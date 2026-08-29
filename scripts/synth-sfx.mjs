#!/usr/bin/env node
/**
 * Synthétise le banc d'effets sonores en local, sans service externe.
 *
 * POURQUOI CE SCRIPT EXISTE À CÔTÉ DE `generate-sfx.mjs`
 *
 * La banque précédente venait d'ElevenLabs, avec un style commun qui demandait
 * « neon arcade », « thick plastic transient » et « saturated ». Le résultat
 * était dur : attaques qui claquent, énergie concentrée entre 4 et 8 kHz, et de
 * la distorsion assumée. Sur un clic joué des dizaines de fois par partie, ça
 * fatigue vite.
 *
 * Refaire la banque par le même chemin demande des crédits, et le quota est
 * épuisé. Or ces sons n'ont rien qui exige un modèle génératif : ce sont des
 * maillets doux, des tocs de bois, des souffles filtrés et des pops. La
 * synthèse additive les rend très bien — à condition de respecter quelques
 * règles que la banque précédente ignorait, et qui sont l'essentiel du travail
 * ici :
 *
 * 1. AUCUN CLIC. Chaque enveloppe part de zéro et revient à zéro, et le rendu
 *    final force les premiers et derniers échantillons à zéro. Un son qui
 *    démarre à amplitude non nulle produit un claquement, quel que soit le
 *    timbre choisi derrière.
 * 2. PAS DE CARRÉ NI DE DENT DE SCIE. Uniquement des partiels sinusoïdaux
 *    explicites et du bruit filtré : rien ne peut créer d'harmonique au-delà de
 *    ce qu'on a décidé, donc rien ne peut crisser.
 * 3. AIGUS EN RETRAIT. Passe-bas doux sur le mélange final. La zone 3-8 kHz est
 *    celle où l'oreille est la plus sensible et où naît la fatigue.
 * 4. PAS DE SATURATION. On somme avec de la marge, puis on normalise. Jamais
 *    l'inverse.
 * 5. UN PEU D'AIR. Trois réflexions courtes suffisent à ce qu'un son ne sonne
 *    pas nu, sans en faire un son de cathédrale.
 *
 * Usage :
 *   node scripts/synth-sfx.mjs            # tout le banc
 *   node scripts/synth-sfx.mjs ui-click   # un ou plusieurs identifiants
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MANIFEST = resolve(ROOT, 'src/lib/sfx/manifest.json');
const OUT_DIR = resolve(ROOT, 'public/sfx');

/**
 * 24 kHz : 12 kHz de bande utile.
 *
 * C'est exactement la limite qu'on veut de toute façon — au-dessus, il n'y a que
 * ce qui fatigue. Choisir la fréquence d'échantillonnage plutôt que filtrer
 * après coup divise aussi le poids des fichiers par deux.
 */
const SR = 24_000;
/** Crête visée, en linéaire. -3 dBFS laisse de la marge au limiteur du jeu. */
const TARGET_PEAK = 0.708;

/* ============================================================
   Générateur pseudo-aléatoire déterministe
   ------------------------------------------------------------
   Le bruit doit être reproductible : deux exécutions du script
   donnent le même fichier, sinon le dépôt bouge à chaque appel
   sans qu'on ait rien changé.
   ============================================================ */
let seed = 0x2f6e2b1;
const random = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 0xffffffff;
};
const noise = () => random() * 2 - 1;
const reseed = (value) => { seed = value >>> 0 || 1; };

/* ============================================================
   Briques élémentaires
   ============================================================ */

const makeBuffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));

/**
 * Enveloppe percussive : montée linéaire courte, descente exponentielle.
 *
 * `attack` n'est jamais nul — c'est ce qui distingue un son doux d'un clic.
 */
const envelope = (i, length, attackSamples, curve) => {
  if (i < attackSamples) return i / attackSamples;
  const t = (i - attackSamples) / Math.max(1, length - attackSamples);
  return Math.exp(-curve * t) * (1 - t);
};

