// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPhoneShell, AudioPhonePlayer, AudioPhoneRevealView, AudioPhoneRules, AudioPhoneStudio, AudioPhoneRoster, AudioPhoneWaiting, type AudioPhoneStudioProps, type AudioPhoneRevealViewProps } from './BubbleAudioPhone';
import { AudioPhoneImitationPhase } from '../AudioPhoneImitationPhase';
import { AudioPhoneInstructionsPhase } from '../AudioPhoneInstructionsPhase';
import { AudioPhoneRecordingAllPhase } from '../AudioPhoneRecordingAllPhase';
import { AudioPhoneGameScreenV2 } from '../AudioPhoneGameScreenV2';

const mocks = vi.hoisted(() => ({
  recorder: { isRecording: false, isStarting: false, isStopping: false, recordedBlob: null as Blob | null, previewUrl: null as string | null, recordingTime: 0, audioLevel: 0, startRecording: vi.fn(), stopRecording: vi.fn(), clearRecording: vi.fn(), resetRecording: vi.fn() },
  onError: undefined as undefined | ((error: unknown) => void),
  start: vi.fn(), stop: vi.fn(),
  chatMount: vi.fn(),
  game: {
    isLoading: false, currentRound: null as null | { id: string; phase: string; max_recording_seconds: number },
    roster: [{ id: 'alex', name: 'Alex', isHost: true }, { id: 'luna', name: 'Luna', isHost: false }],
    originalRecordings: [], imitations: [], uploadErrors: [], isSubmitting: false, isSpectator: false,
    getRevealDataForPhrase: vi.fn(), startGame: vi.fn(async () => true), startRecordingPhase: vi.fn(),
    abandonRound: vi.fn(async () => true), hasSubmittedOriginalPhrase: () => false, allPhrasesSubmitted: () => false,
    canStartImitation: () => false, getSubmittedOriginalPlayerIds: () => [], getPendingOriginalPlayers: () => [],
    submitOriginalPhrase: vi.fn(async () => true), startImitationPhase: vi.fn(),
  },
}));
vi.mock('@/components/InkBetaBrand', () => ({ InkBetaLogo: () => <span>Mimic Master</span> }));
vi.mock('@/components/PlayerAvatar', () => ({ PlayerAvatar: ({ playerName }: { playerName: string }) => <span>{playerName.slice(0, 2)}</span> }));
vi.mock('@/hooks/useGlobalPlayerAvatar', () => ({ useMultiplePlayerAvatars: () => ({}) }));
vi.mock('@/hooks/useSoundEffects', () => ({ playSoundEffect: vi.fn() }));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: vi.fn() }));
vi.mock('@/hooks/useBackgroundMusic', () => ({ useBackgroundMusic: () => ({ autoMode: false, setSituation: vi.fn(), clearSituationOverride: vi.fn() }) }));
vi.mock('@/components/ProcessingOverlay', () => ({ ProcessingOverlay: () => null }));
vi.mock('@/hooks/useAudioPhoneGameV2', () => ({ useAudioPhoneGameV2: () => mocks.game }));
vi.mock('@/components/AudioPhoneDebugPanel', () => ({ AudioPhoneDebugPanel: () => null }));
vi.mock('@/components/LobbyChat', () => ({ LobbyChat: () => null }));
vi.mock('@/components/DeviceSettings', () => ({ DeviceSettings: () => <p>Réglages du micro</p> }));
vi.mock('@/components/imitation/ImitationChat', async () => {
  const { useEffect } = await import('react');
  return { ImitationChat: ({ children }: { children: (chat: { button: React.ReactNode; panel: null }) => React.ReactNode }) => {
    useEffect(() => { mocks.chatMount(); }, []);
    return children({ button: <button type="button">Chat</button>, panel: null });
  } };
});
vi.mock('@/hooks/useStagedTask', () => ({ useStagedTask: () => ({ state: { isRunning: false, ratio: 0, label: '' }, run: (task: (report: () => void) => Promise<boolean>) => task(() => {}) }) }));
vi.mock('@/hooks/useAudioPhoneRecorder', () => ({ useAudioPhoneRecorder: ({ onError }: { onError: (error: unknown) => void }) => { mocks.onError = onError; return mocks.recorder; } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.game.currentRound = null;
  mocks.game.abandonRound.mockResolvedValue(true);
  Object.assign(mocks.recorder, { isRecording: false, isStarting: false, isStopping: false, recordedBlob: null, previewUrl: null, recordingTime: 0, audioLevel: 0 });
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.load = vi.fn();
});
afterEach(cleanup);

const studio = (extra: Partial<AudioPhoneStudioProps> = {}) => render(<AudioPhoneStudio
  title="Ta phrase" description="Une courte phrase" tapeTitle="Alex" maxSeconds={8} recordingTime={0} audioLevel={0}
  isRecording={false} isStarting={false} isStopping={false} isSubmitting={false} previewUrl={null} hasRecording={false}
  startRecording={mocks.start} stopRecording={mocks.stop} onSubmit={() => {}} sidebar={<aside>La bande</aside>} {...extra} />);

const revealProps: AudioPhoneRevealViewProps = {
  author: 'Luna', phraseIndex: 0, phraseCount: 3,
  chain: [{ key: 'original', label: 'Luna', available: true }, { key: 'reversed', label: 'À l’envers', available: true }, { key: 'imitation_0', label: 'Alex', available: false }],
  step: 'idle', isPlaying: false, isHost: true, requiresInteraction: false, message: null,
  onRetry: vi.fn(), onToggle: vi.fn(), onNext: vi.fn(), onPrevious: vi.fn(), onPlayAgain: vi.fn(), onEnd: vi.fn(), complete: false,
};

describe('Audiophone bubble presentation', () => {
  it('annonce une seule étape courante, y compris avant la révélation', () => {
    const view = render(<AudioPhoneShell phase="waiting_reveal"><p>Prêt</p></AudioPhoneShell>);
    expect(view.container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(view.container.querySelector('[aria-current="step"]')).toHaveTextContent('La révélation');
  });
  it('ne présente pas de lancement à un invité', () => {
    render(<AudioPhoneRules isHost={false} playerCount={4} isStarting={false} onStart={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /C’est parti/ })).not.toBeInTheDocument();
    expect(screen.getByText('L’hôte lance la partie.')).toBeInTheDocument();
  });
  it('le micro verrouillé explique comment le débloquer', () => {
    studio({ canRecord: false });
    expect(screen.getByRole('button', { name: 'Démarrer l’enregistrement' })).toBeDisabled();
    expect(screen.getByText('Le micro se débloque à la fin de l’écoute.')).toBeInTheDocument();
  });
  it('l’enregistrement expose un arrêt explicite et sa durée', () => {
    studio({ isRecording: true, recordingTime: 3.2 });
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter l’enregistrement' }));
    expect(mocks.stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('progressbar', { name: 'Durée enregistrée' })).toHaveAttribute('value', '3.2');
  });
  it('on peut toujours arrêter sa prise si la référence arrive en retard', () => {
    studio({ isRecording: true, canRecord: false });
    expect(screen.getByRole('button', { name: 'Arrêter l’enregistrement' })).toBeEnabled();
  });
  it.each(['isStarting', 'isStopping', 'isSubmitting'] as const)('bloque le micro pendant %s', key => {
    studio({ [key]: true });
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
  });
  it('la prise ne part qu’après une validation explicite', () => {
    const submit = vi.fn();
    studio({ hasRecording: true, previewUrl: 'blob:local', onSubmit: submit });
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Démarrer l’enregistrement' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma prise' }));
    expect(submit).toHaveBeenCalledOnce();
  });
  it.each(['sent', 'author', 'spectator'] as const)('aucune capture possible pour %s', status => {
    studio({ status });
    expect(screen.queryByRole('button', { name: /enregistrement/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer ma prise' })).not.toBeInTheDocument();
  });
  it('les joueurs au même nom gardent leur statut grâce aux identifiants', () => {
    const view = render(<AudioPhoneRoster names={['Alex', 'Alex']} ids={['a', 'b']} readyIds={['a']} pending={['Alex']} />);
    const rows = view.container.querySelectorAll('li');
    expect(rows[0]).toHaveTextContent('Prêt'); expect(rows[1]).toHaveTextContent('Au micro');
  });
  it('l’hôte garde le contrôle, sans navigation durant l’écoute', () => {
    const view = render(<AudioPhoneRevealView {...revealProps} isPlaying step="original" />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Phrase suivante' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nouvelle manche' })).toBeDisabled();
    expect(view.container.querySelector('[aria-current="step"]')).toHaveTextContent('Luna');
  });
  it('l’invité peut débloquer son audio, jamais changer la manche', () => {
    render(<AudioPhoneRevealView {...revealProps} isHost={false} requiresInteraction />);
    fireEvent.click(screen.getByRole('button', { name: 'Activer la lecture' }));
    expect(revealProps.onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Phrase suivante' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nouvelle manche' })).not.toBeInTheDocument();
  });
  it('signale les pistes absentes dans le trajet', () => {
    render(<AudioPhoneRevealView {...revealProps} />);
    expect(screen.getByText('Audio indisponible · étape ignorée')).toBeInTheDocument();
  });
  it('bloque la révélation pendant la préparation', () => {
    render(<AudioPhoneWaiting isHost phraseCount={3} isPreparing onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Préparation des audios…' })).toBeDisabled();
  });
});

