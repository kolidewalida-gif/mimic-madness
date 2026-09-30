import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMicrophoneTest } from './useMicrophoneTest';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Microphone test lifecycle', () => {
  it('reports a denied permission and releases the busy state', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useMicrophoneTest({ selectedAudioId: 'usb' }));
    await act(() => result.current.startTest());
    expect(result.current.error).toMatch(/Accès au micro refusé/);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.isTesting).toBe(false);
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false, audio: expect.objectContaining({ deviceId: { exact: 'usb' } }) }));
  });

  it('immediately stops a late permission stream after the settings unmount', async () => {
    let resolve!: (stream: MediaStream) => void;
    const permission = new Promise<MediaStream>(done => { resolve = done; });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => permission } });
    const stop = vi.fn();
    const { result, unmount } = renderHook(() => useMicrophoneTest({ selectedAudioId: 'usb' }));
    act(() => { void result.current.startTest(); });
    expect(result.current.isStarting).toBe(true);
    unmount();
    resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await waitFor(() => expect(stop).toHaveBeenCalledOnce());
  });

  it('stops a pending stream when changing device cancels the test', async () => {
    let resolve!: (stream: MediaStream) => void;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise<MediaStream>(done => { resolve = done; }) } });
    const stop = vi.fn();
    const { result } = renderHook(() => useMicrophoneTest({ selectedAudioId: 'usb' }));
    act(() => { void result.current.startTest(); });
    act(() => result.current.stopTest());
    expect(result.current.isStarting).toBe(false);
    resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await waitFor(() => expect(stop).toHaveBeenCalledOnce());
  });
});
