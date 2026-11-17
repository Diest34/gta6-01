// The renderer: paints the city, the cars, the people and the screens, from the
// state alone. The camera looks at the player's neighbourhood; the world is drawn
// in world coordinates under a translate, the HUD and the screens in screen space.

import { CITY, PALETTE } from './config.js';
import { CAR_MODELS } from './config.js';
import { drawHud, roundRect } from './hud.js';
import { missionMarker, MISSIONS, STORY_INTRO } from './missions.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function drawWorld(state) {
    const cam = state.camera;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ox = vw / 2 - cam.x;
    const oy = vh / 2 - cam.y;
    ctx.save();
    ctx.translate(ox, oy);

    // Water, sand, grass.
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(cam.x - vw / 2 - 40, CITY.waterY, vw + 80, CITY.height - CITY.waterY + 40);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(cam.x - vw / 2 - 40, CITY.waterY, vw + 80, 40);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(cam.x - vw / 2 - 40, CITY.beachY, vw + 80, CITY.waterY - CITY.beachY);
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x - vw / 2 - 40, 0, vw + 80, CITY.beachY);

    // Roads: asphalt with a centre line, sidewalks around each block.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const cx of state.city.xs) ctx.fillRect(cx - CITY.road / 2 - 8, 0, CITY.road + 16, CITY.beachY);
    for (const cy of state.city.ys) ctx.fillRect(0, cy - CITY.road / 2 - 8, CITY.width, CITY.road + 16);
    ctx.fillStyle = PALETTE.road;
    for (const cx of state.city.xs) ctx.fillRect(cx - CITY.road / 2, 0, CITY.road, CITY.beachY);
    for (const cy of state.city.ys) ctx.fillRect(0, cy - CITY.road / 2, CITY.width, CITY.road);
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    for (const cx of state.city.xs) {
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, CITY.beachY);
      ctx.stroke();
    }
    for (const cy of state.city.ys) {
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(CITY.width, cy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Parks.
    for (const park of state.city.parks) {
      ctx.fillStyle = PALETTE.grassDark;
      roundRect(ctx, park.x, park.y, park.w, park.h, 12);
      ctx.fill();
    }

    // Buildings: soft shadow, pastel roof, a darker edge, rooftop details.
    for (const b of state.city.buildings) {
      ctx.fillStyle = 'rgba(30, 25, 35, 0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = PALETTE.buildingEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 10);
      if (b.height > 1) {
        ctx.fillStyle = 'rgba(30,25,35,0.35)';
        ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, b.w * 0.3, b.h * 0.3);
      }
    }

    // Palms.
    for (const palm of state.city.palms) {
      ctx.strokeStyle = '#7a5c38';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.lineTo(palm.x + 3, palm.y - 12);
      ctx.stroke();
      ctx.fillStyle = '#4e8f4e';
      ctx.beginPath();
      ctx.arc(palm.x + 3, palm.y - 14, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mission marker: a tall pulsing beacon plus a ring on the ground.
    const marker = missionMarker(state);
    if (marker) {
      const pulse = 1 + Math.sin(state.elapsed * 4) * 0.15;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 46 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 30 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(marker.x, marker.y - 58);
      ctx.lineTo(marker.x - 10, marker.y - 38);
      ctx.lineTo(marker.x + 10, marker.y - 38);
      ctx.closePath();
      ctx.fill();
    }
    if (state.caseDrop) {
      ctx.fillStyle = '#ff8c42';
      ctx.fillRect(state.caseDrop.x - 8, state.caseDrop.y - 6, 16, 12);
      ctx.fillStyle = '#7a4a00';
      ctx.fillRect(state.caseDrop.x - 8, state.caseDrop.y - 1, 16, 2);
    }
    if (state.fare) {
      const fx = state.fare.pickedUp ? state.fare.dx : state.fare.px;
      const fy = state.fare.pickedUp ? state.fare.dy : state.fare.py;
      ctx.fillStyle = '#f2c230';
      ctx.beginPath();
      ctx.arc(fx, fy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#11141b';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', fx, fy + 4);
    }

    // Pedestrians.
    for (const ped of state.peds) {
      if (ped.down) {
        ctx.fillStyle = ped.shirt;
        ctx.beginPath();
        ctx.ellipse(ped.x, ped.y, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const bob = Math.sin(ped.walkPhase) * 1.5;
      ctx.fillStyle = 'rgba(30,25,35,0.3)';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y + 10, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y + bob * 0.3, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath();
      ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3 - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cars.
    for (const car of state.cars) {
      if (car.dead) continue;
      drawCar(ctx, car, state.elapsed);
    }

    // Rivals.
    for (const e of state.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = 'rgba(30,25,35,0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 10, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#5b2d8e';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(e.angle) * 3, e.y + Math.sin(e.angle) * 3 - 3, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2b2b';
      ctx.fillRect(e.x - 14, e.y - 24, 28, 4);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(e.x - 14, e.y - 24, 28 * Math.max(0, e.health / 100), 4);
    }

    // Bullets.
    ctx.fillStyle = '#ffe14d';
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles.
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The player (on foot only — in a car, the car is the player).
    const p = state.player;
    if (!p.inCar) {
      ctx.fillStyle = 'rgba(30,25,35,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 11, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.hurtFlash > 0 ? '#ffffff' : PALETTE.playerShirt;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4 - 3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 10, p.y + Math.sin(p.angle) * 10);
      ctx.lineTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
      ctx.stroke();
    }

    ctx.restore();

    // Off-screen marker arrow: point toward the mission target.
    if (marker) {
      const sx = marker.x - cam.x + vw / 2;
      const sy = marker.y - cam.y + vh / 2;
      if (sx < 40 || sx > vw - 40 || sy < 40 || sy > vh - 40) {
        const cx = Math.max(50, Math.min(vw - 50, sx));
        const cy = Math.max(90, Math.min(vh - 90, sy));
        const a = Math.atan2(sy - cy, sx - cx);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-10, -11);
        ctx.lineTo(-10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawCar(ctx2, car, elapsed) {
    const model = CAR_MODELS[car.model];
    ctx2.save();
    ctx2.translate(car.x, car.y);
    ctx2.rotate(car.angle);
    ctx2.fillStyle = 'rgba(30,25,35,0.3)';
    ctx2.beginPath();
    ctx2.ellipse(2, 4, model.length / 2, model.width / 2 + 2, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = car.flash > 0 ? '#ffffff' : car.color;
    roundRect(ctx2, -model.length / 2, -model.width / 2, model.length, model.width, 6);
    ctx2.fill();
    ctx2.fillStyle = 'rgba(20,24,32,0.75)';
    ctx2.fillRect(-model.length * 0.22, -model.width / 2 + 3, model.length * 0.18, model.width - 6);
    ctx2.fillStyle = 'rgba(255,255,255,0.25)';
    ctx2.fillRect(model.length * 0.05, -model.width / 2 + 4, model.length * 0.22, model.width - 8);
    ctx2.fillStyle = '#ffe9a8';
    ctx2.fillRect(model.length / 2 - 3, -model.width / 2 + 2, 3, 5);
    ctx2.fillRect(model.length / 2 - 3, model.width / 2 - 7, 3, 5);
    if (car.police) {
      ctx2.fillStyle = '#22242c';
      ctx2.fillRect(-model.length * 0.1, -model.width / 2, model.length * 0.2, 3);
      ctx2.fillRect(-model.length * 0.1, model.width / 2 - 3, model.length * 0.2, 3);
      const red = Math.floor(elapsed * 4) % 2 === 0;
      ctx2.fillStyle = red ? '#ff3b30' : '#2f7bff';
      ctx2.fillRect(-6, -model.width / 2 - 1, 5, 4);
      ctx2.fillStyle = red ? '#2f7bff' : '#ff3b30';
      ctx2.fillRect(1, -model.width / 2 - 1, 5, 4);
    }
    if (car.model === 'cab') {
      ctx2.fillStyle = '#11141b';
      ctx2.font = '700 8px system-ui, sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText('TAXI', 0, 3);
    }
    if (car.mission === 'courier') {
      ctx2.fillStyle = '#ffe14d';
      ctx2.font = '700 9px system-ui, sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText('!', 0, -model.width / 2 - 8);
    }
    ctx2.restore();
    if (car.hp < car.maxHp * 0.35 && !car.dead) {
      ctx2.fillStyle = 'rgba(120,120,120,0.5)';
      ctx2.beginPath();
      ctx2.arc(car.x + Math.sin(elapsed * 6) * 4, car.y - 10, 7, 0, Math.PI * 2);
      ctx2.fill();
    }
  }

  function drawTitle(state, save) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    grad.addColorStop(0, 'rgba(38, 24, 54, 0.55)');
    grad.addColorStop(0.6, 'rgba(58, 28, 40, 0.72)');
    grad.addColorStop(1, 'rgba(20, 18, 26, 0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2c230';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('S O L M A R   B A Y', vw / 2, vh / 2 - 150);
    ctx.fillStyle = '#f5f1e6';
    ctx.font = '700 84px system-ui, sans-serif';
    ctx.fillText('SUNSET KEYS', vw / 2, vh / 2 - 70);
    ctx.fillStyle = '#e8d5a4';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('Five jobs. One debt. A whole city to steal it back in.', vw / 2, vh / 2 - 34);
    ctx.fillStyle = '#f5f1e6';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(STORY_INTRO, vw / 2, vh / 2 + 6);
    ctx.font = '14px system-ui, sans-serif';
    MISSIONS.forEach((m, i) => {
      const done = i < state.completedMissions;
      const current = i === state.missionIndex && !state.storyDone;
      ctx.fillStyle = done ? '#7fc96b' : current ? '#f2c230' : '#b8b2a0';
      ctx.fillText(`${done ? '✓' : current ? '►' : '·'}  ${m.title} — $${m.reward}`, vw / 2, vh / 2 + 44 + i * 24);
    });
    ctx.fillStyle = '#f5f1e6';
    ctx.font = '700 18px system-ui, sans-serif';
    const prompt = save
      ? 'ENTER — Continue your story      N — New game'
      : 'ENTER or CLICK — Start the story';
    ctx.fillText(prompt, vw / 2, vh / 2 + 44 + MISSIONS.length * 24 + 22);
    ctx.fillStyle = '#b8b2a0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('WASD move · E enter / steal a car · F punch · Click shoot · R buy ammo · P pause', vw / 2, vh / 2 + 44 + MISSIONS.length * 24 + 52);
    ctx.fillText('An original game: no real city, no real gang, no borrowed names.', vw / 2, vh - 24);
  }

  function drawPaused() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.fillStyle = 'rgba(20,18,26,0.72)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5f1e6';
    ctx.font = '700 48px system-ui, sans-serif';
    ctx.fillText('PAUSED', vw / 2, vh / 2 - 10);
    ctx.fillStyle = '#b8b2a0';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Progress saved · P or Enter to keep playing', vw / 2, vh / 2 + 28);
  }

  return {
    draw(state, screen, save) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      drawWorld(state);
      if (screen === SCREEN_PLAY) {
        drawHud(ctx, state, { width: window.innerWidth, height: window.innerHeight });
      } else if (screen === SCREEN_TITLE) {
        drawTitle(state, save);
      } else if (screen === SCREEN_PAUSED) {
        drawHud(ctx, state, { width: window.innerWidth, height: window.innerHeight });
        drawPaused();
      }
    },
  };
}
