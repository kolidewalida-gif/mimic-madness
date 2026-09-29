import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { InkBetaBlindtestSetup } from './InkBetaBlindtestSetup';
import { InkBetaBlindtestView, type InkBetaBlindtestViewProps } from './InkBetaBlindtestView';
import { CATEGORY_META } from '@/lib/blindtestTracks';

vi.mock('@/components/PodiumAd', () => ({ PodiumAd: () => null }));
afterEach(cleanup);
const setupProps = () => ({ isHost: true, canStart: true, starting: false, error: null, onStart: vi.fn() });
const viewProps = (overrides: Partial<InkBetaBlindtestViewProps> = {}): InkBetaBlindtestViewProps => ({
  phase: 'listen', currentPlayer: { id: 'a', name: 'Alex' }, players: [{ id: 'a', name: 'Alex' }, { id: 'b', name: 'Sam' }],
  isHost: true, channelReady: true, starting: false, startError: null, startGame: vi.fn(), onEndGame: vi.fn(), replay: vi.fn(),
  volume: 70, setVolume: vi.fn(), toggleMute: vi.fn(), muted: false, roundIndex: 2, totalRounds: 10,
  track: { title: 'Naruto', subtitle: 'Blue Bird', category: 'anime' }, options: ['Naruto', 'One Piece', 'Bleach', 'Demon Slayer'],
  myChoice: null, answerIndex: null, answer: vi.fn(), progress: .7, secondsLeft: 14, urgent: false,
  needsSoundUnlock: false, mediaError: false, resumeSound: vi.fn(), hintText: null, myStreak: 0, myElapsed: null,
  roundDouble: false, teamsEnabled: false, teamOf: {}, teamScores: [0, 0], liveVotes: {}, revealVotes: {}, roundPoints: {},
  answeredIds: new Set(), avgReaction: {}, betaRanked: [{ id: 'a', name: 'Alex', pts: 1200 }, { id: 'b', name: 'Sam', pts: 800 }],
  getAvatar: () => null, ...overrides,
});

