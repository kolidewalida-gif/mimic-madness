// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from '@testing-library/react';
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
  supabase: { channel: mocks.channel, from: mocks.from, removeChannel: mocks.removeChannel },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useBackgroundMusic', () => ({
  useBackgroundMusic: () => ({
    autoMode: false,
    clearSituationOverride: mocks.clearSituationOverride,
    setSituation: mocks.setSituation,
  }),
}));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: mocks.playInkSound }));
vi.mock('@/hooks/useQuestTracker', () => ({ useQuestTracker: () => ({ track: mocks.questTrack }) }));
vi.mock('@/lib/videoStorageSupabase', () => ({
  videoStorage: { deleteVideoClip: mocks.deleteVideoClip, getVideoClip: mocks.getVideoClip },
}));
vi.mock('@/lib/rhythmo/store', () => ({ loadRhythmoTrack: mocks.loadRhythmoTrack }));
vi.mock('@/components/TeammateStatusPanel', () => ({
  TeammateStatusPanel: () => null,
  useBroadcastRecordingStatus: () => ({ broadcastStatus: mocks.broadcastStatus }),
}));
vi.mock('@/components/DeviceSettings', () => ({ DeviceSettings: () => null }));
vi.mock('@/components/PlayerAvatar', () => ({ PlayerAvatar: () => null }));
vi.mock('@/components/VideoWithAudioOverlay', () => ({ VideoWithAudioOverlay: () => null }));
vi.mock('@/components/VolumeSlider', () => ({ VolumeSlider: () => null }));
vi.mock('@/components/rhythmo/RhythmoBand', () => ({ RhythmoBand: () => null }));
vi.mock('@/components/ui/label', () => ({ Label: () => null }));
vi.mock('@/components/ui/switch', () => ({ Switch: () => null }));

/** Vraie balise vidéo, pour observer la position réellement appliquée. */
vi.mock('@/components/VideoPreview', () => ({
  VideoPreview: ({ videoRef }: { videoRef?: { current: HTMLVideoElement | null } }) => (
    <video
      data-testid="video-defi"
      ref={(element) => {
        if (videoRef) videoRef.current = element;
      }}
    />
  ),
}));

/** Expose les rappels du magnétophone sous forme de boutons. */
vi.mock('@/components/AudioRecorder', () => ({
  AudioRecorder: ({
    onRecordingStart,
    onRecordingPause,
    onRecordingResume,
  }: {
    onRecordingStart?: () => void;
    onRecordingPause?: () => void;
    onRecordingResume?: () => void;
  }) => (
    <div>
      <button type="button" onClick={onRecordingStart}>demarrer</button>
      <button type="button" onClick={onRecordingPause}>suspendre</button>
      <button type="button" onClick={onRecordingResume}>relancer</button>
    </div>
  ),
}));

const renderPhase = () =>
  render(
    <ImitationPhase
      lobbyId="lobby-1"
      roundNumber={1}
      currentPlayer={{ id: 'host-1', name: 'Hôte', isHost: true }}
      players={[{ id: 'host-1', name: 'Hôte', isHost: true }]}
      currentChallenge={{ id: 'clip-1', playerId: 'host-1', playerName: 'Hôte' }}
      onAllReady={vi.fn()}
    />,
  );

describe('reprise après changement de voix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVideoClip.mockResolvedValue(null);
    mocks.loadRhythmoTrack.mockResolvedValue(null);

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: [], error: null }),
    };
    mocks.from.mockReturnValue(query);

    const realtimeChannel = { on: vi.fn(), subscribe: vi.fn() };
    realtimeChannel.on.mockReturnValue(realtimeChannel);
    realtimeChannel.subscribe.mockImplementation(() => realtimeChannel);
    mocks.channel.mockReturnValue(realtimeChannel);

    // jsdom ne fournit ni `play` ni `pause` : sans ces doublures, l'appel lève.
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  afterEach(() => cleanup());

  it('ne rembobine pas la vidéo à imiter', async () => {
    const view = renderPhase();
    await act(async () => { await Promise.resolve(); });

    const video = view.getByTestId('video-defi') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 40, configurable: true });
    // La vidéo joue : c'est bien le joueur qui suspend.
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.currentTime = 12.5;

    fireEvent.click(view.getByText('suspendre'));
    expect(video.currentTime).toBe(12.5);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    // Simule ce que fait le navigateur : la position bouge pendant la pause,
    // par exemple parce que le lecteur du défi a rembobiné de lui-même.
    video.currentTime = 0;

    fireEvent.click(view.getByText('relancer'));
    expect(video.currentTime).toBe(12.5);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('ne rejoue pas un passage déjà terminé', async () => {
    /*
     * Le cas réellement signalé. `VideoPreview` rembobine et met en pause dès la
     * fin du passage DÉCOUPÉ du clip — souvent quelques secondes, pas la durée
     * du fichier. Sur un clip court, la vidéo est donc déjà revenue au début
     * avant le clic sur Pause, et la relancer rejouait tout depuis le départ.
     */
    const view = renderPhase();
    await act(async () => { await Promise.resolve(); });

    const video = view.getByTestId('video-defi') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 40, configurable: true });
    // État laissé par l'auto-rembobinage : arrêtée, et revenue au début.
    Object.defineProperty(video, 'paused', { value: true, configurable: true });
    video.currentTime = 0;

    fireEvent.click(view.getByText('suspendre'));
    (HTMLMediaElement.prototype.play as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(view.getByText('relancer'));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('repart bien du début pour une nouvelle prise', async () => {
    // `onRecordingStart` doit, lui, rembobiner : c'est un nouvel essai complet.
    const view = renderPhase();
    await act(async () => { await Promise.resolve(); });

    const video = view.getByTestId('video-defi') as HTMLVideoElement;
    video.currentTime = 20;

    fireEvent.click(view.getByText('demarrer'));
    expect(video.currentTime).toBe(0);
  });
});
