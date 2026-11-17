// Save and continue, via localStorage: money, health, position, wanted level, the
// clock, mission progress and story completion. A save is written whenever the
// player pauses or finishes a mission, and loaded from the title screen.

import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const p = state.player;
    const data = {
      version: 1,
      money: state.money,
      ammo: state.ammo,
      health: p.health,
      x: p.x,
      y: p.y,
      wanted: state.wanted,
      clockMinutes: state.clockMinutes,
      missionIndex: state.missionIndex,
      completedMissions: state.completedMissions,
      storyDone: state.storyDone,
      stats: state.stats,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

// Apply a loaded save onto a fresh game state (the city is rebuilt from the seed,
// the player's progress is restored on top of it).
export function applySave(state, data) {
  const p = state.player;
  state.money = data.money;
  state.ammo = data.ammo;
  p.health = data.health;
  p.x = data.x;
  p.y = data.y;
  state.wanted = data.wanted;
  state.clockMinutes = data.clockMinutes;
  state.completedMissions = data.completedMissions;
  state.storyDone = data.storyDone;
  state.stats = data.stats || state.stats;
  state.camera.x = p.x;
  state.camera.y = p.y;
  // Restart the current mission from its first step.
  state.missionIndex = Math.min(data.missionIndex, 4);
  state.missionStep = 0;
  state.missionTimer = 0;
  state.missionTarget = null;
  state.caseDrop = null;
  return state;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}
