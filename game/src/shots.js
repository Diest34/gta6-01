// The screenshot scenes behind ?shot=start|play|chase|mission. Each one plays the
// real rules forward from a fresh game for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame.

import { STEP } from './config.js';
import { stepGame } from './game.js';
import { makeCar } from './cars.js';
import { enterCar } from './player.js';
import { startMission } from './missions.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;
const NO_ACTIONS = { enter: false, reload: false };

function blankInput() {
  return { up: false, down: false, left: false, right: false, melee: false, shoot: false, mouseX: 640, mouseY: 360 };
}

// Walk or drive toward a point: returns the input state for one step.
function steerToward(state, input, tx, ty) {
  const p = state.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 30) {
    input.up = input.down = input.left = input.right = false;
    return;
  }
  if (p.inCar) {
    const car = p.inCar;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    input.up = Math.abs(diff) < 1.2;
    input.down = false;
    input.left = diff < -0.08;
    input.right = diff > 0.08;
    if (Math.abs(diff) > 1.2) input.up = Math.abs(car.speed) < 120;
  } else {
    input.up = dy < -20;
    input.down = dy > 20;
    input.left = dx < -20;
    input.right = dx > 20;
  }
}

function simulate(state, seconds, pilot, view) {
  const input = blankInput();
  for (let t = 0; t < seconds; t += SAMPLE) {
    if (pilot) pilot(state, input);
    stepGame(state, input, NO_ACTIONS, SAMPLE, view, null);
  }
}

/**
 * Set `state` to the named scene and return the screen to draw over it.
 * start: the title over a living city. play: Rook on foot in Coral Market.
 * chase: driving east on Sunset Boulevard with three stars and Interceptors behind.
 * mission: the Hot Delivery run, package aboard, Dune Strip ahead.
 */
export function stageShot(name, state, view) {
  const city = state.city;
  const lm = city.landmarks;
  if (name === 'play') {
    state.player.x = city.xs[1];
    state.player.y = city.ys[2];
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    simulate(state, 5, (s, input) => steerToward(s, input, city.xs[6], city.ys[2]), view);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const car = makeCar('gull', city.xs[2], city.ys[2], 0, { color: '#3f8fd2' });
    state.cars.push(car);
    enterCar(state, car);
    // Three Interceptors already on the player's tail, so the frame shows the
    // chase at once instead of waiting for them to arrive from the edge.
    for (let i = 0; i < 3; i += 1) {
      const cop = makeCar('interceptor', city.xs[2] - 150 - i * 110, city.ys[2] + (i % 2 === 0 ? 14 : -14), 0, { police: true });
      cop.speed = 320;
      state.cars.push(cop);
    }
    state.wanted = 3;
    state.lastCrime = state.elapsed;
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    simulate(state, 4, (s, input) => steerToward(s, input, city.xs[8], city.ys[2]), view);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    startMission(state, 1);
    state.missionStep = 1;
    state.missionTimer = 68;
    const car = makeCar('comet', city.xs[5], city.ys[1] + 120, Math.PI / 2, { color: '#d95f4b' });
    state.cars.push(car);
    enterCar(state, car);
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    state.toast = { text: '2 · Hot Delivery', sub: 'Deliver to Dune Strip — fast', until: state.elapsed + 60 };
    simulate(state, 3.5, (s, input) => steerToward(s, input, city.xs[5], city.ys[5]), view);
    return { screen: SCREEN_PLAY };
  }
  // start (and anything unknown): the title over five seconds of city life.
  state.camera.x = lm.hideout.x;
  state.camera.y = lm.hideout.y;
  simulate(state, 5, null, view);
  state.camera.x = lm.plaza.x;
  state.camera.y = lm.plaza.y;
  state.player.x = lm.plaza.x;
  state.player.y = lm.plaza.y;
  return { screen: SCREEN_TITLE };
}
