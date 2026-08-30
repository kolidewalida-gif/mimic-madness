import { motion } from 'framer-motion';
import { Clock3, Crown, LogOut, Radio, RotateCcw, Trophy, Users } from 'lucide-react';
import { PodiumAd } from '@/components/PodiumAd';

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
}

const TEAM_META = [
  { name: 'Cyan', color: '#32d6c5' },
  { name: 'Rose', color: '#ff5d7a' },
] as const;

const PlayerAvatar = ({
  player,
  getAvatar,
}: {
  player: RankedPlayer;
  getAvatar: InkBetaBlindtestResultsProps['getAvatar'];
}) => {
  const avatar = getAvatar(player.id);
  const image = avatar?.type === 'image' ? avatar.imageUrl : null;
  return (
    <span className="bt3-avatar">
      {image
        ? <img src={image} alt={player.name} />
        : <span>{(player.name[0] || '?').toUpperCase()}</span>}
    </span>
  );
};

export const InkBetaBlindtestResults = ({
  ranked,
  currentPlayerId,
  isHost,
  teamsEnabled,
  teamScores,
  teamOf,
  avgReaction,
  getAvatar,
  roundIndex,
  totalRounds,
  onReplay,
  onEndGame,
}: InkBetaBlindtestResultsProps) => {
  const winner = ranked[0];
  const teamWinner = teamScores[0] === teamScores[1] ? null : teamScores[0] > teamScores[1] ? 0 : 1;
  const myIndex = ranked.findIndex((player) => player.id === currentPlayerId);
  const me = myIndex >= 0 ? ranked[myIndex] : null;

  return (
    <motion.section
      className="bt3-results"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="bt3-results-title"
    >
      <header className="bt3-results-head">
        <div>
          <span className="bt3-eyebrow">Fin du set · {totalRounds} manches</span>
          <h2 id="bt3-results-title">Le classement est tombé.</h2>
        </div>
        <Trophy aria-hidden="true" />
      </header>

      <div className="bt3-results-layout">
        <section className="bt3-winner-card" aria-label="Vainqueur de la partie">
          {winner ? (
            <>
              <span className="bt3-winner-label"><Crown aria-hidden="true" /> Numéro 1</span>
              <PlayerAvatar player={winner} getAvatar={getAvatar} />
              <div>
                <h3>{winner.name}</h3>
                <p>{winner.id === currentPlayerId ? 'C’est toi, champion.' : 'Le meilleur flair musical du set.'}</p>
              </div>
              <strong>{winner.pts.toLocaleString('fr-FR')}<small>points</small></strong>
            </>
          ) : (
            <div className="bt3-results-empty">Aucun score enregistré.</div>
          )}
        </section>

        <section className="bt3-ranking" aria-labelledby="bt3-ranking-title">
          <div className="bt3-ranking-head">
            <span className="bt3-step">Scoreboard</span>
            <h3 id="bt3-ranking-title">Tout le monde</h3>
          </div>
          <ol>
            {ranked.map((player, index) => {
              const avg = avgReaction[player.id];
              const team = teamOf[player.id] ?? 0;
              return (
                <motion.li
                  key={player.id}
                  data-self={player.id === currentPlayerId || undefined}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="bt3-rank">{String(index + 1).padStart(2, '0')}</span>
                  <PlayerAvatar player={player} getAvatar={getAvatar} />
                  <span className="bt3-rank-copy">
                    <strong>{player.name}{player.id === currentPlayerId ? ' · toi' : ''}</strong>
                    <small>{teamsEnabled ? `Équipe ${TEAM_META[team].name}` : player.isDisconnected ? 'Déconnecté' : 'Joueur'}</small>
                    {avg != null && <small className="bt3-rank-speed"><Clock3 aria-hidden="true" /> {(avg / 1_000).toFixed(1)}s de moyenne</small>}
                  </span>
                  <strong className="bt3-rank-score">{player.pts.toLocaleString('fr-FR')}</strong>
                </motion.li>
              );
            })}
          </ol>
        </section>

        <aside className="bt3-results-side">
          {teamsEnabled && (
            <section className="bt3-team-result" aria-label="Résultat des équipes">
              <span>{teamWinner == null ? 'Égalité des équipes' : `Équipe ${TEAM_META[teamWinner].name} en tête`}</span>
              <div>
                {TEAM_META.map((team, index) => (
                  <article key={team.name} data-winner={teamWinner === index || undefined} style={{ '--bt3-team': team.color } as React.CSSProperties}>
                    <Users aria-hidden="true" /><span>{team.name}</span><strong>{teamScores[index as 0 | 1]}</strong>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="bt3-my-result">
            <span>Ta performance</span>
            <strong>{myIndex >= 0 ? `#${myIndex + 1}` : '—'}</strong>
            <p>{me ? `${me.pts.toLocaleString('fr-FR')} points` : 'Pas de classement'}</p>
            {me && avgReaction[me.id] != null && <small><Clock3 aria-hidden="true" /> {(avgReaction[me.id] / 1_000).toFixed(1)}s par réponse</small>}
          </section>

          <div className="bt3-result-actions">
            {isHost ? (
              <button type="button" className="bt3-replay menu-focus" onClick={onReplay}>
                <RotateCcw aria-hidden="true" /><span><strong>Rejouer</strong><small>Mêmes réglages</small></span>
              </button>
            ) : (
              <p className="bt3-host-wait"><Radio className="animate-pulse" aria-hidden="true" /> En attente de l’hôte…</p>
            )}
            <button type="button" className="bt3-exit menu-focus" onClick={onEndGame}>
              <LogOut aria-hidden="true" /> Retour au lobby
            </button>
          </div>
        </aside>
      </div>

      <PodiumAd
        gameMode="memorise"
        instanceKey={`memorise:${roundIndex}:${totalRounds}`}
        className="bt3-podium-ad"
      />
    </motion.section>
  );
};
