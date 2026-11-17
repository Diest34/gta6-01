// Keyboard and mouse input. Held keys give a steering state; one-shot presses (start,
// pause, enter a car, reload) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. The mouse aims and
// fires the pistol; its position is kept in screen pixels and converted by the game.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RELOAD = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const RELOAD = new Set(['KeyR']);
const MELEE = new Set(['KeyF', 'KeyJ']);
const SHOOT_KEY = new Set(['KeyK']);

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, melee: false, shootKey: false };
  let actions = 0;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;

  function set(code, value) {
    if (UP.has(code)) held.up = value;
    else if (DOWN.has(code)) held.down = value;
    else if (LEFT.has(code)) held.left = value;
    else if (RIGHT.has(code)) held.right = value;
    else if (MELEE.has(code)) held.melee = value;
    else if (SHOOT_KEY.has(code)) held.shootKey = value;
  }

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (RELOAD.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RELOAD;
    } else if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || MELEE.has(event.code) || SHOOT_KEY.has(event.code)) {
      set(event.code, true);
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => set(event.code, false));
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.melee = held.shootKey = false;
    mouseDown = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => { mouseDown = false; });
  canvas.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  return {
    // A fresh snapshot of the held keys and the mouse, for one simulation step.
    read() {
      return {
        up: held.up, down: held.down, left: held.left, right: held.right,
        melee: held.melee, shoot: mouseDown || held.shootKey,
        mouseX, mouseY,
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

// A scripted input, for the screenshot scenes: the autopilot writes into this object
// and the game steps it exactly like a real player's input.
export function scriptedInput() {
  const state = { up: false, down: false, left: false, right: false, melee: false, shoot: false, mouseX: 640, mouseY: 360 };
  return {
    state,
    read() { return state; },
    takeActions() { return 0; },
  };
}