/** Additionne un partiel sinusoïdal, avec glissando optionnel. */
const addTone = (out, { start = 0, duration, freq, toFreq = null, peak, attack = 0.006, curve = 4.5 }) => {
  const from = Math.floor(start * SR);
  const length = Math.floor(duration * SR);
  const attackSamples = Math.max(2, Math.floor(attack * SR));
  let phase = 0;
  for (let i = 0; i < length; i += 1) {
    const index = from + i;
    if (index >= out.length) break;
    const t = i / length;
    const f = toFreq === null ? freq : freq * Math.pow(toFreq / freq, t);
    phase += (2 * Math.PI * f) / SR;
    out[index] += Math.sin(phase) * envelope(i, length, attackSamples, curve) * peak;
  }
};

/**
 * Bruit passé dans un passe-bande à deux pôles, avec balayage optionnel.
 *
 * Filtre écrit à la main plutôt qu'un biquad complet : on n'a besoin que d'une
 * pente douce, et un filtre d'ordre 2 récursif suffit largement pour du souffle.
 */
const addNoise = (out, { start = 0, duration, from, to = null, q = 1, peak, attack = 0.01, curve = 3.5 }) => {
  const fromIndex = Math.floor(start * SR);
  const length = Math.floor(duration * SR);
  const attackSamples = Math.max(2, Math.floor(attack * SR));
  let lp1 = 0; let lp2 = 0; let hp = 0; let prev = 0;
  for (let i = 0; i < length; i += 1) {
    const index = fromIndex + i;
    if (index >= out.length) break;
    const t = i / length;
    const centre = to === null ? from : from * Math.pow(to / from, t);
    const alpha = Math.min(0.99, (2 * Math.PI * centre) / SR);
    const raw = noise();
    lp1 += alpha * (raw - lp1);
    lp2 += alpha * (lp1 - lp2);
    /* Retrait du grave : un passe-bande, c'est un passe-bas moins sa traîne. */
    hp = lp2 - prev + 0.92 * hp;
    prev = lp2;
    const band = hp * (1 + q * 0.5);
    out[index] += band * envelope(i, length, attackSamples, curve) * peak;
  }
};

/* ============================================================
   Familles de sons
   ------------------------------------------------------------
   Douze familles pour quarante-neuf sons : c'est ce qui fait que
   la banque sonne comme une banque et non comme quarante-neuf
   sons sans rapport. Le style commun n'est plus une phrase dans
   un prompt, il est dans le code.
   ============================================================ */

/**
 * Toc de bois feutré : corps court, sub léger, pas de transitoire dur.
 *
 * `definition` ajoute un partiel discret vers 1,2 kHz. Sans lui, le toc mesuré
 * tombait à 476 Hz de centre de gravité : plus aucune dureté, mais plus aucun
 * relief non plus — un clic doit rester une réponse, pas un bruit sourd. On
 * cherche la définition dans les médiums, pas dans la bande 4-8 kHz qui fatigue.
 */
const tock = (out, { at = 0, freq = 210, peak = 0.6, decay = 0.1, air = 0.05, definition = 0.14 }) => {
  addTone(out, { start: at, duration: decay, freq: freq * 1.6, toFreq: freq, peak: peak * 0.55, attack: 0.008, curve: 7 });
  addTone(out, { start: at, duration: decay * 1.4, freq: freq * 0.5, peak: peak * 0.45, attack: 0.01, curve: 5 });
  if (definition > 0) {
    addTone(out, { start: at, duration: decay * 0.35, freq: freq * 6, toFreq: freq * 4, peak: peak * definition, attack: 0.005, curve: 9 });
  }
  if (air > 0) addNoise(out, { start: at, duration: 0.03, from: 1800, to: 700, q: 1, peak: air, attack: 0.004, curve: 9 });
};

/** Note de maillet : fondamentale plus deux partiels bas, longuement amortie. */
const mallet = (out, { at = 0, freq, peak = 0.5, decay = 0.5 }) => {
  addTone(out, { start: at, duration: decay, freq, peak, attack: 0.007, curve: 4 });
  addTone(out, { start: at, duration: decay * 0.7, freq: freq * 2, peak: peak * 0.22, attack: 0.008, curve: 5 });
  addTone(out, { start: at, duration: decay * 0.45, freq: freq * 3.01, peak: peak * 0.07, attack: 0.01, curve: 6 });
  addTone(out, { start: at, duration: decay * 0.9, freq: freq * 0.5, peak: peak * 0.16, attack: 0.012, curve: 4 });
};

