// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between three screens: title, play and paused. Progress is
// saved to localStorage whenever the player pauses or finishes a mission.
//
// ?seed=N fixes the city. ?shot=start|play|chase|mission (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { STEP } from './config.js';
import { createGame, stepGame } from './game.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_PAUSE, ACTION_RELOAD, createInput } from './input.js';
import { createRenderer, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { saveGame, loadSave, applySave, hasSave } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createGame(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
const view = { width: window.innerWidth, height: window.innerHeight };

function runShot(name) {
  const scene = stageShot(name, state, view);
  window.__shotDebug = {
    money: state.money,
    health: state.player.health,
    wanted: state.wanted,
    inCar: !!state.player.inCar,
    carHp: state.player.inCar ? Math.round(state.player.inCar.hp) : null,
    carModel: state.player.inCar ? state.player.inCar.model : null,
    x: Math.round(state.player.x),
    y: Math.round(state.player.y),
    cars: state.cars.length,
    cops: state.cars.filter((c) => c.police && !c.dead).length,
    deadCars: state.cars.filter((c) => c.dead).length,
    elapsed: state.elapsed.toFixed(2),
  };
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, hasSave());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let saved = hasSave();
  let lastMissionIndex = state.missionIndex;
  let accumulator = 0;
  let last = performance.now();
  let newGameKey = false;
  // One-shot simulation actions (E to enter a car, R to buy ammo), queued by the
  // frame and consumed by the first simulation step, so a press is never doubled
  // when a frame runs several steps.
  let queued = { enter: false, reload: false };

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyN') newGameKey = true;
    if (event.code === 'Space' || event.code === 'Enter') audio.unlock();
  });
  canvas.addEventListener('pointerdown', () => audio.unlock());

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    if (fresh) {
      const again = createGame(seed);
      for (const key of Object.keys(again)) state[key] = again[key];
      state.events.length = 0;
    } else if (saved) {
      const data = loadSave();
      if (data) applySave(state, data);
    }
    saved = hasSave();
    lastMissionIndex = state.missionIndex;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Follow the mission at the top of the screen.');
  }

  function pauseGame() {
    saveGame(state);
    saved = true;
    screen = SCREEN_PAUSED;
    announce('Paused. Progress saved.');
  }

  function takeStepActions() {
    const taken = queued;
    queued = { enter: false, reload: false };
    return taken;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const flags = input.takeActions();
    if (screen !== SCREEN_TITLE) newGameKey = false;

    if (screen === SCREEN_TITLE) {
      if (flags & ACTION_CONFIRM) startGame(newGameKey);
    } else if (screen === SCREEN_PAUSED) {
      if (flags & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (flags & ACTION_PAUSE) {
      pauseGame();
    }

    if (screen === SCREEN_PLAY) {
      if (flags & ACTION_ENTER) queued.enter = true;
      if (flags & ACTION_RELOAD) queued.reload = true;
      while (accumulator >= STEP) {
        stepGame(state, input.read(), takeStepActions(), STEP, view, audio);
        accumulator -= STEP;
      }
      // Save whenever a mission completes.
      if (state.missionIndex !== lastMissionIndex) {
        lastMissionIndex = state.missionIndex;
        saveGame(state);
        saved = true;
      }
      const car = state.player.inCar;
      audio.update(car ? Math.abs(car.speed) : 0, state.wanted, STEP);
    } else {
      accumulator = 0;
      audio.update(0, 0, STEP);
    }
    renderer.draw(state, screen, saved);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) pauseGame();
  });

  announce('Sunset Keys. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
