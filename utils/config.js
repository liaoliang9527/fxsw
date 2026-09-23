const CHARACTERS = [
  { id: 'watchman', name: '守夜人', role: '均衡新手', portrait: '/assets/portrait-watchman.jpg', sprite: '/assets/heroes/watchman-walk.png', frames: 4, fps: 7, weapon: 'blade', hp: 130, speed: 190, trait: '每 5 级伤害提升' },
  { id: 'ember', name: '火种', role: '范围爆发', portrait: '/assets/portrait-ember.jpg', sprite: '/assets/heroes/ember-walk.png', frames: 4, fps: 7, weapon: 'flask', hp: 117, speed: 184, trait: '范围 +20% · 生命 -10%' },
  { id: 'gale', name: '疾风', role: '高速走位', portrait: '/assets/portrait-gale.jpg', sprite: '/assets/heroes/gale-walk.png', frames: 4, fps: 10, weapon: 'arrow', hp: 115, speed: 218, trait: '移速 +15% · 冷却 -5%' },
];

const WEAPONS = {
  blade: { name: '回旋刃', icon: '/assets/weapon-blade.png', effect: '/assets/skills/blade-skill.png', effectFrames: 6, effectFps: 14, damage: 18, cooldown: 1.2, color: '#79c9f4', passive: 'power' },
  flask: { name: '火焰瓶', icon: '/assets/weapon-flask.png', effect: '/assets/skills/flask-skill.png', effectFrames: 18, effectFps: 12, damage: 9, cooldown: 2.5, color: '#ef8847', passive: 'area' },
  arrow: { name: '穿风箭', icon: '/assets/weapon-arrow.png', effect: '/assets/skills/arrow-skill.png', effectFrames: 6, effectFps: 14, damage: 24, cooldown: 1.05, color: '#a8e7fb', passive: 'speed' },
  lightning: { name: '雷击', icon: '/assets/weapon-lightning.png', damage: 36, cooldown: 2.0, color: '#8fbaff', passive: 'cooldown' },
  ring: { name: '守护环', icon: '/assets/weapon-ring.png', damage: 8, cooldown: .36, color: '#79aee9', passive: 'area' },
  frost: { name: '寒霜脉冲', icon: '/assets/weapon-frost.png', damage: 27, cooldown: 3.3, color: '#a1ebf6', passive: 'duration' },
  beam: { name: '地狱荆棘', icon: '/assets/weapon-beam.png', damage: 40, cooldown: 2.7, color: '#e05a3d', passive: 'power' },
  raven: { name: '暗影鸦', icon: '/assets/weapon-raven.png', damage: 22, cooldown: 1.45, color: '#a38aeb', passive: 'pickup' },
};

const PASSIVES = {
  power: { name: '力量核心', icon: '/assets/passive-power.png', text: '所有伤害 +10%' },
  area: { name: '扩容药剂', icon: '/assets/passive-area.png', text: '攻击范围 +10%' },
  speed: { name: '迅捷羽毛', icon: '/assets/passive-speed.png', text: '移动速度 +6%' },
  cooldown: { name: '冷却齿轮', icon: '/assets/passive-cooldown.png', text: '攻击冷却 -6%' },
  duration: { name: '持续沙漏', icon: '/assets/passive-duration.png', text: '持续时间 +12%' },
  pickup: { name: '拾取磁石', icon: '/assets/passive-pickup.png', text: '拾取范围 +25%' },
};

const ENEMIES = {
  chaser: { hp: 30, speed: 54, damage: 10, r: 13, xp: 3, color: '#725565', sprite: '/assets/monsters/chaser-walk.png', frames: 4, fps: 7, from: 0 },
  runner: { hp: 19, speed: 104, damage: 9, r: 10, xp: 3, color: '#aa5353', sprite: '/assets/monsters/runner-walk.png', frames: 4, fps: 11, from: 180 },
  thrower: { hp: 38, speed: 45, damage: 11, r: 14, xp: 5, color: '#716aa0', sprite: '/assets/monsters/thrower-walk.png', frames: 4, fps: 6, from: 240 },
  guard: { hp: 100, speed: 34, damage: 15, r: 19, xp: 8, color: '#8b8375', sprite: '/assets/monsters/guard-walk.png', frames: 4, fps: 5, from: 360 },
  bomber: { hp: 28, speed: 73, damage: 20, r: 12, xp: 5, color: '#b9604e', sprite: '/assets/monsters/bomber-walk.png', frames: 4, fps: 6, from: 480 },
  summoner: { hp: 80, speed: 34, damage: 10, r: 17, xp: 9, color: '#7768a1', sprite: '/assets/monsters/summoner-walk.png', frames: 4, fps: 5, from: 660 },
};

const BOSSES = {
  gravewarden: { name: '铁墓守卫', baseType: 'guard', hp: 2500, speed: 28, damage: 24, r: 44, xp: 60, color: '#b7473f', sprite: '/assets/bosses/gravewarden-walk.png', frames: 4, fps: 4, attackEffect: '/assets/boss-effects/grave-slam.png', effectFrames: 6 },
  abysswatcher: { name: '深渊监视者', baseType: 'summoner', hp: 5200, speed: 25, damage: 22, r: 48, xp: 120, color: '#9d4fc7', sprite: '/assets/bosses/abysswatcher-walk.png', frames: 4, fps: 5, attackEffect: '/assets/boss-effects/abyss-rift.png', effectFrames: 6 },
};

module.exports = { CHARACTERS, WEAPONS, PASSIVES, ENEMIES, BOSSES, RUN_SECONDS: 900, WORLD: { width: 2400, height: 1600 } };
