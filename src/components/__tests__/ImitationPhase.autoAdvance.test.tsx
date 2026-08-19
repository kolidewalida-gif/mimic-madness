// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImitationPhase } from '@/components/ImitationPhase';

const mocks = vi.hoisted(() => ({
  broadcastStatus: vi.fn(),
  channel: vi.fn(),
  clearSituationOverride: vi.fn(),
  deleteVideoClip: vi.fn(),
  from: vi.fn(),
  getVideoClip: vi.fn(),
  loadRhythmoTrack: vi.fn(),
  playInkSound: vi.fn(),
  questTrack: vi.fn(),
  removeChannel: vi.fn(),
  setSituation: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: mocks.channel,
    from: mocks.from,
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/hooks/useBackgroundMusic', () => ({
  useBackgroundMusic: () => ({
    autoMode: false,
    clearSituationOverride: mocks.clearSituationOverride,
    setSituation: mocks.setSituation,
  }),
}));

vi.mock('@/hooks/useInkSoundEffects', () => ({
  playInkSound: mocks.playInkSound,
}));

vi.mock('@/hooks/useQuestTracker', () => ({
  useQuestTracker: () => ({ track: mocks.questTrack }),
}));

vi.mock('@/lib/videoStorageSupabase', () => ({
  videoStorage: {
    deleteVideoClip: mocks.deleteVideoClip,
    getVideoClip: mocks.getVideoClip,
  },
}));

vi.mock('@/lib/rhythmo/store', () => ({
  loadRhythmoTrack: mocks.loadRhythmoTrack,
}));

vi.mock('@/components/TeammateStatusPanel', () => ({
  TeammateStatusPanel: () => null,
  useBroadcastRecordingStatus: () => ({ broadcastStatus: mocks.broadcastStatus }),
}));

vi.mock('@/components/AudioRecorder', () => ({ AudioRecorder: () => null }));
vi.mock('@/components/DeviceSettings', () => ({ DeviceSettings: () => null }));
vi.mock('@/components/PlayerAvatar', () => ({ PlayerAvatar: () => null }));
vi.mock('@/components/VideoPreview', () => ({ VideoPreview: () => null }));
vi.mock('@/components/VideoWithAudioOverlay', () => ({ VideoWithAudioOverlay: () => null }));
vi.mock('@/components/VolumeSlider', () => ({ VolumeSlider: () => null }));
vi.mock('@/components/rhythmo/RhythmoBand', () => ({ RhythmoBand: () => null }));
vi.mock('@/components/ui/label', () => ({ Label: () => null }));
vi.mock('@/components/ui/switch', () => ({ Switch: () => null }));

describe('ImitationPhase host auto-advance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T12:00:00.000Z'));
    vi.clearAllMocks();

    mocks.getVideoClip.mockResolvedValue(null);
    mocks.loadRhythmoTrack.mockResolvedValue(null);

    const readyQuery = {
      eq: vi.fn(),
      select: vi.fn(),
    };
    readyQuery.select.mockReturnValue(readyQuery);
    readyQuery.eq
      .mockReturnValueOnce(readyQuery)
      .mockResolvedValueOnce({
        data: [{ player_id: 'host-1', is_ready: true }],
      });
    mocks.from.mockReturnValue(readyQuery);

    const realtimeChannel = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    realtimeChannel.on.mockReturnValue(realtimeChannel);
    realtimeChannel.subscribe.mockReturnValue(realtimeChannel);
    mocks.channel.mockReturnValue(realtimeChannel);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('waits for the full safety delay when every player is ready immediately', async () => {
    const onAllReady = vi.fn();

    render(
      <ImitationPhase
        lobbyId="lobby-1"
        roundNumber={2}
        currentPlayer={{ id: 'host-1', name: 'Hôte', isHost: true }}
        players={[{ id: 'host-1', name: 'Hôte', isHost: true }]}
        currentChallenge={{ id: 'clip-1', playerId: 'host-1', playerName: 'Hôte' }}
        onAllReady={onAllReady}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => vi.advanceTimersByTime(1999));
    expect(onAllReady).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onAllReady).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(5000));
    expect(onAllReady).toHaveBeenCalledTimes(1);
  });
});
