/**
 * Voice filters — audio FX for the imitation phase.
 *
 * Two ways an FX is applied:
 *
 *  1. **Live FX** — Web Audio chain plugged between the mic stream and the
 *     MediaRecorder. The user hears the effect in real time and the saved
 *     file already contains it. Used for `robot`, `echo`, `underwater`,
 *     `megaphone` — pure filtering / distortion FX that work on a stream.
 *
 *  2. **Post-process FX** — applied to the recorded blob after the user
 *     stops recording. SoundTouch conserve la durée pour les voix fixes ;
 *     Autotune détecte F0 avec YIN puis rend des fenêtres contextuelles courtes
 *     vers la note chromatique la plus proche. Le joueur entend le résultat
 *     après l'arrêt, avant de décider de l'envoyer.
 */

export type VoiceFilterId =
  | 'none'
  | 'robot'
  | 'autotune'
  | 'helium'
  | 'deep'
  | 'echo'
  | 'underwater'
  | 'megaphone'
  | 'telephone'
  | 'chorus'
  | 'tremolo'
  | 'vibrato'
  | 'alien'
  | 'radio'
  | 'monstre'
  | 'lutin';

/**
 * Nombre d'effets cumulables simultanément.
 *
 * Au-delà de trois, les effets se masquent les uns les autres : la voix devient
 * une bouillie où l'on ne reconnaît plus aucun des filtres choisis. La limite
 * protège le résultat, pas les performances.
 */
export const MAX_STACKED_FILTERS = 3;

export interface VoiceFilterDef {
  id: VoiceFilterId;
  label: string;
  emoji: string;
  description: string;
  color: string;
  /** True when the effect requires offline post-processing of the blob. */
  postProcess?: boolean;
}

export const VOICE_FILTERS: VoiceFilterDef[] = [
  { id: 'none', label: 'Naturel', emoji: '🎤', description: 'Aucun effet', color: '#9ca3af' },
  { id: 'robot', label: 'Robot', emoji: '🤖', description: 'Voix robotique métallique', color: '#06b6d4' },
  {
    id: 'autotune',
    label: 'Autotune',
    emoji: '🎶',
    description: 'Correction chromatique nette après l’enregistrement',
    color: '#ec4899',
    postProcess: true,
  },
  { id: 'helium', label: 'Hélium', emoji: '🐿️', description: 'Voix aiguë (chipmunk)', color: '#fbbf24', postProcess: true },
  { id: 'deep', label: 'Grave', emoji: '🦁', description: 'Voix profonde de mafieux', color: '#a855f7', postProcess: true },
  { id: 'echo', label: 'Écho', emoji: '🌀', description: 'Réverbération cathédrale', color: '#f472b6' },
  { id: 'underwater', label: 'Sous-marin', emoji: '🌊', description: 'Voix étouffée liquide', color: '#3b82f6' },
  { id: 'megaphone', label: 'Mégaphone', emoji: '📢', description: 'Distordu mégaphone', color: '#ef4444' },
  { id: 'telephone', label: 'Téléphone', emoji: '📞', description: 'Bande étroite du combiné, sans distorsion', color: '#64748b' },
  { id: 'chorus', label: 'Chorale', emoji: '👥', description: 'Plusieurs voix désaccordées à l\'unisson', color: '#22d3ee' },
  { id: 'tremolo', label: 'Trémolo', emoji: '〰️', description: 'Volume qui pulse régulièrement', color: '#f59e0b' },
  { id: 'vibrato', label: 'Vibrato', emoji: '🎻', description: 'Hauteur qui ondule, voix de chanteur', color: '#c084fc' },
  { id: 'alien', label: 'Alien', emoji: '👽', description: 'Modulation haute et ondulante', color: '#4ade80' },
  { id: 'radio', label: 'Radio', emoji: '📻', description: 'Vieux poste, bande étroite et souffle', color: '#d97706' },
  { id: 'monstre', label: 'Monstre', emoji: '👹', description: 'Très grave, caverneux', color: '#dc2626', postProcess: true },
  { id: 'lutin', label: 'Lutin', emoji: '🧚', description: 'Très aigu, minuscule', color: '#f0abfc', postProcess: true },
];

/** Décalage de hauteur, en demi-tons, des effets appliqués après coup. */
const SEMITONES: Partial<Record<VoiceFilterId, number>> = {
  helium: 6,
  lutin: 10,
  deep: -5,
  monstre: -9,
};

/** Les transformations de hauteur fixes ne se combinent pas avec Autotune. */
const FIXED_PITCH_FILTERS = new Set<VoiceFilterId>([
  'helium',
  'lutin',
  'deep',
  'monstre',
]);

/** Effets absents du flux direct et calculés une fois la prise terminée. */
const POST_PROCESS_FILTERS = new Set<VoiceFilterId>([
  ...FIXED_PITCH_FILTERS,
  'autotune',
]);

export const hasAutotune = (filters: VoiceFilterId | VoiceFilterId[]): boolean =>
  asList(filters).includes('autotune');

/**
 * Vérifie un ajout dans le sélecteur.
 *
 * Autotune corrige déjà la hauteur image par image. Lui ajouter un décalage
 * Hélium/Grave produirait une cible ambiguë et une seconde dégradation. Les
 * effets de timbre (Écho, Radio, Chorale…) restent, eux, librement cumulables.
 */
export const canStackVoiceFilter = (
  filters: VoiceFilterId | VoiceFilterId[],
  candidate: VoiceFilterId,
): boolean => {
  if (candidate === 'none') return true;
  const selected = asList(filters);
  if (selected.includes(candidate)) return true;
  if (candidate === 'autotune') {
    return !selected.some((id) => FIXED_PITCH_FILTERS.has(id));
  }
  return !FIXED_PITCH_FILTERS.has(candidate) || !selected.includes('autotune');
};

