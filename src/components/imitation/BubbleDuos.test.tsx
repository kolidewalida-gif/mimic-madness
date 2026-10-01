import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DuoIdentity, DuoLineup, DuoPartnerView, DuoReplays, DuoScoreboard, DuoVotingBoard, type DuoPartnerViewProps } from './BubbleDuos';
import { BubbleGameHeader } from './BubbleGame';
import { ResultsPlayerCard } from '../ResultsPlayerCard';

vi.mock('@/components/PlayerAvatar', () => ({ PlayerAvatar: ({ playerName }: { playerName: string }) => <div role="img" aria-label={playerName} /> }));
vi.mock('@/components/VideoWithAudioOverlay', () => ({ VideoWithAudioOverlay: () => <video aria-label="Imitation" /> }));
const teams = [{ teamNumber: 1, players: [{ id: 'alex', name: 'Alex' }, { id: 'luna', name: 'Luna' }] }, { teamNumber: 2, players: [{ id: 'jade', name: 'Jade' }, { id: 'max', name: 'Max' }] }];
const partner: DuoPartnerViewProps = { currentPlayer: teams[0].players[0], teammate: teams[0].players[1], teamNumber: 1, isReady: false, teammateReady: false, recording: false, audioLevel: 0, messages: [], draft: '', onDraft: vi.fn(), onSend: vi.fn() };
afterEach(cleanup);

describe('Bubble 2V2 presentation', () => {
  it('keeps the team color tied to its actual number rather than its rank', () => {
    const view = render(<DuoIdentity team={teams[1]} self="alex" />);
    expect(view.container.firstElementChild).toHaveAttribute('data-tone', 'pink');
    expect(screen.getByText('Équipe adverse')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
  it('identifies both teams and the individual readiness states', () => {
    render(<DuoLineup teams={teams} self="alex" ready={['alex', 'max']} />);
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByText('Ton équipe')).toBeInTheDocument();
    expect(within(cards[0]).getByText('1/2 prêts')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Défi vu')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Découvre le défi')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Prêt')).toHaveLength(2);
  });
  it('does not invent teams while synchronization is pending', () => {
    render(<DuoLineup teams={[]} self="alex" />);
    expect(screen.getByRole('status')).toHaveTextContent('Les duos se synchronisent');
    expect(screen.queryByText('Duo 1')).toBeNull();
  });
  it('clearly distinguishes a teammate recording from a submitted take', () => {
    const view = render(<DuoPartnerView {...partner} recording audioLevel={0.55} />);
    expect(screen.getByRole('status')).toHaveTextContent('Il enregistre sa voix');
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '55');
    view.rerender(<DuoPartnerView {...partner} isReady teammateReady recording />);
    expect(screen.getByRole('status')).toHaveTextContent('Sa prise est envoyée');
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByText(/Duo prêt !/)).toBeInTheDocument();
  });
  it('keeps team chat collapsible and disables empty messages', () => {
    const send = vi.fn(); const draft = vi.fn();
    const view = render(<DuoPartnerView {...partner} onSend={send} onDraft={draft} />);
    expect(screen.getByRole('button', { name: 'Envoyer au duo' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'On tente cet accent ?' } });
    expect(draft).toHaveBeenCalledWith('On tente cet accent ?');
    view.rerender(<DuoPartnerView {...partner} draft="On tente cet accent ?" onSend={send} onDraft={draft} />);
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Entre vous/ }));
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.getByRole('button', { name: /Entre vous/ })).toHaveAttribute('aria-expanded', 'false');
  });
  it('shows incoming and own messages without hiding the send action', () => {
    render(<DuoPartnerView {...partner} messages={[{ id: '1', playerId: 'luna', playerName: 'Luna', content: 'Je fais la voix grave.', createdAt: new Date() }, { id: '2', playerId: 'alex', playerName: 'Alex', content: 'Parfait !', createdAt: new Date() }]} />);
    const log = screen.getByRole('log');
    expect(within(log).getByText('Luna')).toBeInTheDocument();
    expect(within(log).getByText('Toi')).toBeInTheDocument();
    expect(within(log).getAllByRole('article')).toHaveLength(2);
  });
  it('presents the actual duo and preserves playback, vote and navigation slots', () => {
    render(<DuoVotingBoard team={teams[1]} self="alex" index={1} total={2} video={<video data-testid="team-video" />} controls={<button>Lecture collective</button>} verdict={<button>Mon vote</button>} navigation={<button>Classement</button>} />);
    expect(screen.getByText('Duo 2')).toBeInTheDocument();
    expect(screen.getByTestId('team-video')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lecture collective' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mon vote' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Classement' })).toBeInTheDocument();
  });
  it('shares the first place for identical certified team results', () => {
    render(<DuoScoreboard teams={teams} scores={[{ teamNumber: 2, score: 6, likes: 3, dislikes: 0 }, { teamNumber: 1, score: 6, likes: 3, dislikes: 0 }]} self="alex" certified />);
    expect(screen.getAllByText('En tête')).toHaveLength(2);
    const cards = screen.getAllByRole('listitem');
    expect(cards[0]).toHaveAttribute('data-tone', 'pink');
    expect(cards[1]).toHaveAttribute('data-tone', 'mint');
    expect(screen.getAllByText('+6')).toHaveLength(2);
  });
  it('withholds an uncertified scoreboard', () => {
    render(<DuoScoreboard teams={teams} scores={[{ teamNumber: 1, score: 99, likes: 99, dislikes: 0 }]} self="alex" certified={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('On vérifie les votes');
    expect(screen.queryByText('+99')).toBeNull();
  });
  it('groups individual replays under their original team', () => {
    render(<DuoReplays teams={teams} scores={[{ teamNumber: 2, score: 4, likes: 2, dislikes: 0 }, { teamNumber: 1, score: 0, likes: 0, dislikes: 0 }]} renderPlayer={player => <span>Prise de {player.name}</span>} />);
    const groups = document.querySelectorAll('details');
    expect(groups).toHaveLength(2);
    expect(groups[0].textContent).toContain('Prise de Jade');
    expect(groups[0].textContent).not.toContain('Prise de Luna');
    expect(groups[1].textContent).toContain('Prise de Luna');
  });
  it('labels the shared steps without changing the solo header', () => {
    const view = render(<BubbleGameHeader phase="imitation" teamMode />);
    expect(screen.getByText('Imitation · 2V2')).toBeInTheDocument();
    expect(screen.getByText('Vos prises')).toBeInTheDocument();
    view.rerender(<BubbleGameHeader phase="imitation" />);
    expect(screen.getByText('Imitation')).toBeInTheDocument();
    expect(screen.getByText('Ta prise')).toBeInTheDocument();
  });
  it('does not confuse individual replay cards with the team ranking', () => {
    render(<ResultsPlayerCard presentation="teamReplay" result={{ playerId: 'alex', playerName: 'Alex', likes: 4, dislikes: 0, score: 8 }} rank={1} color="#b5f1dc" isWinner={false} isSolo={false} isCurrentPlayer challengeVideoClipId="demo" clipState={{ status: 'idle' }} isDownloading={false} isSharing={false} canShare={false} hasShared={false} onRequestClip={vi.fn()} onDownload={vi.fn()} onShare={vi.fn()} />);
    expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Prise de Alex');
    expect(screen.getByText('Prise individuelle du duo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Rang 1')).toBeNull();
    expect(screen.queryByText('8 pts')).toBeNull();
    expect(screen.getByRole('button', { name: 'Télécharger l’imitation de Alex' })).toBeInTheDocument();
  });
});
