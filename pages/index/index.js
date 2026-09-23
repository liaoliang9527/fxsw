const { CHARACTERS, WEAPONS, PASSIVES, ENEMIES, BOSSES, RUN_SECONDS, WORLD } = require('../../utils/config');

const SAVE_KEY = 'ruins_survivor_meta_v1';
const SNAP_KEY = 'ruins_survivor_run_v1';
const TALENTS = { hp: '最大生命', damage: '伤害', speed: '移动速度', pickup: '拾取范围', gold: '开局金币' };
const TALENT_COSTS = [25, 50, 90, 140, 200];
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const timeText = (v) => `${String(Math.max(0, Math.floor(v / 60))).padStart(2, '0')}:${String(Math.max(0, Math.floor(v % 60))).padStart(2, '0')}`;
const emptyModal = () => ({ type: '', title: '', subtitle: '' });
const defaultMeta = () => ({ coins: 0, runs: 0, kills: 0, wins: 0, best: 0, bestEndlessCycle: 0, bestEndlessTime: 0, talents: { hp: 0, damage: 0, speed: 0, pickup: 0, gold: 0 }, settings: { sound: true, lowQuality: false, tutorial: true } });

Page({
  data: {
    screen: 'menu', meta: defaultMeta(), settings: defaultMeta().settings, characters: [], selected: 'watchman', currentCharacter: CHARACTERS[0], hasSnapshot: false,
    hud: { hpPercent: 100, xpPercent: 0, hpText: '130/130', levelText: '01', chapter: '第一幕 · 灰烬苏醒', time: '00:00', objective: '下一事件 05:00', coins: 0, kills: 0, weaponList: [], passiveList: [], bossVisible: false, bossPercent: 100, bossName: '首领', hordeVisible: false, hordeText: '' },
    stick: { x: 0, y: 0 }, toast: '', modal: emptyModal(), rerolls: 1, ui: { rightTop: 46, rightGap: 12 },
  },

  onLoad() {
    let saved = defaultMeta();
    try { saved = Object.assign(saved, wx.getStorageSync(SAVE_KEY) || {}); } catch (_) {}
    saved.talents = Object.assign(defaultMeta().talents, saved.talents || {});
    saved.settings = Object.assign(defaultMeta().settings, saved.settings || {});
    this.meta = saved;
    this.measureChrome();
    this.refreshMenu();
  },

  measureChrome() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const capsule = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      const rightTop = capsule && capsule.bottom ? capsule.bottom + 6 : 46;
      const rightGap = capsule && capsule.right ? Math.max(10, info.windowWidth - capsule.right) : 12;
      this.setData({ ui: { rightTop, rightGap } });
    } catch (_) {}
  },

  onReady() { this.initCanvas(); },
  onHide() { if (this.phase === 'playing') this.pauseGame(); },
  onUnload() { this.destroyed = true; this.saveSnapshot(); },

  refreshMenu() {
    let hasSnapshot = false; try { hasSnapshot = !!wx.getStorageSync(SNAP_KEY); } catch (_) {}
    const list = CHARACTERS.map(c => ({ ...c, selected: c.id === this.data.selected, unlocked: c.id === 'watchman' || (c.id === 'ember' && this.meta.kills >= 3000) || (c.id === 'gale' && this.meta.best >= 720), unlockText: c.id === 'ember' ? '累计击败 3000 敌人' : '任意角色存活 12 分钟' }));
    this.setData({ meta: this.meta, settings: this.meta.settings, characters: list, hasSnapshot });
  },

  saveMeta() { try { wx.setStorageSync(SAVE_KEY, this.meta); } catch (_) {} },

  selectCharacter(e) {
    const id = e.currentTarget.dataset.id, found = this.data.characters.find(c => c.id === id);
    if (!found || !found.unlocked) return;
    this.setData({ selected: id }); this.refreshMenu();
  },

  initCanvas() {
    wx.createSelectorQuery().in(this).select('#gameCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res[0]) return;
      const { node, width, height } = res[0], dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
      node.width = width * dpr; node.height = height * dpr;
      const ctx = node.getContext('2d'); ctx.scale(dpr, dpr);
      this.canvas = node; this.ctx = ctx; this.viewport = { width, height, dpr }; this.lastTime = Date.now();
      this.monsterImages = {};
      Object.keys(ENEMIES).forEach(id => { const img = node.createImage(); img.onload = () => { img.ready = true; }; img.onerror = () => { img.ready = false; }; img.src = ENEMIES[id].sprite; this.monsterImages[id] = img; });
      Object.keys(BOSSES).forEach(id => { const img = node.createImage(); img.onload = () => { img.ready = true; }; img.onerror = () => { img.ready = false; }; img.src = BOSSES[id].sprite; this.monsterImages[id] = img; });
      this.bossEffectImages = {};
      Object.keys(BOSSES).forEach(id => { const img = node.createImage(); img.onload = () => { img.ready = true; }; img.onerror = () => { img.ready = false; }; img.src = BOSSES[id].attackEffect; this.bossEffectImages[id] = img; });
      this.heroImages = {};
      CHARACTERS.forEach(c => { const img = node.createImage(); img.onload = () => { img.ready = true; }; img.onerror = () => { img.ready = false; }; img.src = c.sprite; this.heroImages[c.id] = img; });
      this.skillImages = {};
      Object.keys(WEAPONS).forEach(id => { const w = WEAPONS[id]; if(!w.effect)return; const img = node.createImage(); img.onload = () => { img.ready = true; }; img.onerror = () => { img.ready = false; }; img.src = w.effect; this.skillImages[id] = img; });
      const loop = () => { if (this.destroyed) return; const now = Date.now(), dt = Math.min(.033, (now - this.lastTime) / 1000); this.lastTime = now; this.update(dt); this.draw(); this.frame = node.requestAnimationFrame(loop); };
      loop();
    });
  },

  newRun(characterId) {
    const c = CHARACTERS.find(x => x.id === characterId) || CHARACTERS[0];
    const maxHp = c.hp * (1 + this.meta.talents.hp * .06);
    return { character: c.id, x: WORLD.width / 2, y: WORLD.height / 2, hp: maxHp, maxHp, time: 0, level: 1, xp: 0, xpNeed: 15, kills: 0, coins: this.meta.talents.gold * 5,
      weapons: { [c.weapon]: 1 }, passives: {}, evolved: [], timers: {}, endless: false, endlessCycle: 0, cycleStart: 0, refine: 0, enemies: [], projectiles: [], pickups: [], zones: [], particles: [], damageText: [], bullets: [], lastX: 1, lastY: 0,
      spawnTimer: 0, invuln: 0, snapshotTimer: 0, rerolls: 1, warned: {}, events: {}, horde: null, id: 0, freezeUntil: 0, shake: 0 };
  },

  startGame() {
    let snapshot = null; try { snapshot = wx.getStorageSync(SNAP_KEY); } catch (_) {}
    this.run = snapshot ? Object.assign(this.newRun(snapshot.character), snapshot, { enemies: [], projectiles: [], pickups: [], zones: [], particles: [], damageText: [], bullets: [] }) : this.newRun(this.data.selected);
    if(snapshot&&this.run.time>=600&&!this.run.events.midbossDefeated&&this.run.time<900)this.run.events.b10=false;
    if(snapshot&&this.run.time>=900&&!this.run.events.finalbossDefeated)this.run.events.b15=false;
    if(snapshot&&!this.run.endless&&this.run.events.finalbossDefeated){this.run.events.finalbossDefeated=false;this.run.events.b15=false;}
    const c = CHARACTERS.find(x => x.id === this.run.character);
    this.phase = 'playing'; this.input = { x: 0, y: 0 }; this.lastTime = Date.now();
    this.setData({ screen: 'game', currentCharacter: c, modal: emptyModal(), rerolls: this.run.rerolls, stick: { x: 0, y: 0 } });
    this.syncHud(true);
    if (this.meta.settings.tutorial && !snapshot) { this.showToast('拖动左下摇杆移动，武器会自动攻击', 4500); this.meta.settings.tutorial = false; this.saveMeta(); }
  },

  retryGame() { try { wx.removeStorageSync(SNAP_KEY); } catch (_) {} this.startGame(); },
  backToMenu() { this.phase = 'menu'; this.run = null; this.setData({ screen: 'menu', modal: emptyModal(), toast: '' }); this.refreshMenu(); },

  pauseGame() {
    if (!this.run || this.phase !== 'playing') return;
    this.phase = 'paused'; this.saveSnapshot();
    this.setData({ modal: { type: 'pause', title: '已暂停', subtitle: '战斗时间已停止' } });
  },
  resumeGame() { this.phase = 'playing'; this.lastTime = Date.now(); this.setData({ modal: emptyModal() }); },
  quitGame() { this.finishRun('quit'); },

  saveSnapshot() {
    if (!this.run || !['playing', 'paused'].includes(this.phase)) return;
    const r = this.run;
    const snapshot = { character: r.character, x: r.x, y: r.y, hp: r.hp, maxHp: r.maxHp, time: r.time, level: r.level, xp: r.xp, xpNeed: r.xpNeed, kills: r.kills, coins: r.coins, weapons: r.weapons, passives: r.passives, evolved: r.evolved, rerolls: r.rerolls, warned: r.warned, events: r.events, horde: r.horde, endless: r.endless, endlessCycle: r.endlessCycle, cycleStart: r.cycleStart, refine: r.refine };
    try { wx.setStorageSync(SNAP_KEY, snapshot); } catch (_) {}
  },

  finishRun(result) {
    if (!this.run || this.phase === 'result') return;
    this.phase = 'result'; const r = this.run;
    if (r.endless) { this.meta.bestEndlessCycle = Math.max(this.meta.bestEndlessCycle, r.endlessCycle); this.meta.bestEndlessTime = Math.max(this.meta.bestEndlessTime, Math.floor(r.time)); }
    const base = result === 'win' ? 35 : result === 'quit' ? 0 : Math.round(8 + r.time / 45 + r.kills * .03) + (r.endless ? r.endlessCycle * 6 : 0);
    const gained = (result === 'quit' ? Math.floor(r.coins * .5) : r.coins) + base;
    this.meta.coins += gained; this.meta.runs++; this.meta.kills += r.kills; this.meta.best = Math.max(this.meta.best, Math.floor(r.time)); if (result === 'win') this.meta.wins++;
    this.saveMeta(); try { wx.removeStorageSync(SNAP_KEY); } catch (_) {}
    this.vibrate('heavy');
    this.setData({ modal: { type: 'result', title: result === 'win' ? '胜利 · 废墟幸存者' : r.endless ? `无尽轮回 · 止步第 ${r.endlessCycle} 层` : result === 'lose' ? '本局失败' : '对局结束', subtitle: r.endless ? `无尽存活 ${timeText(r.time - 900)} · 总时长 ${timeText(r.time)}` : '本局成长与奖励已结算', time: timeText(r.time), kills: r.kills, coins: gained, endlessCycle: r.endless ? r.endlessCycle : 0 } });
  },

  openTalent() {
    const talents = Object.keys(TALENTS).map(id => { const level = this.meta.talents[id], cost = TALENT_COSTS[level]; return { id, name: TALENTS[id], level, disabled: level >= 5 || this.meta.coins < cost, costText: level >= 5 ? '已满级' : `${cost} 金币` }; });
    this.setData({ modal: { type: 'talent', title: '通用天赋', subtitle: `现有金币 ${this.meta.coins}`, talents } });
  },
  buyTalent(e) { const id = e.currentTarget.dataset.id, level = this.meta.talents[id], cost = TALENT_COSTS[level]; if (level >= 5 || this.meta.coins < cost) return; this.meta.coins -= cost; this.meta.talents[id]++; this.saveMeta(); this.refreshMenu(); this.openTalent(); },
  resetTalents() { Object.keys(this.meta.talents).forEach(id => { for (let i = 0; i < this.meta.talents[id]; i++) this.meta.coins += TALENT_COSTS[i]; this.meta.talents[id] = 0; }); this.saveMeta(); this.refreshMenu(); this.openTalent(); },
  closeModal() { this.setData({ modal: emptyModal() }); },

  openSettings() { this.settingsReturn = this.phase === 'paused' ? 'pause' : 'menu'; this.setData({ settings: this.meta.settings, modal: { type: 'settings', title: '设置', subtitle: '设置会自动保存' } }); },
  closeSettings() { if (this.settingsReturn === 'pause') this.setData({ modal: { type: 'pause', title: '已暂停', subtitle: '战斗时间已停止' } }); else this.closeModal(); },
  toggleSound(e) { this.meta.settings.sound = e.detail.value; this.saveMeta(); this.setData({ settings: this.meta.settings }); },
  toggleQuality(e) { this.meta.settings.lowQuality = e.detail.value; this.saveMeta(); this.setData({ settings: this.meta.settings }); },
  resetTutorial() { this.meta.settings.tutorial = true; this.saveMeta(); wx.showToast({ title: '已重置', icon: 'success' }); },

  joystickStart(e) { this.joystickMove(e); },
  joystickMove(e) {
    const t = e.touches && e.touches[0]; if (!t || !this.viewport) return;
    const cx = 22 + 52, cy = this.viewport.height - 18 - 52;
    let x = t.clientX - cx, y = t.clientY - cy; const len = Math.hypot(x, y), max = 30; if (len > max) { x *= max / len; y *= max / len; }
    this.input = { x: x / max, y: y / max }; this.setData({ stick: { x: Math.round(x), y: Math.round(y) } });
  },
  joystickEnd() { this.input = { x: 0, y: 0 }; this.setData({ stick: { x: 0, y: 0 } }); },

  stats() {
    const r = this.run, c = CHARACTERS.find(x => x.id === r.character), p = r.passives;
    const watch = r.character === 'watchman' ? Math.min(4, Math.floor(r.level / 5)) * .05 : 0;
    return { speed: c.speed * (1 + (p.speed || 0) * .06 + this.meta.talents.speed * .04), damage: (1 + (p.power || 0) * .1 + this.meta.talents.damage * .05 + watch) * (1 + (r.refine || 0) * .06), area: (r.character === 'ember' ? 1.2 : 1) * (1 + (p.area || 0) * .1), cooldown: Math.max(.5, (r.character === 'gale' ? .95 : 1) * (1 - (p.cooldown || 0) * .06)), pickup: 44 * (1 + (p.pickup || 0) * .25 + this.meta.talents.pickup * .1) };
  },

  update(dt) {
    if (!this.run || this.phase !== 'playing') return;
    const r = this.run, s = this.stats(); r.time += dt; r.invuln = Math.max(0, r.invuln - dt); r.shake = Math.max(0, r.shake - dt * 20);
    this.timeline(); this.updateHorde(dt); this.movePlayer(dt, s);
    r.spawnTimer -= dt; if (r.spawnTimer <= 0 && !r.horde) { const count = r.time > 780 ? 4 : r.time > 420 ? 3 : r.time > 180 ? 2 : 1; for (let i = 0; i < count; i++) this.spawnEnemy(); r.spawnTimer = Math.max(.3, 1.1 - r.time / 1700); }
    this.updateEnemies(dt); this.updateBossBullets(dt); this.fireWeapons(dt, s); this.updateProjectiles(dt); this.updateZones(dt); this.updatePickups(dt, s);
    r.particles.forEach(p => { p.ttl -= dt;if(p.x!=null&&!p.thorns){p.x += (p.vx || 0) * dt;p.y += (p.vy || 0) * dt;p.vy=(p.vy||0)+90*dt;} }); r.particles = r.particles.filter(p => p.ttl > 0);
    r.damageText.forEach(p => { p.ttl -= dt; p.y -= 28 * dt; }); r.damageText = r.damageText.filter(p => p.ttl > 0);
    r.snapshotTimer += dt; if (r.snapshotTimer > 20) { r.snapshotTimer = 0; this.saveSnapshot(); }
    this.hudTick = (this.hudTick || 0) + dt; if (this.hudTick > .12) { this.hudTick = 0; this.syncHud(); }
  },

  movePlayer(dt, s) { const r = this.run, i = this.input || { x: 0, y: 0 }; if (i.x || i.y) { r.lastX = i.x; r.lastY = i.y; } r.x = clamp(r.x + i.x * s.speed * dt, 20, WORLD.width - 20); r.y = clamp(r.y + i.y * s.speed * dt, 20, WORLD.height - 20); },

  timeline() {
    const r = this.run;
    if (r.endless) { this.updateEndless(); return; }
    const warn = (key, at, text) => { if (r.time >= at && !r.warned[key]) { r.warned[key] = true; this.showToast(text, 3200); } };
    warn('h1w',145,'怪物群潮正在集结');if(r.time>=150&&!r.events.h1){r.events.h1=true;this.startHorde(1);}
    warn('e5w', 296, '强大敌人正在接近'); warn('e5', 300, '精英敌人出现'); if (r.time >= 300 && !r.events.e5) { r.events.e5 = true; this.spawnEnemy('guard', 'elite'); }
    warn('h2w',445,'第二波群潮即将来袭');if(r.time>=450&&!r.events.h2){r.events.h2=true;this.startHorde(2);}
    warn('b10w', 596, '铁墓守卫正在苏醒'); warn('b10', 600, '首领 · 铁墓守卫'); if (r.time >= 600 && !r.events.b10 && !r.events.midbossDefeated) { r.events.b10 = true; this.spawnBoss('gravewarden', 'midboss'); }
    if (r.time >= 660 && !r.events.e11) { r.events.e11 = true; this.spawnEnemy('runner', 'elite'); this.spawnEnemy('thrower', 'elite'); }
    warn('h3w',745,'终局群潮正在逼近');if(r.time>=750&&!r.events.h3){r.events.h3=true;this.startHorde(3);}
    warn('b15w', 896, '深渊正在凝视这里'); warn('b15', 900, '最终首领 · 深渊监视者'); if (r.time >= RUN_SECONDS && !r.events.b15 && !r.events.finalbossDefeated) { r.events.b15 = true; this.spawnBoss('abysswatcher', 'finalboss'); }
  },

  updateEndless() {
    const r = this.run, cycle = r.endlessCycle, ct = r.time - r.cycleStart, k = s => `ec${cycle}_${s}`;
    if (!r.events[k('h')] && ct >= 8) { r.events[k('h')] = true; this.startHorde(3); }
    if (!r.events[k('e')] && ct >= 60) { r.events[k('e')] = true; this.spawnEnemy('guard', 'elite'); this.spawnEnemy('summoner', 'elite'); this.showToast('无尽精英出现', 2000); }
    if (!r.events[k('b')] && ct >= 110) { r.events[k('b')] = true; const bossId = cycle % 2 === 1 ? 'abysswatcher' : 'gravewarden'; this.spawnBoss(bossId, 'endlessboss', 1.2 + (cycle - 1) * .45); this.showToast(`无尽首领 · ${BOSSES[bossId].name}`, 2600); }
    if (ct >= 150) { r.endlessCycle = cycle + 1; r.cycleStart = r.time; this.showToast(`无尽轮回 · 第 ${r.endlessCycle} 层 · 敌人更强了`, 3000); this.vibrate('medium'); }
  },

  offerEndless() {
    this.saveSnapshot(); this.phase = 'endless'; this.vibrate('heavy');
    this.setData({ modal: { type: 'endless', title: '胜利 · 废墟幸存者', subtitle: '最终首领已被击败，是时候做出抉择' } });
  },
  continueEndless() {
    const r = this.run; if (!r || this.phase !== 'endless') return;
    r.endless = true; r.endlessCycle = 1; r.cycleStart = r.time; this.phase = 'playing'; this.lastTime = Date.now();
    this.setData({ modal: emptyModal() }); this.saveSnapshot();
    this.showToast('无尽轮回 · 第 1 层 · 敌人正在聚集', 3200); this.vibrate('heavy'); this.syncHud(true);
  },
  claimVictory() { if (this.phase !== 'endless') return; this.finishRun('win'); },

  startHorde(wave) {
    const settings={1:{total:36,duration:11,types:['chaser','runner'],reward:12},2:{total:60,duration:15,types:['chaser','runner','thrower','guard'],reward:22},3:{total:88,duration:19,types:['runner','thrower','guard','bomber','summoner'],reward:35}}[wave];if(!settings||this.run.horde)return;
    this.run.horde={wave,total:settings.total,remaining:settings.total,interval:settings.duration/settings.total,timer:0,types:settings.types,reward:settings.reward,spawned:0};this.showToast(this.run.endless?`第 ${this.run.endlessCycle} 层群潮来袭`:`第 ${wave} 波群潮来袭`,2600);this.vibrate('heavy');
  },

  updateHorde(dt) {
    const r=this.run,h=r.horde;if(!h)return;h.timer-=dt;let guard=0;while(h.remaining>0&&h.timer<=0&&guard++<8){if(r.enemies.length<230){this.spawnHordeUnit(h);h.remaining--;h.spawned++;}h.timer+=h.interval;}
    if(h.remaining===0&&!r.enemies.some(e=>e.hordeWave===h.wave&&!e.dead)){r.coins+=h.reward;this.showToast(`群潮肃清 · 获得 ${h.reward} 金币`,2600);r.horde=null;this.syncHud(true);}
  },

  spawnHordeUnit(h) {
    const r=this.run,type=h.types[h.spawned%h.types.length],d=ENEMIES[type],side=h.wave===1?h.spawned%2:h.spawned%4,a=[0,Math.PI,Math.PI/2,-Math.PI/2][side]+rnd(-.22,.22),radius=Math.max(this.viewport?this.viewport.width:700,520)*.68,scale=1+Math.floor(r.time/300)*.34,em=r.endless?1+(r.endlessCycle-1)*.15:1;
    r.enemies.push({id:++r.id,type,hordeWave:h.wave,x:clamp(r.x+Math.cos(a)*radius,25,WORLD.width-25),y:clamp(r.y+Math.sin(a)*radius,25,WORLD.height-25),hp:d.hp*scale*em,maxHp:d.hp*scale*em,r:d.r,speed:d.speed*1.1,damage:d.damage*(1+(h.wave-1)*.15)*em,attack:2,warning:0,slow:0,dead:false});
  },

  spawnBoss(bossId, special, hpMul) {
    const r=this.run,d=BOSSES[bossId],mul=hpMul||1;if(!d||r.enemies.some(e=>e.bossId===bossId&&!e.dead))return;
    const a=rnd(0,Math.PI*2),radius=Math.max(this.viewport?this.viewport.width:700,500)*.62;
    r.enemies.push({id:++r.id,type:d.baseType,bossId,special,x:clamp(r.x+Math.cos(a)*radius,70,WORLD.width-70),y:clamp(r.y+Math.sin(a)*radius,70,WORLD.height-70),hp:d.hp*mul,maxHp:d.hp*mul,r:d.r,speed:d.speed,damage:d.damage,attack:1.8,skill:0,warning:0,slow:0,dead:false});
  },

  spawnEnemy(type, special) {
    const r = this.run; if (r.enemies.length >= 250 && !special) return;
    const available = Object.keys(ENEMIES).filter(id => ENEMIES[id].from <= r.time); type = type || available[Math.floor(Math.random() * available.length)];
    const d = ENEMIES[type], a = rnd(0, Math.PI * 2), radius = Math.max(this.viewport ? this.viewport.width : 700, 500) * .7;
    const boss = special === 'midboss' || special === 'finalboss', em = r.endless ? 1 + (r.endlessCycle - 1) * .15 : 1, maxHp = boss ? (special === 'finalboss' ? 4800 : 2500) : d.hp * (1 + Math.floor(r.time / 300) * .45) * em * (special === 'elite' ? 7 : 1);
    r.enemies.push({ id: ++r.id, type, special, x: clamp(r.x + Math.cos(a) * radius, 30, WORLD.width - 30), y: clamp(r.y + Math.sin(a) * radius, 30, WORLD.height - 30), hp: maxHp, maxHp, r: boss ? 42 : special === 'elite' ? d.r * 1.6 : d.r, speed: d.speed, damage: d.damage * (boss ? 1.6 : special === 'elite' ? 1.3 : 1) * em, attack: rnd(1.5, 3), warning: 0, slow: 0, dead: false });
  },

  updateEnemies(dt) {
    const r = this.run;
    for (const e of r.enemies) {
      if (e.dead) continue; const d = Math.max(1, distance(e, r)), dx = (r.x - e.x) / d, dy = (r.y - e.y) / d; e.attack -= dt; e.slow = Math.max(0, e.slow - dt);
      if (r.time >= r.freezeUntil || e.special) { const speed = e.speed * (e.slow ? .48 : 1); e.x += dx * speed * dt; e.y += dy * speed * dt; }
      if (e.bossId && e.attack <= 0) this.useBossSkill(e);
      e.warning = Math.max(0, e.warning - dt);
      if (d < e.r + 15) this.hurtPlayer(e.damage);
    }
    r.enemies = r.enemies.filter(e => !e.dead);
  },

  useBossSkill(e) {
    const r=this.run,d=BOSSES[e.bossId],phase2=e.hp<=e.maxHp*.5;e.skill=(e.skill||0)+1;e.warning=.9;
    if(e.bossId==='gravewarden'){
      if(e.skill%2){r.zones.push({type:'danger',id:'boss',effect:'gravewarden',x:r.x,y:r.y,radius:96,ttl:1.4,delay:.82,age:0,hit:false,damage:e.damage*1.15});this.showToast('铁墓重击 · 离开红圈',1200);}
      else{this.spawnMinions(e,phase2?'runner':'chaser',phase2?4:3);this.showToast('铁墓守卫召唤亡卒',1200);}
      e.attack=phase2?2.2:3.1;
    }else{
      if(e.skill%2){const count=phase2?5:3;for(let i=0;i<count;i++){const a=i*Math.PI*2/count+r.time,rr=i?rnd(55,150):0,delay=.72+i*.08;r.zones.push({type:'danger',id:'boss',effect:'abysswatcher',x:clamp(r.x+Math.cos(a)*rr,40,WORLD.width-40),y:clamp(r.y+Math.sin(a)*rr,40,WORLD.height-40),radius:phase2?68:62,ttl:delay+.55,delay,age:0,hit:false,damage:e.damage});}this.showToast('深渊凝视 · 连续预警',1300);}
      else{this.spawnBulletRing(e,phase2?16:10,phase2?185:155);this.showToast('深渊弹幕',1000);}
      e.attack=phase2?1.65:2.55;
    }
  },

  spawnMinions(boss,type,count) {
    const r=this.run,d=ENEMIES[type];for(let i=0;i<count;i++){const a=i*Math.PI*2/count+r.time,x=clamp(boss.x+Math.cos(a)*75,25,WORLD.width-25),y=clamp(boss.y+Math.sin(a)*75,25,WORLD.height-25);r.enemies.push({id:++r.id,type,x,y,hp:d.hp*2,maxHp:d.hp*2,r:d.r,speed:d.speed*1.08,damage:d.damage,attack:2,warning:0,slow:0,dead:false});}
  },

  spawnBulletRing(boss,count,speed) {
    const r=this.run;for(let i=0;i<count;i++){const a=i*Math.PI*2/count+r.time*.35;r.bullets.push({x:boss.x,y:boss.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:7,ttl:4,damage:boss.damage*.7,dead:false});}
  },

  updateBossBullets(dt) {
    const r=this.run;for(const b of r.bullets){b.ttl-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(distance(b,r)<b.r+13){this.hurtPlayer(b.damage);b.dead=true;}}
    r.bullets=r.bullets.filter(b=>!b.dead&&b.ttl>0&&b.x>0&&b.y>0&&b.x<WORLD.width&&b.y<WORLD.height);
  },

  spawnLightningArc(x1,y1,x2,y2) {
    const count=this.meta.settings.lowQuality?5:9,points=[];for(let i=0;i<=count;i++){const t=i/count,fade=Math.sin(Math.PI*t),nx=-(y2-y1),ny=x2-x1,len=Math.max(1,Math.hypot(nx,ny)),j=i===0||i===count?0:rnd(-12,12)*fade;points.push({x:x1+(x2-x1)*t+nx/len*j,y:y1+(y2-y1)*t+ny/len*j});}
    this.run.particles.push({lightning:true,points,ttl:.2,maxTtl:.2,color:'#8fdcff'});
    this.run.particles.push({x:x2,y:y2,vx:0,vy:0,radius:11,ttl:.18,color:'#d9f7ff',flash:true});
  },

  nearest(max = Infinity, from) { const r = this.run, o = from || r; let best = null, bd = max; r.enemies.forEach(e => { const d = distance(e, o); if (!e.dead && d < bd) { best = e; bd = d; } }); return best; },

  fireWeapons(dt, s) {
    const r = this.run;
    Object.keys(r.weapons).forEach(id => {
      const level = r.weapons[id], w = WEAPONS[id]; r.timers[id] = (r.timers[id] || 0) - dt; if (r.timers[id] > 0) return;
      const target = this.nearest(620); if (!target && id !== 'ring' && id !== 'frost') return;
      const evolved = r.evolved.includes(id), damage = w.damage * s.damage * (1 + (level - 1) * .24) * (evolved ? 1.55 : 1); r.timers[id] = Math.max(.14, w.cooldown * s.cooldown * (1 - (level - 1) * .08) * (evolved ? .82 : 1));
      if (['blade','arrow','raven'].includes(id)) { const angle = id === 'arrow' ? Math.atan2(r.lastY,r.lastX) : Math.atan2(target.y-r.y,target.x-r.x); const count = evolved && id !== 'raven' ? 2 : 1; for(let i=0;i<count;i++){const a=angle+(count===2?(i ? .18 : -.18):0),p={id,x:r.x,y:r.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,r:id==='blade'?12:7,damage,ttl:id==='blade'?1.2:1.5,age:0,pierce:2+Math.floor(level/2),hits:{}};if(id==='blade')Object.assign(p,{boomerang:true,startX:r.x,startY:r.y,dirX:Math.cos(a),dirY:Math.sin(a),curve:(count===2?(i?1:-1):(r.id%2?1:-1))*82,range:310,duration:1.2});r.projectiles.push(p);} }
      else if (id === 'flask') r.zones.push({ type: 'fire', id, x: target.x, y: target.y, radius: (62+level*8)*s.area, ttl: 3, age: 0, tick: 0, damage });
      else if (id === 'lightning') { const hits=[...r.enemies].filter(e=>!e.dead).sort((a,b)=>distance(a,r)-distance(b,r)).slice(0,evolved?5:1+Math.floor(level/2));let from={x:r.x,y:r.y};hits.forEach(e=>{this.damageEnemy(e,damage,id);this.spawnLightningArc(from.x,from.y,e.x,e.y);from=e;});if(hits.length)r.shake=Math.max(r.shake,2.5); }
      else if (id === 'ring') { const radius=(72+level*6)*s.area; r.enemies.forEach(e=>{if(Math.abs(distance(e,r)-radius)<e.r+14)this.damageEnemy(e,damage,id);}); }
      else if (id === 'frost') { const radius=(125+level*9)*s.area;r.enemies.forEach(e=>{if(distance(e,r)<radius+e.r){this.damageEnemy(e,damage,id);e.slow=2.2;}});r.particles.push({ring:true,x:r.x,y:r.y,radius,ttl:.35,color:w.color}); }
      else if (id === 'beam') { const a=Math.atan2(target.y-r.y,target.x-r.x),dx=Math.cos(a),dy=Math.sin(a);r.enemies.forEach(e=>{const px=e.x-r.x,py=e.y-r.y,along=px*dx+py*dy,across=Math.abs(px*dy-py*dx);if(along>0&&along<620&&across<22+e.r)this.damageEnemy(e,damage,id);});r.particles.push({thorns:true,x:r.x,y:r.y,angle:a,length:620,ttl:.55,maxTtl:.55,color:w.color}); }
    });
  },

  updateProjectiles(dt) { const r=this.run;for(const p of r.projectiles){p.age=(p.age||0)+dt;if(p.boomerang){const oldX=p.x,oldY=p.y,out=.56,turn=.34,px=-p.dirY,py=p.dirX;if(p.age<=out){const t=clamp(p.age/out,0,1),u=1-t,x0=p.startX,y0=p.startY,x1=x0+p.dirX*p.range*.52+px*p.curve,y1=y0+p.dirY*p.range*.52+py*p.curve,x2=x0+p.dirX*p.range,y2=y0+p.dirY*p.range;p.x=u*u*x0+2*u*t*x1+t*t*x2;p.y=u*u*y0+2*u*t*y1+t*t*y2;p.returning=false;}else{if(!p.returning){const dx=r.x-p.x,dy=r.y-p.y,len=Math.max(1,Math.hypot(dx,dy)),speed=Math.max(1,Math.hypot(p.vx,p.vy));p.returning=true;p.returnStartX=p.x;p.returnStartY=p.y;p.returnDirX=dx/len;p.returnDirY=dy/len;p.returnControl1X=p.x+p.vx/speed*110;p.returnControl1Y=p.y+p.vy/speed*110;p.returnEndX=p.x+p.returnDirX*220;p.returnEndY=p.y+p.returnDirY*220;p.returnControl2X=p.returnEndX-p.returnDirX*90;p.returnControl2Y=p.returnEndY-p.returnDirY*90;p.ttl=5;}const rt=p.age-out;if(rt<=turn){const t=clamp(rt/turn,0,1),u=1-t;p.x=u*u*u*p.returnStartX+3*u*u*t*p.returnControl1X+3*u*t*t*p.returnControl2X+t*t*t*p.returnEndX;p.y=u*u*u*p.returnStartY+3*u*u*t*p.returnControl1Y+3*u*t*t*p.returnControl2Y+t*t*t*p.returnEndY;}else{const travel=(rt-turn)*620;p.x=p.returnEndX+p.returnDirX*travel;p.y=p.returnEndY+p.returnDirY*travel;}p.ttl-=dt;const view=this.viewport||{width:1000,height:600},camX=clamp(r.x-view.width/2,0,WORLD.width-view.width),camY=clamp(r.y-view.height/2,0,WORLD.height-view.height),margin=80;if(rt>turn&&(p.x<camX-margin||p.x>camX+view.width+margin||p.y<camY-margin||p.y>camY+view.height+margin))p.ttl=0;}p.vx=(p.x-oldX)/Math.max(dt,.001);p.vy=(p.y-oldY)/Math.max(dt,.001);}else{p.ttl-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}for(const e of r.enemies){const hitKey=p.boomerang?`${e.id}:${p.returning?'back':'out'}`:e.id;if(!p.hits[hitKey]&&distance(p,e)<p.r+e.r){p.hits[hitKey]=1;this.damageEnemy(e,p.damage,p.id);if(!p.boomerang&&p.pierce--<=0){p.ttl=0;break;}}}}r.projectiles=r.projectiles.filter(p=>p.ttl>0); },
  updateZones(dt) { const r=this.run;for(const z of r.zones){z.ttl-=dt;z.age=(z.age||0)+dt;if(z.type==='danger'){z.delay=(z.delay==null ? .75 : z.delay)-dt;if(z.delay<=0&&!z.hit){z.hit=true;z.hitAt=z.age;if(distance(z,r)<z.radius+14)this.hurtPlayer(z.damage);r.shake=Math.max(r.shake,5);for(let i=0;i<8;i++)r.particles.push({x:z.x,y:z.y,vx:rnd(-100,100),vy:rnd(-120,10),radius:rnd(2,5),ttl:rnd(.3,.6),color:'#d9555f'});}}else{z.tick-=dt;if(z.tick<=0){z.tick=.35;r.enemies.forEach(e=>{if(distance(z,e)<z.radius+e.r)this.damageEnemy(e,z.damage,z.id);});}}}r.zones=r.zones.filter(z=>z.ttl>0); },

  damageEnemy(e, amount, weapon) {
    if (!e || e.dead) return; const r=this.run;e.hp-=amount;
    if(Math.random()<.35)r.damageText.push({x:e.x+rnd(-5,5),y:e.y-e.r,text:Math.round(amount),color:(WEAPONS[weapon]&&WEAPONS[weapon].color)||'#fff',ttl:.5});
    if(e.hp<=0){e.dead=true;r.kills++;const d=e.bossId?BOSSES[e.bossId]:ENEMIES[e.type];r.pickups.push({type:'xp',x:e.x,y:e.y,value:d.xp*(e.special&&!e.bossId?5:1)});if(Math.random()<.08||e.bossId)r.pickups.push({type:'coin',x:e.x+8,y:e.y,value:e.bossId?12:1});if(e.special)r.pickups.push({type:'chest',x:e.x,y:e.y});const count=this.meta.settings.lowQuality?2:e.bossId?18:5;for(let i=0;i<count;i++)r.particles.push({x:e.x,y:e.y,vx:rnd(-100,100),vy:rnd(-130,20),radius:rnd(2,6),ttl:rnd(.35,.8),color:d.color});if(e.special==='midboss')r.events.midbossDefeated=true;if(e.special==='finalboss'){r.events.finalbossDefeated=true;this.offerEndless();}else if(e.special==='endlessboss'){const reward=20+r.endlessCycle*5;r.coins+=reward;r.hp=Math.min(r.maxHp,r.hp+r.maxHp*.18);this.showToast(`无尽首领击破 · 回复生命 +${reward} 金币`,3000);this.vibrate('heavy');}}
  },

  hurtPlayer(amount) { const r=this.run;if(r.invuln>0||this.phase!=='playing')return;r.hp-=amount;r.invuln=.5;r.shake=7;this.vibrate('light');if(r.hp<=0){r.hp=0;this.finishRun('lose');} },

  updatePickups(dt,s) { const r=this.run;for(let i=r.pickups.length-1;i>=0;i--){const p=r.pickups[i],d=distance(p,r);if(d<s.pickup*2&&d>2){p.x+=(r.x-p.x)/d*150*dt;p.y+=(r.y-p.y)/d*150*dt;}if(d<s.pickup){r.pickups.splice(i,1);if(p.type==='xp')r.xp+=p.value;else if(p.type==='coin')r.coins+=p.value;else if(p.type==='chest'){this.openChest();return;}}}if(r.xp>=r.xpNeed)this.levelUp(); },

  levelUp() { const r=this.run;if(this.phase!=='playing')return;r.xp-=r.xpNeed;r.level++;r.xpNeed=Math.round(15+10*Math.pow(r.level-1,1.3));this.phase='level';this.vibrate('medium');this.showChoices(); },
  buildChoices() { const r=this.run,pool=[];Object.keys(WEAPONS).forEach(id=>{if((r.weapons[id]||0)<5&&(r.weapons[id]||Object.keys(r.weapons).length<5))pool.push({kind:'weapon',id});});Object.keys(PASSIVES).forEach(id=>{if((r.passives[id]||0)<5&&(r.passives[id]||Object.keys(r.passives).length<5))pool.push({kind:'passive',id});});const out=[];while(out.length<3&&pool.length){const i=Math.floor(Math.random()*pool.length),x=pool.splice(i,1)[0];if(!out.some(v=>v.kind===x.kind&&v.id===x.id))out.push(x);}while(out.length<3)out.push(r.endless?{kind:'refine',id:'refine'}:{kind:'coin',id:'coin'});return out; },
  showChoices() { const r=this.run;this.pendingChoices=this.buildChoices();const choices=this.pendingChoices.map(c=>{if(c.kind==='weapon'){const d=WEAPONS[c.id],lv=r.weapons[c.id]||0;return{key:`w${c.id}`,icon:d.icon,name:d.name,levelText:lv?`Lv ${lv} → ${lv+1}`:'新武器',text:'提升伤害、范围或攻击频率',tag:r.passives[d.passive]?'◆ 已满足进化配方':'武器能力'};}if(c.kind==='passive'){const d=PASSIVES[c.id],lv=r.passives[c.id]||0;return{key:`p${c.id}`,icon:d.icon,name:d.name,levelText:lv?`Lv ${lv} → ${lv+1}`:'新被动',text:d.text,tag:'被动能力'};}if(c.kind==='refine')return{key:'refine',icon:'/assets/passive-power.png',name:'无尽淬炼',levelText:`第 ${(r.refine||0)+1} 次淬炼`,text:'所有伤害 +6% · 最大生命 +4',tag:'无尽成长'};return{key:'coin',icon:'/assets/pickup-coin.png',name:'金币补给',levelText:'补给',text:'获得 20 金币',tag:'资源'};});this.setData({rerolls:r.rerolls,modal:{type:'level',title:`等级提升 · Lv ${r.level}`,subtitle:'选择一项能力，战斗已暂停',choices}}); },
  chooseUpgrade(e) { const c=this.pendingChoices[Number(e.currentTarget.dataset.index)],r=this.run;if(!c)return;if(c.kind==='weapon')r.weapons[c.id]=(r.weapons[c.id]||0)+1;else if(c.kind==='passive')r.passives[c.id]=(r.passives[c.id]||0)+1;else if(c.kind==='refine'){r.refine=(r.refine||0)+1;r.maxHp+=4;r.hp=Math.min(r.maxHp,r.hp+4);}else r.coins+=20;this.phase='playing';this.setData({modal:emptyModal()});this.syncHud(true);if(r.xp>=r.xpNeed)this.levelUp(); },
  reroll() { if(this.run.rerolls<=0)return;this.run.rerolls--;this.showChoices(); },

  openChest() { const r=this.run;this.phase='chest';const eligible=Object.keys(r.weapons).filter(id=>r.weapons[id]>=5&&r.passives[WEAPONS[id].passive]&&!r.evolved.includes(id));let icon,name,text;if(eligible.length){const id=eligible[0];r.evolved.push(id);icon=WEAPONS[id].icon;name=`${WEAPONS[id].name} · 进化`;text='伤害、范围与攻击效率大幅提高';}else{const ids=Object.keys(r.weapons).filter(id=>r.weapons[id]<5);if(ids.length){const id=ids[0];r.weapons[id]++;icon=WEAPONS[id].icon;name=`${WEAPONS[id].name} Lv${r.weapons[id]}`;text='武器等级提升';}else{r.coins+=20;icon='/assets/pickup-coin.png';name='金币奖励';text='获得 20 金币';}}this.setData({modal:{type:'chest',title:'宝箱奖励',subtitle:'精英战利品',icon,rewardName:name,rewardText:text}}); },
  closeReward() { this.phase='playing';this.setData({modal:emptyModal()});this.syncHud(true);if(this.run.xp>=this.run.xpNeed)this.levelUp(); },

  syncHud(force) { const r=this.run;if(!r)return;const phase=r.time<300?0:r.time<600?1:r.time<900?2:3,next=[300,600,900][phase];const boss=r.enemies.find(e=>e.special==='endlessboss')||r.enemies.find(e=>e.special==='finalboss')||r.enemies.find(e=>e.special==='midboss'),bossData=boss&&boss.bossId?BOSSES[boss.bossId]:null;let chapter=['第一幕 · 灰烬苏醒','第二幕 · 猎潮逼近','第三幕 · 长夜围城','终幕 · 灾厄降临'][phase],objective=r.horde?'击退怪物群潮':phase===3?'击败最终首领':`下一事件 ${timeText(next-r.time)}`;if(r.endless){chapter=`无尽轮回 · 第 ${r.endlessCycle} 层`;const ct=r.time-r.cycleStart,nextT=[60,110,150].find(t=>t>ct)||150;objective=boss?'击破无尽首领':r.horde?'击退怪物群潮':`下一事件 ${timeText(nextT-ct)}`;}const weaponList=Object.keys(r.weapons).map(id=>({id,name:WEAPONS[id].name,icon:WEAPONS[id].icon,level:r.weapons[id],evolved:r.evolved.includes(id)}));const passiveList=Object.keys(r.passives).map(id=>({id,name:PASSIVES[id].name,icon:PASSIVES[id].icon,level:r.passives[id]}));this.setData({hud:{hpPercent:clamp(r.hp/r.maxHp*100,0,100),xpPercent:clamp(r.xp/r.xpNeed*100,0,100),hpText:`${Math.ceil(r.hp)}/${Math.ceil(r.maxHp)}`,levelText:String(r.level).padStart(2,'0'),chapter,time:timeText(r.time),objective,coins:r.coins,kills:r.kills,weaponList,passiveList,bossVisible:!!boss,bossPercent:boss?clamp(boss.hp/boss.maxHp*100,0,100):100,bossName:bossData?bossData.name:boss&&boss.special==='finalboss'?'最终首领':'首领',hordeVisible:!!r.horde,hordeText:r.horde?(r.endless?`第 ${r.endlessCycle} 层群潮 · 待入场 ${r.horde.remaining}`:`第 ${r.horde.wave} 波 · 待入场 ${r.horde.remaining}`):''}}); },

  showToast(text, ms=2500) { clearTimeout(this.toastTimer);this.setData({toast:text});this.toastTimer=setTimeout(()=>this.setData({toast:''}),ms); },
  vibrate(level) { if(!this.data.settings.sound)return;try { if(level==='light')wx.vibrateShort({type:'light'});else wx.vibrateShort({type:level==='heavy'?'heavy':'medium'}); } catch (_) {} },

  drawSkillFrame(ctx,id,frame,x,y,width,height,rotation=0) {
    const img=this.skillImages&&this.skillImages[id],w=WEAPONS[id];if(!img||!img.ready||!w||!w.effectFrames)return false;
    const fw=img.width/w.effectFrames,fh=img.height;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(img,(frame%w.effectFrames)*fw,0,fw,fh,-width/2,-height/2,width,height);ctx.restore();return true;
  },

  drawBossEffect(ctx,bossId,frame,x,y,size) {
    const img=this.bossEffectImages&&this.bossEffectImages[bossId],d=BOSSES[bossId];if(!img||!img.ready||!d||!d.effectFrames)return false;
    const fw=img.width/d.effectFrames,fh=img.height;ctx.drawImage(img,(frame%d.effectFrames)*fw,0,fw,fh,x-size/2,y-size/2,size,size);return true;
  },

  drawEnemy(ctx,e,r) {
    const monsterId=e.bossId||e.type,d=e.bossId?BOSSES[e.bossId]:ENEMIES[e.type],img=this.monsterImages&&this.monsterImages[monsterId];ctx.save();ctx.translate(e.x,e.y);
    if(e.special){ctx.strokeStyle=e.special==='finalboss'?'#e85d68':'#f0bd69';ctx.lineWidth=3;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(0,0,e.r*1.3,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    if(img&&img.ready){const frames=d.frames||1,frame=Math.floor((r.time+e.id*.037)*(d.fps||6))%frames,fw=img.width/frames,fh=img.height,size=e.r*(e.bossId?5.2:e.special?5:4.2);ctx.scale(r.x<e.x?-1:1,1);ctx.drawImage(img,frame*fw,0,fw,fh,-size/2,-size*.54,size,size);ctx.restore();return;}
    ctx.rotate(Math.atan2(r.y-e.y,r.x-e.x)+Math.PI/2);ctx.fillStyle=ENEMIES[e.type].color;ctx.strokeStyle=e.special?'#f0bd69':'#11171c';ctx.lineWidth=e.special?4:2;ctx.beginPath();if(e.type==='runner'){ctx.moveTo(0,-e.r*1.3);ctx.lineTo(e.r*.8,e.r);ctx.lineTo(0,e.r*.55);ctx.lineTo(-e.r*.8,e.r);}else if(e.type==='thrower'){ctx.moveTo(0,-e.r*1.2);ctx.lineTo(e.r,0);ctx.lineTo(0,e.r*1.2);ctx.lineTo(-e.r,0);}else if(e.type==='guard'){ctx.moveTo(-e.r*.85,-e.r);ctx.lineTo(e.r*.85,-e.r);ctx.lineTo(e.r*.7,e.r*.7);ctx.lineTo(0,e.r*1.2);ctx.lineTo(-e.r*.7,e.r*.7);}else if(e.type==='summoner'){for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?e.r*.55:e.r*1.2;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}}else{ctx.arc(0,0,e.r,0,Math.PI*2);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=e.type==='bomber'?'#ff9d56':e.type==='summoner'?'#ba9ef5':'#dc6066';ctx.beginPath();ctx.arc(0,-e.r*.15,Math.max(2,e.r*.18),0,Math.PI*2);ctx.fill();ctx.restore();
  },

  draw() {
    const ctx=this.ctx,v=this.viewport;if(!ctx||!v)return;ctx.clearRect(0,0,v.width,v.height);ctx.fillStyle='#101820';ctx.fillRect(0,0,v.width,v.height);if(!this.run||this.data.screen!=='game')return;const r=this.run,cam={x:clamp(r.x-v.width/2,0,WORLD.width-v.width),y:clamp(r.y-v.height/2,0,WORLD.height-v.height)},sx=r.shake?rnd(-r.shake,r.shake):0,sy=r.shake?rnd(-r.shake,r.shake):0;ctx.save();ctx.translate(-cam.x+sx,-cam.y+sy);
    const g=ctx.createRadialGradient(WORLD.width/2,WORLD.height/2,50,WORLD.width/2,WORLD.height/2,1400);g.addColorStop(0,'#344044');g.addColorStop(.5,'#202a2e');g.addColorStop(1,'#11191e');ctx.fillStyle=g;ctx.fillRect(0,0,WORLD.width,WORLD.height);ctx.strokeStyle='#3a464b';ctx.lineWidth=1;for(let x=0;x<WORLD.width;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD.height);ctx.stroke();}for(let y=0;y<WORLD.height;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD.width,y);ctx.stroke();}
    if(!this.meta.settings.lowQuality){for(let i=0;i<50;i++){const x=(i*347+123)%WORLD.width,y=(i*619+91)%WORLD.height;ctx.fillStyle='#11191cbb';ctx.beginPath();ctx.ellipse(x,y,20+i%12,5+i%4,i,0,Math.PI*2);ctx.fill();}}
    ctx.strokeStyle='#8a929366';ctx.lineWidth=5;ctx.strokeRect(4,4,WORLD.width-8,WORLD.height-8);
    r.zones.forEach(z=>{if(z.type==='fire'){const frame=z.age<.72?Math.min(11,Math.floor(z.age/.72*12)):12+Math.floor((z.age-.72)*12)%6;this.drawSkillFrame(ctx,'flask',frame,z.x,z.y,z.radius*2.1,z.radius*2.1);return;}if(z.hit&&z.effect){const frame=Math.min(5,Math.floor((z.age-(z.hitAt||z.age))*12));if(this.drawBossEffect(ctx,z.effect,frame,z.x,z.y,z.radius*2.3))return;}const pulse=!z.hit ? .28+.16*Math.sin(z.age*18) : .12;ctx.fillStyle=`rgba(175,32,50,${pulse})`;ctx.strokeStyle=z.hit?'#ff9b72':'#ed5a64';ctx.lineWidth=3;ctx.beginPath();ctx.arc(z.x,z.y,z.radius,0,Math.PI*2);ctx.fill();ctx.stroke();});
    r.bullets.forEach(b=>{ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='#b57cff';ctx.shadowColor='#875cff';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d9c5ff';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();});
    r.pickups.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);if(p.type==='xp'){ctx.fillStyle='#50d8ff';ctx.shadowColor='#50d8ff';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(7,0);ctx.lineTo(0,9);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();}else if(p.type==='coin'){ctx.fillStyle='#e3ae47';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle='#d3a653';ctx.fillRect(-11,-8,22,16);ctx.strokeStyle='#f2cf82';ctx.strokeRect(-11,-8,22,16);}ctx.restore();});
    r.enemies.forEach(e=>{ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*.7,e.r*1.2,e.r*.45,0,0,Math.PI*2);ctx.fill();this.drawEnemy(ctx,e,r);if(e.special){ctx.fillStyle='#341014';ctx.fillRect(e.x-e.r,e.y-e.r-13,e.r*2,4);ctx.fillStyle='#dc535c';ctx.fillRect(e.x-e.r,e.y-e.r-13,e.r*2*Math.max(0,e.hp/e.maxHp),4);}});
    r.projectiles.forEach(p=>{const w=WEAPONS[p.id],frame=w.effectFrames?Math.floor((p.age||0)*(w.effectFps||12))%w.effectFrames:0,angle=Math.atan2(p.vy,p.vx),size=p.id==='blade'?36:p.id==='arrow'?46:p.r*2.4;if(this.drawSkillFrame(ctx,p.id,frame,p.x,p.y,size,size,angle))return;ctx.fillStyle=w.color;ctx.shadowColor=w.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;});
    if(r.weapons.ring){const radius=(72+r.weapons.ring*6)*this.stats().area;ctx.strokeStyle='rgba(107,189,231,.48)';ctx.lineWidth=7;ctx.beginPath();ctx.arc(r.x,r.y,radius,0,Math.PI*2);ctx.stroke();}
    const character=CHARACTERS.find(c=>c.id===r.character)||CHARACTERS[0],hero=this.heroImages&&this.heroImages[character.id];ctx.save();ctx.translate(r.x,r.y);if(r.invuln>0&&Math.floor(r.invuln*14)%2===0)ctx.globalAlpha=.45;if(hero&&hero.ready){const moving=Math.hypot((this.input&&this.input.x)||0,(this.input&&this.input.y)||0)>.08,frame=moving?Math.floor(r.time*character.fps)%character.frames:0,fw=hero.width/character.frames,fh=hero.height,size=64;ctx.scale(r.lastX<0?-1:1,1);ctx.drawImage(hero,frame*fw,0,fw,fh,-size/2,-size*.6,size,size);}else{const face=Math.atan2(r.lastY,r.lastX);ctx.rotate(face+Math.PI/2);ctx.fillStyle='#263e50';ctx.strokeStyle='#c0e0ef';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(12,-3);ctx.lineTo(15,17);ctx.lineTo(0,10);ctx.lineTo(-15,17);ctx.lineTo(-12,-3);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#d5c2a5';ctx.beginPath();ctx.arc(0,-13,5,0,Math.PI*2);ctx.fill();}ctx.restore();
    r.particles.forEach(p=>{ctx.globalAlpha=p.thorns?clamp(p.ttl/.14,0,1):clamp(p.ttl/(p.maxTtl||.5),0,1);if(p.lightning){const pts=p.points;if(!pts||pts.length<2)return;ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.shadowColor='#62caff';ctx.shadowBlur=16;ctx.strokeStyle='rgba(73,174,255,.7)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();ctx.shadowBlur=7;ctx.strokeStyle='#effcff';ctx.lineWidth=2;ctx.stroke();ctx.restore();}else if(p.ring){ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.stroke();}else if(p.thorns){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);const life=1-clamp(p.ttl/(p.maxTtl||.55),0,1),count=12;for(let i=0;i<count;i++){const grow=clamp((life-i/count*.72)*5,0,1);if(!grow)continue;const x=30+i*(p.length-55)/(count-1),side=i%2?1:-1,height=(20+i%3*7)*grow;ctx.fillStyle='rgba(38,16,18,.72)';ctx.beginPath();ctx.ellipse(x,0,17,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#281517';ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.shadowColor='#b93425';ctx.shadowBlur=7;ctx.beginPath();ctx.moveTo(x-10,side*4);ctx.lineTo(x+2,side*-height);ctx.lineTo(x+10,side*3);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#ff9a55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+1,side*-height*.72);ctx.lineTo(x+3,side*-height*.22);ctx.stroke();}ctx.restore();}else{if(p.flash){ctx.shadowColor=p.color;ctx.shadowBlur=18;}ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}});ctx.globalAlpha=1;r.damageText.forEach(t=>{ctx.globalAlpha=clamp(t.ttl/.5,0,1);ctx.fillStyle=t.color;ctx.font='bold 14px serif';ctx.textAlign='center';ctx.fillText(String(t.text),t.x,t.y);});ctx.globalAlpha=1;ctx.restore();
  },
});