/**
 * Bornes du cumul de hauteur.
 *
 * Rien n'empêche de choisir Grave et Monstre ensemble, ce qui donnerait −14
 * demi-tons : à ce point la voix n'est plus qu'un grondement inintelligible.
 * On additionne donc, mais on borne.
 */
const MIN_SEMITONES = -12;
const MAX_SEMITONES = 12;

/* ============================================================
   LIVE FX — applied to the MediaStream during recording
============================================================ */

/** Normalise l'entrée : un identifiant seul reste accepté. */
const asList = (filters: VoiceFilterId | VoiceFilterId[]): VoiceFilterId[] =>
  (Array.isArray(filters) ? filters : [filters]).filter((id) => id !== 'none');

/**
 * L'architecture enregistre d'abord les effets directs, puis corrige la hauteur
 * du blob. Autotune est donc toujours placé en dernier pour que l'ordre affiché
 * corresponde exactement à l'ordre DSP réel.
 */
export const normalizeVoiceFilterOrder = (
  filters: VoiceFilterId | VoiceFilterId[],
): VoiceFilterId[] => {
  const selected = asList(filters);
  return selected.includes('autotune')
    ? [...selected.filter((id) => id !== 'autotune'), 'autotune']
    : selected;
};

/** Les effets qui ont une chaîne temps réel, dans l'ordre choisi. */
const liveFilters = (filters: VoiceFilterId | VoiceFilterId[]): VoiceFilterId[] =>
  normalizeVoiceFilterOrder(filters).filter((id) => !POST_PROCESS_FILTERS.has(id));

/**
 * Un effet temps réel, sous forme de bloc raccordable.
 *
 * C'est ce qui rend le cumul possible. L'ancienne version branchait chaque
 * effet directement de la source vers la sortie : deux effets choisis ensemble
 * jouaient donc en parallèle, chacun sur la voix sèche, et l'on entendait deux
 * versions superposées au lieu d'une voix traitée deux fois. Avec une entrée et
 * une sortie explicites, les blocs se mettent en série.
 */
interface VoiceEffect {
  input: AudioNode;
  output: AudioNode;
  dispose: () => void;
}

export const applyVoiceFilters = (
  inputStream: MediaStream,
  filters: VoiceFilterId | VoiceFilterId[],
): { stream: MediaStream; dispose: () => void } => {
  const live = liveFilters(filters);
  /*
   * Aucun effet temps réel : on rend le flux d'entrée TEL QUEL.
   *
   * C'est le cas de `none` et des effets de hauteur, qui s'appliquent après
   * l'enregistrement. L'appelant doit savoir que le flux renvoyé peut être le
   * flux du micro lui-même — l'arrêter couperait le micro.
   */
  if (live.length === 0) {
    return { stream: inputStream, dispose: () => {} };
  }

  const context = new AudioContext();
  const source = context.createMediaStreamSource(inputStream);
  const destination = context.createMediaStreamDestination();

  const effects: VoiceEffect[] = [];
  for (const id of live.slice(0, MAX_STACKED_FILTERS)) {
    const effect = buildEffect(context, id);
    if (effect) effects.push(effect);
  }

  // Mise en série : la sortie de chacun alimente l'entrée du suivant.
  let tail: AudioNode = source;
  for (const effect of effects) {
    tail.connect(effect.input);
    tail = effect.output;
  }

  /*
   * Limiteur de sortie. Chaque effet ajoute du gain — l'écho empile ses
   * reprises, le chorus superpose trois voix — donc un cumul sature vite, et une
   * saturation s'entend comme un grésillement désagréable.
   */
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 10;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  tail.connect(limiter);
  limiter.connect(destination);

  return {
    stream: destination.stream,
    dispose: () => {
      for (const effect of effects) {
        try { effect.dispose(); } catch { /* graphe peut déjà être défait */ }
      }
      try { source.disconnect(); } catch { /* noop */ }
      try { limiter.disconnect(); } catch { /* noop */ }
      try { destination.disconnect(); } catch { /* noop */ }
      if (context.state !== 'closed') {
        context.close().catch(() => {});
      }
    },
  };
};

/** Ancienne signature à un seul filtre. Conservée pour les appels existants. */
export const applyVoiceFilter = (
  inputStream: MediaStream,
  filter: VoiceFilterId,
): { stream: MediaStream; dispose: () => void } => applyVoiceFilters(inputStream, filter);