/** Suite de notes de maillet, pour les accords et les arpèges. */
const phrase = (out, { freqs, at = 0, spacing = 0.09, peak = 0.5, decay = 0.55 }) => {
  freqs.forEach((freq, i) => {
    mallet(out, { at: at + i * spacing, freq, peak: peak * (1 - i * 0.04), decay });
  });
};

/** Souffle de tissu : bruit filtré qui monte puis redescend. */
const airSwipe = (out, { at = 0, duration = 0.32, from = 500, to = 2200, peak = 0.5, q = 1.2 }) => {
  addNoise(out, { start: at, duration: duration * 0.55, from, to, q, peak, attack: 0.02, curve: 1.5 });
  addNoise(out, { start: at + duration * 0.5, duration: duration * 0.5, from: to, to: from * 0.8, q, peak: peak * 0.75, attack: 0.01, curve: 3 });
};

/** Corps grave descendant : le registre des refus, sans buzz. */
const thud = (out, { at = 0, freq = 180, peak = 0.6, duration = 0.3 }) => {
  addTone(out, { start: at, duration, freq, toFreq: freq * 0.6, peak, attack: 0.01, curve: 3.5 });
  addTone(out, { start: at, duration: duration * 0.8, freq: freq * 2.02, toFreq: freq * 1.2, peak: peak * 0.2, attack: 0.012, curve: 4 });
  addNoise(out, { start: at, duration: 0.06, from: 500, to: 200, q: 0.8, peak: peak * 0.15, attack: 0.008, curve: 8 });
};

/** Rebond caoutchouteux : dips de hauteur de plus en plus faibles. */
const bounce = (out, { at = 0, freq = 300, peak = 0.55, count = 4 }) => {
  for (let i = 0; i < count; i += 1) {
    const start = at + i * 0.085;
    const energy = peak * Math.pow(0.62, i);
    addTone(out, { start, duration: 0.075, freq: freq * 1.15, toFreq: freq * 0.55, peak: energy, attack: 0.006, curve: 5 });
    addTone(out, { start: start + 0.04, duration: 0.06, freq: freq * 0.55, toFreq: freq * 1.05, peak: energy * 0.5, attack: 0.005, curve: 5 });
  }
};

/** Gelée : hauteur modulée par un oscillateur lent. */
const wobble = (out, { at = 0, freq = 320, duration = 0.45, rate = 13, depth = 0.16, peak = 0.55 }) => {
  const fromIndex = Math.floor(at * SR);
  const length = Math.floor(duration * SR);
  const attackSamples = Math.floor(0.012 * SR);
  let phaseAcc = 0;
  for (let i = 0; i < length; i += 1) {
    const index = fromIndex + i;
    if (index >= out.length) break;
    const lfo = Math.sin((2 * Math.PI * rate * i) / SR);
    const f = freq * (1 + depth * lfo);
    phaseAcc += (2 * Math.PI * f) / SR;
    out[index] += Math.sin(phaseAcc) * envelope(i, length, attackSamples, 3) * peak;
  }
  addTone(out, { start: at, duration: duration * 0.5, freq: freq * 0.5, peak: peak * 0.25, attack: 0.014, curve: 3 });
};

/** Étincelle étouffée : quelques craquements graves, rien de sifflant. */
const crackle = (out, { at = 0, duration = 0.28, peak = 0.5 }) => {
  let cursor = at;
  let energy = peak;
  while (cursor < at + duration) {
    addNoise(out, { start: cursor, duration: 0.03, from: 1400, to: 500, q: 1.5, peak: energy, attack: 0.002, curve: 12 });
    cursor += 0.025 + random() * 0.03;
    energy *= 0.78;
  }
  addTone(out, { start: at, duration, freq: 420, toFreq: 130, peak: peak * 0.4, attack: 0.008, curve: 4 });
};

/** Ticking qui accélère : la pression du temps, en bois. */
const ticking = (out, { at = 0, duration = 2, peak = 0.5, count = 14 }) => {
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    /* Espacement décroissant : les coups se rapprochent vers la fin. */
    const position = at + duration * (t * t * 0.55 + t * 0.45);
    tock(out, { at: position, freq: 300 + 220 * t, peak: peak * (0.7 + 0.3 * t), decay: 0.07, air: 0.03 });
  }
};

