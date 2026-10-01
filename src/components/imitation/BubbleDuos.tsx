import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, Crown, Headphones, MessageCircle, Mic, Send, Swords, ThumbsDown, ThumbsUp, Users, Clock } from 'lucide-react';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import type { Team, TeamPlayer } from '@/lib/teamsLogic';
import { cn } from '@/lib/utils';
import s from './BubbleDuos.module.css';

// The actual team number, never its rank or array position, defines its color.
const tone = (number: number) => ['mint', 'pink', 'lavender', 'gold'][((number - 1) % 4 + 4) % 4];
export const DuoIdentity = ({ team, self, compact = false }: { team: Team; self: string; compact?: boolean }) =>
  <div className={cn(s.identity, compact && s.compact)} data-tone={tone(team.teamNumber)}>
    <span className={s.teamMark}><Users aria-hidden="true" /><b>{String(team.teamNumber).padStart(2, '0')}</b></span>
    <div><strong>Duo {team.teamNumber}</strong><small>{team.players.some(p => p.id === self) ? 'Ton équipe' : 'Équipe adverse'}</small></div>
    <div className={s.portraits}>{team.players.map(p => <PlayerAvatar key={p.id} playerId={p.id} playerName={p.name} size="lg" showTitle={false} />)}</div>
  </div>;

export const DuoLineup = ({ teams, self, ready = [], step = 'preview' }: { teams: Team[]; self: string; ready?: string[]; step?: 'preview' | 'imitation' }) =>
  <section className={s.lineup} aria-label="Les duos de la manche">
    {teams.length === 0 ? <p className={s.sync} role="status"><Users />Les duos se synchronisent…</p> : <>
      <div className={s.lineupTitle}><Swords aria-hidden="true" /><strong>Les duos</strong><small>{step === 'preview' ? 'Même défi. Deux voix par équipe.' : 'Une prise chacun. Un score ensemble.'}</small></div>
      <div className={s.teams}>{teams.map(team => <article key={team.teamNumber} className={s.teamCard} data-tone={tone(team.teamNumber)}>
        <header><strong>Duo {team.teamNumber}</strong>{team.players.some(p => p.id === self) && <span>Ton équipe</span>}<small>{team.players.filter(p => ready.includes(p.id)).length}/{team.players.length} prêts</small></header>
        <ul>{team.players.map(p => <li key={p.id}><PlayerAvatar playerId={p.id} playerName={p.name} size="sm" showTitle={false} /><div><strong>{p.name}{p.id === self && <small> · toi</small>}</strong><span>{ready.includes(p.id) ? step === 'preview' ? 'Défi vu' : 'Prise envoyée' : step === 'preview' ? 'Découvre le défi' : 'Prépare sa prise'}</span></div><span className={cn(s.playerState, ready.includes(p.id) && s.ready)}>{ready.includes(p.id) ? <Check aria-label="Prêt" /> : <Clock aria-label="En attente" />}</span></li>)}</ul>
      </article>)}</div>
    </>}
  </section>;

interface TeamMessage { id: string; playerId: string; playerName: string; content: string; createdAt: Date }
export interface DuoPartnerViewProps {
  currentPlayer: TeamPlayer; teammate: TeamPlayer; teamNumber?: number;
  isReady: boolean; teammateReady: boolean; recording: boolean; audioLevel: number;
  messages: TeamMessage[]; draft: string; onDraft: (text: string) => void; onSend: () => void;
  scrollAnchor?: ReactNode;
}
export const DuoPartnerView = ({ currentPlayer, teammate, teamNumber, isReady, teammateReady, recording, audioLevel, messages, draft, onDraft, onSend, scrollAnchor }: DuoPartnerViewProps) => {
  const [chatOpen, setChatOpen] = useState(true);
  return <section className={s.partner} data-tone={tone(teamNumber ?? 1)} aria-label="Le coin de ton duo">
    <header className={s.partnerHeading}><span className={s.headIcon}><Headphones /></span><div><small>En équipe</small><h2>{teamNumber ? `Duo ${teamNumber}` : 'Ton duo'}</h2></div><span className={s.counter}>{Number(isReady) + Number(teammateReady)}/2</span></header>
    <div className={s.partnerBody}>
      <div className={s.partnerPortrait}><PlayerAvatar playerId={teammate.id} playerName={teammate.name} size="xl" showTitle={false} /><strong>{teammate.name}</strong><small>Ton coéquipier</small></div>
      <p className={cn(s.status, teammateReady && s.ready)} role="status">{teammateReady ? <Check /> : recording ? <Mic /> : <Clock />}{teammateReady ? 'Sa prise est envoyée' : recording ? 'Il enregistre sa voix' : 'Il prépare sa prise'}</p>
      {recording && !teammateReady && <div className={s.audio} role="meter" aria-label="Activité du micro du coéquipier" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(1, audioLevel)) * 100)}>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ height: `${Math.max(12, Math.min(100, audioLevel * 100 * (0.6 + (i % 4) * 0.13)))}%` }} />)}</div>}
      <div className={s.yourStatus}><span><PlayerAvatar playerId={currentPlayer.id} playerName={currentPlayer.name} size="sm" showTitle={false} /><strong>Ta prise</strong></span><small>{isReady ? 'Envoyée' : 'À enregistrer'}</small>{isReady && <Check />}</div>
      <p className={s.partnerTip}>{isReady && teammateReady ? 'Duo prêt ! Vos deux voix seront réunies pour le vote.' : 'Chacun enregistre sa voix. Vos deux prises seront réunies pour le vote.'}</p>
    </div>
    <button type="button" className={s.chatToggle} aria-expanded={chatOpen} onClick={() => setChatOpen(!chatOpen)}><MessageCircle /><span>Entre vous</span><small>{messages.length || ''}</small><ChevronDown className={chatOpen ? s.chevronOpen : undefined} /></button>
    {chatOpen && <div className={s.chatBody}>
      <div className={s.messages} role="log" aria-label="Messages du duo" aria-live="polite" aria-relevant="additions text">{messages.length === 0 ? <div className={s.chatEmpty}><MessageCircle /><strong>Accordez vos voix.</strong><p>Un accent, une idée ? Glisse un mot à ton coéquipier.</p></div> : messages.map(msg => <article key={msg.id} className={cn(s.message, msg.playerId === currentPlayer.id && s.mine)}><small>{msg.playerId === currentPlayer.id ? 'Toi' : msg.playerName}<time>{msg.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time></small><p>{msg.content}</p></article>)}{scrollAnchor}</div>
      <form className={s.composer} onSubmit={event => { event.preventDefault(); onSend(); }}><input aria-label="Message à ton duo" value={draft} onChange={event => onDraft(event.target.value)} placeholder="Un mot à ton duo…" /><button type="submit" aria-label="Envoyer au duo" disabled={!draft.trim()}><Send /></button></form>
    </div>}
  </section>;
};

