// Cars: the player's ride, parked cars to steal, and NPC traffic. Player cars use
// arcade physics (accelerate, steer, drift a little); traffic cars follow the road
// grid from intersection to intersection on the right-hand lane.

import { CAR_MODELS, CITY } from './config.js';
import { clampToCity, randomIntersection, resolveBuildingCollision } from './city.js';
import { chance, pick, range, rangeInt } from './random.js';

let nextCarId = 1;

export function makeCar(modelKey, x, y, angle, opts) {
  const model = CAR_MODELS[modelKey];
  const o = opts || {};
  return {
    id: nextCarId,
    model: modelKey,
    name: model.name,
    color: o.color || model.color,
    x, y, angle,
    speed: 0,
    hp: model.hp,
    maxHp: model.hp,
    traffic: !!o.traffic,
    parked: !!o.parked,
    police: !!o.police,
    mission: o.mission || null, // 'courier' | 'armored' | null
    // Traffic state: current waypoint intersection and lane offset.
    tx: o.tx ?? x,
    ty: o.ty ?? y,
    turnCooldown: 0,
    honkCooldown: 0,
    ramCooldown: 0,
    crashCooldown: 0,
    ramHits: 0,
    dead: false,
    flash: 0,
  };
}

export function spawnParkedCars(random, city) {
  const cars = [];
  const models = ['comet', 'gull', 'mule', 'cab'];
  const colors = ['#d95f4b', '#3f8fd2', '#e8b23a', '#7fb3a8', '#d97b9b', '#8fa8c8', '#a98bc4', '#6fae7d', '#c9c2b8'];
  for (let i = 0; i < 22; i += 1) {
    const vertical = chance(random, 0.5);
    const road = vertical
      ? { x: city.xs[rangeInt(random, 0, city.xs.length - 1)], y: range(random, 120, CITY.height - 260) }
      : { x: range(random, 120, CITY.width - 120), y: city.ys[rangeInt(random, 0, city.ys.length - 1)] };
    const off = (chance(random, 0.5) ? 1 : -1) * (CITY.road / 2 - 16);
    const x = vertical ? road.x + off : road.x;
    const y = vertical ? road.y : road.y + off;
    const angle = vertical ? (off > 0 ? Math.PI / 2 : -Math.PI / 2) : (off > 0 ? 0 : Math.PI);
    cars.push(makeCar(pick(random, models), x, y, angle, { parked: true, color: pick(random, colors) }));
  }
  return cars;
}

export function spawnTraffic(random, city, count) {
  const cars = [];
  const models = ['comet', 'gull', 'mule', 'cab'];
  for (let i = 0; i < count; i += 1) {
    const p = randomIntersection(random, city.xs, city.ys);
    const car = makeCar(pick(random, models), p.x, p.y, pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), { traffic: true });
    const target = randomIntersection(random, city.xs, city.ys);
    car.tx = target.x;
    car.ty = target.y;
    car.speed = range(random, 120, 180);
    cars.push(car);
  }
  return cars;
}

// --- Player driving ---

function driveStep(car, input, dt) {
  const model = CAR_MODELS[car.model];
  const forward = input.up ? 1 : input.down ? -0.6 : 0;
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  if (forward !== 0) {
    car.speed += forward * model.accel * dt;
    if (car.speed > model.topSpeed) car.speed = model.topSpeed;
    if (car.speed < -model.reverse) car.speed = -model.reverse;
  } else {
    // Coast down.
    const drag = 260 * dt;
    if (Math.abs(car.speed) <= drag) car.speed = 0;
    else car.speed -= Math.sign(car.speed) * drag;
  }
  const turn = steer * model.grip * dt * Math.min(1, Math.abs(car.speed) / 120) * dir;
  car.angle += turn;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// --- Traffic AI: drive along roads toward a waypoint intersection. ---

function trafficStep(car, random, city, dt) {
  const speed = 150;
  const lane = 15; // right-hand lane offset
  const dx = car.tx - car.x;
  const dy = car.ty - car.y;
  const arrived = Math.abs(dx) < 6 && Math.abs(dy) < 6;
  if (arrived) {
    const t = randomIntersection(random, city.xs, city.ys);
    car.tx = t.x;
    car.ty = t.y;
    return;
  }
  // Move along the axis that is furthest off, snapped to its lane.
  let targetAngle;
  if (Math.abs(dx) > 6) {
    targetAngle = dx > 0 ? 0 : Math.PI;
    const laneY = car.ty + (dx > 0 ? lane : -lane);
    car.y += (laneY - car.y) * Math.min(1, dt * 4);
  } else {
    targetAngle = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
    const laneX = car.tx + (dy > 0 ? -lane : lane);
    car.x += (laneX - car.x) * Math.min(1, dt * 4);
  }
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  car.speed = speed;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
}

// --- Shared ---

export function carRadius(car) {
  const model = CAR_MODELS[car.model];
  return Math.max(model.length, model.width) * 0.55;
}

// Circle-vs-circle between two cars; returns the impact speed for crash sounds.
export function collideCars(a, b) {
  const ra = carRadius(a);
  const rb = carRadius(b);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = ra + rb - 6;
  if (d >= min || d === 0) return 0;
  const impact = Math.abs(a.speed - b.speed);
  const nx = dx / d;
  const ny = dy / d;
  const push = (min - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const avg = (a.speed + b.speed) / 2;
  a.speed = avg * 0.7;
  b.speed = avg * 0.7;
  return impact;
}

export function updateCars(state, dt, random) {
  for (const car of state.cars) {
    if (car.dead) continue;
    if (car.traffic) {
      trafficStep(car, random, state.city, dt);
    }
    clampToCity(car, 30);
    car.r = carRadius(car);
    resolveBuildingCollision(state.city, car);
    if (car.flash > 0) car.flash -= dt;
    if (car.crashCooldown > 0) car.crashCooldown -= dt;
  }
  // Car-car collisions.
  for (let i = 0; i < state.cars.length; i += 1) {
    const a = state.cars[i];
    if (a.dead) continue;
    for (let j = i + 1; j < state.cars.length; j += 1) {
      const b = state.cars[j];
      if (b.dead) continue;
      const impact = collideCars(a, b);
      if (impact > 200) {
        // One hit per crash, not one per frame: two cars grinding together
        // would otherwise drain each other's health in a single second.
        // Police cars never take or deal crash damage here — their ramming is
        // the police module's job, with its own cooldown and bounce-off.
        if (!a.police && !b.police && a.crashCooldown <= 0 && b.crashCooldown <= 0) {
          a.hp -= impact * 0.008;
          b.hp -= impact * 0.008;
          a.crashCooldown = 0.5;
          b.crashCooldown = 0.5;
        }
        state.events.push({ type: 'crash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, strength: impact });
      }
    }
  }
  for (const car of state.cars) {
    if (car.hp <= 0 && !car.dead) {
      car.dead = true;
      state.events.push({ type: 'carDestroyed', car });
    }
  }
}

export { driveStep };
