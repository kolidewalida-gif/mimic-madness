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
  | 'megaphone';

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
];

/* ============================================================
   LIVE FX — applied to the MediaStream during recording
============================================================ */

export const applyVoiceFilter = (
  inputStream: MediaStream,
  filter: VoiceFilterId,
): { stream: MediaStream; dispose: () => void } => {
  // Filters that are post-processed don't apply a live chain — the user
  // hears their natural voice while recording (we can't change pitch live
  // without complex granular synthesis), and the FX is baked in after stop.
  if (filter === 'none' || filter === 'helium' || filter === 'deep') {
    return { stream: inputStream, dispose: () => {} };
  }

  const context = new AudioContext();
  const source = context.createMediaStreamSource(inputStream);
  const destination = context.createMediaStreamDestination();

  const cleanup = buildLiveChain(context, source, destination, filter);

  return {
    stream: destination.stream,
    dispose: () => {
      cleanup();
      try { source.disconnect(); } catch { /* noop */ }
      try { destination.disconnect(); } catch { /* noop */ }
      if (context.state !== 'closed') {
        context.close().catch(() => {});
      }
    },
  };
};

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

    default:
      try { source.connect(output); } catch { /* noop */ }
      return () => {};
  }
};

/* ============================================================
   POST-PROCESS FX — applied to the recorded blob after stop
============================================================ */

/**
 * Returns true if the given filter requires post-processing the blob after
 * MediaRecorder finishes. Live FX filters return false.
 */
export const requiresPostProcessing = (filter: VoiceFilterId): boolean => {
  const def = VOICE_FILTERS.find((f) => f.id === filter);
  return Boolean(def?.postProcess);
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
  filter: VoiceFilterId,
  signal?: AbortSignal,
): Promise<Blob> => {
  if (!requiresPostProcessing(filter) || signal?.aborted) return blob;

  const semitones = filter === 'helium' ? 6 : filter === 'deep' ? -5 : 0;
  if (semitones === 0) return blob;

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

    if (filter === 'deep') {
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
