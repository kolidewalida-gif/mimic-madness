/**
 * Voice filters — audio FX presets applied to a MediaStreamTrack.
 *
 * Each preset takes the original audio source (a MediaStream from getUserMedia)
 * and returns a *new* MediaStream where the audio is processed through Web
 * Audio nodes. The MediaRecorder consumes the processed stream so the saved
 * file contains the FX baked in.
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
}

export const VOICE_FILTERS: VoiceFilterDef[] = [
  { id: 'none', label: 'Naturel', emoji: '🎤', description: 'Aucun effet', color: '#9ca3af' },
  { id: 'robot', label: 'Robot', emoji: '🤖', description: 'Voix robotique', color: '#06b6d4' },
  { id: 'helium', label: 'Hélium', emoji: '🐿️', description: 'Voix aiguë', color: '#fbbf24' },
  { id: 'deep', label: 'Grave', emoji: '🦁', description: 'Voix profonde', color: '#a855f7' },
  { id: 'echo', label: 'Écho', emoji: '🌀', description: 'Réverbération', color: '#f472b6' },
  { id: 'underwater', label: 'Sous-marin', emoji: '🌊', description: 'Étouffé liquide', color: '#3b82f6' },
  { id: 'megaphone', label: 'Mégaphone', emoji: '📢', description: 'Distordu', color: '#ef4444' },
];

interface FilterChain {
  context: AudioContext;
  destination: MediaStreamAudioDestinationNode;
  cleanup: () => void;
}

/**
 * Apply a voice filter to a MediaStream and return a new processed
 * MediaStream. Caller MUST call the returned `dispose()` when done so the
 * AudioContext is released.
 */
export const applyVoiceFilter = (
  inputStream: MediaStream,
  filter: VoiceFilterId,
): { stream: MediaStream; dispose: () => void } => {
  if (filter === 'none') {
    return { stream: inputStream, dispose: () => {} };
  }

  const context = new AudioContext();
  const source = context.createMediaStreamSource(inputStream);
  const destination = context.createMediaStreamDestination();

  const cleanup = buildFilterChain(context, source, destination, filter);

  return {
    stream: destination.stream,
    dispose: () => {
      cleanup();
      source.disconnect();
      destination.disconnect();
      if (context.state !== 'closed') {
        context.close().catch(() => {});
      }
    },
  };
};

const buildFilterChain = (
  ctx: AudioContext,
  source: AudioNode,
  output: AudioNode,
  filter: VoiceFilterId,
): (() => void) => {
  switch (filter) {
    case 'robot': {
      // Ring modulation around 50 Hz creates the classic robot tone
      const osc = ctx.createOscillator();
      osc.frequency.value = 50;
      const gain = ctx.createGain();
      const ring = ctx.createGain();
      ring.gain.value = 0;
      osc.connect(ring.gain);
      source.connect(ring);
      ring.connect(gain);
      gain.connect(output);
      osc.start();
      return () => {
        try { osc.stop(); } catch { /* noop */ }
      };
    }
    case 'helium': {
      // High-pass + slight pitch boost via shelf
      const highshelf = ctx.createBiquadFilter();
      highshelf.type = 'highshelf';
      highshelf.frequency.value = 1500;
      highshelf.gain.value = 12;
      const peaking = ctx.createBiquadFilter();
      peaking.type = 'peaking';
      peaking.frequency.value = 3000;
      peaking.Q.value = 1;
      peaking.gain.value = 8;
      source.connect(highshelf);
      highshelf.connect(peaking);
      peaking.connect(output);
      return () => {};
    }
    case 'deep': {
      const lowshelf = ctx.createBiquadFilter();
      lowshelf.type = 'lowshelf';
      lowshelf.frequency.value = 200;
      lowshelf.gain.value = 12;
      const peaking = ctx.createBiquadFilter();
      peaking.type = 'peaking';
      peaking.frequency.value = 80;
      peaking.Q.value = 1;
      peaking.gain.value = 8;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2200;
      source.connect(lowshelf);
      lowshelf.connect(peaking);
      peaking.connect(lowpass);
      lowpass.connect(output);
      return () => {};
    }
    case 'echo': {
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.28;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.45;
      const wet = ctx.createGain();
      wet.gain.value = 0.6;
      const dry = ctx.createGain();
      dry.gain.value = 0.85;
      source.connect(dry);
      dry.connect(output);
      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(output);
      return () => {};
    }
    case 'underwater': {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 600;
      const wobble = ctx.createOscillator();
      wobble.frequency.value = 2;
      const wobbleGain = ctx.createGain();
      wobbleGain.gain.value = 60;
      wobble.connect(wobbleGain);
      wobbleGain.connect(lowpass.frequency);
      source.connect(lowpass);
      lowpass.connect(output);
      wobble.start();
      return () => {
        try { wobble.stop(); } catch { /* noop */ }
      };
    }
    case 'megaphone': {
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1500;
      bandpass.Q.value = 4;
      const distortion = ctx.createWaveShaper();
      distortion.curve = makeDistortionCurve(40);
      distortion.oversample = '4x';
      const gain = ctx.createGain();
      gain.gain.value = 1.5;
      source.connect(bandpass);
      bandpass.connect(distortion);
      distortion.connect(gain);
      gain.connect(output);
      return () => {};
    }
    default:
      source.connect(output);
      return () => {};
  }
};

const makeDistortionCurve = (amount: number): Float32Array => {
  const k = amount;
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
};
