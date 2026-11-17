// The wanted level and the Solmar Bay police. Crimes raise stars; stars bring
// Interceptors that chase, ram and try to bust the player. Lay low — no crimes, no
// cops close by — and the heat cools off one star at a time. On foot, a cop who
// catches a slow player busts them: money lost, heat gone, wake up at the clinic.

import { CAR_MODELS, WANTED } from './config.js';
import { makeCar } from './cars.js';
import { clampToCity } from './city.js';

export function addWanted(state, stars, reason) {
  if (state.wanted >= WANTED.max) return;
  state.wanted = Math.min(WANTED.max, state.wanted + stars);
  state.wantedTimer = 0;
  state.lastCrime = state.elapsed;
  if (reason) state.events.push({ type: 'wanted', stars: state.wanted, reason });
}

function spawnPolice(state, random) {
  const p = state.player;
  const angle = random() * Math.PI * 2;
  const dist = 700;
  const x = p.x + Math.cos(angle) * dist;
  const y = p.y + Math.sin(angle) * dist;
  const car = makeCar('interceptor', x, y, Math.atan2(p.y - y, p.x - x), { police: true });
  car.speed = 200;
  state.cars.push(car);
  return car;
}

function policeDrive(state, car, dt) {
  const p = state.player;
  const model = CAR_MODELS[car.model];
  const targetAngle = Math.atan2(p.y - car.y, p.x - car.x);
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const dist = Math.hypot(p.x - car.x, p.y - car.y);
  // Ease off the gas when very close, so the ram lands instead of overshooting.
  const wantSpeed = dist < 90 ? model.topSpeed * 0.55 : model.topSpeed;
  car.speed += (wantSpeed - car.speed) * Math.min(1, dt * 0.8);
  car.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff * 2.2 * dt * 3));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  clampToCity(car, 30);
}

export function updatePolice(state, dt, random) {
  const p = state.player;
  const cops = state.cars.filter((c) => c.police && !c.dead);
  // Wanted level decides how many Interceptors are on the street.
  const wantCount = state.wanted === 0 ? 0 : Math.min(WANTED.maxPolice, 1 + state.wanted);
  while (cops.length < wantCount && state.cars.length < 60) {
    cops.push(spawnPolice(state, random));
  }
  // Cops with nothing to chase drive off and despawn.
  for (const car of cops) {
    if (state.wanted === 0) {
      car.speed = Math.max(0, car.speed - 200 * dt);
      const d = Math.hypot(p.x - car.x, p.y - car.y);
      if (d > 900 || car.speed === 0) car.dead = true;
      continue;
    }
    policeDrive(state, car, dt);
    if (car.ramCooldown > 0) car.ramCooldown -= dt;
    const d = Math.hypot(p.x - car.x, p.y - car.y);
    if (!p.inCar && d < WANTED.bustRange) {
      // Busted — but only if the player is cornered (not sprinting away).
      state.events.push({ type: 'busted' });
    } else if (p.inCar && d < 46) {
      // Ram: a hard hit damages the player's car and slows it. One hit per
      // cop per second, and the cop bounces off afterwards, so it has to
      // re-approach instead of grinding the player's car down in place.
      const target = p.inCar;
      target.speed *= 1 - 0.9 * dt;
      car.speed *= 0.6;
      if (car.ramCooldown <= 0) {
        car.ramCooldown = 1.0;
        car.speed *= 0.35;
        target.hp -= 6;
        state.events.push({ type: 'ram', x: car.x, y: car.y });
        if (target.hp <= 0) {
          state.events.push({ type: 'carDestroyed', car: target });
        }
      }
    }
  }
  // Heat decay: no crime for a while and no cop nearby.
  if (state.wanted > 0) {
    const nearCop = cops.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < 420);
    if (state.elapsed - state.lastCrime > WANTED.decayDelay && !nearCop) {
      state.wantedTimer += dt;
      if (state.wantedTimer >= WANTED.decayInterval) {
        state.wanted -= 1;
        state.wantedTimer = 0;
        state.events.push({ type: 'wanted', stars: state.wanted, reason: 'cooling off' });
      }
    } else {
      state.wantedTimer = 0;
    }
  }
  // Busted on foot is handled by the event above; game.js resolves it once.
}
