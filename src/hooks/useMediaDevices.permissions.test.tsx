import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaDevices } from './useMediaDevices';

let media: EventTarget & { enumerateDevices: ReturnType<typeof vi.fn>; getUserMedia: ReturnType<typeof vi.fn> };
let stop: ReturnType<typeof vi.fn>;
beforeEach(() => {
  stop = vi.fn();
  media = Object.assign(new EventTarget(), {
    enumerateDevices: vi.fn().mockResolvedValue([{ deviceId: 'one', label: 'Micro 1', kind: 'audioinput' }, { deviceId: 'two', label: 'Micro 2', kind: 'audioinput' }]),
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }], getVideoTracks: () => [] }),
  });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: media });
});
afterEach(cleanup);

describe('Settings microphone permissions', () => {
  it('does not capture audio on mount or on device changes when opted out', async () => {
    const { result } = renderHook(() => useMediaDevices({ requestPermissionOnMount: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.audioInputs).toHaveLength(2);
    expect(media.getUserMedia).not.toHaveBeenCalled();
    act(() => media.dispatchEvent(new Event('devicechange')));
    await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalledTimes(2));
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });

  it('explicit authorization stops the temporary permissions stream', async () => {
    const { result } = renderHook(() => useMediaDevices({ requestPermissionOnMount: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.reloadDevices());
    expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(stop).toHaveBeenCalledOnce();
  });

  it('preserves legacy authorization-on-mount without requesting camera access', async () => {
    const { result } = renderHook(() => useMediaDevices());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(stop).toHaveBeenCalledOnce();
  });

  it('keeps a chosen device when labels refresh and releases active audio on unmount', async () => {
    const { result, unmount } = renderHook(() => useMediaDevices({ requestPermissionOnMount: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.changeAudioInput('two'));
    act(() => media.dispatchEvent(new Event('devicechange')));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedAudioId).toBe('two');
    await act(() => result.current.getMediaStream());
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });
});