const buildLiveChain = (
  ctx: AudioContext,
  source: AudioNode,
  output: AudioNode,
  filter: VoiceFilterId,
): (() => void) => {
  switch (filter) {
    case 'robot': {
      // Proper ring modulation: multiply the source by a 130 Hz sine carrier.
      // We pre-emphasise the signal with a peaking filter at 1.2 kHz to keep
      // intelligibility, then bandpass the result to the classic "telephone
      // robot" range (300-3500 Hz), and add a touch of chorus by mixing the
      // ring-modded signal with a slightly delayed dry copy.
      const preEmph = ctx.createBiquadFilter();
      preEmph.type = 'peaking';
      preEmph.frequency.value = 1200;
      preEmph.Q.value = 1.5;
      preEmph.gain.value = 6;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1500;
      bandpass.Q.value = 0.7;

      // The ring modulation: multiplier = source * carrier
      // Web Audio's GainNode multiplies its input by gain.value, so if we
      // drive gain.value with a -1..+1 oscillator we get ring modulation.
      const ring = ctx.createGain();
      ring.gain.value = 0;
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = 130;
      carrier.connect(ring.gain);

      // Chorus copy: dry signal delayed 18 ms, mixed at 35%
      const chorusDelay = ctx.createDelay(0.05);
      chorusDelay.delayTime.value = 0.018;
      const chorusGain = ctx.createGain();
      chorusGain.gain.value = 0.35;

      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.85;

      // Routing
      source.connect(preEmph);
      preEmph.connect(ring);
      ring.connect(bandpass);
      bandpass.connect(wetGain);
      wetGain.connect(output);

      preEmph.connect(chorusDelay);
      chorusDelay.connect(chorusGain);
      chorusGain.connect(output);

      carrier.start();
      return () => {
        try { carrier.stop(); } catch { /* noop */ }
      };
    }

    case 'echo': {
      // 3 delay taps for a thick cathedral reverb without an external IR.
      // Tap 1: 180 ms, gain 0.55 — primary reflection
      // Tap 2: 360 ms, gain 0.35 — secondary, fed back into tap 1
      // Tap 3: 540 ms, gain 0.20 — tail
      const dry = ctx.createGain();
      dry.gain.value = 0.7;

      const mkTap = (delayMs: number, fbGain: number, wetGain: number) => {
        const d = ctx.createDelay(2);
        d.delayTime.value = delayMs / 1000;
        const fb = ctx.createGain();
        fb.gain.value = fbGain;
        const w = ctx.createGain();
        w.gain.value = wetGain;
        // Slight high-cut on the feedback so the tail darkens like a real room
        const tone = ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.frequency.value = 4500;
        d.connect(tone);
        tone.connect(fb);
        fb.connect(d);
        tone.connect(w);
        return { input: d, output: w };
      };

      const tap1 = mkTap(180, 0.30, 0.55);
      const tap2 = mkTap(360, 0.35, 0.35);
      const tap3 = mkTap(540, 0.25, 0.20);

      source.connect(dry);
      dry.connect(output);

      source.connect(tap1.input);
      source.connect(tap2.input);
      source.connect(tap3.input);
      tap1.output.connect(output);
      tap2.output.connect(output);
      tap3.output.connect(output);

      return () => {};
    }

    case 'underwater': {
      // Aggressive lowpass + LFO sweep for the gurgling effect, plus a short
      // delay to give the impression of muffled bouncing.
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 700;
      lowpass.Q.value = 4;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 250;
      lfo.connect(lfoGain);
      lfoGain.connect(lowpass.frequency);

      const slap = ctx.createDelay(0.2);
      slap.delayTime.value = 0.07;
      const slapGain = ctx.createGain();
      slapGain.gain.value = 0.35;

      const wet = ctx.createGain();
      wet.gain.value = 0.95;

      source.connect(lowpass);
      lowpass.connect(wet);
      wet.connect(output);

      lowpass.connect(slap);
      slap.connect(slapGain);
      slapGain.connect(output);

      lfo.start();
      return () => {
        try { lfo.stop(); } catch { /* noop */ }
      };
    }

    case 'megaphone': {
      // Tight bandpass (300-3500 Hz) + waveshaper distortion + slight delay
      // for the "outdoor announcement" feel. The distortion curve is a soft
      // tanh-style clipper rather than the previous steep curve, which
      // sounded harsh and hissy.
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 350;
      hp.Q.value = 0.8;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3500;
      lp.Q.value = 0.8;

      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 1800;
      presence.Q.value = 1.2;
      presence.gain.value = 8;

      const distortion = ctx.createWaveShaper();
      distortion.curve = makeSoftClipCurve(8) as Float32Array<ArrayBuffer>;
      distortion.oversample = '4x';

      const slap = ctx.createDelay(0.1);
      slap.delayTime.value = 0.04;
      const slapGain = ctx.createGain();
      slapGain.gain.value = 0.3;

      const out = ctx.createGain();
      out.gain.value = 0.85;

      source.connect(hp);
      hp.connect(lp);
      lp.connect(presence);
      presence.connect(distortion);
      distortion.connect(out);
      out.connect(output);

      distortion.connect(slap);
      slap.connect(slapGain);
      slapGain.connect(output);

      return () => {};
    }

    case 'telephone': {
      // Bande du combiné : 300–3400 Hz, avec un creux de présence pour la
      // netteté. Volontairement SANS distorsion, c'est ce qui le distingue du
      // mégaphone.
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 300;
      hp.Q.value = 0.7;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3400;
      lp.Q.value = 0.7;

      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 2000;
      presence.Q.value = 1.4;
      presence.gain.value = 5;

      source.connect(hp);
      hp.connect(lp);
      lp.connect(presence);
      presence.connect(output);
      return () => {};
    }

    case 'chorus': {
      /*
       * Trois copies légèrement retardées, chacune désaccordée par un oscillateur
       * lent de fréquence différente. Les battements entre elles donnent
       * l'impression de plusieurs personnes à l'unisson plutôt que d'un écho.
       */
      const dry = ctx.createGain();
      dry.gain.value = 0.6;
      source.connect(dry);
      dry.connect(output);

      const oscillators: OscillatorNode[] = [];
      const voices: Array<{ delayMs: number; rate: number; depthMs: number }> = [
        { delayMs: 14, rate: 0.28, depthMs: 3.2 },
        { delayMs: 21, rate: 0.41, depthMs: 2.6 },
        { delayMs: 29, rate: 0.19, depthMs: 3.8 },
      ];

      for (const voice of voices) {
        const delay = ctx.createDelay(0.2);
        delay.delayTime.value = voice.delayMs / 1000;

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = voice.rate;
        const depth = ctx.createGain();
        depth.gain.value = voice.depthMs / 1000;
        lfo.connect(depth);
        depth.connect(delay.delayTime);

        const wet = ctx.createGain();
        wet.gain.value = 0.34;

        source.connect(delay);
        delay.connect(wet);
        wet.connect(output);

        lfo.start();
        oscillators.push(lfo);
      }

      return () => {
        for (const lfo of oscillators) {
          try { lfo.stop(); } catch { /* déjà arrêté */ }
        }
      };
    }

    case 'tremolo': {
      /*
       * Le volume pulse. Un oscillateur sort entre −1 et +1, donc le brancher
       * seul sur un gain le ferait passer en négatif — ce qui inverserait la
       * phase au lieu de baisser le son. On garde donc un gain de base et l'on
       * n'ajoute qu'une modulation d'amplitude moindre.
       */
      const shaped = ctx.createGain();
      shaped.gain.value = 0.72;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5.5;
      const depth = ctx.createGain();
      depth.gain.value = 0.28;
      lfo.connect(depth);
      depth.connect(shaped.gain);

      source.connect(shaped);
      shaped.connect(output);

      lfo.start();
      return () => {
        try { lfo.stop(); } catch { /* noop */ }
      };
    }

    case 'vibrato': {
      // La hauteur ondule : un retard très court dont le temps est modulé
      // produit exactement ça, sans synthèse granulaire.
      const delay = ctx.createDelay(0.05);
      delay.delayTime.value = 0.006;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5.2;
      const depth = ctx.createGain();
      depth.gain.value = 0.0022;
      lfo.connect(depth);
      depth.connect(delay.delayTime);

      source.connect(delay);
      delay.connect(output);

      lfo.start();
      return () => {
        try { lfo.stop(); } catch { /* noop */ }
      };
    }

    case 'alien': {
      /*
       * Modulation en anneau à une porteuse bien plus haute que le robot
       * (420 Hz contre 130), ce qui donne un timbre métallique inhumain plutôt
       * que mécanique, plus une ondulation de hauteur par-dessus.
       */
      const ring = ctx.createGain();
      ring.gain.value = 0;
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = 420;
      carrier.connect(ring.gain);

      const warble = ctx.createDelay(0.05);
      warble.delayTime.value = 0.008;
      const warbleLfo = ctx.createOscillator();
      warbleLfo.type = 'sine';
      warbleLfo.frequency.value = 7.5;
      const warbleDepth = ctx.createGain();
      warbleDepth.gain.value = 0.003;
      warbleLfo.connect(warbleDepth);
      warbleDepth.connect(warble.delayTime);

      const tone = ctx.createBiquadFilter();
      tone.type = 'bandpass';
      tone.frequency.value = 1600;
      tone.Q.value = 0.6;

      const wet = ctx.createGain();
      wet.gain.value = 0.9;
      // Un peu de voix sèche conservée, sinon les paroles deviennent
      // incompréhensibles et le jeu perd son intérêt.
      const dry = ctx.createGain();
      dry.gain.value = 0.25;

      source.connect(warble);
      warble.connect(ring);
      ring.connect(tone);
      tone.connect(wet);
      wet.connect(output);
      source.connect(dry);
      dry.connect(output);

      carrier.start();
      warbleLfo.start();
      return () => {
        try { carrier.stop(); } catch { /* noop */ }
        try { warbleLfo.stop(); } catch { /* noop */ }
      };
    }

    case 'radio': {
      // Vieux poste : bande étroite, médiums saillants, écrêtage très léger.
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 420;
      hp.Q.value = 0.9;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2800;
      lp.Q.value = 0.9;

      const honk = ctx.createBiquadFilter();
      honk.type = 'peaking';
      honk.frequency.value = 1300;
      honk.Q.value = 2;
      honk.gain.value = 9;

      const drive = ctx.createWaveShaper();
      // Écrêtage doux et modéré : à 3 on garde la voix lisible.
      drive.curve = makeSoftClipCurve(3) as Float32Array<ArrayBuffer>;
      drive.oversample = '2x';

      const out = ctx.createGain();
      out.gain.value = 0.9;

      source.connect(hp);
      hp.connect(lp);
      lp.connect(honk);
      honk.connect(drive);
      drive.connect(out);
      out.connect(output);
      return () => {};
    }

    default:
      try { source.connect(output); } catch { /* noop */ }
      return () => {};
  }
};