/** Ronronnement de bande rembobinée, bouclable. */
const whirr = (out, { duration, peak = 0.45 }) => {
  const length = Math.min(out.length, Math.floor(duration * SR));
  let lp = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / SR;
    /* Deux modulations lentes incommensurables : ça évite un motif audible. */
    const warble = 1 + 0.35 * Math.sin(2 * Math.PI * 5.5 * t) + 0.18 * Math.sin(2 * Math.PI * 8.3 * t);
    const cut = Math.min(0.99, (2 * Math.PI * 900 * warble) / SR);
    lp += cut * (noise() - lp);
    const reel = 0.35 * Math.sin(2 * Math.PI * 220 * warble * t);
    out[i] += (lp * 0.8 + reel * 0.2) * peak;
  }
};

/** Ronflement de machine avec petits clics, bouclable. */
const hum = (out, { duration, peak = 0.4 }) => {
  const length = Math.min(out.length, Math.floor(duration * SR));
  let lp = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / SR;
    lp += 0.02 * (noise() - lp);
    const body = 0.5 * Math.sin(2 * Math.PI * 92 * t) + 0.25 * Math.sin(2 * Math.PI * 138 * t);
    out[i] += (body * 0.5 + lp * 2.2) * peak;
  }
  /* Clics réguliers mais pas métronomiques. */
  for (let k = 0; k * 0.62 < duration - 0.1; k += 1) {
    addNoise(out, { start: k * 0.62 + 0.05, duration: 0.02, from: 900, to: 400, q: 1, peak: peak * 0.5, attack: 0.003, curve: 12 });
  }
};

/** Applaudissements : beaucoup de petites frappes graves, jamais claquantes. */
const crowd = (out, { duration = 1.8, peak = 0.5 }) => {
  const claps = Math.floor(duration * 90);
  for (let i = 0; i < claps; i += 1) {
    const at = random() * (duration - 0.06);
    /* Enveloppe d'ensemble : montée rapide, retombée douce. */
    const shape = Math.min(1, at / 0.18) * Math.exp(-1.6 * (at / duration));
    addNoise(out, {
      start: at,
      duration: 0.035,
      from: 900 + random() * 700,
      to: 350,
      q: 0.9,
      peak: peak * 0.16 * shape * (0.6 + random() * 0.4),
      attack: 0.003,
      curve: 11,
    });
  }
};

/** Cuivres doux : additif à partiels pairs, attaque lente, pas de mordant. */
const horn = (out, { at = 0, freq, duration = 0.5, peak = 0.5 }) => {
  addTone(out, { start: at, duration, freq, peak, attack: 0.022, curve: 2.6 });
  addTone(out, { start: at, duration: duration * 0.9, freq: freq * 2, peak: peak * 0.4, attack: 0.026, curve: 3 });
  addTone(out, { start: at, duration: duration * 0.7, freq: freq * 3, peak: peak * 0.14, attack: 0.03, curve: 3.4 });
  addTone(out, { start: at, duration: duration * 0.55, freq: freq * 4, peak: peak * 0.05, attack: 0.032, curve: 4 });
};

/* ============================================================
   Chaîne de sortie
   ============================================================ */

/** Passe-bas à un pôle, appliqué deux fois pour une pente douce de 12 dB. */
const lowpass = (buffer, cutoff) => {
  const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let z1 = 0; let z2 = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    z1 += alpha * (buffer[i] - z1);
    z2 += alpha * (z1 - z2);
    buffer[i] = z2;
  }
};

/**
 * Trois réflexions courtes. Assez pour que le son ne soit pas nu, trop peu pour
 * qu'on entende une pièce : les sons d'interface doivent rester secs.
 */
const air = (buffer, amount) => {
  if (amount <= 0) return;
  const taps = [[0.011, 0.5], [0.019, 0.32], [0.031, 0.19]];
  const dry = Float32Array.from(buffer);
  for (const [delay, level] of taps) {
    const offset = Math.floor(delay * SR);
    for (let i = offset; i < buffer.length; i += 1) {
      buffer[i] += dry[i - offset] * level * amount;
    }
  }
};

/** Retire la composante continue, qui mange de la marge sans s'entendre. */
const removeDc = (buffer) => {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) sum += buffer[i];
  const mean = sum / buffer.length;
  for (let i = 0; i < buffer.length; i += 1) buffer[i] -= mean;
};