export const DuoVotingBoard = ({ team, self, index, total, video, controls, verdict, navigation }: { team?: Team; self: string; index: number; total: number; video: ReactNode; controls: ReactNode; verdict: ReactNode; navigation: ReactNode }) =>
  <div className={s.voteLayout}>
    <section className={s.screenPanel}>
      <header>{team ? <DuoIdentity team={team} self={self} compact /> : <strong>Le duo se prépare…</strong>}<span className={s.sequence}>{index + 1}<small>/{total}</small></span></header>
      <div className={s.video}>{video}</div><footer>{controls}<p><Headphones /> Deux voix, une imitation.</p></footer>
    </section>
    <section className={s.jury} aria-label="Ton verdict sur le duo">
      <span className={s.juryIcon}><ThumbsUp /></span><small>Le jury, c’est vous</small><h2>Alors, ce duo ?</h2><p>Écoute les deux voix, puis donne ton verdict sur l’équipe.</p>
      {verdict}<div className={s.voteNavigation}>{navigation}</div>
    </section>
  </div>;

export interface DuoScore { teamNumber: number; score: number; likes: number; dislikes: number }
export const DuoScoreboard = ({ teams, scores, self, certified }: { teams: Team[]; scores: DuoScore[]; self: string; certified: boolean }) =>
  <section className={s.scoreboard} aria-label="Classement des duos">
    <div className={s.scoreHeading}><TrophyMark /><div><small>Un score par équipe</small><h2>Le match des duos</h2></div></div>
    {!certified ? <p className={s.sync} role="status">On vérifie les votes…</p> : scores.length === 0 ? <p className={s.sync}>Aucun résultat d’équipe disponible.</p> : <ol className={s.scoreCards}>{scores.map(score => {
      const team = teams.find(t => t.teamNumber === score.teamNumber);
      const rank = scores.findIndex(other => other.score === score.score && other.likes === score.likes) + 1;
      return <li key={score.teamNumber} data-tone={tone(score.teamNumber)} className={cn(s.scoreCard, rank === 1 && s.winner)}>
        <header><span className={s.rank}>{rank === 1 ? <Crown /> : String(rank).padStart(2, '0')}</span><strong>{rank === 1 ? 'En tête' : `Place ${rank}`}</strong>{team?.players.some(p => p.id === self) && <small>Ton équipe</small>}</header>
        {team ? <DuoIdentity team={team} self={self} /> : <strong>Duo {score.teamNumber}</strong>}
        <p className={s.teamNames}>{team?.players.map(p => p.name).join(' & ')}</p><div className={s.score}><strong>{score.score > 0 ? '+' : ''}{score.score}</strong><span>points du duo</span></div>
        <footer><span><ThumbsUp />{score.likes}<small>votes pour</small></span><span><ThumbsDown />{score.dislikes}<small>votes contre</small></span></footer>
      </li>;
    })}</ol>}
    <p className={s.scoreNote}>Le classement tient compte du score d’équipe, puis des votes positifs. Les ex æquo partagent la même place.</p>
  </section>;

const TrophyMark = () => <span className={s.trophy}><Crown aria-hidden="true" /></span>;

export const DuoReplays = ({ teams, scores, renderPlayer }: { teams: Team[]; scores: DuoScore[]; renderPlayer: (player: TeamPlayer) => ReactNode }) =>
  <section className={s.replays} aria-label="Les prises des duos"><header><h2>Retour dans les coulisses</h2><p>Les prises individuelles à réécouter, télécharger ou partager.</p></header>{scores.map(score => {
    const team = teams.find(t => t.teamNumber === score.teamNumber);
    if (!team) return null;
    return <details key={team.teamNumber} className={s.replayGroup} data-tone={tone(team.teamNumber)}><summary><Users /><strong>Duo {team.teamNumber}</strong><span>{team.players.map(p => p.name).join(' & ')}</span><ChevronDown /></summary><div className={s.replayCards}>{team.players.map(p => <div key={p.id}>{renderPlayer(p)}</div>)}</div></details>;
  })}</section>;

export { s as duoStyles };
