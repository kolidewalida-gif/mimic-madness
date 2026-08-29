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
  { name: 'Cyan', color: '#2df2d0' },
  { name: 'Rose', color: '#ff62b6' },
] as const;

const PlayerAvatar = ({
  player,
  place,
  getAvatar,
}: {
  player: RankedPlayer;
  place: number;
  getAvatar: InkBetaBlindtestResultsProps['getAvatar'];
}) => {
  const avatar = getAvatar(player.id);
  const image = avatar?.type === 'image' ? avatar.imageUrl : null;
  return (
    <div className="ibt-result-avatar" data-place={place}>
      {image
        ? <img src={image} alt={player.name} />
        : <span>{(player.name[0] || '?').toUpperCase()}</span>}
    </div>
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
  const topThree = ranked.slice(0, 3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean) as RankedPlayer[];
  const teamWinner = teamScores[0] === teamScores[1] ? null : teamScores[0] > teamScores[1] ? 0 : 1;

  return (
    <motion.section
      className="ibt-results"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="ibt-results-title"
    >
      <header className="ibt-results-head">
        <div className="ibt-trophy"><Trophy aria-hidden="true" /></div>
        <div>
          <span className="ibt-kicker">Session terminée · {totalRounds} manches</span>
          <h2 id="ibt-results-title">Classement final</h2>
          <p>{ranked.length > 0 ? 'Le studio applaudit les meilleurs mélomanes.' : 'Aucun joueur dans cette session.'}</p>
        </div>
      </header>

      {teamsEnabled && (
        <section className="ibt-team-result" aria-label="Résultat des équipes">
          <p>{teamWinner == null ? 'Égalité parfaite' : `L’équipe ${TEAM_META[teamWinner].name} remporte le mix`}</p>
          <div>
            {TEAM_META.map((team, index) => (
              <article key={team.name} data-winner={teamWinner === index || undefined} style={{ '--ibt-team': team.color } as React.CSSProperties}>
                <Users aria-hidden="true" /><span>{team.name}</span><strong>{teamScores[index as 0 | 1]}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      {podiumOrder.length > 0 && (
        <div className="ibt-podium" data-count={podiumOrder.length}>
          {podiumOrder.map((player) => {
            const place = ranked.findIndex((entry) => entry.id === player.id) + 1;
            const avg = avgReaction[player.id];
            return (
              <motion.article
                key={player.id}
                className="ibt-podium-player"
                data-place={place}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: place * 0.08 }}
              >
                {place === 1 && <Crown className="ibt-podium-crown" aria-hidden="true" />}
                <PlayerAvatar player={player} place={place} getAvatar={getAvatar} />
                <span className="ibt-place">{place === 1 ? '1er' : `${place}e`}</span>
                <h3>{player.name}{player.id === currentPlayerId ? ' · toi' : ''}</h3>
                <strong>{player.pts.toLocaleString('fr-FR')} pts</strong>
                <small><Clock3 aria-hidden="true" /> {avg != null ? `${(avg / 1_000).toFixed(1)}s moy.` : 'aucune réponse'}</small>
              </motion.article>
            );
          })}
        </div>
      )}

      <div className="ibt-results-lower">
        <section className="ibt-ranking" aria-labelledby="ibt-ranking-title">
          <div className="ibt-panel-head"><div><span>Tableau complet</span><h3 id="ibt-ranking-title">Toute la troupe</h3></div></div>
          <ol>
            {ranked.map((player, index) => {
              const avg = avgReaction[player.id];
              const team = teamOf[player.id] ?? 0;
              return (
                <li key={player.id} data-self={player.id === currentPlayerId || undefined}>
                  <span className="ibt-rank-number">{String(index + 1).padStart(2, '0')}</span>
                  <PlayerAvatar player={player} place={index + 1} getAvatar={getAvatar} />
                  <span className="ibt-rank-name">
                    <strong>{player.name}{player.id === currentPlayerId ? ' (toi)' : ''}</strong>
                    <small>{teamsEnabled ? `Équipe ${TEAM_META[team].name}` : player.isDisconnected ? 'Déconnecté' : 'Joueur'}</small>
                  </span>
                  <span className="ibt-rank-speed">{avg != null ? `${(avg / 1_000).toFixed(1)}s` : '—'}</span>
                  <strong className="ibt-rank-score">{player.pts.toLocaleString('fr-FR')}</strong>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="ibt-results-actions">
          <div className="ibt-results-summary">
            <span>Ta position</span>
            <strong>{ranked.some((player) => player.id === currentPlayerId) ? `#${ranked.findIndex((player) => player.id === currentPlayerId) + 1}` : '—'}</strong>
            <small>{ranked.some((player) => player.id === currentPlayerId) ? `${ranked.find((player) => player.id === currentPlayerId)?.pts ?? 0} points` : 'Aucun classement'}</small>
          </div>
          {isHost ? (
            <button type="button" className="ibt-replay menu-focus" onClick={onReplay}>
              <RotateCcw aria-hidden="true" /><span>Rejouer</span><small>Mêmes réglages</small>
            </button>
          ) : (
            <p className="ibt-host-wait"><Radio className="animate-pulse" aria-hidden="true" /> En attente de l’hôte…</p>
          )}
          <button type="button" className="ibt-exit menu-focus" onClick={onEndGame}>
            <LogOut aria-hidden="true" /> Retour au lobby
          </button>
        </aside>
      </div>

      <PodiumAd
        gameMode="memorise"
        instanceKey={`memorise:${roundIndex}:${totalRounds}`}
        className="ibt-podium-ad"
      />
    </motion.section>
  );
};