/** Force le silence aux deux bouts : la garantie anti-clic de dernier recours. */
const guardEdges = (buffer, seconds = 0.004) => {
  const n = Math.max(2, Math.floor(seconds * SR));
  for (let i = 0; i < n && i < buffer.length; i += 1) {
    buffer[i] *= i / n;
    buffer[buffer.length - 1 - i] *= i / n;
  }
};

/** Normalise à la crête visée, sans jamais écrêter. */
const normalize = (buffer) => {
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) peak = Math.max(peak, Math.abs(buffer[i]));
  if (peak === 0) return 0;
  const factor = TARGET_PEAK / peak;
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= factor;
  return peak;
};

/**
 * Rend une boucle raccordable : la fin est fondue dans le début.
 *
 * `playSustainedSample` rejoue ces fichiers en boucle. Sans ce raccord, chaque
 * tour produit un clic — le défaut le plus audible de tout le banc.
 */
const seamless = (buffer, seconds = 0.25) => {
  const n = Math.min(Math.floor(seconds * SR), Math.floor(buffer.length / 3));
  for (let i = 0; i < n; i += 1) {
    const fade = i / n;
    const tail = buffer[buffer.length - n + i];
    buffer[i] = buffer[i] * fade + tail * (1 - fade);
  }
  /* La queue recopiée n'a plus lieu d'être jouée : on l'efface en douceur. */
  for (let i = 0; i < n; i += 1) {
    buffer[buffer.length - n + i] *= 1 - i / n;
  }
};

const encodeWav = (buffer) => {
  const bytes = Buffer.alloc(44 + buffer.length * 2);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(36 + buffer.length * 2, 4);
  bytes.write('WAVE', 8, 'ascii');
  bytes.write('fmt ', 12, 'ascii');
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); // PCM
  bytes.writeUInt16LE(1, 22); // mono
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36, 'ascii');
  bytes.writeUInt32LE(buffer.length * 2, 40);
  for (let i = 0; i < buffer.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]));
    bytes.writeInt16LE(Math.round(clamped * 32_767), 44 + i * 2);
  }
  return bytes;
};

/* ============================================================
   Les quarante-neuf recettes
   ------------------------------------------------------------
   `lp` est la coupure du passe-bas final, `air` la dose de
   réflexions, `loop` marque les deux fichiers rejoués en boucle.
   ============================================================ */

