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
    <span className="bt5-avatar">
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
      className="bt5-results"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="bt5-results-title"
    >
      <header className="bt5-results-head">
        <span className="bt5-eyebrow">Fin du set · {totalRounds} manches</span>
        <h2 id="bt5-results-title">Le classement est tombé.</h2>
      </header>

      {winner && (
        <motion.div
          className="bt5-winner"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 200, delay: 0.1 }}
        >
          <span className="bt5-winner-crown" aria-hidden="true"><Crown /></span>
          <PlayerAvatar player={winner} getAvatar={getAvatar} />
          <div className="bt5-winner-copy">
            <strong>{winner.name}</strong>
            <small>{winner.id === currentPlayerId ? 'C’est toi, champion.' : 'Meilleure oreille du set'}</small>
          </div>
          <strong className="bt5-winner-score">{winner.pts.toLocaleString('fr-FR')}<small>pts</small></strong>
        </motion.div>
      )}

      <ol className="bt5-ranking" aria-label="Classement complet">
        {ranked.map((player, index) => {
          const avg = avgReaction[player.id];
          const team = teamOf[player.id] ?? 0;
          return (
            <motion.li
              key={player.id}
              data-self={player.id === currentPlayerId || undefined}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              <span className="bt5-rank">{index === 0 ? <Trophy aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>
              <PlayerAvatar player={player} getAvatar={getAvatar} />
              <span className="bt5-rank-copy">
                <strong>{player.name}{player.id === currentPlayerId ? ' · toi' : ''}</strong>
                <small>
                  {teamsEnabled ? `Équipe ${TEAM_META[team].name}` : player.isDisconnected ? 'Déconnecté' : null}
                  {avg != null && <em><Clock3 aria-hidden="true" /> {(avg / 1_000).toFixed(1)}s de moyenne</em>}
                </small>
              </span>
              <strong className="bt5-rank-score">{player.pts.toLocaleString('fr-FR')}</strong>
            </motion.li>
          );
        })}
      </ol>

      {teamsEnabled && (
        <div className="bt5-team-result" aria-label="Résultat des équipes">
          <span>{teamWinner == null ? 'Égalité des équipes' : `Équipe ${TEAM_META[teamWinner].name} en tête`}</span>
          <div>
            {TEAM_META.map((team, index) => (
              <article key={team.name} data-winner={teamWinner === index || undefined} style={{ '--bt5-team': team.color } as React.CSSProperties}>
                <Users aria-hidden="true" /><span>{team.name}</span><strong>{teamScores[index as 0 | 1]}</strong>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="bt5-result-foot">
        {me && (
          <p className="bt5-my-result">
            Ta place : <strong>#{myIndex + 1}</strong> · {me.pts.toLocaleString('fr-FR')} pts
          </p>
        )}
        <div className="bt5-result-actions">
          {isHost ? (
            <button type="button" className="bt5-replay menu-focus" onClick={onReplay}>
              <RotateCcw aria-hidden="true" /><span><strong>Rejouer</strong><small>Mêmes réglages</small></span>
            </button>
          ) : (
            <p className="bt5-host-wait"><Radio className="animate-pulse" aria-hidden="true" /> En attente de l’hôte…</p>
          )}
          <button type="button" className="bt5-exit menu-focus" onClick={onEndGame}>
            <LogOut aria-hidden="true" /> Retour au lobby
          </button>
        </div>
      </div>

      <PodiumAd
        gameMode="memorise"
        instanceKey={`memorise:${roundIndex}:${totalRounds}`}
        className="bt5-podium-ad"
      />
    </motion.section>
  );
};
