// Pedestrians: Solmar Bay locals who stroll the sidewalks, cross at corners, scatter
// when a gun goes off or a car bears down on them, and (rarely) get angry when shoved.

import { CITY } from './config.js';
import { clampToCity, resolveBuildingCollision } from './city.js';
import { chance, pick, range, rangeInt } from './random.js';

const SHIRTS = ['#e84c3d', '#3f8fd2', '#e8b23a', '#7fb3a8', '#d97b9b', '#8fa8c8', '#a98bc4', '#6fae7d', '#f2f2f2', '#5c6b7a'];

export function spawnPedestrians(random, city, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const onVertical = chance(random, 0.5);
    const x = onVertical
      ? city.xs[rangeInt(random, 0, city.xs.length - 1)] + (chance(random, 0.5) ? 1 : -1) * (CITY.road / 2 + 10)
      : range(random, 100, CITY.width - 100);
    const y = onVertical
      ? range(random, 100, CITY.height - 300)
      : city.ys[rangeInt(random, 0, city.ys.length - 1)] + (chance(random, 0.5) ? 1 : -1) * (CITY.road / 2 + 10);
    peds.push({
      id: i,
      x, y,
      angle: pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      speed: range(random, 35, 70),
      shirt: pick(random, SHIRTS),
      walkPhase: range(random, 0, Math.PI * 2),
      scared: 0,
      down: false,
      downTimer: 0,
      targetX: x,
      targetY: y,
      retarget: range(random, 0, 4),
    });
  }
  return peds;
}

export function scarePeds(peds, x, y, radius) {
  for (const p of peds) {
    if (p.down) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < radius) {
      p.scared = 2.5;
      p.angle = Math.atan2(p.y - y, p.x - x);
    }
  }
}

export function updatePedestrians(state, dt, random) {
  for (const p of state.peds) {
    if (p.down) {
      p.downTimer -= dt;
      if (p.downTimer <= 0) p.down = false;
      continue;
    }
    p.walkPhase += dt * (p.scared > 0 ? 14 : 7);
    if (p.scared > 0) p.scared -= dt;
    p.retarget -= dt;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    if (p.retarget <= 0 || Math.hypot(dx, dy) < 12) {
      // Pick a new stroll target along the same sidewalk line.
      const vertical = Math.abs(dx) < Math.abs(dy) || chance(random, 0.5);
      if (vertical) {
        p.targetX = p.x;
        p.targetY = p.y + (chance(random, 0.5) ? 1 : -1) * range(random, 120, 420);
      } else {
        p.targetX = p.x + (chance(random, 0.5) ? 1 : -1) * range(random, 120, 420);
        p.targetY = p.y;
      }
      p.retarget = range(random, 3, 7);
    }
    const speed = p.scared > 0 ? p.speed * 2.6 : p.speed;
    p.angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
    p.x += Math.cos(p.angle) * speed * dt;
    p.y += Math.sin(p.angle) * speed * dt;
    clampToCity(p, 24);
    p.r = 10;
    resolveBuildingCollision(state.city, p);
  }
}
