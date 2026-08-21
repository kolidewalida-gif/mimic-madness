// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioRecorder } from '@/components/AudioRecorder';

const mocks = vi.hoisted(() => ({
  applyVoiceFilter: vi.fn(),
  disposeFilter: vi.fn(),
  postProcessRecordedBlob: vi.fn(async (blob: Blob) => blob),
  requiresPostProcessing: vi.fn(() => false),
  uploadVideo: vi.fn(),
  toast: vi.fn(),
}));

/*
 * Seules la mise en forme audio et l'envoi sont simulés. La description des
 * effets, elle, est de la logique pure : la réimplémenter dans la simulation la
 * laisserait dériver du vrai code, alors que le composant s'en sert pour tous
 * ses libellés.
 */
vi.mock('@/lib/voiceFilters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/voiceFilters')>();
  return {
    ...actual,
    applyVoiceFilter: mocks.applyVoiceFilter,
    applyVoiceFilters: mocks.applyVoiceFilter,
    postProcessRecordedBlob: mocks.postProcessRecordedBlob,
    requiresPostProcessing: mocks.requiresPostProcessing,
  };
});

vi.mock('@/lib/videoStorageSupabase', async (importOriginal) => {
  // Seul l'envoi est simulé : la déduction d'extension est de la logique pure,
  // et la réimplémenter dans le mock la laisserait dériver du vrai code.
  const actual = await importOriginal<typeof import('@/lib/videoStorageSupabase')>();
  return {
    ...actual,
    videoStorage: { uploadVideo: mocks.uploadVideo },
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/hooks/useSoundEffects', () => ({
  playSoundEffect: vi.fn(),
}));