/**
 * Emballe un effet en bloc raccordable.
 *
 * Les corps d'effets ci-dessus respectent déjà un nœud d'entrée et un nœud de
 * sortie : il suffit de leur en fournir deux à soi pour qu'ils deviennent
 * composables, sans toucher à leur réglage.
 */
const buildEffect = (ctx: AudioContext, filter: VoiceFilterId): VoiceEffect | null => {
  try {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const cleanup = buildLiveChain(ctx, input, output, filter);
    return {
      input,
      output,
      dispose: () => {
        cleanup();
        try { input.disconnect(); } catch { /* noop */ }
        try { output.disconnect(); } catch { /* noop */ }
      },
    };
  } catch {
    // Un effet qui ne se construit pas ne doit pas emporter les autres.
    return null;
  }
};

/* ============================================================
   POST-PROCESS FX — applied to the recorded blob after stop
============================================================ */

/**
 * Returns true if the given filter requires post-processing the blob after
 * MediaRecorder finishes. Live FX filters return false.
 */
export const requiresPostProcessing = (
  filters: VoiceFilterId | VoiceFilterId[],
): boolean => asList(filters).some((id) => POST_PROCESS_FILTERS.has(id));

/**
 * Décalage de hauteur résultant du cumul, en demi-tons.
 *
 * Les effets s'additionnent : Hélium (+6) avec Grave (−5) donne +1, soit une
 * voix presque naturelle. C'est le résultat correct — le joueur a choisi deux
 * effets qui se contrarient. La somme est simplement bornée, parce qu'au-delà
 * d'une octave la voix cesse d'être intelligible.
 */
export const combinedSemitones = (
  filters: VoiceFilterId | VoiceFilterId[],
): number => {
  const total = asList(filters).reduce((sum, id) => sum + (SEMITONES[id] ?? 0), 0);
  return Math.max(MIN_SEMITONES, Math.min(MAX_SEMITONES, total));
};

