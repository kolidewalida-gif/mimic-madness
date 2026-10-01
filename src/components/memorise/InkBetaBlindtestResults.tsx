import { ArrowLeft, Check, Clock3, Crown, Loader2, Radio, RotateCcw, Trophy, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PodiumAd } from '@/components/PodiumAd';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import styles from './BubbleBlindtest.module.css';

interface RankedPlayer { id: string; name: string; pts: number; isDisconnected?: boolean }
interface InkBetaBlindtestResultsProps {
  ranked: RankedPlayer[]; currentPlayerId: string; isHost: boolean; teamsEnabled: boolean;
  teamScores: [number, number]; teamOf: Record<string, 0 | 1>; avgReaction: Record<string, number>;
  getAvatar: (id: string) => { type?: string; imageUrl?: string | null } | null | undefined;
  roundIndex: number; totalRounds: number; onReplay: () => void; onEndGame: () => void;
  starting?: boolean; error?: string | null;
}

export const InkBetaBlindtestResults = ({ ranked, currentPlayerId, isHost, teamsEnabled, teamScores,
  teamOf, avgReaction, getAvatar, roundIndex, totalRounds, onReplay, onEndGame, starting = false, error }: InkBetaBlindtestResultsProps) => {
  const reduceMotion = useReducedMotion();
  const winner = ranked[0];
  const winners = ranked.filter(player => player.pts === winner?.pts);
  const me = ranked.find(player => player.id === currentPlayerId);
  const rankOf = (player: RankedPlayer) => ranked.filter(other => other.pts > player.pts).length + 1;
  const podium = ranked.slice(0, 3);
  const teamWinner = teamScores[0] === teamScores[1] ? null : teamScores[0] > teamScores[1] ? 0 : 1;
  const avatar = (player: RankedPlayer) => {
    const item = getAvatar(player.id);
    return <span className={styles.avatar}>{item?.type === 'image' && item.imageUrl ? <img src={item.imageUrl} alt="" /> : player.name.slice(0, 1).toUpperCase()}</span>;
  };
  return <section className={styles.results} aria-labelledby="ibx-results-title">
    <header className={`${styles.heading} ${styles.resultsHeading}`}><span className={styles.eyebrow}><Check /> {totalRounds} manches terminées</span><h1 id="ibx-results-title">Des oreilles <em>en or.</em></h1><p>{winner ? winners.length > 1 ? `${winners.map(player => player.name).join(' & ')} partagent la première place !` : `${winner.name} remporte ce blindtest !` : 'Aucun score enregistré pour cette session.'}</p></header>
    <div className={styles.resultsGrid}>
      <div className={styles.podiumPanel}>
        <div className={styles.podiumLabel}><Trophy /><span>{winners.length > 1 ? 'PREMIERS EX ÆQUO' : 'LA TÊTE D’AFFICHE'}</span></div>
        <ol className={styles.podium} aria-label="Podium de la partie">{podium.map((player, index) => <motion.li key={player.id} data-position={index + 1} data-self={player.id === currentPlayerId || undefined} initial={reduceMotion ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: index === 0 ? .2 : .05, ease: [0.16, 1, 0.3, 1] }}>
          <div className={styles.podiumPortrait}>{rankOf(player) === 1 && <Crown />}{avatar(player)}</div><strong>{player.name}</strong><small>{player.id === currentPlayerId ? 'C’est toi !' : 'Bien joué !'}</small><div className={styles.podiumStep}><b>{rankOf(player)}</b><strong>{player.pts.toLocaleString('fr-FR')}<small>points</small></strong></div>
        </motion.li>)}</ol>
        {!winner && <div className={styles.wait}><Trophy /><h2>Le prochain mix sera le bon.</h2></div>}
        <div className={styles.personalResult}><span>{me ? `Ta place : #${rankOf(me)} sur ${ranked.length}` : 'Pas de classement personnel'}</span><strong>{me ? `${me.pts.toLocaleString('fr-FR')} points` : '—'}</strong>{me && avgReaction[me.id] != null && <small><Clock3 />{(avgReaction[me.id] / 1000).toFixed(1)} s de réaction moyenne</small>}</div>
      </div>
      <div className={styles.resultsRight}>
        <section className={styles.ranking} aria-labelledby="ibx-ranking-title"><header className={styles.sectionHead}><div><Users /><h2 id="ibx-ranking-title">Toute la bande</h2></div><span className={styles.count}>{ranked.length}</span></header><ol>{ranked.map(player => <li key={player.id} data-self={player.id === currentPlayerId || undefined}><b>{String(rankOf(player)).padStart(2, '0')}</b>{avatar(player)}<span><strong>{player.name}</strong><small>{player.isDisconnected ? 'hors ligne' : teamsEnabled ? `Équipe ${teamOf[player.id] === 1 ? 'Rose' : 'Cyan'}` : player.id === currentPlayerId ? 'toi' : 'dans le mix'}{avgReaction[player.id] != null && ` · ${(avgReaction[player.id] / 1000).toFixed(1)} s`}</small></span><strong>{player.pts.toLocaleString('fr-FR')}<small>pts</small></strong></li>)}</ol></section>
        {teamsEnabled && <section className={styles.teamResult}><span className={styles.eyebrow}>{teamWinner == null ? 'Équipes ex æquo' : `Victoire ${teamWinner === 0 ? 'Cyan' : 'Rose'}`}</span><div><span>Cyan <strong>{teamScores[0].toLocaleString('fr-FR')}</strong></span><span>Rose <strong>{teamScores[1].toLocaleString('fr-FR')}</strong></span></div></section>}
        <section className={styles.resultActions}><h2>Encore un refrain ?</h2><p>Un nouveau mix, la même bande.</p>{isHost ? <button className={`${styles.primary} ${styles.yellow}`} type="button" onClick={() => { playSoundEffect('powerUp', .32); onReplay(); }} disabled={starting} aria-busy={starting}>{starting ? <Loader2 className={styles.spinning} /> : <RotateCcw />}<span>{starting ? 'Préparation…' : 'Encore une partie'}</span></button> : <p className={styles.status} role="status"><Radio />L’hôte choisit la suite.</p>}{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.secondary} type="button" onClick={onEndGame}><ArrowLeft />Retour au lobby</button></section>
      </div>
    </div>
    <PodiumAd gameMode="memorise" instanceKey={`memorise:${roundIndex}:${totalRounds}`} className={styles.podiumAd} />
  </section>;
};
