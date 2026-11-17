// The HUD: health, money, wanted stars, the in-game clock, the current objective,
// and the minimap — a live bird's-eye view of Solmar Bay with the player, the cops
// and the mission marker on it. Drawn in screen space, after the world.

import { CITY, PALETTE } from './config.js';
import { missionObjectiveText, missionMarker, currentMissionDef } from './missions.js';
import { districtAt } from './city.js';

function star(cx, cy, r, ctx, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.gold : 'rgba(245,241,230,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,18,26,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function formatClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function drawHud(ctx, state, view) {
  const p = state.player;
  const W = view.width;
  ctx.textBaseline = 'alphabetic';

  // Top-left: health bar and money.
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, 14, 14, 250, 64, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 15px ' + "'system-ui', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText('ROOK', 26, 36);
  ctx.fillStyle = '#3a2b2b';
  ctx.fillRect(26, 44, 150, 12);
  ctx.fillStyle = p.health > 30 ? '#7fc96b' : '#e5534b';
  ctx.fillRect(26, 44, 150 * Math.max(0, p.health / p.maxHealth), 12);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 20px ' + "'system-ui', sans-serif";
  ctx.fillText(`$${state.money}`, 188, 58);
  ctx.font = '12px ' + "'system-ui', sans-serif";
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Ammo ${state.ammo}`, 26, 72);

  // Top-right: wanted stars and clock.
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, W - 264, 14, 250, 64, 10);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) star(W - 246 + i * 30, 38, 12, ctx, i < state.wanted);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 18px ' + "'system-ui', sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText(formatClock(state.clockMinutes), W - 26, 42);
  ctx.font = '12px ' + "'system-ui', sans-serif";
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(districtAt(p.x, p.y), W - 26, 68);

  // Top-centre: current mission and objective.
  const def = currentMissionDef(state);
  const objective = missionObjectiveText(state);
  ctx.textAlign = 'center';
  const title = def ? def.title : state.storyDone ? 'Free Roam' : 'Sunset Keys';
  ctx.font = '700 16px ' + "'system-ui', sans-serif";
  const tw = Math.max(ctx.measureText(title).width, ctx.measureText(objective).width) + 40;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, W / 2 - tw / 2, 14, tw, 58, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(title, W / 2, 36);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '14px ' + "'system-ui', sans-serif";
  ctx.fillText(objective, W / 2, 58);

  // Bottom-left: context hint.
  ctx.textAlign = 'left';
  ctx.font = '13px ' + "'system-ui', sans-serif";
  ctx.fillStyle = PALETTE.muted;
  let hint = 'WASD move · E enter car · F punch · Click shoot · R buy ammo · P pause';
  if (p.inCar) {
    hint = `Driving the ${p.inCar.name} · E get out`;
  }
  ctx.fillText(hint, 16, view.height - 16);

  // Toast (mission banners, busts, payouts).
  if (state.toast && state.elapsed < state.toast.until) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.panel;
    const lines = state.toast.sub ? 2 : 1;
    const bw = 620;
    roundRect(ctx, W / 2 - bw / 2, 96, bw, lines === 2 ? 66 : 44, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 18px ' + "'system-ui', sans-serif";
    ctx.fillText(state.toast.text, W / 2, 96 + 26);
    if (state.toast.sub) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = '14px ' + "'system-ui', sans-serif";
      ctx.fillText(state.toast.sub, W / 2, 96 + 50);
    }
  }

  drawMinimap(ctx, state, view);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMinimap(ctx, state, view) {
  const mw = 220;
  const mh = 188;
  const x0 = view.width - mw - 14;
  const y0 = view.height - mh - 14;
  const sx = mw / CITY.width;
  const sy = mh / CITY.height;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x0 - 6, y0 - 6, mw + 12, mh + 12, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, mw, mh);
  ctx.clip();
  // Water and sand.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x0, y0 + CITY.waterY * sy, mw, mh - CITY.waterY * sy);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x0, y0 + CITY.beachY * sy, mw, (CITY.waterY - CITY.beachY) * sy);
  // Land, roads, buildings.
  ctx.fillStyle = '#6f9e55';
  ctx.fillRect(x0, y0, mw, CITY.beachY * sy);
  ctx.fillStyle = '#5c5c66';
  for (const cx of state.city.xs) ctx.fillRect(x0 + cx * sx - 2, y0, 4, CITY.beachY * sy);
  for (const cy of state.city.ys) ctx.fillRect(x0, y0 + cy * sy - 2, mw, 4);
  ctx.fillStyle = '#8a7a5c';
  for (const b of state.city.buildings) ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  // Fare marker.
  if (state.fare) {
    const fx = state.fare.pickedUp ? state.fare.dx : state.fare.px;
    const fy = state.fare.pickedUp ? state.fare.dy : state.fare.py;
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.arc(x0 + fx * sx, y0 + fy * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission marker, pulsing.
  const marker = missionMarker(state);
  if (marker) {
    const pulse = 3 + Math.sin(state.elapsed * 5) * 1.5;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(x0 + marker.x * sx, y0 + marker.y * sy, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Case drop.
  if (state.caseDrop) {
    ctx.fillStyle = '#ff8c42';
    ctx.fillRect(x0 + state.caseDrop.x * sx - 3, y0 + state.caseDrop.y * sy - 3, 6, 6);
  }
  // Police, then the player on top.
  ctx.fillStyle = '#ff5a4d';
  for (const car of state.cars) {
    if (car.police && !car.dead) {
      ctx.beginPath();
      ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const p = state.player;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#11141b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px ' + "'system-ui', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BAY', x0, y0 - 12);
}
