import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMicrophoneAudioContext, getPreferredMicrophone, isBrowserMicrophoneFilterEnabled, microphoneConstraints, microphoneRecorderOptions, setBrowserMicrophoneFilterEnabled, setPreferredMicrophone } from '../microphoneCapture';

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Microphone browser capabilities', () => {
  it('only requests supported processing, with preferred rather than required rates', () => {
    vi.stubGlobal('navigator', { mediaDevices: { getSupportedConstraints: () => ({ echoCancellation: true, sampleRate: true, channelCount: true }) } });
    expect(microphoneConstraints()).toEqual({ echoCancellation: true, sampleRate: { ideal: 48000 }, channelCount: { ideal: 1 } });
  });
  it('preserves the chosen microphone and filter preference across game modes', () => {
    vi.stubGlobal('navigator', { mediaDevices: {} });
    setPreferredMicrophone('usb'); setBrowserMicrophoneFilterEnabled(false);
    expect(getPreferredMicrophone()).toBe('usb');
    expect(isBrowserMicrophoneFilterEnabled()).toBe(false);
    expect(microphoneConstraints()).toMatchObject({ deviceId: { exact: 'usb' }, noiseSuppression: false, autoGainControl: true });
    expect(microphoneConstraints({ deviceId: 'headset', noiseSuppression: true })).toMatchObject({ deviceId: { exact: 'headset' }, noiseSuppression: true });
  });
  it('still builds safe constraints if feature detection is absent', () => {
    vi.stubGlobal('navigator', { mediaDevices: {} });
    expect(microphoneConstraints()).toMatchObject({ channelCount: { ideal: 1 }, latency: { ideal: .02 } });
  });
  it.each(['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'])('chooses the actual supported recorder format: %s', mime => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (type: string) => type === mime });
    expect(microphoneRecorderOptions()).toEqual({ mimeType: mime, audioBitsPerSecond: 128000 });
  });
  it('lets the engine choose the format when no candidate is supported', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false });
    expect(microphoneRecorderOptions()).toEqual({ audioBitsPerSecond: 128000 });
  });
  it('resumes an interrupted WebKit recording context without changing hardware rate', () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    const Ctor = vi.fn(function() { return { state: 'interrupted', resume }; });
    vi.stubGlobal('AudioContext', undefined); vi.stubGlobal('webkitAudioContext', Ctor);
    createMicrophoneAudioContext();
    expect(Ctor).toHaveBeenCalledWith({ latencyHint: 'balanced' });
    expect(resume).toHaveBeenCalledOnce();
  });
});