/** Libellés des effets retenus, dans l'ordre, pour l'affichage. */
export const describeFilters = (
  filters: VoiceFilterId | VoiceFilterId[],
): VoiceFilterDef[] => {
  const chosen = normalizeVoiceFilterOrder(filters);
  if (chosen.length === 0) {
    return [VOICE_FILTERS[0]];
  }
  return chosen
    .map((id) => VOICE_FILTERS.find((entry) => entry.id === id))
    .filter((entry): entry is VoiceFilterDef => Boolean(entry));
};

interface PitchCorrectionPoint {
  /** Position dans le tampon source original, en échantillons. */
  sample: number;
  /** Correction locale vers la note chromatique la plus proche. */
  semitones: number;
}

const AUTOTUNE_ANALYSIS_RATE = 12_000;
const AUTOTUNE_FRAME_SIZE = 1024;
const AUTOTUNE_HOP_SIZE = 768;
const AUTOTUNE_MIN_FREQUENCY = 70;
const AUTOTUNE_MAX_FREQUENCY = 700;
const AUTOTUNE_RMS_GATE = 0.012;
const AUTOTUNE_YIN_THRESHOLD = 0.16;
const AUTOTUNE_MIN_CONFIDENCE = 0.76;
const SOUNDTOUCH_INPUT_BATCH = 16_384;
const SOUNDTOUCH_OUTPUT_BLOCK = 2048;
const AUTOTUNE_RENDER_WINDOW = 16_384;
const AUTOTUNE_RENDER_HOP = 4096;
const AUTOTUNE_CROSSFADE = 512;

/** Rend périodiquement la main au navigateur pour garder l'annulation active. */
const yieldToMainThread = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/** Mélange les canaux sans toucher au tampon WebAudio d'origine. */
const mixToMono = (buffer: AudioBuffer, signal?: AbortSignal): Float32Array => {
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    for (let index = 0; index < input.length; index += 1) {
      if ((index & 16_383) === 0 && signal?.aborted) return new Float32Array();
      mono[index] += input[index];
    }
  }
  if (buffer.numberOfChannels > 1) {
    const scale = 1 / buffer.numberOfChannels;
    for (let index = 0; index < mono.length; index += 1) mono[index] *= scale;
  }
  return mono;
};

/**
 * Réduit uniquement la copie d'analyse à 12 kHz. La sortie audio garde son
 * échantillonnage natif ; cette réduction rend YIN assez léger sur mobile.
 */
const downsampleForPitchAnalysis = (
  samples: Float32Array,
  sourceRate: number,
  signal?: AbortSignal,
): { samples: Float32Array; sampleRate: number; sourceRatio: number } => {
  const sampleRate = Math.min(sourceRate, AUTOTUNE_ANALYSIS_RATE);
  const sourceRatio = sourceRate / sampleRate;
  if (sourceRatio <= 1) return { samples, sampleRate: sourceRate, sourceRatio: 1 };

  const output = new Float32Array(Math.floor(samples.length / sourceRatio));
  for (let index = 0; index < output.length; index += 1) {
    if ((index & 4095) === 0 && signal?.aborted) {
      return { samples: new Float32Array(), sampleRate, sourceRatio };
    }
    const start = Math.floor(index * sourceRatio);
    const end = Math.max(start + 1, Math.floor((index + 1) * sourceRatio));
    let sum = 0;
    for (let sourceIndex = start; sourceIndex < end && sourceIndex < samples.length; sourceIndex += 1) {
      sum += samples[sourceIndex];
    }
    output[index] = sum / Math.max(1, Math.min(end, samples.length) - start);
  }
  return { samples: output, sampleRate, sourceRatio };
};

/** Détection YIN locale : fréquence nulle pour le silence ou une trame ambiguë. */
const detectPitchYin = (
  samples: Float32Array,
  offset: number,
  sampleRate: number,
  difference: Float32Array,
  normalized: Float32Array,
): number | null => {
  let mean = 0;
  for (let index = 0; index < AUTOTUNE_FRAME_SIZE; index += 1) {
    mean += samples[offset + index];
  }
  mean /= AUTOTUNE_FRAME_SIZE;

  let energy = 0;
  for (let index = 0; index < AUTOTUNE_FRAME_SIZE; index += 1) {
    const centered = samples[offset + index] - mean;
    energy += centered * centered;
  }
  if (Math.sqrt(energy / AUTOTUNE_FRAME_SIZE) < AUTOTUNE_RMS_GATE) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / AUTOTUNE_MAX_FREQUENCY));
  const maxLag = Math.min(
    difference.length - 1,
    Math.ceil(sampleRate / AUTOTUNE_MIN_FREQUENCY),
  );
  const comparedSamples = AUTOTUNE_FRAME_SIZE - maxLag;

  difference[0] = 0;
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let index = 0; index < comparedSamples; index += 1) {
      const delta = samples[offset + index] - samples[offset + index + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  normalized[0] = 1;
  let cumulative = 0;
  for (let lag = 1; lag <= maxLag; lag += 1) {
    cumulative += difference[lag];
    normalized[lag] = cumulative > 0 ? (difference[lag] * lag) / cumulative : 1;
  }

  let bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    if (normalized[lag] >= AUTOTUNE_YIN_THRESHOLD) continue;
    while (lag + 1 <= maxLag && normalized[lag + 1] < normalized[lag]) lag += 1;
    bestLag = lag;
    break;
  }
  if (bestLag < 0 || 1 - normalized[bestLag] < AUTOTUNE_MIN_CONFIDENCE) return null;

  const left = normalized[Math.max(1, bestLag - 1)];
  const center = normalized[bestLag];
  const right = normalized[Math.min(maxLag, bestLag + 1)];
  const denominator = left - 2 * center + right;
  const refinedLag = Math.abs(denominator) > 1e-8
    ? bestLag + (left - right) / (2 * denominator)
    : bestLag;
  const frequency = sampleRate / refinedLag;
  return Number.isFinite(frequency) &&
    frequency >= AUTOTUNE_MIN_FREQUENCY &&
    frequency <= AUTOTUNE_MAX_FREQUENCY
    ? frequency
    : null;
};

