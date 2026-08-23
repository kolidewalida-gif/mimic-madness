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

    /*
     * Requête réutilisable, et non consommable une seule fois.
     *
     * L'état des joueurs est lu dès le montage, puis à nouveau quand le canal
     * temps réel s'abonne — la lecture SQL ne dépend volontairement plus du
     * transport, pour qu'un WebSocket bloqué ne fige plus la manche. Une
     * simulation qui ne répond qu'à la première requête ferait échouer la
     * seconde pour une raison qui n'existe pas dans le produit.
     */
    const readyRows = [{ player_id: 'host-1', is_ready: true }];
    const readyQuery = {
      select: vi.fn(() => readyQuery),
      eq: vi.fn(() => readyQuery),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: readyRows, error: null }),
    };
    mocks.from.mockReturnValue(readyQuery);

    const realtimeChannel = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    realtimeChannel.on.mockReturnValue(realtimeChannel);
    // L'abonnement déclenche une relecture ; le cas d'un canal qui ne s'abonne
    // jamais est couvert par la relecture périodique.
    realtimeChannel.subscribe.mockImplementation((onStatus?: (status: string) => void) => {
      onStatus?.('SUBSCRIBED');
      return realtimeChannel;
    });
    mocks.channel.mockReturnValue(realtimeChannel);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('advances as soon as every certified rendition is loaded', async () => {
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

    expect(onAllReady).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(5000));
    expect(onAllReady).toHaveBeenCalledTimes(1);
  });
});
