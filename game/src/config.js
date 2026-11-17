// Sunset Keys — every tuning number and colour in one place.
// The world is one big fixed-size city (2796 x 2400). The camera shows a 1280 x 720
// window of it, so no rule below depends on the screen size.

export const STEP = 1 / 60; // fixed simulation step, seconds
export const VIEW = { width: 1280, height: 720 };

export const CITY = {
  width: 2796,
  height: 2400,
  pitch: 340, // road centre to road centre
  road: 76, // road width
  blocksX: 8,
  blocksY: 6,
  beachY: 2116, // sand starts here; water below it
  waterY: 2236,
};

// On-foot player.
export const PLAYER = {
  radius: 13,
  walkSpeed: 230,
  runSpeed: 310,
  health: 100,
  punchDamage: 34,
  punchRange: 34,
  punchArc: 1.1,
  punchCooldown: 0.35,
};

// Cars. topSpeed in px/s, accel in px/s^2.
export const CAR_MODELS = {
  comet: { name: 'Comet', kind: 'sedan', topSpeed: 470, accel: 300, reverse: 170, grip: 2.6, hp: 100, length: 46, width: 22, color: '#d95f4b' },
  gull: { name: 'Gull GT', kind: 'coupe', topSpeed: 560, accel: 380, reverse: 180, grip: 3.1, hp: 80, length: 44, width: 20, color: '#3f8fd2' },
  mule: { name: 'Mule', kind: 'van', topSpeed: 380, accel: 230, reverse: 150, grip: 2.2, hp: 160, length: 54, width: 24, color: '#e8b23a' },
  cab: { name: 'Cab', kind: 'taxi', topSpeed: 450, accel: 290, reverse: 170, grip: 2.6, hp: 100, length: 46, width: 22, color: '#f2c230' },
  interceptor: { name: 'Interceptor', kind: 'police', topSpeed: 540, accel: 360, reverse: 190, grip: 3.0, hp: 140, length: 48, width: 22, color: '#f4f6f8' },
  armored: { name: 'Armored Mule', kind: 'armored', topSpeed: 360, accel: 210, reverse: 140, grip: 2.0, hp: 320, length: 56, width: 26, color: '#5c6b7a' },
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;
export const PARKED_COUNT = 22;

export const WANTED = {
  max: 5,
  decayDelay: 22, // seconds with no crime and no police near before stars start falling
  decayInterval: 7, // seconds per star once decaying
  bustRange: 30, // a cop this close on foot busts the player
  bustSpeed: 60, // ...only while the player moves slower than this
  maxPolice: 6,
};

export const COMBAT = {
  pistolDamage: 34,
  pistolRange: 420,
  pistolCooldown: 0.22,
  bulletSpeed: 900,
  startAmmo: 24,
  maxAmmo: 96,
  enemyHealth: 100,
  enemyShootRange: 320,
  enemyShootCooldown: 1.4,
};

export const CLOCK = {
  startMinutes: 9 * 60, // 09:00
  minutesPerSecond: 1, // one game minute per real second
};

export const PALETTE = {
  water: '#2e7f9e',
  waterDeep: '#256b87',
  sand: '#e8d5a4',
  grass: '#7fae62',
  grassDark: '#6f9e55',
  sidewalk: '#cbb98f',
  road: '#4a4a52',
  roadLine: '#e8d27a',
  curb: '#8f8570',
  buildingRoof: ['#e07856', '#e8a04c', '#7fb3a8', '#d97b9b', '#8fa8c8', '#c9b458', '#a98bc4', '#6fae7d'],
  buildingEdge: '#3a3340',
  player: '#f2f2f2',
  playerShirt: '#e84c3d',
  police: '#f4f6f8',
  text: '#f5f1e6',
  muted: '#b8b2a0',
  gold: '#f2c230',
  red: '#e5534b',
  panel: 'rgba(20, 18, 26, 0.78)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Where the save lives between visits (this browser only).
export const SAVE_KEY = 'sunset-keys.save.v1';
export const BEST_KEY = 'sunset-keys.best';
