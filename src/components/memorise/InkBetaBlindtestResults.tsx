import { ArrowLeft, ArrowUpRight, Check, Clock3, Crown, Loader2, Radio, RotateCcw, Trophy, Users } from 'lucide-react';
import { PodiumAd } from '@/components/PodiumAd';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface RankedPlayer {
  id: string;
  name: string;
  pts: number;
  isDisconnected?: boolean;
}
interface InkBetaBlindtestResultsProps {
  ranked: RankedPlayer[];
  currentPlayerId: string;
  isHost: boolean;
  teamsEnabled: boolean;
  teamScores: [number, number];
  teamOf: Record<string, 0 | 1>;
  avgReaction: Record<string, number>;
  getAvatar: (playerId: string) => { type?: string; imageUrl?: string | null } | null | undefined;
  roundIndex: number;
  totalRounds: number;
  onReplay: () => void;
  onEndGame: () => void;
  starting?: boolean;
  error?: string | null;
}

export const InkBetaBlindtestResults = ({
  ranked, currentPlayerId, isHost, teamsEnabled, teamScores, teamOf, avgReaction,
  getAvatar, roundIndex, totalRounds, onReplay, onEndGame, starting = false, error,
}: InkBetaBlindtestResultsProps) => {
  const winner = ranked[0];
  const topPlayers = winner ? ranked.filter((player) => player.pts === winner.pts) : [];
  const tied = topPlayers.length > 1;
  const myIndex = ranked.findIndex((player) => player.id === currentPlayerId);
  const me = ranked[myIndex];
  const myRank = me ? ranked.filter((player) => player.pts > me.pts).length + 1 : null;
  const winnerAvatar = winner ? getAvatar(winner.id) : null;
  const teamWinner = teamScores[0] === teamScores[1] ? null : teamScores[0] > teamScores[1] ? 0 : 1;
  const avatar = (player: RankedPlayer) => {
    const item = getAvatar(player.id);
    return <span className="ibx-avatar">{item?.type === 'image' && item.imageUrl ? <img src={item.imageUrl} alt="" /> : player.name.slice(0, 1).toUpperCase()}</span>;
  };
  return (
    <section className="ibx-results" aria-labelledby="ibx-results-title">
      <header className="ibx-results-heading"><span className="ibx-kicker"><Check /> {totalRounds} MANCHES TERMINÉES</span><h1 id="ibx-results-title">Le classement final.</h1><p>Les scores et les temps de réponse de cette partie.</p></header>
      <div className="ibx-results-grid">
        <section className="ibx-winner" aria-label="Vainqueur de la partie">
          <span className="ibx-kicker"><Crown />{tied ? 'PREMIERS EX ÆQUO' : 'LA TÊTE D’AFFICHE'}</span>
          <div className="ibx-winner-record" aria-hidden="true"><span>{!tied && winnerAvatar?.type === 'image' && winnerAvatar.imageUrl ? <img src={winnerAvatar.imageUrl} alt="" /> : <Trophy />}</span></div>
          <span className="ibx-winner-position">{winner ? '#01' : '—'}</span>
          <h2>{winner ? tied ? topPlayers.map((player) => player.name).join(' & ') : winner.name : 'Pas encore de score'}</h2>
          <p>{winner ? tied ? 'Le même score. La même place au sommet.' : winner.id === currentPlayerId ? 'La meilleure oreille du groupe, c’est toi.' : 'Une oreille en or. Une victoire méritée.' : 'Le prochain set sera le bon.'}</p>
          {winner && <strong className="ibx-winner-score">{winner.pts.toLocaleString('fr-FR')}<small>POINTS</small></strong>}
        </section>
        <section className="ibx-ranking" aria-labelledby="ibx-ranking-title">
          <header className="ibx-section-head"><div><Trophy /><h2 id="ibx-ranking-title">Le classement</h2></div><span>{ranked.length} joueurs</span></header>
          <ol>{ranked.map((player) => {
            const rank = ranked.filter((other) => other.pts > player.pts).length + 1;
            const avg = avgReaction[player.id];
            return <li key={player.id} data-self={player.id === currentPlayerId || undefined}>
              <span className="ibx-rank-number">{String(rank).padStart(2, '0')}</span>{avatar(player)}
              <span className="ibx-ranking-name"><strong>{player.name}{player.id === currentPlayerId && <small>toi</small>}</strong><small>{player.isDisconnected ? 'Hors ligne' : teamsEnabled ? `Équipe ${teamOf[player.id] === 1 ? 'Rose' : 'Cyan'}` : rank === 1 ? 'En tête d’affiche' : 'Dans le mix'}{avg != null && <> · {(avg / 1000).toFixed(1)} s / réponse</>}</small></span>
              <strong className="ibx-ranking-points">{player.pts.toLocaleString('fr-FR')}<small>pts</small></strong>
            </li>;
          })}</ol>
          {ranked.length === 0 && <p className="ibx-empty">Aucun score enregistré pour cette session.</p>}
        </section>
        <aside className="ibx-results-side">
          <section className="ibx-personal-result"><span className="ibx-kicker">TON RÉSULTAT</span><strong>{myRank != null ? `#${myRank}` : '—'}<small>sur {ranked.length}</small></strong><p>{me ? `${me.pts.toLocaleString('fr-FR')} points au compteur` : 'Pas de classement'}</p>{me && avgReaction[me.id] != null && <span><Clock3 />{(avgReaction[me.id] / 1000).toFixed(1)} s de réaction moyenne</span>}</section>
          {teamsEnabled && <section className="ibx-results-teams"><span className="ibx-kicker"><Users />{teamWinner == null ? 'ÉQUIPES EX ÆQUO' : `VICTOIRE ${teamWinner === 0 ? 'CYAN' : 'ROSE'}`}</span><div className="ibx-team-totals"><span>Cyan <strong>{teamScores[0].toLocaleString('fr-FR')}</strong></span><span>Rose <strong>{teamScores[1].toLocaleString('fr-FR')}</strong></span></div></section>}
          <div className="ibx-result-actions">
            <h3>On remet ça ?</h3><p>Un nouveau mix, les mêmes réglages.</p>
            {isHost ? <button type="button" className="ibx-launch" onClick={() => { playSoundEffect('powerUp', .32); onReplay(); }} disabled={starting} aria-busy={starting}>{starting ? <Loader2 className="ibx-spinning" /> : <RotateCcw />}<span>{starting ? 'Préparation…' : 'Encore une partie'}</span><ArrowUpRight /></button> : <p className="ibx-status" role="status"><Radio />L’hôte choisit la suite.</p>}
            {error && <p className="ibx-message ibx-message-error" role="alert">{error}</p>}
            <button type="button" className="ibx-secondary" onClick={() => { playSoundEffect('whoosh', .2); onEndGame(); }}><ArrowLeft />Retour au lobby</button>
          </div>
        </aside>
      </div>
      <PodiumAd gameMode="memorise" instanceKey={`memorise:${roundIndex}:${totalRounds}`} className="ibx-podium-ad" />
    </section>
  );
};
