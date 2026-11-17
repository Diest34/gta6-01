// The player on foot: Rook, a driver-for-hire in Solmar Bay. WASD moves (Shift runs),
// E slips into the nearest car, and the player takes damage from crashes, bullets and
// punches. When driving, the player rides inside the car instead.

import { PLAYER } from './config.js';
import { clampToCity, resolveBuildingCollision } from './city.js';
import { carRadius } from './cars.js';

export function createPlayer(x, y) {
  return {
    x, y,
    r: PLAYER.radius,
    angle: 0,
    health: PLAYER.health,
    maxHealth: PLAYER.health,
    inCar: null, // the car object when driving, else null
    punchCooldown: 0,
    shootCooldown: 0,
    hurtFlash: 0,
    moving: false,
  };
}

export function updatePlayerOnFoot(state, input, dt) {
  const p = state.player;
  if (p.inCar) return;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  if (len > 0) {
    mx /= len;
    my /= len;
    const speed = PLAYER.walkSpeed;
    p.x += mx * speed * dt;
    p.y += my * speed * dt;
    p.angle = Math.atan2(my, mx);
  }
  clampToCity(p, 20);
  resolveBuildingCollision(state.city, p);
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (p.hurtFlash > 0) p.hurtFlash -= dt;
}

// The nearest car the player could slip into (parked, traffic or police), within range.
export function nearestEnterableCar(state, maxDist) {
  const p = state.player;
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.dead) continue;
    if (car.traffic && Math.abs(car.speed) > 40) continue; // can't board a moving car
    const d = Math.hypot(car.x - p.x, car.y - p.y) - carRadius(car);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(state, car) {
  const p = state.player;
  p.inCar = car;
  car.parked = false;
  car.traffic = false;
  p.x = car.x;
  p.y = car.y;
}

export function exitCar(state) {
  const p = state.player;
  const car = p.inCar;
  if (!car) return;
  p.inCar = null;
  // Step out to the side of the car.
  const side = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 30;
  p.y = car.y + Math.sin(side) * 30;
  clampToCity(p, 20);
  resolveBuildingCollision(state.city, p);
  car.speed *= 0.4;
}

export function hurtPlayer(state, amount, fromX, fromY) {
  const p = state.player;
  if (p.health <= 0) return;
  p.health -= amount;
  p.hurtFlash = 0.25;
  if (fromX !== undefined) {
    // Knock the player away from the hit.
    const d = Math.hypot(p.x - fromX, p.y - fromY) || 1;
    p.x += ((p.x - fromX) / d) * 8;
    p.y += ((p.y - fromY) / d) * 8;
  }
  if (p.health <= 0) {
    p.health = 0;
    state.events.push({ type: 'wasted' });
  }
}
