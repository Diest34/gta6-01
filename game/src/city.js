// Solmar Bay: the city itself. A grid of roads and blocks, built once from a seed:
// buildings with pastel roofs, two parks, a beach and water along the south edge,
// and named districts and landmarks the missions point at.
import { CITY, PALETTE } from './config.js';
import { chance, pick, range, rangeInt } from './random.js';

export const DISTRICTS = [
  { name: 'Palmetto Heights', x0: 0, y0: 0, x1: 1398, y1: 1058 },
  { name: 'Coral Market', x0: 1398, y0: 0, x1: 2796, y1: 1058 },
  { name: 'Old Cannery', x0: 0, y0: 1058, x1: 1398, y1: 2116 },
  { name: 'Harbor Point', x0: 1398, y0: 1058, x1: 2796, y1: 2116 },
  { name: 'Marina Row', x0: 0, y0: 1900, x1: 2796, y1: 2116 },
  { name: 'Dune Strip', x0: 0, y0: 2116, x1: 2796, y1: 2400 },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return 'Solmar Bay';
}

// Road centre lines, in world coordinates.
export function roadCentersX() {
  const out = [];
  for (let i = 0; i <= CITY.blocksX; i += 1) out.push(i * CITY.pitch + CITY.road / 2);
  return out;
}

export function roadCentersY() {
  const out = [];
  for (let i = 0; i <= CITY.blocksY; i += 1) out.push(i * CITY.pitch + CITY.road / 2);
  return out;
}

export function isRoad(x, y) {
  const onX = roadCentersX().some((cx) => Math.abs(x - cx) <= CITY.road / 2);
  const onY = roadCentersY().some((cy) => Math.abs(y - cy) <= CITY.road / 2);
  return onX || onY;
}

export function buildCity(random) {
  const buildings = [];
  const palms = [];
  const parks = [];
  const xs = roadCentersX();
  const ys = roadCentersY();
  // Two parks: one in Palmetto Heights, one in Coral Market.
  const parkBlocks = [{ bx: 1, by: 1 }, { bx: 6, by: 1 }];
  for (let bx = 0; bx < CITY.blocksX; bx += 1) {
    for (let by = 0; by < CITY.blocksY; by += 1) {
      const x0 = bx * CITY.pitch + CITY.road;
      const y0 = by * CITY.pitch + CITY.road;
      const w = CITY.pitch - CITY.road;
      const h = CITY.pitch - CITY.road;
      if (parkBlocks.some((p) => p.bx === bx && p.by === by)) {
        parks.push({ x: x0, y: y0, w, h });
        for (let i = 0; i < 5; i += 1) {
          palms.push({ x: x0 + range(random, 24, w - 24), y: y0 + range(random, 24, h - 24) });
        }
        continue;
      }
      const count = rangeInt(random, 1, 3);
      for (let i = 0; i < count; i += 1) {
        const bw = range(random, 90, 150);
        const bh = range(random, 80, 140);
        const bx0 = x0 + range(random, 12, Math.max(13, w - bw - 12));
        const by0 = y0 + range(random, 12, Math.max(13, h - bh - 12));
        const b = { x: bx0, y: by0, w: bw, h: bh, color: pick(random, PALETTE.buildingRoof), height: rangeInt(random, 1, 3) };
        if (buildings.some((o) => b.x < o.x + o.w + 16 && b.x + b.w + 16 > o.x && b.y < o.y + o.h + 16 && b.y + b.h + 16 > o.y)) continue;
        buildings.push(b);
      }
      // Palms along the block's street corners.
      if (chance(random, 0.7)) {
        palms.push({ x: x0 + 14, y: y0 + 14 });
        palms.push({ x: x0 + w - 14, y: y0 + h - 14 });
      }
    }
  }
  // Beach palms along the sand.
  for (let x = 120; x < CITY.width - 120; x += 260) {
    palms.push({ x: x + range(random, -40, 40), y: CITY.beachY + range(random, 30, 80) });
  }
  const landmarks = {
    hideout: { name: "Sable's Garage", x: xs[1], y: ys[1], district: 'Palmetto Heights' },
    clinic: { name: 'Harbor Clinic', x: xs[7], y: ys[5], district: 'Harbor Point' },
    market: { name: 'Coral Market', x: xs[6], y: ys[1], district: 'Coral Market' },
    cannery: { name: 'Old Cannery', x: xs[1], y: ys[4], district: 'Old Cannery' },
    marina: { name: 'Marina Row', x: xs[3], y: ys[5], district: 'Marina Row' },
    dunes: { name: 'Dune Strip', x: xs[5], y: ys[5], district: 'Dune Strip' },
    plaza: { name: 'Sunset Plaza', x: xs[4], y: ys[2], district: 'Coral Market' },
  };
  return { buildings, palms, parks, landmarks, xs, ys };
}

// Push a circle (x, y, r) out of every building it overlaps. Returns true if it hit one.
export function resolveBuildingCollision(city, body) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= body.r * body.r) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      body.x = cx + (dx / d) * body.r;
      body.y = cy + (dy / d) * body.r;
    } else {
      // Centre inside the building: push out along the smallest penetration.
      const left = body.x - b.x;
      const right = b.x + b.w - body.x;
      const top = body.y - b.y;
      const bottom = b.y + b.h - body.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) body.x = b.x - body.r;
      else if (m === right) body.x = b.x + b.w + body.r;
      else if (m === top) body.y = b.y - body.r;
      else body.y = b.y + b.h + body.r;
    }
  }
  return hit;
}

export function clampToCity(body, margin) {
  body.x = Math.max(margin, Math.min(CITY.width - margin, body.x));
  body.y = Math.max(margin, Math.min(CITY.height - margin, body.y));
}

export function randomIntersection(random, xs, ys) {
  return { x: xs[Math.floor(random() * xs.length)], y: ys[Math.floor(random() * ys.length)] };
}

// The nearest road centre point to (x, y), used to snap a car back onto a road.
export function nearestRoadPoint(x, y, xs, ys) {
  let bx = xs[0];
  let by = ys[0];
  for (const cx of xs) if (Math.abs(x - cx) < Math.abs(x - bx)) bx = cx;
  for (const cy of ys) if (Math.abs(y - cy) < Math.abs(y - by)) by = cy;
  return { x: bx, y: by };
}
