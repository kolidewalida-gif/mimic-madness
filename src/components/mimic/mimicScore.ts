/**
 * MimicEngine v1 — heuristic karaoke scoring. ISOLATED to the Mimic module.
 *
 * Honest scope: a browser can't compare a singer to the original ISOLATED
 * vocal (we only have the full-mix 30s preview). So this is an *entertainment*
 * engine: it analyses the singer's own microphone (energy, pitch activity,
 * timing/coverage, dynamics, stability) and correlates their singing with the
 * backing track's energy envelope. It rewards singing energetically, in time
 * with the music, with pitch movement — and punishes silence / flat cheating.
 *
 * The engine is deterministic given the same frame inputs, smoothed, tolerant,
 * and produces a live % plus sub-scores for the results screen.
 */

export interface SubScores {
  paroles: number;   // coverage of sung sections (did you sing where you should)
  justesse: number;  // pitch presence / stability
  rythme: number;    // onset timing vs music energy changes
  synchro: number;   // singing while music has energy
  dynamique: number; // healthy volume, expressive variation
  stabilite: number; // consistency (not erratic / not dead-flat)
}

export interface MimicResult {
  mimic: number;      // 0-100 overall
  sub: SubScores;
}

/** One analysis frame captured ~15x/sec. */
interface Frame {
  voice: number;   // singer RMS energy 0..1
  music: number;   // backing track energy 0..1 (from singer's device)
  pitch: number;   // detected pitch in Hz (0 = none)
  t: number;       // ms since perform start
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/**
 * Lightweight autocorrelation pitch detector on a time-domain buffer.
 * Returns Hz, or 0 if no clear pitch (unvoiced / silence).
 */
export function detectPitch(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return 0; // too quiet → unvoiced

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  const b = buf.subarray(r1, r2);
  const n = b.length;
  if (n < 2) return 0;

  const c = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += b[i] * b[i + lag];
    c[lag] = sum;
  }
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  if (maxpos <= 0) return 0;
  const T0 = maxpos;
  const freq = sampleRate / T0;
  if (freq < 70 || freq > 1100) return 0; // outside human singing range
  return freq;
}

/**
 * Accumulates frames and produces a running Mimic estimate. Designed to be
 * cheap to call every frame and to give a smoothed, slowly-rising score.
 */
export class MimicAnalyzer {
  private frames: Frame[] = [];
  private smoothed = 68; // pleasant starting point (Tome 5: start high-ish, stabilise)

  reset() { this.frames = []; this.smoothed = 68; }

  push(f: Frame) { this.frames.push(f); }

  /** Live smoothed % — call a few times per second for a fluid HUD. */
  live(): number {
    const target = this.rawMimic();
    // ease toward target (interpolated, never jumpy — Tome 11 §10)
    this.smoothed += (target - this.smoothed) * 0.12;
    return Math.round(clamp(this.smoothed));
  }

  /** Final locked result with sub-scores. */
  finalize(): MimicResult {
    const sub = this.computeSub();
    const mimic = Math.round(clamp(
      sub.paroles * 0.20 +
      sub.justesse * 0.18 +
      sub.rythme * 0.16 +
      sub.synchro * 0.18 +
      sub.dynamique * 0.14 +
      sub.stabilite * 0.14,
    ));
    return { mimic, sub };
  }

  private rawMimic(): number {
    const s = this.computeSub();
    return clamp(
      s.paroles * 0.20 + s.justesse * 0.18 + s.rythme * 0.16 +
      s.synchro * 0.18 + s.dynamique * 0.14 + s.stabilite * 0.14,
    );
  }

  private computeSub(): SubScores {
    const f = this.frames;
    if (f.length < 4) {
      return { paroles: 60, justesse: 60, rythme: 60, synchro: 60, dynamique: 60, stabilite: 60 };
    }
    const musicOn = f.filter((x) => x.music > 0.06);
    const voiceFrames = f.filter((x) => x.voice > 0.045);
    const voiceRatio = voiceFrames.length / f.length;

    // Coverage: sang during musically-active parts.
    const bothOn = musicOn.filter((x) => x.voice > 0.045).length;
    const coverage = musicOn.length ? bothOn / musicOn.length : voiceRatio;
    const paroles = clamp(30 + coverage * 75);

    // Synchro: singing correlated with music energy (not random gaps).
    const synchro = clamp(35 + coverage * 65 - Math.max(0, voiceRatio - 0.95) * 60);

    // Pitch: presence + variety of detected pitches (movement, not monotone).
    const pitches = voiceFrames.map((x) => x.pitch).filter((p) => p > 0);
    const pitchPresence = voiceFrames.length ? pitches.length / voiceFrames.length : 0;
    let pitchVar = 0;
    if (pitches.length > 3) {
      const semis = pitches.map((p) => 12 * Math.log2(p / 220));
      const mean = semis.reduce((a, b) => a + b, 0) / semis.length;
      pitchVar = Math.sqrt(semis.reduce((a, b) => a + (b - mean) ** 2, 0) / semis.length);
    }
    // reward some movement (2-7 semitone spread), penalise dead-flat (cheat) & chaos
    const movement = pitchVar <= 0.4 ? 0.2 : pitchVar > 9 ? 0.55 : Math.min(1, pitchVar / 5);
    const justesse = clamp(30 + pitchPresence * 45 + movement * 30);

    // Rhythm: voice onset density over the extract (the backing track plays
    // continuously, so we reward phrasing rather than dead-flat or scattered).
    const durSec = Math.max(1, (f[f.length - 1].t - f[0].t) / 1000);
    const onsets = this.countOnsets(f.map((x) => x.voice), 0.05);
    const expected = Math.max(3, durSec / 1.2); // ~a phrase group every 1.2s
    const rythme = clamp(35 + Math.min(1, onsets / expected) * 60);

    // Dynamics: healthy average energy + natural variation.
    const energies = voiceFrames.map((x) => x.voice);
    const avgE = energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : 0;
    const eVar = energies.length > 2
      ? Math.sqrt(energies.reduce((a, b) => a + (b - avgE) ** 2, 0) / energies.length) : 0;
    const dynamique = clamp(30 + Math.min(1, avgE / 0.18) * 45 + Math.min(1, eVar / 0.08) * 25);

    // Stability: expressive but not erratic; punish both silence and flatness.
    const flat = pitchVar < 0.3 && eVar < 0.01; // likely a held tone / cheat
    const stabilite = clamp(flat ? 25 : 55 + Math.min(1, movement) * 25 + (voiceRatio > 0.25 ? 15 : 0));

    return { paroles, justesse, rythme, synchro, dynamique, stabilite };
  }

  private countOnsets(series: number[], thr: number): number {
    let count = 0;
    let above = false;
    for (const v of series) {
      if (!above && v > thr) { count++; above = true; }
      else if (above && v < thr * 0.6) above = false;
    }
    return count;
  }
}

/** A short encouraging comment for the results screen (Tome 5 §11). */
export function mimicComment(r: MimicResult): string {
  const { mimic, sub } = r;
  if (mimic >= 92) return '🔥 Imitation exceptionnelle !';
  if (mimic >= 80) return '✨ Superbe performance !';
  const best = (Object.entries(sub) as [keyof SubScores, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const label: Record<keyof SubScores, string> = {
    paroles: 'les paroles', justesse: 'la justesse', rythme: 'le rythme',
    synchro: 'la synchro', dynamique: "l'énergie", stabilite: 'la stabilité',
  };
  if (mimic >= 60) return `👏 Bien joué, surtout sur ${label[best]} !`;
  return `🎤 Continue, ${label[best]} était ton point fort !`;
}
