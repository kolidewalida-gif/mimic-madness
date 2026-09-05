// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPhoneImitationPhase } from '@/components/AudioPhoneImitationPhase';

const mocks = vi.hoisted(() => ({
  clearSituationOverride: vi.fn(),
  playInkSound: vi.fn(),
  resetRecording: vi.fn(),
  setSituation: vi.fn(),
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

vi.mock('@/hooks/useAudioPhoneRecorder', () => ({
  useAudioPhoneRecorder: () => ({
    isRecording: false,
    isStarting: false,
    isStopping: false,
    recordedBlob: null,
    previewUrl: null,
    recordingTime: 0,
    audioLevel: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    clearRecording: vi.fn(),
    resetRecording: mocks.resetRecording,
  }),
}));

const renderPhase = () => render(
  <AudioPhoneImitationPhase
    variant="default"
    currentPhraseIndex={0}
    totalPhrases={1}
    authorName="Alice"
    reversedAudioUrl="https://example.test/reversed.webm"
    shouldImitate
    hasImitated={false}
    isAuthor={false}
    allImitationsDone={false}
    completedImitations={0}
    totalImitations={1}
    pendingPlayerNames={['Alice']}
    isHost={false}
    isSubmitting={false}
    maxSeconds={8}
    onSubmitImitation={vi.fn()}
    onNextPhrase={vi.fn()}
  />,
);

describe('AudioPhoneImitationPhase default playback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = vi.fn();
    HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => cleanup());

  it('bascule bien de lecture à pause à partir des événements du média', () => {
    const view = renderPhase();
    const audio = view.container.querySelector('audio') as HTMLAudioElement;
    const pause = HTMLMediaElement.prototype.pause as ReturnType<typeof vi.fn>;
    pause.mockClear();

    fireEvent.click(view.getByRole('button', { name: /Écouter l'audio inversé/i }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();

    fireEvent.play(audio);
    fireEvent.click(view.getByRole('button', { name: /^Pause$/i }));

    expect(pause).toHaveBeenCalledOnce();
    expect(view.getByRole('button', { name: /Écouter l'audio inversé/i })).toBeInTheDocument();
  });
});