/**
 * Produit une enveloppe de correction chromatique lissée. Chaque trame reste à
 * 100 % sur sa note cible (« hard tune »), mais les changements sont bornés
 * pour éviter les clics aux frontières des blocs SoundTouch.
 */
const analyzeAutotune = async (
  buffer: AudioBuffer,
  signal?: AbortSignal,
): Promise<PitchCorrectionPoint[]> => {
  const mono = mixToMono(buffer, signal);
  if (signal?.aborted || mono.length === 0) return [];
  const analysis = downsampleForPitchAnalysis(mono, buffer.sampleRate, signal);
  if (signal?.aborted || analysis.samples.length < AUTOTUNE_FRAME_SIZE) return [];

  const maxLag = Math.ceil(analysis.sampleRate / AUTOTUNE_MIN_FREQUENCY);
  const difference = new Float32Array(maxLag + 1);
  const normalized = new Float32Array(maxLag + 1);
  const points: PitchCorrectionPoint[] = [];
  let previousCorrection = 0;
  let previousWasVoiced = false;
  let voicedFrames = 0;

  for (
    let offset = 0;
    offset + AUTOTUNE_FRAME_SIZE <= analysis.samples.length;
    offset += AUTOTUNE_HOP_SIZE
  ) {
    if (signal?.aborted) return [];
    const frequency = detectPitchYin(
      analysis.samples,
      offset,
      analysis.sampleRate,
      difference,
      normalized,
    );

    let correction = 0;
    if (frequency !== null) {
      const midi = 69 + 12 * Math.log2(frequency / 440);
      const target = Math.round(midi) - midi;
      correction = previousWasVoiced
        ? previousCorrection + Math.max(-0.28, Math.min(0.28, target - previousCorrection))
        : target;
      previousWasVoiced = true;
      voicedFrames += 1;
    } else {
      // Revenir rapidement au naturel dans les consonnes et les silences évite
      // de tirer leur bruit vers la dernière note détectée.
      correction = previousCorrection * 0.35;
      if (Math.abs(correction) < 0.015) correction = 0;
      previousWasVoiced = false;
    }

    previousCorrection = correction;
    points.push({
      sample: Math.round((offset + AUTOTUNE_FRAME_SIZE / 2) * analysis.sourceRatio),
      semitones: correction,
    });

    if (points.length % 16 === 0) {
      await yieldToMainThread();
      if (signal?.aborted) return [];
    }
  }

  return voicedFrames > 0 ? points : [];
};

interface SoundTouchPipeline {
  stretch: {
    setParameters: (
      sampleRate: number,
      sequenceMs: number,
      seekWindowMs: number,
      overlapMs: number,
    ) => void;
  };
  pitchSemitones: number;
  tempo: number;
  rate: number;
}

interface SoundTouchSource {
  extract: (target: Float32Array, frames: number, position: number) => number;
}

interface SoundTouchFilter {
  extract: (target: Float32Array, frames: number) => number;
}

interface SoundTouchConstructor {
  new (): SoundTouchPipeline;
}

interface SimpleFilterConstructor {
  new (source: SoundTouchSource, pipeline: SoundTouchPipeline): SoundTouchFilter;
}

interface SoundTouchConstructors {
  SoundTouch: SoundTouchConstructor;
  SimpleFilter: SimpleFilterConstructor;
}

/**
 * Source stéréo virtuelle : une tranche du buffer, puis assez de silence pour
 * vider réellement SoundTouch. La version précédente s'arrêtait avant sa queue
 * et remplaçait jusqu'à plusieurs centaines de millisecondes par des zéros.
 */
const createPaddedSoundTouchSource = (
  buffer: AudioBuffer,
  startFrame: number,
  signalFrames: number,
  totalFrames: number,
): SoundTouchSource => {
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

  return {
    extract: (target, requestedFrames, position) => {
      const extracted = Math.max(0, Math.min(requestedFrames, totalFrames - position));
      target.fill(0, 0, extracted * 2);
      const sourceFrames = Math.max(0, Math.min(extracted, signalFrames - position));
      for (let frame = 0; frame < sourceFrames; frame += 1) {
        const sourceFrame = startFrame + position + frame;
        if (sourceFrame < 0 || sourceFrame >= buffer.length) continue;
        target[frame * 2] = left[sourceFrame];
        target[frame * 2 + 1] = right[sourceFrame];
      }
      return extracted;
    },
  };
};

