// Combat: fists and a pistol. Left click (or K) fires at the mouse; F throws a
// punch in front of the player. Rival crew members carry pistols too and drop cash
// when they go down. Bullets are plain fast circles with a short life.

import { COMBAT, PLAYER } from './config.js';
import { hurtPlayer } from './player.js';
import { carRadius } from './cars.js';
import { scarePeds } from './pedestrians.js';

export function createEnemy(x, y, opts) {
  const o = opts || {};
  return {
    x, y,
    r: 13,
    angle: 0,
    health: o.health || COMBAT.enemyHealth,
    speed: o.speed || 120,
    shootCooldown: 1 + Math.random() * 0.5,
    dead: false,
    kind: o.kind || 'rival',
    cash: o.cash || 40,
  };
}

export function fireBullet(state, x, y, angle, fromPlayer) {
  state.bullets.push({
    x, y,
    vx: Math.cos(angle) * COMBAT.bulletSpeed,
    vy: Math.sin(angle) * COMBAT.bulletSpeed,
    life: COMBAT.pistolRange / COMBAT.bulletSpeed,
    fromPlayer,
  });
}

export function meleeAttack(state) {
  const p = state.player;
  if (p.inCar || p.punchCooldown > 0) return;
  p.punchCooldown = PLAYER.punchCooldown;
  state.events.push({ type: 'punch', x: p.x + Math.cos(p.angle) * 26, y: p.y + Math.sin(p.angle) * 26 });
  // Rivals in front of the fist take the hit.
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > PLAYER.punchRange + e.r) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    let diff = a - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < PLAYER.punchArc) damageEnemy(state, e, PLAYER.punchDamage);
  }
}

export function shootPlayer(state, aimAngle) {
  const p = state.player;
  if (p.inCar || p.shootCooldown > 0) return;
  if (state.ammo <= 0) {
    state.events.push({ type: 'dryFire' });
    return;
  }
  p.shootCooldown = COMBAT.pistolCooldown;
  state.ammo -= 1;
  fireBullet(state, p.x + Math.cos(aimAngle) * 20, p.y + Math.sin(aimAngle) * 20, aimAngle, true);
  scarePeds(state.peds, p.x, p.y, 420);
  state.events.push({ type: 'gunshot', x: p.x, y: p.y });
}

export function damageEnemy(state, enemy, amount) {
  enemy.health -= amount;
  enemy.flash = 0.12;
  if (enemy.health <= 0 && !enemy.dead) {
    enemy.dead = true;
    state.money += enemy.cash;
    state.events.push({ type: 'enemyDown', x: enemy.x, y: enemy.y, cash: enemy.cash });
  }
}

function hitBuildings(state, bullet) {
  for (const b of state.city.buildings) {
    if (bullet.x > b.x && bullet.x < b.x + b.w && bullet.y > b.y && bullet.y < b.y + b.h) return true;
  }
  return false;
}

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    if (b.life <= 0) continue;
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (hitBuildings(state, b)) {
      b.life = 0;
      state.events.push({ type: 'spark', x: b.x, y: b.y });
      continue;
    }
    if (b.fromPlayer) {
      for (const e of state.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 4) {
          damageEnemy(state, e, COMBAT.pistolDamage);
          b.life = 0;
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const car of state.cars) {
        if (car.dead || car === state.player.inCar) continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < carRadius(car)) {
          car.hp -= COMBAT.pistolDamage;
          car.flash = 0.1;
          b.life = 0;
          break;
        }
      }
    } else {
      const p = state.player;
      if (!p.inCar && Math.hypot(p.x - b.x, p.y - b.y) < p.r + 4) {
        hurtPlayer(state, COMBAT.pistolDamage * 0.5, b.x - b.vx * 0.02, b.y - b.vy * 0.02);
        b.life = 0;
      } else if (p.inCar && Math.hypot(p.inCar.x - b.x, p.inCar.y - b.y) < carRadius(p.inCar)) {
        p.inCar.hp -= COMBAT.pistolDamage * 0.5;
        b.life = 0;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

export function updateEnemies(state, dt) {
  const p = state.player;
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    const d = Math.hypot(px - e.x, py - e.y);
    e.angle = Math.atan2(py - e.y, px - e.x);
    if (d > 60) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    }
    e.shootCooldown -= dt;
    if (e.shootCooldown <= 0 && d < COMBAT.enemyShootRange) {
      e.shootCooldown = COMBAT.enemyShootCooldown;
      fireBullet(state, e.x, e.y, e.angle + (Math.random() - 0.5) * 0.18, false);
      state.events.push({ type: 'gunshot', x: e.x, y: e.y });
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead || e.health > -200);
}
