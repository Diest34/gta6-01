// Missions and the story of Sunset Keys. Rook owes Sable, a fixer in Palmetto
// Heights, one last season of driving. Five jobs, in order, then repeatable taxi
// fares for cash. Each mission is a list of steps; a step is done when its condition
// holds, and finishing the last step pays out and unlocks the next job.

import { makeCar } from './cars.js';
import { addWanted } from './police.js';
import { createEnemy } from './combat.js';

export const STORY_INTRO = "Rook owes Sable one last season of driving. Five jobs, then the debt is gone.";

export const MISSIONS = [
  {
    id: 'first-fare',
    title: '1 · First Fare',
    briefing: "Sable needs a driver tonight. Steal a car, pick up the fare at Marina Row, drop them at Coral Market.",
    reward: 150,
    steps: [
      { type: 'enterCar', label: 'Steal a car — press E near a parked car' },
      { type: 'goto', x: 'marina', y: null, radius: 90, label: 'Pick up the fare at Marina Row' },
      { type: 'goto', x: 'market', y: null, radius: 90, label: 'Drop the fare at Coral Market' },
    ],
  },
  {
    id: 'hot-delivery',
    title: '2 · Hot Delivery',
    briefing: "A package is waiting at Coral Market. Dune Strip wants it fast — 75 seconds, no excuses.",
    reward: 250,
    steps: [
      { type: 'goto', x: 'market', y: null, radius: 80, label: 'Pick up the package at Coral Market' },
      { type: 'deliver', x: 'dunes', y: null, radius: 90, time: 75, label: 'Deliver to Dune Strip' },
    ],
  },
  {
    id: 'getaway',
    title: '3 · Getaway Driver',
    briefing: "Sable's crew hit the cannery vault. Meet them at the Old Cannery and drive them clear — the cops will be coming.",
    reward: 400,
    steps: [
      { type: 'goto', x: 'cannery', y: null, radius: 90, label: 'Meet the crew at the Old Cannery' },
      { type: 'escape', duration: 20, label: 'Lose the cops — survive 20 seconds' },
    ],
  },
  {
    id: 'courier',
    title: '4 · The Courier',
    briefing: "A rival courier is running Sable's route. Ram his car off the road, then grab the case he drops.",
    reward: 500,
    steps: [
      { type: 'ram', hits: 3, label: 'Ram the courier’s car — 3 hits' },
      { type: 'collect', radius: 70, label: 'Grab the dropped case' },
    ],
  },
  {
    id: 'harbor-job',
    title: '5 · The Harbor Job',
    briefing: "The big one: an armored Mule is parked at Harbor Point. Take it, and bring it to Sable's Garage with the whole city on you.",
    reward: 1000,
    steps: [
      { type: 'steal', label: 'Steal the armored Mule at Harbor Point' },
      { type: 'deliver', x: 'hideout', y: null, radius: 100, time: 120, label: 'Get the Mule to Sable’s Garage' },
    ],
  },
];

function landmarkPoint(state, key) {
  if (key === null || key === undefined) return null;
  const lm = state.city.landmarks[key];
  return lm ? { x: lm.x, y: lm.y } : null;
}

function resolveStepPoint(state, step) {
  if (step.x === 'courierCar' && state.missionTarget) return { x: state.missionTarget.x, y: state.missionTarget.y };
  if (step.x === 'caseDrop' && state.caseDrop) return { x: state.caseDrop.x, y: state.caseDrop.y };
  if (typeof step.x === 'string') return landmarkPoint(state, step.x);
  if (typeof step.x === 'number') return { x: step.x, y: step.y };
  return null;
}

export function startMission(state, index) {
  const def = MISSIONS[index];
  state.missionIndex = index;
  state.missionStep = 0;
  state.missionTimer = 0;
  state.missionStepTimerSet = null;
  state.missionTarget = null;
  state.caseDrop = null;
  state.missionFailed = false;
  if (def.id === 'courier') {
    // The courier cruises the Coral Market roads in a fast Gull.
    const lm = state.city.landmarks.market;
    const car = makeCar('gull', lm.x + 120, lm.y, 0, { mission: 'courier', color: '#2b2b33' });
    car.speed = 200;
    car.tx = lm.x + 600;
    car.ty = lm.y;
    car.traffic = true;
    state.cars.push(car);
    state.missionTarget = car;
  }
  if (def.id === 'harbor-job') {
    const lm = state.city.landmarks.clinic;
    const car = makeCar('armored', lm.x - 100, lm.y + 60, Math.PI / 2, { mission: 'armored', parked: true });
    state.cars.push(car);
    state.missionTarget = car;
  }
  state.events.push({ type: 'missionStart', title: def.title, briefing: def.briefing });
}

