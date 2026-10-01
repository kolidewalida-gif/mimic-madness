import { registerAudioContext } from './audioUnlock';

const DEVICE_KEY = 'mimic-master:microphone-device';
const FILTER_KEY = 'mimic-master:microphone-browser-filter';
export function getPreferredMicrophone(): string {
  try { return localStorage.getItem(DEVICE_KEY) || ''; } catch { return ''; }
}
export function setPreferredMicrophone(id: string): void {
  try { localStorage.setItem(DEVICE_KEY, id); } catch { /* Private browsing. */ }
}
export function isBrowserMicrophoneFilterEnabled(): boolean {
  try { return localStorage.getItem(FILTER_KEY) !== 'false'; } catch { return true; }
}
export function setBrowserMicrophoneFilterEnabled(enabled: boolean): void {
  try { localStorage.setItem(FILTER_KEY, String(enabled)); } catch { /* Private browsing. */ }
}

/** Capabilities, not browser names: never require a sample rate a device cannot supply. */
export function microphoneConstraints(options: { deviceId?: string; noiseSuppression?: boolean } = {}): MediaTrackConstraints & { latency?: ConstrainDouble } {
  const supported = navigator.mediaDevices?.getSupportedConstraints?.() as (MediaTrackSupportedConstraints & { latency?: boolean }) | undefined;
  const allows = (key: keyof MediaTrackSupportedConstraints | 'latency') => !supported || supported[key] === true;
  const constraints: MediaTrackConstraints & { latency?: ConstrainDouble } = {};
  const device = options.deviceId ?? getPreferredMicrophone();
  if (device && allows('deviceId')) constraints.deviceId = { exact: device };
  if (allows('echoCancellation')) constraints.echoCancellation = true;
  if (allows('noiseSuppression')) constraints.noiseSuppression = options.noiseSuppression ?? isBrowserMicrophoneFilterEnabled();
  if (allows('autoGainControl')) constraints.autoGainControl = true;
  if (allows('channelCount')) constraints.channelCount = { ideal: 1 };
  if (allows('sampleRate')) constraints.sampleRate = { ideal: 48000 };
  if (allows('latency')) constraints.latency = { ideal: 0.02 };
  return constraints;
}

/** A recording graph owns its context. Never close the shared UI/SFX context. */
export function createMicrophoneAudioContext(sampleRate?: number): AudioContext {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio indisponible dans ce navigateur.');
  return registerAudioContext(new Ctor({ latencyHint: 'balanced', ...(sampleRate ? { sampleRate } : {}) }));
}

export function microphoneRecorderOptions(): MediaRecorderOptions {
  const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg']
    .find(type => MediaRecorder.isTypeSupported(type));
  return { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 128000 };
}