describe('lecteur de prise', () => {
  it('suit les événements du média et libère la lecture à la fermeture', async () => {
    const view = render(<AudioPhonePlayer src="blob:take" label="Écouter ma prise" />);
    const audio = view.container.querySelector('audio')!;
    fireEvent.click(screen.getByRole('button', { name: 'Écouter ma prise' }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    fireEvent.play(audio);
    expect(screen.getByRole('button', { name: 'Mettre ma prise en pause' })).toBeInTheDocument();
    fireEvent.ended(audio);
    expect(screen.getByRole('button', { name: 'Écouter ma prise' })).toBeInTheDocument();
    view.unmount();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
  it('un refus de lecture laisse un bouton utilisable et une erreur lisible', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('blocked'));
    render(<AudioPhonePlayer src="blob:take" label="Écouter ma prise" />);
    fireEvent.click(screen.getByRole('button', { name: 'Écouter ma prise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lecture indisponible');
    expect(screen.queryByRole('button', { name: 'Mettre ma prise en pause' })).not.toBeInTheDocument();
  });
  it('arrête le retour audio avant une nouvelle capture ou un envoi', () => {
    const view = render(<AudioPhonePlayer src="blob:take" label="Écouter ma prise" />);
    fireEvent.play(view.container.querySelector('audio')!);
    view.rerender(<AudioPhonePlayer src="blob:take" label="Écouter ma prise" suspended />);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Écouter ma prise' })).toBeDisabled();
  });
});

const imitationProps = {
  variant: 'inkBeta' as const, currentPhraseIndex: 0, totalPhrases: 2, authorName: 'Luna', reversedAudioUrl: 'blob:reversed', shouldImitate: true,
  hasImitated: false, isAuthor: false, allImitationsDone: false, completedImitations: 0, totalImitations: 2, pendingPlayerNames: ['Alex', 'Max'],
  isHost: false, isSubmitting: false, maxSeconds: 8, onSubmitImitation: vi.fn(async () => true), onNextPhrase: vi.fn(),
};
const recordingProps = {
  variant: 'inkBeta' as const, maxSeconds: 8, playerName: 'Alex', hasSubmitted: false, allSubmitted: false, playersCount: 2, submittedCount: 0,
  submittedPlayerIds: [], pendingPlayerNames: ['Alex', 'Luna'], playerNames: ['Alex', 'Luna'], isHost: true, isSubmitting: false,
  onSubmit: vi.fn(async () => true), onStartImitation: vi.fn(),
};

describe('intégration des phases Audiophone', () => {
  it('débloque le micro à la fin de l’audio, et coupe le son avant la capture', () => {
    const view = render(<AudioPhoneImitationPhase {...imitationProps} />);
    expect(screen.getByRole('button', { name: 'Démarrer l’enregistrement' })).toBeDisabled();
    fireEvent.ended(view.container.querySelector('audio')!);
    const pause = vi.mocked(HTMLMediaElement.prototype.pause); pause.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer l’enregistrement' }));
    expect(pause).toHaveBeenCalledOnce();
    expect(mocks.recorder.startRecording).toHaveBeenCalledOnce();
  });
  it.each(['absent', 'erreur'] as const)('ne bloque pas le jeu sur un audio %s', source => {
    const view = render(<AudioPhoneImitationPhase {...imitationProps} reversedAudioUrl={source === 'absent' ? null : 'blob:broken'} />);
    if (source === 'erreur') fireEvent.error(view.container.querySelector('audio')!);
    expect(screen.getByText(/Audio indisponible\. Tu peux quand même/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Démarrer l’enregistrement' })).toBeEnabled();
  });
  it('montre une erreur de micro au joueur', () => {
    render(<AudioPhoneRecordingAllPhase {...recordingProps} />);
    act(() => mocks.onError?.(new Error('denied')));
    expect(screen.getByRole('alert')).toHaveTextContent('Micro indisponible');
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer l’enregistrement' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('la prise originale reste disponible quand l’envoi échoue', async () => {
    mocks.recorder.recordedBlob = new Blob(['take']); mocks.recorder.previewUrl = 'blob:local';
    const onSubmit = vi.fn(async () => false);
    render(<AudioPhoneRecordingAllPhase {...recordingProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma prise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Elle est conservée');
    expect(mocks.recorder.clearRecording).not.toHaveBeenCalled();
  });
  it('une imitation rejetée garde son retour audio et propose de réessayer', async () => {
    mocks.recorder.recordedBlob = new Blob(['take']); mocks.recorder.previewUrl = 'blob:local';
    render(<AudioPhoneImitationPhase {...imitationProps} onSubmitImitation={vi.fn(async () => { throw new Error('offline'); })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma prise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ta prise est conservée');
    expect(mocks.recorder.clearRecording).not.toHaveBeenCalled();
  });
  it('envoie une prise valide une seule fois et libère son brouillon', async () => {
    mocks.recorder.recordedBlob = new Blob(['take']); mocks.recorder.previewUrl = 'blob:local';
    const onSubmit = vi.fn(async () => true);
    render(<AudioPhoneRecordingAllPhase {...recordingProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma prise' }));
    await waitFor(() => expect(mocks.recorder.clearRecording).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledOnce();
  });
  it('ne laisse pas le bouton de lancement bloqué après un échec', async () => {
    render(<AudioPhoneInstructionsPhase variant="inkBeta" isHost playerCount={4} onStart={vi.fn(async () => false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'C’est parti !' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La partie n’a pas démarré');
    expect(screen.getByRole('button', { name: 'C’est parti !' })).toBeEnabled();
  });
});

describe('coquille de partie', () => {
  const props = { variant: 'inkBeta' as const, currentPlayer: { id: 'alex', name: 'Alex', isHost: true }, players: mocks.game.roster, lobbyId: 'demo-lobby', onEndGame: vi.fn() };
  it('le chat reste monté quand on passe des règles à la capture', () => {
    const view = render(<AudioPhoneGameScreenV2 {...props} />);
    expect(mocks.chatMount).toHaveBeenCalledOnce();
    mocks.game.currentRound = { id: 'round-1', phase: 'recording_all', max_recording_seconds: 8 };
    // The real hook emits state. Here a fresh roster prop drives the memoized shell.
    view.rerender(<AudioPhoneGameScreenV2 {...props} players={[...props.players]} />);
    expect(screen.getByRole('heading', { name: 'Qu’est-ce qu’on enregistre ?' })).toBeInTheDocument();
    expect(mocks.chatMount).toHaveBeenCalledOnce();
  });
  it('un invité quitte uniquement son écran, pas la manche collective', async () => {
    const onEndGame = vi.fn();
    render(<AudioPhoneGameScreenV2 {...props} currentPlayer={{ ...props.currentPlayer, isHost: false }} onEndGame={onEndGame} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitter la partie' }));
    await waitFor(() => expect(onEndGame).toHaveBeenCalledOnce());
    expect(mocks.game.abandonRound).not.toHaveBeenCalled();
  });
  it('l’hôte reste dans la partie si l’abandon partagé échoue', async () => {
    mocks.game.abandonRound.mockResolvedValueOnce(false);
    const onEndGame = vi.fn();
    render(<AudioPhoneGameScreenV2 {...props} onEndGame={onEndGame} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitter la partie' }));
    await waitFor(() => expect(mocks.game.abandonRound).toHaveBeenCalledOnce());
    expect(onEndGame).not.toHaveBeenCalled();
  });
  it('ouvre les réglages sans démarrer ni enregistrer', () => {
    render(<AudioPhoneGameScreenV2 {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Réglages du microphone' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Réglages du micro')).toBeInTheDocument();
    expect(mocks.recorder.startRecording).not.toHaveBeenCalled();
    expect(mocks.game.startGame).not.toHaveBeenCalled();
  });
});
