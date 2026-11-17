// Sound, all synthesised with WebAudio — no audio files. The engine hum follows the
// car's speed, the siren wails while the player is wanted, and one-shots cover
// gunshots, punches, pickups, crashes and mission jingles. Nothing here runs until the
// first user gesture unlocks the AudioContext.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let noiseBuffer = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      const len = ctx.sampleRate * 0.5;
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure()) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  return {
    unlock() { ensure(); },
    /** Call every frame: speed in px/s (0 on foot), wanted stars. */
    update(speed, wanted, dt) {
      if (!ctx) return;
      if (engineGain) engineGain.gain.value = speed > 10 ? 0.03 + Math.min(0.05, speed / 9000) : 0;
      if (engineOsc) engineOsc.frequency.value = 55 + Math.min(180, speed * 0.35);
      if (sirenGain) sirenGain.gain.value = wanted > 0 ? 0.028 : 0;
      if (wanted > 0 && sirenOsc) {
        sirenTimer -= dt;
        if (sirenTimer <= 0) {
          sirenHigh = !sirenHigh;
          sirenOsc.frequency.value = sirenHigh ? 950 : 660;
          sirenTimer = 0.45;
        }
      }
    },
    gunshot() { noise(0.14, 0.5, 2600); tone(160, 0.08, 'square', 0.18, 60); },
    punch() { noise(0.09, 0.35, 500); },
    crash() { noise(0.25, 0.4, 700); },
    pickup() { tone(660, 0.09, 'sine', 0.25); setTimeout(() => tone(990, 0.12, 'sine', 0.25), 90); },
    cash() { tone(880, 0.1, 'triangle', 0.3); setTimeout(() => tone(1174, 0.14, 'triangle', 0.3), 100); },
    missionDone() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.3), i * 110));
    },
    missionFail() { tone(220, 0.4, 'sawtooth', 0.2, 110); },
    busted() { tone(330, 0.5, 'sawtooth', 0.25, 165); },
    click() { tone(500, 0.05, 'square', 0.12); },
    horn() { tone(370, 0.18, 'square', 0.15, 370); },
  };
}
