// The game state and the one step that advances it: read input, drive or walk the
// player, run traffic, pedestrians, police, combat and missions, then resolve the
// events they raised (crashes, busts, mission payouts). Nothing here draws or
// listens to the browser — main.js owns that.

import { CITY, CLOCK, COMBAT, PALETTE, STEP } from './config.js';
import { createRandom } from './random.js';
import { buildCity, districtAt } from './city.js';
import { makeCar, spawnParkedCars, spawnTraffic, updateCars, driveStep, collideCars, carRadius } from './cars.js';
import { spawnPedestrians, updatePedestrians, scarePeds } from './pedestrians.js';
import { createPlayer, updatePlayerOnFoot, nearestEnterableCar, enterCar, exitCar, hurtPlayer } from './player.js';
import { updatePolice, addWanted } from './police.js';
import { meleeAttack, shootPlayer, updateBullets, updateEnemies } from './combat.js';
import { startMission, updateMissions, missionMarker } from './missions.js';
import { TRAFFIC_COUNT, PED_COUNT } from './config.js';

export function createGame(seed) {
  const random = createRandom(seed);
  const city = buildCity(random);
  const lm = city.landmarks;
  const player = createPlayer(lm.hideout.x + 60, lm.hideout.y + 40);
  const state = {
    seed,
    random,
    city,
    player,
    cars: [],
    peds: [],
    enemies: [],
    bullets: [],
    particles: [],
    events: [],
    money: 50,
    ammo: COMBAT.startAmmo,
    wanted: 0,
    wantedTimer: 0,
    lastCrime: -999,
    elapsed: 0,
    clockMinutes: CLOCK.startMinutes,
    missionIndex: 0,
    missionStep: 0,
    missionTimer: 0,
    missionStepTimerSet: null,
    missionTarget: null,
    caseDrop: null,
    missionFailed: false,
    fare: null,
    storyDone: false,
    completedMissions: 0,
    camera: { x: player.x, y: player.y },
    toast: null, // { text, sub, until }
    busted: false,
    wasted: false,
    stats: { carsStolen: 0, pedsHit: 0, shotsFired: 0 },
  };
  state.cars = spawnParkedCars(random, city).concat(spawnTraffic(random, city, TRAFFIC_COUNT));
  // A Comet parked right by the hideout, so mission 1 starts smoothly.
  state.cars.push(makeCar('comet', lm.hideout.x + 40, lm.hideout.y + 120, 0, { parked: true, color: '#d95f4b' }));
  state.peds = spawnPedestrians(random, city, PED_COUNT);
  startMission(state, 0);
  state.events.length = 0; // the mission-start toast is shown by main.js instead
  return state;
}

function spawnParticles(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3 });
  }
}

function playerScreenPos(state, view) {
  return { x: state.player.x - state.camera.x + view.width / 2, y: state.player.y - state.camera.y + view.height / 2 };
}