vi.mock('@/components/InkVoiceFilterPicker', () => ({
  InkVoiceFilterPicker: () => null,
}));

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported = vi.fn(() => true);

  state: RecordingState = 'inactive';
  readonly stream: MediaStream;
  readonly mimeType = 'audio/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  start = vi.fn(() => {
    this.state = 'recording';
  });

  stop = vi.fn(() => {
    this.state = 'inactive';
    this.onstop?.(new Event('stop'));
  });

  constructor(stream: MediaStream) {
    this.stream = stream;
    FakeMediaRecorder.instances.push(this);
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: AudioContextState = 'running';
  readonly analyser = {
    fftSize: 0,
    frequencyBinCount: 8,
    getByteFrequencyData: vi.fn(),
  };
  createAnalyser = vi.fn(() => this.analyser);
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  /**
   * Tampon minimal mais exploitable : l'assemblage des segments décode, mixe en
   * mono puis réencode. Faire échouer le décodage empêcherait de tester ce
   * chemin, qui est précisément le cœur du mode multi-voix.
   */
  decodeAudioData = vi.fn(async () => ({
    length: 4,
    numberOfChannels: 1,
    sampleRate: 48_000,
    duration: 4 / 48_000,
    getChannelData: () => new Float32Array([0.5, 0.4, 0.3, 0.2]),
  }) as unknown as AudioBuffer);
  close = vi.fn(async () => {
    this.state = 'closed';
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('AudioRecorder lifecycle cleanup', () => {
  let trackStop: ReturnType<typeof vi.fn>;
  let stream: MediaStream;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.isTypeSupported.mockClear();
    FakeAudioContext.instances = [];
    mocks.applyVoiceFilter.mockReset();
    mocks.disposeFilter.mockReset();
    mocks.postProcessRecordedBlob.mockClear();
    mocks.requiresPostProcessing.mockReset().mockReturnValue(false);
    mocks.uploadVideo.mockReset().mockResolvedValue({ id: 'saved-clip' });
    mocks.toast.mockReset();

    trackStop = vi.fn();
    const track = { stop: trackStop } as unknown as MediaStreamTrack;
    stream = {
      getTracks: () => [track],
    } as MediaStream;
    getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    mocks.applyVoiceFilter.mockImplementation((input: MediaStream) => ({
      stream: input,
      dispose: mocks.disposeFilter,
    }));

    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 17));
    cancelAnimationFrameMock = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('stops a getUserMedia stream that resolves after unmount', async () => {
    let resolveMedia: (value: MediaStream) => void = () => undefined;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => {
      resolveMedia = resolve;
    }));
    const onAudioSaved = vi.fn();
    const view = render(
      <AudioRecorder playerId="p1" playerName="Joueur" onAudioSaved={onAudioSaved} />,
    );

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    expect(getUserMedia).toHaveBeenCalledOnce();
    view.unmount();

    resolveMedia(stream);
    await flushMicrotasks();

    expect(trackStop).toHaveBeenCalledOnce();
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(mocks.uploadVideo).not.toHaveBeenCalled();
    expect(onAudioSaved).not.toHaveBeenCalled();
  });

  it('stops recorder, tracks, filter, RAF and context on unmount', async () => {
    const onRecordingStart = vi.fn();
    const onRecordingStop = vi.fn();
    const onAudioSaved = vi.fn();
    const view = render(
      <AudioRecorder
        playerId="p1"
        playerName="Joueur"
        onRecordingStart={onRecordingStart}
        onRecordingStop={onRecordingStop}
        onAudioSaved={onAudioSaved}
      />,
    );

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
    const recorder = FakeMediaRecorder.instances[0];
    expect(recorder.state).toBe('recording');

    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 220));

    expect(recorder.stop).toHaveBeenCalledOnce();
    expect(recorder.onstop).toBeNull();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(mocks.disposeFilter).toHaveBeenCalledOnce();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(17);
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce();
    expect(onRecordingStart).not.toHaveBeenCalled();
    expect(onRecordingStop).not.toHaveBeenCalled();
    expect(mocks.uploadVideo).not.toHaveBeenCalled();
    expect(onAudioSaved).not.toHaveBeenCalled();
  });

  it('attend une validation explicite au lieu d’envoyer dès l’arrêt', async () => {
    /*
     * Non-régression du bug signalé : l'imitation partait dès qu'on arrêtait
     * d'enregistrer. `autoSaveClip` téléversait dans `onstop`, ce qui faisait
     * remonter `onAudioSaved` au parent, lequel remplaçait aussitôt le
     * composant. L'écran de contrôle existait mais personne ne le voyait jamais.
     */
    const onRecordingStop = vi.fn();
    const onAudioSaved = vi.fn();
    const view = render(
      <AudioRecorder playerId="p1" playerName="Joueur"
        onRecordingStop={onRecordingStop} onAudioSaved={onAudioSaved} />,
    );

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
    FakeMediaRecorder.instances[0].ondataavailable?.(
      { data: new Blob(['voice'], { type: 'audio/webm' }) } as BlobEvent,
    );

    fireEvent.click(view.getByRole('button', { name: /Terminer/i }));
    await waitFor(() => expect(onRecordingStop).toHaveBeenCalledOnce());
    await flushMicrotasks();

    // Rien n'est parti : la prise attend le joueur.
    expect(mocks.uploadVideo).not.toHaveBeenCalled();
    expect(onAudioSaved).not.toHaveBeenCalled();

    const confirm = await waitFor(() => view.getByRole('button', { name: /Valider/i }));
    fireEvent.click(confirm);

    await waitFor(() => expect(onAudioSaved).toHaveBeenCalledWith({ id: 'saved-clip' }));
    expect(mocks.uploadVideo).toHaveBeenCalledOnce();
  });

  it('ouvre un nouveau segment à la reprise sans relâcher le micro', async () => {
    /*
     * Le micro doit rester ouvert pendant la pause : le réouvrir redemanderait
     * l'autorisation sur certains navigateurs et ferait perdre la reprise.
     * Seule la chaîne d'effets est démontée, pour pouvoir en rebrancher une
     * autre avec la nouvelle voix.
     */
    const onRecordingPause = vi.fn();
    const onRecordingResume = vi.fn();
    const onRecordingStart = vi.fn();
    const view = render(
      <AudioRecorder playerId="p1" playerName="Joueur"
        onRecordingStart={onRecordingStart}
        onRecordingPause={onRecordingPause} onRecordingResume={onRecordingResume} />,
    );

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
    FakeMediaRecorder.instances[0].ondataavailable?.(
      { data: new Blob(['segment un'], { type: 'audio/webm' }) } as BlobEvent,
    );

    // Le début de prise est différé de 200 ms : on le laisse passer pour pouvoir
    // vérifier ensuite qu'une reprise ne le rejoue pas.
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(onRecordingStart).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByRole('button', { name: /^Pause$/i }));
    await waitFor(() => expect(onRecordingPause).toHaveBeenCalledOnce());

    // Le micro n'est pas coupé, et le premier segment est annoncé.
    expect(trackStop).not.toHaveBeenCalled();
    expect(view.getByText(
      (_content, element) => element?.textContent === '1 segment enregistré',
    )).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /Reprendre/i }));
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(2));
    expect(onRecordingResume).toHaveBeenCalledOnce();
    // Un second enregistreur, sur le même micro.
    expect(FakeMediaRecorder.instances[1].stream).toBe(stream);
    expect(trackStop).not.toHaveBeenCalled();

    /*
     * Non-régression : une reprise ne doit PAS annoncer un début de prise.
     * `onRecordingStart` est différé de 200 ms et le parent y remet la vidéo à
     * imiter au début du clip. Le déclencher à la reprise rembobinait la vidéo
     * juste après chaque changement de voix, écrasant la position restaurée.
     */
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(onRecordingStart).toHaveBeenCalledTimes(1);
  });

  it('assemble les deux segments à l’arrêt final', async () => {
    const view = render(<AudioRecorder playerId="p1" playerName="Joueur" />);

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
    FakeMediaRecorder.instances[0].ondataavailable?.(
      { data: new Blob(['un'], { type: 'audio/webm' }) } as BlobEvent,
    );
    fireEvent.click(view.getByRole('button', { name: /^Pause$/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /Reprendre/i })).toBeTruthy());

    fireEvent.click(view.getByRole('button', { name: /Reprendre/i }));
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(2));
    FakeMediaRecorder.instances[1].ondataavailable?.(
      { data: new Blob(['deux'], { type: 'audio/webm' }) } as BlobEvent,
    );

    fireEvent.click(view.getByRole('button', { name: /Terminer/i }));

    // L'assemblage décode, mixe et réencode : on attend l'écran de contrôle.
    await waitFor(
      () => expect(view.getByRole('button', { name: /Valider/i })).toBeTruthy(),
      { timeout: 4000 },
    );

    // Les deux segments sont annoncés. Le libellé est construit de plusieurs
    // nœuds de texte, d'où le comparateur sur le contenu complet.
    const summary = await waitFor(() => view.getByText(
      (_content, element) => element?.textContent === '2 segments enregistrés',
    ));
    expect(summary).toBeTruthy();

    // Le micro n'est relâché qu'à l'arrêt définitif.
    expect(trackStop).toHaveBeenCalled();
  });
});