describe('Ink Beta blindtest setup', () => {
  it('starts with every category and the supported default configuration', () => {
    const props = setupProps(); render(<InkBetaBlindtestSetup {...props} />);
    expect(within(screen.getByRole('group', { name: 'Univers musicaux disponibles' })).getAllByRole('button', { pressed: true })).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'C’est parti !' }));
    expect(props.onStart).toHaveBeenCalledWith(expect.arrayContaining(Object.keys(CATEGORY_META)), { rounds: 10, listenMs: 20000, teams: false, hints: true, doublePoints: true });
  });
  it('applies a preset and prevents removing the final category', () => {
    const props = setupProps(); render(<InkBetaBlindtestSetup {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hits & nostalgie' }));
    for (const name of ['Rap FR', 'Années 80-90', 'K-Pop']) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}$`) }));
    const music = screen.getByRole('button', { name: /^Musique$/ });
    expect(music).toHaveAttribute('aria-disabled', 'true'); fireEvent.click(music);
    expect(music).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'C’est parti !' }));
    expect(props.onStart.mock.calls[0][0]).toEqual(['music']);
  });
  it('sends edited durations and extras, without changing the game contract', () => {
    const props = setupProps(); render(<InkBetaBlindtestSetup {...props} />);
    const rounds = within(screen.getByRole('group', { name: 'Nombre de manches' })).getAllByRole('button');
    fireEvent.click(rounds[0]);
    fireEvent.click(within(screen.getByRole('group', { name: 'Durée d’écoute par manche' })).getAllByRole('button')[0]);
    fireEvent.click(screen.getByRole('switch', { name: 'En équipes' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Un coup de pouce' }));
    fireEvent.click(screen.getByRole('button', { name: 'C’est parti !' }));
    expect(props.onStart.mock.calls[0][1]).toMatchObject({ rounds: Number(rounds[0].textContent), teams: true, hints: false });
  });
  it('selects three unique random categories', () => {
    render(<InkBetaBlindtestSetup {...setupProps()} />); fireEvent.click(screen.getByRole('button', { name: 'Surprends-moi' }));
    expect(within(screen.getByRole('group', { name: 'Univers musicaux disponibles' })).getAllByRole('button', { pressed: true })).toHaveLength(3);
  });
  it('blocks launch while disconnected or preparing and exposes failures', () => {
    const props = setupProps(); const { rerender } = render(<InkBetaBlindtestSetup {...props} canStart={false} />);
    expect(screen.getByRole('button', { name: 'C’est parti !' })).toBeDisabled();
    rerender(<InkBetaBlindtestSetup {...props} starting />); expect(screen.getByRole('button', { name: 'Préparation du mix…' })).toBeDisabled();
    rerender(<InkBetaBlindtestSetup {...props} error="Aucun extrait disponible" />); expect(screen.getByRole('alert')).toHaveTextContent('Aucun extrait disponible');
  });
  it('shows guests an honest waiting screen rather than editable host settings', () => {
    render(<InkBetaBlindtestSetup {...setupProps()} isHost={false} />);
    expect(screen.queryByRole('button', { name: 'C’est parti !' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('En attente de l’hôte');
  });
});

describe('Ink Beta stage composition', () => {
  it('animates the sound system only while an audible excerpt can play', () => {
    const props = viewProps();
    const { container, rerender } = render(<InkBetaBlindtestView {...props} />);
    expect(container.querySelector('.ibx-root')).toHaveAttribute('data-playing', 'true');
    expect(container.querySelectorAll('.ibx-speaker')).toHaveLength(2);
    expect(container.querySelector('.ibx-tonearm')).toHaveAttribute('aria-hidden', 'true');
    for (const state of [{ muted: true }, { mediaError: true }, { needsSoundUnlock: true }, { secondsLeft: 0 }]) {
      rerender(<InkBetaBlindtestView {...props} {...state} />);
      expect(container.querySelector('.ibx-root')).not.toHaveAttribute('data-playing');
    }
    rerender(<InkBetaBlindtestView {...props} phase="reveal" />);
    expect(container.querySelector('.ibx-root')).not.toHaveAttribute('data-playing');
  });
  it('uses the existing Mimic Master brand and places scores beside a record-above-answers stage', () => {
    const { container } = render(<InkBetaBlindtestView {...viewProps()} />);
    expect(screen.getByRole('heading', { name: 'Mimic Master Ink Beta' })).toBeInTheDocument();
    const arena = container.querySelector('.ibx-arena');
    expect(arena?.firstElementChild).toHaveClass('ibx-live');
    const stage = container.querySelector('.ibx-stage');
    expect(stage?.querySelector('.ibx-turntable')).toBeInTheDocument();
    expect(stage?.querySelectorAll('.ibx-answer')).toHaveLength(4);
    expect(container.querySelector('.ibx-game-layout')?.firstElementChild).toHaveClass('ibx-listening-room');
  });
  it('freezes the entire host configuration while launching', () => {
    render(<InkBetaBlindtestSetup {...setupProps()} starting />);
    expect(screen.getByRole('button', { name: 'Pop culture' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Musique' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'En équipes' })).toBeDisabled();
  });
});

describe('Ink Beta gameplay and results', () => {
  it('dispatches answers by index and locks choices once sent', () => {
    const props = viewProps(); const { rerender } = render(<InkBetaBlindtestView {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /B One Piece/ })); expect(props.answer).toHaveBeenCalledWith(1);
    rerender(<InkBetaBlindtestView {...props} myChoice={1} myElapsed={2500} />);
    for (const choice of screen.getAllByRole('button').filter((button) => button.classList.contains('ibx-answer'))) expect(choice).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Réponse verrouillée');
  });
  it('disables answers after the timer expires', () => {
    render(<InkBetaBlindtestView {...viewProps({ secondsLeft: 0 })} />);
    expect(screen.getByRole('button', { name: /A Naruto/ })).toBeDisabled();
  });
  it('keeps the audio controls connected', () => {
    const props = viewProps({ needsSoundUnlock: true }); render(<InkBetaBlindtestView {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Activer le son' })); expect(props.resumeSound).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('slider', { name: 'Volume de l’extrait musical' }), { target: { value: '40' } }); expect(props.setVolume).toHaveBeenCalledWith(40);
    fireEvent.click(screen.getByRole('button', { name: 'Couper le son' })); expect(props.toggleMute).toHaveBeenCalledOnce();
  });
  it('requires confirmation before leaving an active round', () => {
    const props = viewProps(); render(<InkBetaBlindtestView {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retour au lobby' })); expect(props.onEndGame).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer à jouer' })); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retour au lobby' })); fireEvent.click(screen.getByRole('button', { name: 'Quitter la partie' })); expect(props.onEndGame).toHaveBeenCalledOnce();
  });
  it('shows correct answer, votes and awarded points without editable choices', () => {
    render(<InkBetaBlindtestView {...viewProps({ phase: 'reveal', myChoice: 0, answerIndex: 0, roundPoints: { a: 750 }, revealVotes: { a: 0, b: 2 } })} />);
    expect(screen.getByText('Bonne réponse')).toBeInTheDocument(); expect(screen.getByLabelText('Votes : Alex')).toBeInTheDocument();
    expect(screen.getByText('+750')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /A Naruto/ })).not.toBeInTheDocument();
  });
  it('renders team scores and teammate votes', () => {
    render(<InkBetaBlindtestView {...viewProps({ teamsEnabled: true, teamOf: { a: 0, b: 0 }, liveVotes: { b: 1 }, teamScores: [2000, 500] })} />);
    expect(screen.getByLabelText('Coéquipiers : Sam')).toBeInTheDocument(); expect(screen.getByText('Ton équipe : Cyan')).toBeInTheDocument();
  });
  it('renders tied winners fairly and disables replay during loading', () => {
    const props = viewProps({ phase: 'final', starting: true, betaRanked: [{ id: 'a', name: 'Alex', pts: 1200 }, { id: 'b', name: 'Sam', pts: 1200 }] });
    render(<InkBetaBlindtestView {...props} />); expect(screen.getByText('PREMIERS EX ÆQUO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préparation…' })).toBeDisabled();
  });
  it('offers replay only to the host and always allows a lobby return', () => {
    const props = viewProps({ phase: 'final' }); const { rerender } = render(<InkBetaBlindtestView {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Encore une partie' })); expect(props.replay).toHaveBeenCalledOnce();
    rerender(<InkBetaBlindtestView {...props} isHost={false} />); expect(screen.queryByRole('button', { name: 'Encore une partie' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('L’hôte choisit la suite.');
  });
});