export function stepGame(state, input, actions, dt, view, audio) {
  const p = state.player;
  state.elapsed += dt;
  state.clockMinutes = (CLOCK.startMinutes + Math.floor(state.elapsed * CLOCK.minutesPerSecond)) % (24 * 60);

  // --- One-shot actions ---
  if (actions.enter) {
    if (p.inCar) {
      exitCar(state);
    } else {
      const car = nearestEnterableCar(state, 64);
      if (car) {
        const wasParked = car.parked;
        const wasPolice = car.police;
        enterCar(state, car);
        state.stats.carsStolen += 1;
        if (!wasParked || wasPolice) addWanted(state, 1, 'grand theft auto');
        if (wasPolice) addWanted(state, 1, 'stealing a police car');
        state.events.push({ type: 'enterCar', name: car.name });
      }
    }
  }
  if (input.melee) meleeAttack(state);
  if (input.shoot && !p.inCar) {
    const sp = playerScreenPos(state, view);
    const aim = Math.atan2(input.mouseY - sp.y, input.mouseX - sp.x);
    if (p.shootCooldown <= 0 && state.ammo > 0) state.stats.shotsFired += 1;
    shootPlayer(state, aim);
  }
  if (actions.reload) {
    // Ammo comes from cash: $10 buys 12 rounds at any time.
    if (state.money >= 10 && state.ammo < COMBAT.maxAmmo) {
      state.money -= 10;
      state.ammo = Math.min(COMBAT.maxAmmo, state.ammo + 12);
      state.events.push({ type: 'reload', ammo: state.ammo });
    }
  }

  // --- Movement ---
  if (p.inCar) {
    driveStep(p.inCar, input, dt);
    p.x = p.inCar.x;
    p.y = p.inCar.y;
    p.angle = p.inCar.angle;
    // Hitting a pedestrian while driving is a crime.
    for (const ped of state.peds) {
      if (ped.down) continue;
      if (Math.hypot(ped.x - p.inCar.x, ped.y - p.inCar.y) < carRadius(p.inCar) + 8 && Math.abs(p.inCar.speed) > 80) {
        ped.down = true;
        ped.downTimer = 6;
        state.stats.pedsHit += 1;
        addWanted(state, 1, 'hit and run');
        scarePeds(state.peds, ped.x, ped.y, 260);
        spawnParticles(state, ped.x, ped.y, '#e5534b', 8, 120);
      }
    }
  } else {
    updatePlayerOnFoot(state, input, dt);
    // A moving car that hits the player on foot knocks them down (briefly
    // invulnerable afterwards, so one car cannot drain the whole bar at once).
    if (p.hurtFlash <= 0) {
      for (const car of state.cars) {
        if (car.dead || Math.abs(car.speed) < 60) continue;
        if (Math.hypot(car.x - p.x, car.y - p.y) < carRadius(car) + p.r) {
          hurtPlayer(state, 10, car.x, car.y);
          break;
        }
      }
    }
  }

  // --- The world around the player ---
  // Ramming the courier counts (mission 4) — checked before updateCars resolves
  // the collision and averages the two speeds away.
  const courier = state.missionTarget;
  if (courier && courier.mission === 'courier' && p.inCar) {
    const impact = collideCars(p.inCar, courier);
    if (impact > 140) {
      courier.ramHits += 1;
      courier.flash = 0.2;
      state.events.push({ type: 'ramHit', hits: courier.ramHits, x: courier.x, y: courier.y });
      spawnParticles(state, courier.x, courier.y, '#f2c230', 10, 160);
      if (audio) audio.crash();
    }
  }
  updateCars(state, dt, state.random);
  updatePedestrians(state, dt, state.random);
  updatePolice(state, dt, state.random);
  updateBullets(state, dt);
  updateEnemies(state, dt);
  updateMissions(state, dt, state.random);

  // Camera follows the player, smoothly, clamped to the city so the view never
  // shows the void past its edges.
  const tx = Math.max(view.width / 2, Math.min(CITY.width - view.width / 2, p.x));
  const ty = Math.max(view.height / 2, Math.min(CITY.height - view.height / 2, p.y));
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);

  // Particles fade.
  for (const pt of state.particles) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);

  // --- Resolve events into toasts, sounds and game-over states ---
  for (const ev of state.events) {
    switch (ev.type) {
      case 'crash':
        spawnParticles(state, ev.x, ev.y, '#c9c2b8', 6, 140);
        if (ev.strength > 220 && audio) audio.crash();
        break;
      case 'gunshot':
        if (audio) audio.gunshot();
        break;
      case 'punch':
        if (audio) audio.punch();
        spawnParticles(state, ev.x, ev.y, '#f2c230', 4, 90);
        break;
      case 'dryFire':
        state.toast = { text: 'Out of ammo — press R to buy 12 rounds ($10)', sub: '', until: state.elapsed + 2.5 };
        break;
      case 'reload':
        state.toast = { text: `Ammo restocked — ${ev.ammo} rounds`, sub: '', until: state.elapsed + 2 };
        if (audio) audio.pickup();
        break;
      case 'enterCar':
        state.toast = { text: `Driving the ${ev.name}`, sub: 'W/S drive · A/D steer · E get out', until: state.elapsed + 2.5 };
        break;
      case 'wanted':
        if (ev.stars > 0) state.toast = { text: `Wanted level ${ev.stars} — ${ev.reason}`, sub: 'Lose the cops to cool off', until: state.elapsed + 3 };
        break;
      case 'missionStart':
        state.toast = { text: ev.title, sub: ev.briefing, until: state.elapsed + 5 };
        break;
      case 'missionStep':
        state.toast = { text: ev.label, sub: '', until: state.elapsed + 3 };
        break;
      case 'missionDone':
        state.toast = { text: `${ev.title} — complete! +$${ev.reward}`, sub: '', until: state.elapsed + 4 };
        if (audio) audio.missionDone();
        break;
      case 'missionFail':
        state.toast = { text: `Job failed — ${ev.reason}`, sub: 'Starting the job over', until: state.elapsed + 3.5 };
        if (audio) audio.missionFail();
        break;
      case 'fare':
        state.toast = { text: `Taxi fare available — $${ev.reward}`, sub: 'Pick up the passenger at the marker', until: state.elapsed + 3 };
        break;
      case 'farePickup':
        state.toast = { text: 'Passenger aboard — take them to the marker', sub: '', until: state.elapsed + 2.5 };
        break;
      case 'fareDone':
        state.toast = { text: `Fare complete +$${ev.reward}`, sub: '', until: state.elapsed + 3 };
        if (audio) audio.cash();
        break;
      case 'enemyDown':
        state.toast = { text: `Rival down — +$${ev.cash}`, sub: '', until: state.elapsed + 2 };
        if (audio) audio.cash();
        break;
      case 'storyDone':
        state.toast = { text: 'Debt paid — Sable owes you nothing now', sub: 'Free roam: taxi fares still pay', until: state.elapsed + 6 };
        break;
      case 'ramHit':
        state.toast = { text: `Courier rammed — ${ev.hits}/3 hits`, sub: '', until: state.elapsed + 2 };
        break;
      case 'ram':
        if (audio) audio.crash();
        break;
      case 'carDestroyed': {
        const destroyed = ev.car;
        if (destroyed === p.inCar) {
          exitCar(state);
          hurtPlayer(state, 25);
          state.toast = { text: 'Your car is wrecked!', sub: '', until: state.elapsed + 3 };
        }
        spawnParticles(state, destroyed.x, destroyed.y, '#e5534b', 18, 220);
        if (audio) audio.crash();
        break;
      }
      case 'busted':
        if (!state.busted && !state.wasted) {
          state.busted = true;
          const fine = Math.floor(state.money * 0.2);
          state.money -= fine;
          state.wanted = 0;
          if (audio) audio.busted();
          state.toast = { text: `BUSTED — fined $${fine}`, sub: 'Waking up at Harbor Clinic', until: state.elapsed + 4 };
        }
        break;
      case 'wasted':
        if (!state.wasted) {
          state.wasted = true;
          state.wanted = 0;
          state.money = Math.max(0, state.money - 100);
          if (audio) audio.busted();
        }
        break;
      case 'spark':
        spawnParticles(state, ev.x, ev.y, '#f2c230', 3, 80);
        break;
      default:
        break;
    }
  }
  state.events.length = 0;

  // Respawn after a bust or a wipeout: clinic, full health, fresh start on the job.
  if (state.busted || state.wasted) {
    const lm = state.city.landmarks.clinic;
    if (p.inCar) {
      p.inCar.speed = 0;
      p.inCar = null;
    }
    p.x = lm.x;
    p.y = lm.y + 60;
    p.health = p.maxHealth;
    state.camera.x = p.x;
    state.camera.y = p.y;
    state.busted = false;
    state.wasted = false;
    state.respawned = true;
  }

  return { district: districtAt(p.x, p.y), marker: missionMarker(state) };
}