export function currentMissionDef(state) {
  if (state.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[state.missionIndex];
}

export function currentStep(state) {
  const def = currentMissionDef(state);
  if (!def) return null;
  return def.steps[state.missionStep] || null;
}

export function missionObjectiveText(state) {
  const step = currentStep(state);
  if (step) {
    let label = step.label;
    if (step.type === 'deliver' && state.missionTimer > 0) label += ` — ${Math.ceil(state.missionTimer)}s`;
    if (step.type === 'escape' && state.missionTimer > 0) label += ` — ${Math.ceil(state.missionTimer)}s`;
    if (step.type === 'ram' && state.missionTarget) label += ` (${state.missionTarget.ramHits}/3)`;
    return label;
  }
  if (state.storyDone) return 'Story complete — taxi fares pay the bills. Press E near a car to drive.';
  return 'No active mission.';
}

export function missionMarker(state) {
  const step = currentStep(state);
  if (!step) return null;
  const pt = resolveStepPoint(state, step);
  if (!pt) return null;
  return { x: pt.x, y: pt.y, label: step.label };
}

function completeMission(state) {
  const def = currentMissionDef(state);
  state.money += def.reward;
  state.completedMissions += 1;
  state.events.push({ type: 'missionDone', title: def.title, reward: def.reward });
  state.missionIndex += 1;
  state.missionStep = 0;
  state.missionTimer = 0;
  state.missionTarget = null;
  state.caseDrop = null;
  if (state.missionIndex >= MISSIONS.length) {
    state.storyDone = true;
    state.events.push({ type: 'storyDone' });
  } else {
    startMission(state, state.missionIndex);
  }
}

function failMission(state, reason) {
  state.events.push({ type: 'missionFail', reason });
  startMission(state, state.missionIndex);
}

function startFare(state, random) {
  // Repeatable side gig after the story: a random taxi fare.
  const a = state.city.xs[Math.floor(random() * state.city.xs.length)];
  const b = state.city.ys[Math.floor(random() * state.city.ys.length)];
  const c = state.city.xs[Math.floor(random() * state.city.xs.length)];
  const d = state.city.ys[Math.floor(random() * state.city.ys.length)];
  state.fare = { px: a, py: b, dx: c, dy: d, pickedUp: false, reward: 60 + Math.floor(random() * 7) * 10 };
  state.events.push({ type: 'fare', reward: state.fare.reward });
}

export function updateMissions(state, dt, random) {
  // After the story, taxi fares keep the money coming.
  if (state.storyDone) {
    if (!state.fare) startFare(state, random);
    else {
      const p = state.player;
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      const target = state.fare.pickedUp ? { x: state.fare.dx, y: state.fare.dy } : { x: state.fare.px, y: state.fare.py };
      if (Math.hypot(px - target.x, py - target.y) < 90) {
        if (!state.fare.pickedUp) {
          state.fare.pickedUp = true;
          state.events.push({ type: 'farePickup' });
        } else {
          state.money += state.fare.reward;
          state.events.push({ type: 'fareDone', reward: state.fare.reward });
          state.fare = null;
        }
      }
    }
    return;
  }
  const def = currentMissionDef(state);
  if (!def) return;
  const step = def.steps[state.missionStep];
  if (!step) return;
  const p = state.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;

  if (step.type === 'enterCar') {
    if (p.inCar) advance(state);
    return;
  }
  if (step.type === 'goto' || step.type === 'deliver' || step.type === 'collect') {
    const pt = resolveStepPoint(state, step);
    if (!pt) return;
    if (step.type === 'deliver' && state.missionTimer === 0 && state.missionStepTimerSet !== step) {
      state.missionTimer = step.time || 0;
      state.missionStepTimerSet = step;
    }
    if (step.type === 'deliver' && state.missionTimer > 0) {
      state.missionTimer -= dt;
      if (state.missionTimer <= 0) {
        failMission(state, 'Too slow — the delivery window closed.');
        return;
      }
    }
    if (Math.hypot(px - pt.x, py - pt.y) < step.radius) {
      if (step.type === 'deliver' || step.type === 'goto') {
        state.missionTimer = 0;
        advance(state);
      } else if (step.type === 'collect' && !p.inCar) {
        advance(state);
      }
    }
    return;
  }
  if (step.type === 'escape') {
    if (state.missionTimer === 0) {
      state.missionTimer = step.duration;
      addWanted(state, 2, 'the crew job');
      // Two rivals guard the cannery meeting.
      const lm = state.city.landmarks.cannery;
      state.enemies.push(createEnemy(lm.x - 80, lm.y - 40));
      state.enemies.push(createEnemy(lm.x + 60, lm.y + 70));
    }
    state.missionTimer -= dt;
    if (state.missionTimer <= 0) {
      state.missionTimer = 0;
      advance(state);
    }
    return;
  }
  if (step.type === 'ram') {
    const car = state.missionTarget;
    if (!car) return;
    if (car.ramHits >= step.hits) {
      car.traffic = false;
      car.speed = 0;
      car.parked = true;
      state.caseDrop = { x: car.x + 40, y: car.y + 20 };
      advance(state);
    }
    return;
  }
  if (step.type === 'steal') {
    if (p.inCar && p.inCar.mission === 'armored') {
      addWanted(state, 3, 'the armored Mule');
      advance(state);
    }
  }
}

function advance(state) {
  state.missionStep += 1;
  state.missionTimer = 0;
  const def = currentMissionDef(state);
  if (state.missionStep >= def.steps.length) completeMission(state);
  else state.events.push({ type: 'missionStep', label: def.steps[state.missionStep].label });
}