/** Rend une tranche avec un décalage fixe et une queue SoundTouch vidée. */
const renderSoundTouchSlice = (
  buffer: AudioBuffer,
  startFrame: number,
  frameCount: number,
  semitones: number,
  constructors: SoundTouchConstructors,
  localWindow: boolean,
  signal?: AbortSignal,
): Float32Array => {
  const paddedFrames = Math.ceil(
    (frameCount + SOUNDTOUCH_INPUT_BATCH) / SOUNDTOUCH_INPUT_BATCH,
  ) * SOUNDTOUCH_INPUT_BATCH;
  const source = createPaddedSoundTouchSource(
    buffer,
    startFrame,
    frameCount,
    paddedFrames,
  );
  const soundTouch = new constructors.SoundTouch();
  // SoundTouchJS démarre sinon avec 44,1 kHz, même sur un micro 48 kHz.
  soundTouch.stretch.setParameters(
    buffer.sampleRate,
    localWindow ? 24 : 0,
    localWindow ? 12 : 0,
    localWindow ? 6 : 8,
  );
  soundTouch.pitchSemitones = semitones;
  soundTouch.tempo = 1;
  soundTouch.rate = 1;

  const filter = new constructors.SimpleFilter(source, soundTouch);
  const output = new Float32Array(frameCount * 2);
  const temporary = new Float32Array(SOUNDTOUCH_OUTPUT_BLOCK * 2);
  let writtenFrames = 0;

  while (writtenFrames < frameCount && !signal?.aborted) {
    const received = filter.extract(temporary, SOUNDTOUCH_OUTPUT_BLOCK);
    if (received <= 0) break;
    const copied = Math.min(received, frameCount - writtenFrames);
    output.set(temporary.subarray(0, copied * 2), writtenFrames * 2);
    writtenFrames += copied;
  }

  // Repli sans trou si un navigateur rend exceptionnellement moins que la
  // tranche demandée. Pour Autotune cette zone reste hors de la partie centrale
  // utilisée ; pour une voix fixe elle est ensuite fondue avec la fin originale.
  if (writtenFrames < frameCount) {
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
    for (let frame = writtenFrames; frame < frameCount; frame += 1) {
      const sourceFrame = startFrame + frame;
      if (sourceFrame < 0 || sourceFrame >= buffer.length) continue;
      output[frame * 2] = left[sourceFrame];
      output[frame * 2 + 1] = right[sourceFrame];
    }
  }

  return output;
};

/**
 * Autotune local : chaque bloc de 85–93 ms reçoit sa correction propre dans un
 * rendu SoundTouch indépendant avec 128 ms de contexte de chaque côté. Seule
 * la zone centrale est conservée, puis fondue sur 10 ms avec le bloc voisin.
 * Le gros tampon interne de SimpleFilter ne peut donc plus avaler plusieurs
 * notes sous une seule valeur de pitch.
 */
const renderAutotuneBuffer = async (
  buffer: AudioBuffer,
  corrections: PitchCorrectionPoint[],
  baseSemitones: number,
  constructors: SoundTouchConstructors,
  signal?: AbortSignal,
): Promise<AudioBuffer> => {
  const outputChannels = Math.min(buffer.numberOfChannels, 2);
  const sourceChannels = Array.from(
    { length: outputChannels },
    (_, channel) => buffer.getChannelData(channel),
  );
  const sums = Array.from(
    { length: outputChannels },
    () => new Float32Array(buffer.length),
  );
  const weights = new Float32Array(buffer.length);
  const contextFrames = Math.floor(
    (AUTOTUNE_RENDER_WINDOW - AUTOTUNE_RENDER_HOP) / 2,
  );
  const candidateStart = contextFrames - AUTOTUNE_CROSSFADE;
  const candidateFrames = AUTOTUNE_RENDER_HOP + AUTOTUNE_CROSSFADE * 2;
  let correctionIndex = 0;
  let blockIndex = 0;

  const correctionAt = (sample: number): number => {
    while (
      correctionIndex + 1 < corrections.length &&
      corrections[correctionIndex + 1].sample <= sample
    ) {
      correctionIndex += 1;
    }
    const current = corrections[correctionIndex];
    const next = corrections[Math.min(correctionIndex + 1, corrections.length - 1)];
    const width = next.sample - current.sample;
    if (width <= 0) return current.semitones;
    const progress = Math.max(0, Math.min(1, (sample - current.sample) / width));
    return current.semitones + (next.semitones - current.semitones) * progress;
  };

  for (
    let blockStart = 0;
    blockStart < buffer.length;
    blockStart += AUTOTUNE_RENDER_HOP
  ) {
    if (signal?.aborted) return buffer;
    const center = Math.min(
      buffer.length - 1,
      blockStart + Math.floor(AUTOTUNE_RENDER_HOP / 2),
    );
    const localSemitones = Math.max(
      MIN_SEMITONES,
      Math.min(MAX_SEMITONES, baseSemitones + correctionAt(center)),
    );
    const windowStart = blockStart - contextFrames;
    const tuned = Math.abs(localSemitones) >= 0.01
      ? renderSoundTouchSlice(
          buffer,
          windowStart,
          AUTOTUNE_RENDER_WINDOW,
          localSemitones,
          constructors,
          true,
          signal,
        )
      : null;

    for (let candidateFrame = 0; candidateFrame < candidateFrames; candidateFrame += 1) {
      const localFrame = candidateStart + candidateFrame;
      const destinationFrame = blockStart - AUTOTUNE_CROSSFADE + candidateFrame;
      if (destinationFrame < 0 || destinationFrame >= buffer.length) continue;

      const relative = destinationFrame - blockStart;
      let weight = 1;
      if (relative < AUTOTUNE_CROSSFADE) {
        weight = (relative + AUTOTUNE_CROSSFADE) / (AUTOTUNE_CROSSFADE * 2);
      } else if (relative > AUTOTUNE_RENDER_HOP - AUTOTUNE_CROSSFADE) {
        weight = (
          AUTOTUNE_RENDER_HOP + AUTOTUNE_CROSSFADE - relative
        ) / (AUTOTUNE_CROSSFADE * 2);
      }
      if (weight <= 0) continue;

      const sourceFrame = windowStart + localFrame;
      for (let channel = 0; channel < outputChannels; channel += 1) {
        const sample = tuned
          ? tuned[localFrame * 2 + channel] ?? 0
          : sourceFrame >= 0 && sourceFrame < buffer.length
            ? sourceChannels[channel][sourceFrame]
            : 0;
        sums[channel][destinationFrame] += sample * weight;
      }
      weights[destinationFrame] += weight;
    }

    blockIndex += 1;
    if (blockIndex % 6 === 0) {
      await yieldToMainThread();
      if (signal?.aborted) return buffer;
    }
  }

  const rendered = new AudioBuffer({
    numberOfChannels: outputChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate,
  });
  for (let channel = 0; channel < outputChannels; channel += 1) {
    const output = rendered.getChannelData(channel);
    for (let frame = 0; frame < buffer.length; frame += 1) {
      if ((frame & 8191) === 0 && signal?.aborted) return buffer;
      output[frame] = weights[frame] > 1e-6
        ? sums[channel][frame] / weights[frame]
        : sourceChannels[channel][frame];
    }
  }
  return rendered;
};

