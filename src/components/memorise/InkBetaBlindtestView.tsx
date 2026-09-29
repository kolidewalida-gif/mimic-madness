import { useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, AudioLines, Check, ChevronRight, Disc3, Flame, Headphones, Lightbulb, Loader2, Radio, Trophy, Users, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { CATEGORY_META, type BlindtestCategory } from '@/lib/blindtestTracks';
import { InkBetaLogo, InkBetaMascot } from '@/components/InkBetaBrand';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import type { BlindtestConfig } from './MemoriseGameScreen';
import { InkBetaBlindtestSetup } from './InkBetaBlindtestSetup';
import { InkBetaBlindtestResults } from './InkBetaBlindtestResults';
import './inkBetaBlindtest.css';

type Player = { id: string; name: string; isDisconnected?: boolean };
type Avatar = { type?: string; imageUrl?: string | null } | null | undefined;
export interface InkBetaBlindtestViewProps {
  phase: 'intro' | 'listen' | 'reveal' | 'final';
  currentPlayer: Player;
  players: Player[];
  isHost: boolean;
  channelReady: boolean;
  starting: boolean;
  startError: string | null;
  startGame: (categories: BlindtestCategory[], config: BlindtestConfig) => void;
  onEndGame: () => void;
  replay: () => void;
  volume: number;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  muted: boolean;
  roundIndex: number;
  totalRounds: number;
  track: { title: string; subtitle?: string; category: BlindtestCategory; artwork?: string } | null;
  options: string[];
  myChoice: number | null;
  answerIndex: number | null;
  answer: (choice: number) => void;
  progress: number;
  secondsLeft: number;
  urgent: boolean;
  needsSoundUnlock: boolean;
  mediaError: boolean;
  resumeSound: () => void;
  hintText: string | null;
  myStreak: number;
  myElapsed: number | null;
  roundDouble: boolean;
  teamsEnabled: boolean;
  teamOf: Record<string, 0 | 1>;
  teamScores: [number, number];
  liveVotes: Record<string, number>;
  revealVotes: Record<string, number>;
  roundPoints: Record<string, number>;
  answeredIds: Set<string>;
  avgReaction: Record<string, number>;
  betaRanked: (Player & { pts: number })[];
  getAvatar: (id: string) => Avatar;
  children?: ReactNode;
}

const AvatarChip = ({ player, getAvatar }: { player: Player; getAvatar: (id: string) => Avatar }) => {
  const avatar = getAvatar(player.id);
  return <span className="ibx-avatar">{avatar?.type === 'image' && avatar.imageUrl ? <img src={avatar.imageUrl} alt="" /> : player.name.slice(0, 1).toUpperCase()}</span>;
};

/** Presentation only: audio, scoring and realtime synchronization stay in MemoriseGameScreen. */
export const InkBetaBlindtestView = (props: InkBetaBlindtestViewProps) => {
  const {
    phase, currentPlayer, players, isHost, channelReady, starting, startError, startGame,
    onEndGame, replay, volume, setVolume, toggleMute, muted, roundIndex, totalRounds,
    track, options, myChoice, answerIndex, answer, progress, secondsLeft, urgent,
    needsSoundUnlock, mediaError, resumeSound, hintText, myStreak, myElapsed, roundDouble,
    teamsEnabled, teamOf, teamScores, liveVotes, revealVotes, roundPoints, answeredIds,
    avgReaction, betaRanked, getAvatar, children,
  } = props;
  const [exitOpen, setExitOpen] = useState(false);
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const active = phase === 'listen' || phase === 'reveal';
  const step = phase === 'intro' ? 0 : phase === 'final' ? 2 : 1;
  const category = track ? CATEGORY_META[track.category] : null;
  const myTeam = teamOf[currentPlayer.id] ?? 0;
  const connected = players.filter((player) => !player.isDisconnected);
  const answered = connected.filter((player) => answeredIds.has(player.id)).length;
  const points = roundPoints[currentPlayer.id] ?? 0;
  const correct = answerIndex != null && myChoice === answerIndex;
  const choicesLocked = myChoice != null || secondsLeft <= 0;

  return (
    <div className="ibx-root" data-phase={phase} data-playing={phase === 'listen' && !muted && !mediaError && !needsSoundUnlock && secondsLeft > 0 || undefined}>
      {children}
      <div className="ibx-scenery" aria-hidden="true"><i /><i /><i /><span className="ibx-scenery-word">BLINDTEST</span></div>
      <div className="ibx-motion-field" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--bar': index } as CSSProperties} />)}</div>
      <motion.header className="ibx-topbar" initial={reduceMotion ? false : { y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 210, damping: 24 }}>
        <div className="ibx-brand"><InkBetaLogo titleId="blindtest-brand" /><span className="ibx-mode-stamp"><Headphones />BLINDTEST<br />MUSICAL</span></div>
        <ol className="ibx-steps" aria-label="Progression de la partie">
          {['Le mix', 'La partie', 'Le podium'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-done={step > index || undefined}><b>{step > index ? <Check /> : `0${index + 1}`}</b><span>{label}</span>{index < 2 && <ChevronRight />}</li>)}
        </ol>
        <div className="ibx-top-actions">
          <span className="ibx-player-count"><Users />{connected.length}<span>en ligne</span></span>
          <button className="ibx-icon-button" type="button" onClick={() => { playSoundEffect(muted ? 'toggleOn' : 'toggleOff', .16); toggleMute(); }} aria-label={muted ? 'Activer le son' : 'Couper le son'} aria-pressed={muted}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <label className="ibx-header-volume"><span className="sr-only">Volume de l’extrait musical</span><input type="range" min={0} max={100} value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
          <button className="ibx-back" type="button" onClick={() => { playSoundEffect('whoosh', .18); if (active) setExitOpen(true); else onEndGame(); }} aria-label="Retour au lobby"><ArrowLeft /><span>Lobby</span></button>
        </div>
      </motion.header>
      <AnimatePresence>{exitOpen && <motion.div className="ibx-exit-confirm" role="alert" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} onKeyDown={(event) => { if (event.key === 'Escape') setExitOpen(false); }}>
        <p><strong>Quitter la partie en cours ?</strong> Tu retourneras au lobby.</p>
        <button type="button" autoFocus onClick={() => { playSoundEffect('selectItem', .16); setExitOpen(false); }}>Continuer à jouer</button>
        <button type="button" onClick={onEndGame}>Quitter la partie</button>
      </motion.div>}</AnimatePresence>
      <main className="ibx-main">
        {phase === 'intro' && <InkBetaBlindtestSetup isHost={isHost} canStart={channelReady} starting={starting} error={startError} onStart={startGame} />}
        {active && track && <motion.div className="ibx-arena" key={`${phase}-${roundIndex}`} initial={reduceMotion ? false : { opacity: 0, scale: .975 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}>
          <motion.aside className="ibx-live" aria-label="Classement en direct" initial={reduceMotion ? false : { x: -80, rotate: -2, opacity: 0 }} animate={{ x: 0, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 170, damping: 19, delay: .08 }}>
            <header><Trophy /><strong>Les scores</strong><span>EN DIRECT</span></header>
            <p className="ibx-live-intro">Qui a la meilleure oreille ?</p>
            {teamsEnabled && <div className="ibx-team-totals"><span>Cyan <strong>{teamScores[0]}</strong></span><span>Rose <strong>{teamScores[1]}</strong></span></div>}
            <ol>{betaRanked.map((player, index) => <motion.li layout key={player.id} data-self={player.id === currentPlayer.id || undefined} data-leader={index === 0 || undefined}><span className="ibx-live-rank">{String(index + 1).padStart(2, '0')}</span><AvatarChip player={player} getAvatar={getAvatar} /><span className="ibx-live-name">{player.name}{player.id === currentPlayer.id && <small>toi</small>}{player.isDisconnected && <small>hors ligne</small>}</span><strong>{player.pts.toLocaleString('fr-FR')}<small>pts</small></strong>{phase === 'listen' && answeredIds.has(player.id) && <Check aria-label="A répondu" />}</motion.li>)}</ol>
            <div className="ibx-score-tip"><InkBetaMascot /><span>Le bon titre.<br />Au bon moment.<br /><strong>Un max de points !</strong></span></div>
          </motion.aside>
          <motion.div className="ibx-stage" initial={reduceMotion ? false : { y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .42, delay: .1, ease: [0.22, 1, 0.36, 1] }}>
          <div className="ibx-round-header">
            <div><span className="ibx-kicker">{phase === 'listen' ? 'TENDS L’OREILLE. SOIS LE PLUS RAPIDE.' : 'ALORS, TU L’AVAIS ?'}</span><h1>{phase === 'listen' ? 'C’est quoi ce son ?' : 'C’était ce titre !'}</h1></div>
            <div className="ibx-round-counter"><Disc3 /><span>MANCHE</span><strong>{String(roundIndex + 1).padStart(2, '0')}<small> / {String(totalRounds).padStart(2, '0')}</small></strong></div>
          </div>
          <div className="ibx-session-progress" role="progressbar" aria-label="Progression des manches" aria-valuemin={0} aria-valuemax={totalRounds} aria-valuenow={roundIndex + 1}><span style={{ width: `${((roundIndex + 1) / Math.max(1, totalRounds)) * 100}%` }} /></div>
          <div className="ibx-game-layout">
            <section className="ibx-listening-room" aria-label={phase === 'listen' ? 'Écoute de l’extrait' : 'Titre révélé'}>
              <div className="ibx-round-tags"><span><Disc3 />{category?.label}</span>{roundDouble && <span className="ibx-double"><Zap />POINTS ×2</span>}</div>
              {phase === 'listen' ? <>
                <div className="ibx-soundstage">
                <div className="ibx-speaker ibx-speaker-left" aria-hidden="true"><i /><i /><span>MM / L</span></div>
                <div className="ibx-speaker ibx-speaker-right" aria-hidden="true"><i /><i /><span>MM / R</span></div>
                <div className="ibx-deck">
                <span className="ibx-deck-label" aria-hidden="true">MIMIC SOUND SYSTEM</span>
                <div className="ibx-turntable" data-urgent={urgent || undefined}>
                  <svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="109" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="3" /><circle cx="120" cy="120" r="109" fill="none" stroke="currentColor" strokeWidth="4" pathLength="1" strokeDasharray={`${Math.max(0, Math.min(1, progress))} 1`} transform="rotate(-90 120 120)" strokeLinecap="round" /></svg>
                  <div className="ibx-timer-disc" aria-hidden="true" />
                  <div className="ibx-timer" role="timer" aria-live="off" aria-label={`${secondsLeft} secondes restantes`}><span>IL TE RESTE</span><strong>{String(secondsLeft).padStart(2, '0')}</strong><small>secondes</small></div>
                </div>
                <div className="ibx-tonearm" aria-hidden="true"><i /></div>
                <div className="ibx-deck-controls" aria-hidden="true"><span /><span /><span /><div className="ibx-equalizer"><i /><i /><i /><i /><i /><i /><i /></div><b>STEREO</b></div>
                </div>
                </div>
                {mediaError ? <p className="ibx-message ibx-message-error" role="status"><Radio />Extrait indisponible. Changement de piste…</p> : needsSoundUnlock ? <button className="ibx-unlock" type="button" onClick={resumeSound}><Volume2 />Activer le son</button> : <span className="ibx-audio-status"><AudioLines />{muted ? 'Le son est coupé' : 'À l’écoute. À toi de jouer.'}</span>}
                {hintText && myChoice == null && <div className="ibx-hint"><Lightbulb /><span><small>UN PETIT INDICE</small><strong>{hintText}</strong></span></div>}
                {myStreak >= 2 && <span className="ibx-streak"><Flame />{myStreak} bonnes réponses d’affilée</span>}
              </> : <>
                <div className="ibx-reveal-art">{track.artwork && track.artwork !== failedArtwork ? <img src={track.artwork} alt={`Pochette de ${track.title}`} onError={() => setFailedArtwork(track.artwork ?? null)} /> : <Disc3 aria-hidden="true" />}</div>
                <span className="ibx-kicker">IL FALLAIT RECONNAÎTRE</span><h2 className="ibx-track-title">{track.title}</h2>{track.subtitle && <p className="ibx-track-subtitle">{track.subtitle}</p>}
                <div className="ibx-next-track" role="status"><Loader2 />{roundIndex + 1 >= totalRounds ? 'Le podium arrive…' : 'La prochaine manche arrive…'}</div>
              </>}
            </section>
            <section className="ibx-answer-panel" aria-labelledby="ibx-answer-title">
              <header><h2 id="ibx-answer-title">{phase === 'listen' ? 'À toi de jouer !' : correct ? 'Bien joué !' : 'Garde le rythme !'}</h2><p>{phase === 'listen' ? 'Un choix. Pas de retour en arrière.' : 'Le bon titre et les votes de chacun.'}</p></header>
              {phase === 'listen' && myChoice != null && <div className="ibx-answer-sent" role="status"><Check /><span><strong>Réponse verrouillée</strong>{myElapsed != null && <small>Envoyée en {(myElapsed / 1000).toFixed(1)} s. Place au verdict.</small>}</span></div>}
              {phase === 'reveal' && <div className="ibx-round-verdict" data-correct={correct || undefined} role="status"><span>{correct ? <Check /> : <X />}{correct ? 'C’est la bonne réponse !' : myChoice == null ? 'Tu n’as pas répondu à temps.' : 'Ce n’était pas ce titre.'}</span><strong>+{points.toLocaleString('fr-FR')} <small>pts</small></strong></div>}
              <div className="ibx-answers">
                {options.map((option, index) => {
                  const mine = myChoice === index;
                  const right = phase === 'reveal' && answerIndex === index;
                  const voters = phase === 'reveal' ? players.filter((player) => revealVotes[player.id] === index) : teamsEnabled ? players.filter((player) => player.id !== currentPlayer.id && (teamOf[player.id] ?? 0) === myTeam && liveVotes[player.id] === index) : [];
                  const content = <><span className="ibx-answer-letter">{String.fromCharCode(65 + index)}</span><strong>{option}</strong><span className="ibx-answer-mark" aria-hidden="true">{phase === 'reveal' && mine && !right ? <X /> : right || mine ? <Check /> : <ArrowUpRight />}</span>{phase === 'reveal' && <span className="ibx-answer-verdict">{right ? 'Bonne réponse' : mine ? 'Ton choix' : ''}</span>}{voters.length > 0 && <span className="ibx-voters" aria-label={`${phase === 'listen' ? 'Coéquipiers' : 'Votes'} : ${voters.map((player) => player.name).join(', ')}`}>{voters.map((player) => <AvatarChip key={player.id} player={player} getAvatar={getAvatar} />)}</span>}</>;
                  return phase === 'listen' ? <motion.button key={index} className="ibx-answer" type="button" data-choice={index} data-selected={mine || undefined} disabled={choicesLocked} aria-pressed={mine} onClick={() => answer(index)} initial={reduceMotion ? false : { y: 28, opacity: 0, rotateX: 12 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: .17 + index * .055 }} whileHover={choicesLocked || reduceMotion ? undefined : { y: -4, rotate: index % 2 ? .35 : -.35 }} whileTap={choicesLocked || reduceMotion ? undefined : { y: 5, scale: .99 }}>{content}</motion.button> : <motion.div layout key={index} className="ibx-answer" data-choice={index} data-correct={right || undefined} data-wrong={mine && !right || undefined} initial={reduceMotion ? false : { scale: .94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 20, delay: index * .045 }}>{content}</motion.div>;
                })}
              </div>
              <footer className="ibx-answer-footer"><span><Users />{phase === 'listen' ? `${answered} / ${connected.length} réponses reçues` : 'Les scores ont été mis à jour'}</span>{teamsEnabled && <span>Ton équipe : {myTeam === 0 ? 'Cyan' : 'Rose'}</span>}</footer>
            </section>
          </div>
          </motion.div>
        </motion.div>}
        {active && !track && <div className="ibx-wait" role="status"><Loader2 /><h1>On prépare le prochain extrait.</h1></div>}
        {phase === 'final' && <InkBetaBlindtestResults ranked={betaRanked} currentPlayerId={currentPlayer.id} isHost={isHost} teamsEnabled={teamsEnabled} teamScores={teamScores} teamOf={teamOf} avgReaction={avgReaction} getAvatar={getAvatar} roundIndex={roundIndex} totalRounds={totalRounds} onReplay={replay} onEndGame={onEndGame} starting={starting} error={startError} />}
        {!active && <footer className="ibx-page-footer"><span>MIMIC MASTER · INK BETA</span><span>De bonnes oreilles. De mauvais perdants.</span><Headphones aria-hidden="true" /></footer>}
      </main>
    </div>
  );
};
