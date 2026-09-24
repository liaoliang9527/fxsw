const CHARACTERS = [
  { id: 'watchman', name: '守夜人', role: '均衡新手', portrait: '/assets/portrait-watchman.jpg', sprite: '/assets/heroes/watchman-walk.png', frames: 4, fps: 7, weapon: 'blade', hp: 130, speed: 190, trait: '每 5 级伤害提升 · 守望斩击', ability: '守望斩击' },
  { id: 'ember', name: '火种', role: '范围爆发', portrait: '/assets/portrait-ember.jpg', sprite: '/assets/heroes/ember-walk.png', frames: 4, fps: 7, weapon: 'flask', hp: 117, speed: 184, trait: '范围 +20% · 烬火新星', ability: '烬火新星' },
  { id: 'gale', name: '疾风', role: '高速走位', portrait: '/assets/portrait-gale.jpg', sprite: '/assets/heroes/gale-walk.png', frames: 4, fps: 10, weapon: 'arrow', hp: 115, speed: 218, trait: '移速 +15% · 疾风突进', ability: '疾风突进' },
];

const WEAPONS = {
  blade: { name: '回旋刃', icon: '/assets/weapon-blade.png', effect: '/assets/skills/blade-skill.png', effectFrames: 6, effectFps: 14, damage: 18, cooldown: 1.2, color: '#79c9f4', passive: 'power', tag: '暴击飞刃' },
  flask: { name: '火焰瓶', icon: '/assets/weapon-flask.png', effect: '/assets/skills/flask-skill.png', effectFrames: 18, effectFps: 12, damage: 9, cooldown: 2.5, color: '#ef8847', passive: 'area', tag: '瘟疫扩散' },
  arrow: { name: '穿风箭', icon: '/assets/weapon-arrow.png', effect: '/assets/skills/arrow-skill.png', effectFrames: 6, effectFps: 14, damage: 24, cooldown: 1.05, color: '#a8e7fb', passive: 'speed', tag: '暴击飞刃' },
  lightning: { name: '雷击', icon: '/assets/weapon-lightning.png', effect: '/assets/skills/lightning-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 16, damage: 36, cooldown: 2.0, color: '#8fbaff', passive: 'cooldown', tag: '暴击飞刃' },
  ring: { name: '守护环', icon: '/assets/weapon-ring.png', effect: '/assets/skills/ring-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 12, damage: 8, cooldown: .36, color: '#79aee9', passive: 'area', tag: '反伤生存' },
  frost: { name: '寒霜脉冲', icon: '/assets/weapon-frost.png', effect: '/assets/skills/frost-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 14, damage: 27, cooldown: 3.3, color: '#a1ebf6', passive: 'duration', tag: '冰霜控制' },
  beam: { name: '地狱荆棘', icon: '/assets/weapon-beam.png', effect: '/assets/skills/beam-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 12, damage: 40, cooldown: 2.7, color: '#e05a3d', passive: 'power', tag: '反伤生存' },
  raven: { name: '暗影鸦', icon: '/assets/weapon-raven.png', effect: '/assets/skills/raven-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 10, damage: 22, cooldown: 1.45, color: '#a38aeb', passive: 'pickup', tag: '召唤阵地' },
  totem: { name: '守卫图腾', icon: '/assets/weapon-ring.png', effect: '/assets/skills/totem-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 8, damage: 12, cooldown: 4.5, color: '#8fc9a8', passive: 'cooldown', tag: '召唤阵地' }, // TODO: 换守卫图腾专用图标
  tome: { name: '灵魂飞书', icon: '/assets/weapon-raven.png', effect: '/assets/skills/tome-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 10, damage: 14, cooldown: 3, color: '#c9b46a', passive: 'area', tag: '召唤阵地' }, // TODO: 换灵魂飞书专用图标
  plague: { name: '瘟疫瓶', icon: '/assets/weapon-flask.png', effect: '/assets/skills/plague-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 12, damage: 14, cooldown: 2.8, color: '#7ed957', passive: 'duration', tag: '瘟疫扩散' }, // TODO: 换瘟疫瓶专用图标
  gravity: { name: '重力井', icon: '/assets/weapon-frost.png', effect: '/assets/skills/gravity-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 12, damage: 30, cooldown: 5, color: '#a78bfa', passive: 'power', tag: '瘟疫扩散' }, // TODO: 换重力井专用图标
  spike: { name: '寒冰尖刺', icon: '/assets/weapon-arrow.png', effect: '/assets/skills/spike-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 14, damage: 26, cooldown: 1.6, color: '#8ad8ff', passive: 'duration', tag: '冰霜控制' }, // TODO: 换寒冰尖刺专用图标
  shield: { name: '圣盾脉冲', icon: '/assets/weapon-beam.png', effect: '/assets/skills/shield-skill.png', effectFrames: 6, effectColumns: 6, effectFps: 10, damage: 35, cooldown: 9, color: '#ffd66b', passive: 'cooldown', tag: '反伤生存' }, // TODO: 换圣盾脉冲专用图标
};

const PASSIVES = {
  power: { name: '力量核心', icon: '/assets/passive-power.png', text: '所有伤害 +10%', tag: '爆发通用' },
  area: { name: '扩容药剂', icon: '/assets/passive-area.png', text: '攻击范围 +10%', tag: '瘟疫扩散' },
  speed: { name: '迅捷羽毛', icon: '/assets/passive-speed.png', text: '移动速度 +6%', tag: '暴击飞刃' },
  cooldown: { name: '冷却齿轮', icon: '/assets/passive-cooldown.png', text: '攻击冷却 -6%', tag: '召唤阵地' },
  duration: { name: '持续沙漏', icon: '/assets/passive-duration.png', text: '持续时间 +12%', tag: '冰霜控制' },
  pickup: { name: '拾取磁石', icon: '/assets/passive-pickup.png', text: '拾取范围 +25%', tag: '幸运成长' },
  crit: { name: '会心烙印', icon: '/assets/passive-power.png', text: '暴击几率 +6% · 暴击伤害 250%', tag: '暴击飞刃' }, // TODO: 换会心烙印专用图标
  steal: { name: '汲血獠牙', icon: '/assets/passive-pickup.png', text: '击杀敌人时回复生命', tag: '反伤生存' }, // TODO: 换汲血獠牙专用图标
  thorn: { name: '荆棘甲壳', icon: '/assets/passive-area.png', text: '受到伤害时反弹伤害', tag: '反伤生存' }, // TODO: 换荆棘甲壳专用图标
  phoenix: { name: '不死鸟羽', icon: '/assets/passive-speed.png', text: '每局一次免死并浴火重生', tag: '反伤生存' }, // TODO: 换不死鸟羽专用图标
  luck: { name: '幸运蹄铁', icon: '/assets/pickup-coin.png', text: '提升掉落几率与卡牌质量', tag: '幸运成长' }, // TODO: 换幸运蹄铁专用图标
};

const AFFIXES = {
  swift: { name: '迅捷', tier: 1, text: '【迅捷】敌人移动速度大幅提升', color: '#797cff' },
  corpse: { name: '尸爆', tier: 1, text: '【尸爆】敌人死亡后会原地爆炸', color: '#ff8a45' },
  healer: { name: '治疗', tier: 1, text: '【治疗】会持续恢复附近敌人生命', color: '#62d78a' },
  shield: { name: '护盾', tier: 2, text: '【护盾】护盾存在时免疫减速', color: '#66b9ff' },
  split: { name: '分裂', tier: 2, text: '【分裂】敌人死亡后会裂成两只', color: '#8bea72' },
  teleport: { name: '瞬移', tier: 2, text: '【瞬移】远距离时会向你闪现', color: '#bd72ff' },
};

const ENEMIES = {
  chaser: { hp: 30, speed: 54, damage: 10, r: 13, xp: 3, color: '#725565', sprite: '/assets/monsters/chaser-walk.png', frames: 4, fps: 7, from: 0 },
  runner: { hp: 19, speed: 104, damage: 9, r: 10, xp: 3, color: '#aa5353', sprite: '/assets/monsters/runner-walk.png', frames: 4, fps: 11, from: 180 },
  thrower: { hp: 38, speed: 45, damage: 11, r: 14, xp: 5, color: '#716aa0', sprite: '/assets/monsters/thrower-walk.png', frames: 4, fps: 6, from: 240, shot: 'ember', shotRange: 520, shotSpeed: 220, shotCooldown: 2.7 },
  guard: { hp: 100, speed: 34, damage: 15, r: 19, xp: 8, color: '#8b8375', sprite: '/assets/monsters/guard-walk.png', frames: 4, fps: 5, from: 360 },
  bomber: { hp: 28, speed: 73, damage: 20, r: 12, xp: 5, color: '#b9604e', sprite: '/assets/monsters/bomber-walk.png', frames: 4, fps: 6, from: 480 },
  summoner: { hp: 80, speed: 34, damage: 10, r: 17, xp: 9, color: '#7768a1', sprite: '/assets/monsters/summoner-walk.png', frames: 4, fps: 5, from: 660, shot: 'void', shotRange: 560, shotSpeed: 175, shotCooldown: 3.4 },
};

const BOSSES = {
  gravewarden: { name: '铁墓守卫', baseType: 'guard', hp: 2500, speed: 28, damage: 24, r: 44, xp: 60, color: '#b7473f', sprite: '/assets/bosses/gravewarden-walk.png', frames: 4, fps: 4, attackEffect: '/assets/boss-effects/grave-slam.png', effectFrames: 6 },
  abysswatcher: { name: '深渊监视者', baseType: 'summoner', hp: 5200, speed: 25, damage: 22, r: 48, xp: 120, color: '#9d4fc7', sprite: '/assets/bosses/abysswatcher-walk.png', frames: 4, fps: 5, attackEffect: '/assets/boss-effects/abyss-rift.png', effectFrames: 6 },
};

module.exports = { CHARACTERS, WEAPONS, PASSIVES, AFFIXES, ENEMIES, BOSSES, RUN_SECONDS: 900, WORLD: { width: 2400, height: 1600 } };
