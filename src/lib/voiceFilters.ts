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
 *     stops recording, via OfflineAudioContext. Used for `helium` and `deep`
 *     because realistic chipmunk / deep-voice effects require shifting both
 *     pitch AND tempo (playbackRate change), which is NOT possible on a live
 *     MediaStream in Web Audio. The user hears a passthrough during
 *     recording; once they stop, we render the blob through a pitch shifter
 *     and replace the blob before saving.
 *
 * No external dependency — pure Web Audio API.
 */

export type VoiceFilterId =
  | 'none'
  | 'robot'
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

/** Les effets qui ont une chaîne temps réel, dans l'ordre choisi. */
const liveFilters = (filters: VoiceFilterId | VoiceFilterId[]): VoiceFilterId[] =>
  asList(filters).filter((id) => !SEMITONES[id]);

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
): boolean => asList(filters).some((id) => Boolean(SEMITONES[id]));

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
  const chosen = asList(filters);
  if (chosen.length === 0) {
    return [VOICE_FILTERS[0]];
  }
  return chosen
    .map((id) => VOICE_FILTERS.find((entry) => entry.id === id))
    .filter((entry): entry is VoiceFilterDef => Boolean(entry));
};

/**
 * Decode the recorded blob, render it through OfflineAudioContext with a
 * pitch shift that preserves the original duration (no tempo change).
 *
 * We use a simple OLA (Overlap-Add) granular pitch shifter:
 *  - helium: +6 semitones  (ratio 1.498)
 *  - deep:   -5 semitones  (ratio 0.749)
 *
 * The algorithm:
 *  1. Decode the blob to PCM.
 *  2. Resample at pitch_ratio × original_rate into an OfflineAudioContext
 *     that has the SAME duration as the original (not scaled).
 *  3. Use a playbackRate-shifted source but render into a context whose
 *     length = original_length so the output is time-stretched back to
 *     the original duration via the browser's internal resampler.
 *
 * This gives a good-enough chipmunk / deep voice without external libs.
 */
export const postProcessRecordedBlob = async (
  blob: Blob,
  filters: VoiceFilterId | VoiceFilterId[],
  signal?: AbortSignal,
): Promise<Blob> => {
  if (!requiresPostProcessing(filters) || signal?.aborted) return blob;

  const semitones = combinedSemitones(filters);
  if (semitones === 0) return blob;
  // Le renfort de graves n'a de sens que pour une voix descendue.
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

    // Use SoundTouchJS for pitch shifting that preserves duration.
    const { SoundTouch, SimpleFilter, WebAudioBufferSource } = await import('soundtouchjs');
    if (signal?.aborted) return blob;

    const sampleRate = sourceBuffer.sampleRate;
    const numChannels = sourceBuffer.numberOfChannels;
    const originalLength = sourceBuffer.length;

    const soundTouch = new SoundTouch(sampleRate);
    soundTouch.pitchSemitones = semitones;
    soundTouch.tempo = 1;
    soundTouch.rate = 1;

    const source = new WebAudioBufferSource(sourceBuffer);
    const filterNode = new SimpleFilter(source, soundTouch);
    const blockSize = 4096;
    const interleaved: number[] = [];
    const temporary = new Float32Array(blockSize * 2);
    let received = filterNode.extract(temporary, blockSize);
    while (received > 0) {
      if (signal?.aborted) return blob;
      for (let index = 0; index < received * 2; index += 1) {
        interleaved.push(temporary[index]);
      }
      received = filterNode.extract(temporary, blockSize);
    }
    if (signal?.aborted) return blob;

    const outputFrames = Math.min(Math.floor(interleaved.length / 2), originalLength);
    const outputChannels = Math.min(numChannels, 2);
    const shiftedBuffer = new AudioBuffer({
      numberOfChannels: outputChannels,
      length: outputFrames,
      sampleRate,
    });
    for (let channel = 0; channel < outputChannels; channel += 1) {
      const channelData = shiftedBuffer.getChannelData(channel);
      for (let index = 0; index < outputFrames; index += 1) {
        if ((index & 4095) === 0 && signal?.aborted) return blob;
        channelData[index] = interleaved[index * 2 + channel] ?? 0;
      }
    }

    if (deepen) {
      const enhancementContext = new OfflineAudioContext(outputChannels, outputFrames, sampleRate);
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