const RECIPES = {
  'ui-click': { lp: 4200, air: 0.1, render: (b) => tock(b, { freq: 200, peak: 0.7, decay: 0.1, air: 0.07, definition: 0.18 }) },
  'ui-hover': { lp: 5200, air: 0.12, render: (b) => addNoise(b, { duration: 0.05, from: 2600, to: 1500, q: 0.8, peak: 0.5, attack: 0.006, curve: 9 }) },
  'ui-success': { lp: 5600, air: 0.22, render: (b) => phrase(b, { freqs: [523.25, 783.99], spacing: 0.1, peak: 0.55, decay: 0.5 }) },
  'ui-error': { lp: 3200, air: 0.14, render: (b) => thud(b, { freq: 196, peak: 0.65, duration: 0.34 }) },
  'ui-notify': { lp: 5400, air: 0.2, render: (b) => mallet(b, { freq: 659.25, peak: 0.55, decay: 0.42 }) },
  'ui-alert': {
    lp: 4600, air: 0.18,
    render: (b) => [0, 0.18, 0.36].forEach((at, i) => horn(b, { at, freq: [392, 392, 523.25][i], duration: 0.34, peak: 0.5 })),
  },
  'ui-whoosh': { lp: 4400, air: 0.16, render: (b) => airSwipe(b, { duration: 0.34, from: 480, to: 1900, peak: 0.55, q: 1.1 }) },
  'ui-boing': { lp: 4000, air: 0.14, render: (b) => bounce(b, { freq: 300, peak: 0.6, count: 4 }) },
  'ui-wobble': { lp: 4200, air: 0.16, render: (b) => wobble(b, { freq: 300, duration: 0.5, rate: 12, depth: 0.18, peak: 0.6 }) },
  'ui-zap': { lp: 3800, air: 0.1, render: (b) => crackle(b, { duration: 0.26, peak: 0.5 }) },
  'ui-celebration': {
    lp: 5200, air: 0.3,
    render: (b) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => horn(b, { at: i * 0.13, freq, duration: 0.6, peak: 0.42 }));
      phrase(b, { freqs: [1046.5, 1318.5], at: 0.52, spacing: 0.08, peak: 0.3, decay: 0.6 });
    },
  },
  'ui-applause': { lp: 3600, air: 0.24, render: (b) => crowd(b, { duration: 1.7, peak: 0.6 }) },
  'ui-level-up': { lp: 5400, air: 0.26, render: (b) => phrase(b, { freqs: [523.25, 659.25, 783.99, 1046.5], spacing: 0.13, peak: 0.5, decay: 0.5 }) },
  'ui-achievement': {
    lp: 5200, air: 0.34,
    render: (b) => {
      phrase(b, { freqs: [659.25, 987.77], spacing: 0.12, peak: 0.5, decay: 0.8 });
      mallet(b, { at: 0.3, freq: 1318.5, peak: 0.22, decay: 0.9 });
    },
  },
  'ui-xp': { lp: 5000, air: 0.14, render: (b) => tock(b, { freq: 560, peak: 0.5, decay: 0.08, air: 0.04 }) },
  'ui-power-up': {
    lp: 4800, air: 0.16,
    render: (b) => {
      addTone(b, { duration: 0.42, freq: 220, toFreq: 660, peak: 0.55, attack: 0.014, curve: 2.6 });
      addTone(b, { duration: 0.34, freq: 440, toFreq: 1320, peak: 0.2, attack: 0.016, curve: 3 });
    },
  },
  'ui-game-over': {
    lp: 3200, air: 0.2,
    render: (b) => [0, 0.26, 0.52].forEach((at, i) => horn(b, { at, freq: [294, 247, 196][i], duration: 0.5, peak: 0.45 })),
  },
  'ui-suspense': {
    lp: 3400, air: 0.22,
    render: (b) => {
      addNoise(b, { duration: 1.8, from: 260, to: 900, q: 0.7, peak: 0.4, attack: 0.4, curve: 0.4 });
      addTone(b, { duration: 1.8, freq: 110, toFreq: 220, peak: 0.35, attack: 0.5, curve: 0.5 });
    },
  },
  'ui-coin': { lp: 5400, air: 0.2, render: (b) => phrase(b, { freqs: [880, 1174.66], spacing: 0.07, peak: 0.5, decay: 0.34 }) },
  'ui-gem': { lp: 6000, air: 0.28, render: (b) => mallet(b, { freq: 1174.66, peak: 0.5, decay: 0.55 }) },
  'ui-reveal': {
    lp: 5600, air: 0.3,
    render: (b) => {
      airSwipe(b, { duration: 0.6, from: 400, to: 2400, peak: 0.34, q: 1 });
      phrase(b, { freqs: [659.25, 987.77, 1318.5], at: 0.22, spacing: 0.1, peak: 0.34, decay: 0.5 });
    },
  },
  'ui-start': {
    lp: 4800, air: 0.2,
    render: (b) => {
      addNoise(b, { duration: 0.5, from: 300, to: 1400, q: 0.8, peak: 0.3, attack: 0.2, curve: 1 });
      horn(b, { at: 0.42, freq: 261.63, duration: 0.5, peak: 0.55 });
      mallet(b, { at: 0.42, freq: 523.25, peak: 0.3, decay: 0.5 });
    },
  },
  'ui-join': { lp: 5200, air: 0.18, render: (b) => phrase(b, { freqs: [523.25, 783.99], spacing: 0.08, peak: 0.5, decay: 0.3 }) },
  'ui-leave': { lp: 4400, air: 0.18, render: (b) => phrase(b, { freqs: [587.33, 392], spacing: 0.09, peak: 0.45, decay: 0.32 }) },
  'invite-received': {
    lp: 5400, air: 0.26,
    render: (b) => {
      phrase(b, { freqs: [659.25, 880], spacing: 0.16, peak: 0.5, decay: 0.6 });
      mallet(b, { at: 0.5, freq: 1046.5, peak: 0.24, decay: 0.5 });
    },
  },
  'invite-sent': {
    lp: 5000, air: 0.2,
    render: (b) => {
      airSwipe(b, { duration: 0.4, from: 700, to: 2600, peak: 0.45, q: 1.3 });
      mallet(b, { at: 0.28, freq: 1318.5, peak: 0.2, decay: 0.3 });
    },
  },
  'invite-accepted': { lp: 5400, air: 0.22, render: (b) => phrase(b, { freqs: [587.33, 880], spacing: 0.12, peak: 0.5, decay: 0.45 }) },
  'invite-declined': { lp: 4000, air: 0.18, render: (b) => phrase(b, { freqs: [493.88, 349.23], spacing: 0.1, peak: 0.42, decay: 0.34 }) },
  'message-in': { lp: 4600, air: 0.14, render: (b) => tock(b, { freq: 420, peak: 0.5, decay: 0.11, air: 0.03 }) },
  'message-out': { lp: 4800, air: 0.14, render: (b) => tock(b, { freq: 520, peak: 0.42, decay: 0.08, air: 0.03 }) },
  'vote-up': {
    lp: 4600, air: 0.16,
    render: (b) => {
      tock(b, { freq: 260, peak: 0.6, decay: 0.12, air: 0.04 });
      addTone(b, { start: 0.05, duration: 0.14, freq: 330, toFreq: 520, peak: 0.22, attack: 0.008, curve: 4 });
    },
  },
  'vote-down': {
    lp: 3800, air: 0.16,
    render: (b) => {
      tock(b, { freq: 240, peak: 0.55, decay: 0.12, air: 0.04 });
      addTone(b, { start: 0.05, duration: 0.16, freq: 300, toFreq: 180, peak: 0.22, attack: 0.008, curve: 4 });
    },
  },
  'ui-countdown': { lp: 4200, air: 0.1, render: (b) => tock(b, { freq: 340, peak: 0.55, decay: 0.08, air: 0.04 }) },
  'quiz-correct': { lp: 5600, air: 0.24, render: (b) => phrase(b, { freqs: [783.99, 1046.5], spacing: 0.14, peak: 0.55, decay: 0.5 }) },
  'quiz-wrong': {
    lp: 3200, air: 0.16,
    render: (b) => {
      thud(b, { freq: 185, peak: 0.6, duration: 0.26 });
      thud(b, { at: 0.24, freq: 165, peak: 0.5, duration: 0.3 });
    },
  },
  'quiz-timeup': {
    lp: 4200, air: 0.3,
    render: (b) => [0, 0.22, 0.44].forEach((at) => mallet(b, { at, freq: 659.25, peak: 0.5 - at * 0.4, decay: 0.6 })),
  },
  'quiz-rush': { lp: 4200, air: 0.12, render: (b) => ticking(b, { duration: 1.85, peak: 0.5, count: 16 }) },
  'quiz-streak': {
    lp: 5600, air: 0.26,
    render: (b) => phrase(b, { freqs: [659.25, 830.61, 987.77, 1318.5], spacing: 0.1, peak: 0.5, decay: 0.45 }),
  },
  'process-rewind': { lp: 3000, air: 0.06, loop: true, render: (b, d) => whirr(b, { duration: d, peak: 0.5 }) },
  'process-loading': { lp: 2600, air: 0.08, loop: true, render: (b, d) => hum(b, { duration: d, peak: 0.45 }) },
  'process-done': {
    lp: 5000, air: 0.22,
    render: (b) => {
      tock(b, { freq: 170, peak: 0.55, decay: 0.14, air: 0.06 });
      mallet(b, { at: 0.16, freq: 783.99, peak: 0.45, decay: 0.55 });
    },
  },
  'mode-imitation': {
    lp: 5200, air: 0.24,
    render: (b) => {
      tock(b, { freq: 300, peak: 0.5, decay: 0.1, air: 0.06 });
      phrase(b, { freqs: [523.25, 659.25, 880], at: 0.18, spacing: 0.12, peak: 0.42, decay: 0.5 });
    },
  },
  'mode-undercover': {
    lp: 3600, air: 0.3,
    render: (b) => {
      [0, 0.14, 0.28, 0.42].forEach((at, i) => mallet(b, { at, freq: [294, 349.23, 294, 233.08][i], peak: 0.4, decay: 0.24 }));
      addTone(b, { start: 0.6, duration: 0.5, freq: 587.33, toFreq: 493.88, peak: 0.24, attack: 0.05, curve: 2.4 });
    },
  },
  'mode-quiz': {
    lp: 5400, air: 0.24,
    render: (b) => {
      horn(b, { freq: 392, duration: 0.4, peak: 0.45 });
      phrase(b, { freqs: [783.99, 1046.5], at: 0.34, spacing: 0.12, peak: 0.42, decay: 0.5 });
    },
  },
  'mode-blurrush': {
    lp: 5000, air: 0.2,
    render: (b) => {
      tock(b, { freq: 900, peak: 0.45, decay: 0.05, air: 0.12 });
      airSwipe(b, { at: 0.1, duration: 0.4, from: 700, to: 2400, peak: 0.34, q: 1.4 });
      mallet(b, { at: 0.5, freq: 1046.5, peak: 0.36, decay: 0.4 });
    },
  },
  'mode-monopoly': {
    lp: 4000, air: 0.22,
    render: (b) => {
      [0, 0.09, 0.17, 0.28].forEach((at) => tock(b, { at, freq: 180 + random() * 120, peak: 0.4, decay: 0.07, air: 0.05 }));
      phrase(b, { freqs: [392, 523.25, 659.25], at: 0.44, spacing: 0.12, peak: 0.4, decay: 0.5 });
    },
  },
  'mode-audiophone': {
    lp: 3400, air: 0.26,
    render: (b) => {
      [0, 0.34].forEach((at) => {
        for (let k = 0; k < 6; k += 1) {
          mallet(b, { at: at + k * 0.035, freq: 880, peak: 0.22, decay: 0.1 });
        }
      });
      addNoise(b, { start: 0.72, duration: 0.5, from: 2000, to: 500, q: 1.2, peak: 0.34, attack: 0.05, curve: 2 });
    },
  },
  'mode-blindtest': {
    lp: 5200, air: 0.24,
    render: (b) => {
      addNoise(b, { duration: 0.22, from: 1600, to: 600, q: 1.6, peak: 0.4, attack: 0.01, curve: 4 });
      phrase(b, { freqs: [523.25, 659.25, 783.99, 987.77], at: 0.24, spacing: 0.07, peak: 0.4, decay: 0.55 });
    },
  },
  'mode-mimic': {
    lp: 5200, air: 0.26,
    render: (b) => {
      tock(b, { freq: 240, peak: 0.45, decay: 0.12, air: 0.08 });
      phrase(b, { freqs: [587.33, 880, 1174.66], at: 0.2, spacing: 0.11, peak: 0.42, decay: 0.5 });
    },
  },
};