/** Décalage fixe à durée exacte, avec une fin audible garantie. */
const renderFixedPitchBuffer = (
  buffer: AudioBuffer,
  semitones: number,
  constructors: SoundTouchConstructors,
  signal?: AbortSignal,
): AudioBuffer => {
  const outputChannels = Math.min(buffer.numberOfChannels, 2);
  const interleaved = renderSoundTouchSlice(
    buffer,
    0,
    buffer.length,
    semitones,
    constructors,
    false,
    signal,
  );
  const rendered = new AudioBuffer({
    numberOfChannels: outputChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate,
  });
  const tailFadeFrames = Math.min(buffer.length, Math.round(buffer.sampleRate * 0.04));
  const tailFadeStart = buffer.length - tailFadeFrames;

  for (let channel = 0; channel < outputChannels; channel += 1) {
    const output = rendered.getChannelData(channel);
    const original = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
    for (let frame = 0; frame < buffer.length; frame += 1) {
      let sample = interleaved[frame * 2 + channel] ?? original[frame];
      if (tailFadeFrames > 1 && frame >= tailFadeStart) {
        const originalMix = (frame - tailFadeStart) / (tailFadeFrames - 1);
        sample = sample * (1 - originalMix) + original[frame] * originalMix;
      }
      output[frame] = sample;
    }
  }
  return rendered;
};

/**
 * Decode the recorded blob and render it through SoundTouch while preserving
 * its exact duration. Fixed voices use one pitch offset; Autotune renders
 * short contextual blocks so every detected note receives its own correction.
 */
export const postProcessRecordedBlob = async (
  blob: Blob,
  filters: VoiceFilterId | VoiceFilterId[],
  signal?: AbortSignal,
): Promise<Blob> => {
  if (!requiresPostProcessing(filters) || signal?.aborted) return blob;

  const semitones = combinedSemitones(filters);
  const autotune = hasAutotune(filters);
  if (semitones === 0 && !autotune) return blob;
  const deepen = semitones < 0;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    if (signal?.aborted) return blob;

    const decodeContext = new AudioContext();
    const closeDecodeContext = () => {
      if (decodeContext.state !== 'closed') {
        void decodeContext.close().catch(() => {});
      }
    };
    signal?.addEventListener('abort', closeDecodeContext, { once: true });

    let sourceBuffer: AudioBuffer;
    try {
      sourceBuffer = await decodeContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      signal?.removeEventListener('abort', closeDecodeContext);
      closeDecodeContext();
    }
    if (signal?.aborted) return blob;

    const corrections = autotune ? await analyzeAutotune(sourceBuffer, signal) : [];
    if (signal?.aborted) return blob;
    // Une prise sans hauteur fiable (silence, souffle, percussion) reste intacte
    // plutôt que de lui inventer une note et des artefacts.
    if (autotune && corrections.length === 0 && semitones === 0) return blob;

    const soundTouchModule = await import('soundtouchjs');
    if (signal?.aborted) return blob;
    const constructors: SoundTouchConstructors = {
      SoundTouch: soundTouchModule.SoundTouch as unknown as SoundTouchConstructor,
      SimpleFilter: soundTouchModule.SimpleFilter as unknown as SimpleFilterConstructor,
    };

    const shiftedBuffer = autotune
      ? await renderAutotuneBuffer(
          sourceBuffer,
          corrections,
          semitones,
          constructors,
          signal,
        )
      : renderFixedPitchBuffer(sourceBuffer, semitones, constructors, signal);
    if (signal?.aborted) return blob;

    if (deepen) {
      const enhancementContext = new OfflineAudioContext(
        shiftedBuffer.numberOfChannels,
        shiftedBuffer.length,
        shiftedBuffer.sampleRate,
      );
      const enhancementSource = enhancementContext.createBufferSource();
      enhancementSource.buffer = shiftedBuffer;
      const shelf = enhancementContext.createBiquadFilter();
      shelf.type = 'lowshelf';
      shelf.frequency.value = 300;
      shelf.gain.value = 5;
      const gain = enhancementContext.createGain();
      gain.gain.value = 1.2;
      enhancementSource.connect(shelf);
      shelf.connect(gain);
      gain.connect(enhancementContext.destination);
      enhancementSource.start(0);
      const rendered = await enhancementContext.startRendering();
      return signal?.aborted ? blob : audioBufferToWav(rendered);
    }

    return signal?.aborted ? blob : audioBufferToWav(shiftedBuffer);
  } catch (error) {
    if (!signal?.aborted) {
      console.error('[voiceFilters] post-process failed, falling back to original blob', error);
    }
    return blob;
  }
};

/* ============================================================
   Helpers
============================================================ */

/** tanh-style soft clipper — much smoother than the previous f(x) = x/(1+|x|) */
const makeSoftClipCurve = (drive: number): Float32Array => {
  const samples = 8192;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
};

/**
 * Encode an AudioBuffer to a WAV file Blob (16-bit PCM, little-endian).
 * Pure JS, no dependency.
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const ab = new ArrayBuffer(totalSize);
  const view = new DataView(ab);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave + convert float32 [-1, 1] to int16
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, str: string) => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};