/* ============================================================
   Rendu
   ============================================================ */

const raw = (await readFile(MANIFEST, 'utf8')).replace(/^\uFEFF/, '');
const manifest = JSON.parse(raw);
const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const onlyIds = new Set(args);
const selected = onlyIds.size > 0
  ? manifest.samples.filter((sample) => onlyIds.has(sample.id))
  : manifest.samples;

if (selected.length === 0) {
  console.error('Aucun échantillon sélectionné.');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const report = [];
for (const sample of selected) {
  const recipe = RECIPES[sample.id];
  if (!recipe) {
    console.error(`! ${sample.id} — pas de recette`);
    process.exitCode = 1;
    continue;
  }

  /* Une graine par identifiant : le bruit est reproductible fichier par fichier. */
  reseed([...sample.id].reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7));

  const buffer = makeBuffer(sample.durationSeconds);
  recipe.render(buffer, sample.durationSeconds);

  lowpass(buffer, recipe.lp);
  air(buffer, recipe.air ?? 0);
  removeDc(buffer);
  if (recipe.loop) seamless(buffer);
  const rawPeak = normalize(buffer);
  guardEdges(buffer, recipe.loop ? 0.0005 : 0.004);

  await writeFile(resolve(OUT_DIR, `${sample.id}.wav`), encodeWav(buffer));

  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 1) sumSquares += buffer[i] * buffer[i];
  report.push({
    id: sample.id,
    seconds: sample.durationSeconds,
    kb: Math.round((44 + buffer.length * 2) / 1024),
    rms: Math.round(Math.sqrt(sumSquares / buffer.length) * 1000) / 1000,
    headroomBeforeNormalize: Math.round(rawPeak * 100) / 100,
  });
  console.log(`+ ${sample.id}  ${sample.durationSeconds}s  ${report.at(-1).kb} Ko`);
}

const totalKb = report.reduce((sum, entry) => sum + entry.kb, 0);
console.log(`\n${report.length} son(s) rendu(s), ${totalKb} Ko au total, 24 kHz mono.`);
