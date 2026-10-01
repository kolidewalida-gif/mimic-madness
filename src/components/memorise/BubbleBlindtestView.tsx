import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, AudioLines, Check, ChevronRight, Disc3, Flame, Headphones, Lightbulb, Loader2, Trophy, Users, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { CATEGORY_META, type BlindtestCategory } from '@/lib/blindtestTracks';
import { InkBetaLogo, InkBetaMascot } from '@/components/InkBetaBrand';
import type { BlindtestConfig } from './MemoriseGameScreen';
import { InkBetaBlindtestSetup } from './InkBetaBlindtestSetup';
import { InkBetaBlindtestResults } from './InkBetaBlindtestResults';
import styles from './BubbleBlindtest.module.css';

type Player = { id: string; name: string; isDisconnected?: boolean };
type Avatar = { type?: string; imageUrl?: string | null } | null | undefined;
export interface InkBetaBlindtestViewProps {
  phase: 'intro' | 'listen' | 'reveal' | 'final';
  currentPlayer: Player; players: Player[]; isHost: boolean; channelReady: boolean;
  starting: boolean; startError: string | null;
  startGame: (categories: BlindtestCategory[], config: BlindtestConfig) => void;
  onEndGame: () => void; replay: () => void;
  volume: number; setVolume: (value: number) => void; toggleMute: () => void; muted: boolean;
  roundIndex: number; totalRounds: number;
  track: { title: string; subtitle?: string; category: BlindtestCategory; artwork?: string } | null;
  options: string[]; myChoice: number | null; answerIndex: number | null; answer: (choice: number) => void;
  progress: number; secondsLeft: number; urgent: boolean;
  needsSoundUnlock: boolean; mediaError: boolean; resumeSound: () => void;
  hintText: string | null; myStreak: number; myElapsed: number | null; roundDouble: boolean;
  teamsEnabled: boolean; teamOf: Record<string, 0 | 1>; teamScores: [number, number];
  liveVotes: Record<string, number>; revealVotes: Record<string, number>; roundPoints: Record<string, number>;
  answeredIds: Set<string>; avgReaction: Record<string, number>;
  betaRanked: (Player & { pts: number })[]; getAvatar: (id: string) => Avatar; children?: ReactNode;
}

const AvatarChip = ({ player, getAvatar }: { player: Player; getAvatar: (id: string) => Avatar }) => {
  const avatar = getAvatar(player.id);
  return <span className={styles.avatar} title={player.name}>{avatar?.type === 'image' && avatar.imageUrl ? <img src={avatar.imageUrl} alt="" /> : player.name.slice(0, 1).toUpperCase()}</span>;
};

/** Bubble presentation only. The engine still owns audio, scoring and realtime. */
export const InkBetaBlindtestView = (props: InkBetaBlindtestViewProps) => {
  const { phase, currentPlayer, players, isHost, channelReady, starting, startError, startGame,
    onEndGame, replay, volume, setVolume, toggleMute, muted, roundIndex, totalRounds, track,
    options, myChoice, answerIndex, answer, progress, secondsLeft, urgent, needsSoundUnlock,
    mediaError, resumeSound, hintText, myStreak, myElapsed, roundDouble, teamsEnabled, teamOf,
    teamScores, liveVotes, revealVotes, roundPoints, answeredIds, avgReaction, betaRanked, getAvatar, children } = props;
  const [exitOpen, setExitOpen] = useState(false);
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const exitDialog = useRef<HTMLDivElement>(null);
  const lobbyButton = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const active = phase === 'listen' || phase === 'reveal';
  const step = phase === 'intro' ? 0 : phase === 'final' ? 2 : 1;
  const connected = players.filter(player => !player.isDisconnected);
  const answered = connected.filter(player => answeredIds.has(player.id)).length;
  const correct = answerIndex != null && myChoice === answerIndex;
  const myTeam = teamOf[currentPlayer.id] ?? 0;
  const locked = myChoice != null || secondsLeft <= 0;
  const audible = phase === 'listen' && !muted && !mediaError && !needsSoundUnlock && secondsLeft > 0;
  const artwork = track?.artwork && track.artwork !== failedArtwork ? track.artwork : null;
  const closeExit = () => { setExitOpen(false); lobbyButton.current?.focus(); };
  useEffect(() => { if (track?.artwork) { const image = new Image(); image.src = track.artwork; } }, [track?.artwork]);
  useEffect(() => { main.current?.scrollTo?.(0, 0); }, [step, roundIndex]);

  return <div className={`ibx-root ${styles.root}`} data-phase={phase} data-playing={audible || undefined}>
    {children}
    <div className={styles.scenery} aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
    <header className={styles.topbar}>
      <div className={styles.brand}><InkBetaLogo titleId="blindtest-brand" /><span><Headphones /><strong>Blindtest<small>musical</small></strong></span></div>
      <ol className={styles.steps} aria-label="Progression de la partie">{['Le mix', 'La partie', 'Le podium'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-done={step > index || undefined}><b>{step > index ? <Check /> : `0${index + 1}`}</b><span>{label}</span>{index < 2 && <ChevronRight />}</li>)}</ol>
      <div className={styles.tools}><span className={styles.online}><Users />{connected.length}<span>en ligne</span></span>
        <button className={styles.iconButton} type="button" onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'} aria-pressed={muted}>{muted ? <VolumeX /> : <Volume2 />}</button>
        <label className={styles.volume}><span className="sr-only">Volume de l’extrait musical</span><input type="range" min={0} max={100} value={volume} onChange={event => setVolume(Number(event.target.value))} /></label>
        <button ref={lobbyButton} className={styles.secondary} type="button" onClick={() => { if (active) setExitOpen(true); else onEndGame(); }} aria-label="Retour au lobby"><ArrowLeft /><span>Lobby</span></button>
      </div>
    </header>
    <main ref={main} className={styles.main}><div className={styles.content}>
      {phase === 'intro' && <InkBetaBlindtestSetup isHost={isHost} canStart={channelReady} starting={starting} error={startError} onStart={startGame} />}
      {active && track && <motion.div key={roundIndex} className={`ibx-arena ${styles.arena}`} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }}>
        <header className={styles.heading}><div><span className={styles.eyebrow}>{phase === 'listen' ? 'À l’écoute · une seule réponse' : 'Le titre mystère, c’était…'}</span><h1>{phase === 'listen' ? <>Alors, <em>tu reconnais ?</em></> : correct ? <>Bien joué, <em>bien entendu !</em></> : <>On te donne <em>la réponse.</em></>}</h1></div><span className={styles.roundTicket}><Disc3 /><span>Manche<strong>{String(roundIndex + 1).padStart(2, '0')}<small> / {totalRounds}</small></strong></span></span></header>
        <div className={styles.sessionProgress} role="progressbar" aria-label="Progression des manches" aria-valuemin={0} aria-valuemax={totalRounds} aria-valuenow={roundIndex + 1}><span style={{ width: `${(roundIndex + 1) / Math.max(1, totalRounds) * 100}%` }} /></div>
        <div className={`ibx-game-layout ${styles.console}`}>
          <section className={`ibx-listening-room ${styles.listening}`} aria-label={phase === 'listen' ? 'Écoute de l’extrait' : 'Titre révélé'}>
            <div className={styles.tags}><span><Disc3 />{CATEGORY_META[track.category].label}</span>{roundDouble && <span className={styles.double}><Zap />Points ×2</span>}</div>
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'listen' ? <motion.div key="listen" className={styles.listenBody} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: reduceMotion ? 1 : .96 }} transition={{ duration: .2 }}>
                <div className={`ibx-turntable ${styles.turntable}`} data-urgent={urgent || undefined}>
                  <div className={styles.vinyl} aria-hidden="true"><i /><span><Headphones /></span></div>
                  <div className={styles.timerRing}><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="113" pathLength="1" /><circle cx="120" cy="120" r="113" pathLength="1" strokeDasharray={`${Math.max(0, Math.min(1, progress))} 1`} /></svg><div className={styles.timer} role="timer" aria-live="off" aria-label={`${secondsLeft} secondes restantes`}><strong>{String(secondsLeft).padStart(2, '0')}</strong><span>secondes</span></div></div>
                  <span className={styles.arm} aria-hidden="true" />
                </div>
                <div className={styles.equalizer} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
                {mediaError ? <p className={styles.error} role="status">Extrait indisponible. Changement de piste…</p> : needsSoundUnlock ? <button className={styles.primary} type="button" onClick={resumeSound}><Volume2 />Activer le son</button> : <p className={styles.audioStatus}><AudioLines />{muted ? 'Le son est coupé' : myChoice != null ? 'Profite du son. Le verdict arrive.' : 'Écoute bien, le chrono tourne.'}</p>}
                {hintText && myChoice == null && <div className={styles.hint}><Lightbulb /><span>Un petit indice<strong>{hintText}</strong></span></div>}
                {myStreak >= 2 && <span className={styles.streak}><Flame />{myStreak} bonnes réponses d’affilée</span>}
              </motion.div> : <motion.div key={`reveal-${roundIndex}`} className={styles.revealBody} initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: [0.16, 1, 0.3, 1] }}>
                <motion.div className={styles.artwork} initial={reduceMotion ? false : { rotateY: -16, rotateZ: -5, scale: .86 }} animate={{ rotateY: 0, rotateZ: -2, scale: 1 }} transition={{ duration: .95, ease: [0.16, 1, 0.3, 1] }}>{artwork ? <img src={artwork} alt={`Pochette de ${track.title}`} onError={() => setFailedArtwork(track.artwork ?? null)} /> : <div className={styles.artFallback}><Disc3 /><span>{track.title}</span></div>}<span className={styles.artSheen} aria-hidden="true" /></motion.div>
                <motion.div className={styles.trackCopy} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .2 }}><h2>{track.title}</h2>{track.subtitle && <p>{track.subtitle}</p>}<span className={styles.next} role="status"><Loader2 />{roundIndex + 1 >= totalRounds ? 'Le podium arrive…' : 'La prochaine manche arrive…'}</span></motion.div>
              </motion.div>}
            </AnimatePresence>
          </section>
          <section className={styles.answerPanel} aria-labelledby="ibx-answer-title">
            <header><span className={styles.eyebrow}>{phase === 'listen' ? 'À toi de jouer' : 'Les réponses de la bande'}</span><h2 id="ibx-answer-title">{phase === 'listen' ? 'Quel titre se cache ici ?' : correct ? 'Tu l’avais !' : 'Et voilà le vrai titre.'}</h2><p>{phase === 'listen' ? 'Choisis le bon titre. Plus tu es rapide, plus tu marques.' : 'La bonne réponse et les choix de chacun.'}</p></header>
            {phase === 'listen' && myChoice != null && <div className={styles.sent} role="status"><Check /><span><strong>Réponse verrouillée</strong>{myElapsed != null && <small>Envoyée en {(myElapsed / 1000).toFixed(1)} s. Place au verdict.</small>}</span></div>}
            {phase === 'reveal' && <div className={styles.verdict} data-correct={correct || undefined} role="status"><span>{correct ? <Check /> : <X />}{correct ? 'C’est la bonne réponse !' : myChoice == null ? 'Tu n’as pas répondu à temps.' : 'Ce n’était pas ce titre.'}</span><strong>+{(roundPoints[currentPlayer.id] ?? 0).toLocaleString('fr-FR')}<small>pts</small></strong></div>}
            <div className={styles.answers}>{options.map((option, index) => {
              const mine = myChoice === index, right = phase === 'reveal' && answerIndex === index;
              const voters = phase === 'reveal' ? players.filter(player => revealVotes[player.id] === index) : teamsEnabled ? players.filter(player => player.id !== currentPlayer.id && (teamOf[player.id] ?? 0) === myTeam && liveVotes[player.id] === index) : [];
              const content = <><span className={styles.letter}>{String.fromCharCode(65 + index)}</span><strong>{option}</strong><span className={styles.answerMark} aria-hidden="true">{phase === 'reveal' && mine && !right ? <X /> : right || mine ? <Check /> : <ChevronRight />}</span>{phase === 'reveal' && <small className={styles.answerVerdict}>{right ? 'Bonne réponse' : mine ? 'Ton choix' : ''}</small>}{voters.length > 0 && <span className={styles.voters} aria-label={`${phase === 'listen' ? 'Coéquipiers' : 'Votes'} : ${voters.map(player => player.name).join(', ')}`}>{voters.map(player => <AvatarChip key={player.id} player={player} getAvatar={getAvatar} />)}</span>}</>;
              return phase === 'listen' ? <motion.button key={index} type="button" className={`ibx-answer ${styles.answer}`} data-choice={index} data-selected={mine || undefined} disabled={locked} aria-pressed={mine} onClick={() => answer(index)} whileHover={locked || reduceMotion ? undefined : { y: -3 }} whileTap={locked || reduceMotion ? undefined : { y: 3 }} transition={{ type: 'spring', stiffness: 340, damping: 24 }}>{content}</motion.button> : <motion.div key={index} className={`ibx-answer ${styles.answer}`} data-choice={index} data-correct={right || undefined} data-wrong={mine && !right || undefined} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay: index * .05 }}>{content}</motion.div>;
            })}</div>
            <footer className={styles.answerFooter}><span><Users />{phase === 'listen' ? `${answered} / ${connected.length} réponses reçues` : 'Les scores ont été mis à jour'}</span>{teamsEnabled && <span>Ton équipe : {myTeam === 0 ? 'Cyan' : 'Rose'}</span>}</footer>
          </section>
        </div>
        <aside className={`ibx-live ${styles.scorebar}`} aria-label="Classement en direct"><div className={styles.scoreHeading}><Trophy /><strong>La bande</strong><small>{teamsEnabled ? `Cyan ${teamScores[0]} · Rose ${teamScores[1]}` : 'Classement en direct'}</small></div><ol>{betaRanked.map(player => <li key={player.id} data-self={player.id === currentPlayer.id || undefined}><b>{betaRanked.filter(other => other.pts > player.pts).length + 1}</b><AvatarChip player={player} getAvatar={getAvatar} /><span><strong>{player.name}</strong><small>{player.isDisconnected ? 'hors ligne' : player.id === currentPlayer.id ? 'toi' : 'dans la partie'}</small></span><strong>{player.pts.toLocaleString('fr-FR')}<small>pts</small></strong>{phase === 'listen' && answeredIds.has(player.id) && <Check aria-label="A répondu" />}</li>)}</ol></aside>
      </motion.div>}
      {active && !track && <div className={styles.wait} role="status"><Loader2 /><h1>On prépare le prochain extrait.</h1></div>}
      {phase === 'final' && <InkBetaBlindtestResults ranked={betaRanked} currentPlayerId={currentPlayer.id} isHost={isHost} teamsEnabled={teamsEnabled} teamScores={teamScores} teamOf={teamOf} avgReaction={avgReaction} getAvatar={getAvatar} roundIndex={roundIndex} totalRounds={totalRounds} onReplay={replay} onEndGame={onEndGame} starting={starting} error={startError} />}
    </div></main>
    <AnimatePresence>{exitOpen && <motion.div className={styles.modalBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div ref={exitDialog} className={styles.exitDialog} role="alertdialog" aria-modal="true" aria-labelledby="blindtest-exit-title" aria-describedby="blindtest-exit-description" initial={reduceMotion ? false : { y: 12, scale: .96 }} animate={{ y: 0, scale: 1 }} onKeyDown={event => {
      if (event.key === 'Escape') closeExit();
      if (event.key === 'Tab') { const buttons = exitDialog.current?.querySelectorAll<HTMLButtonElement>('button'); if (!buttons?.length) return; const first = buttons[0], last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
    }}><InkBetaMascot /><h2 id="blindtest-exit-title">Tu quittes la scène ?</h2><p id="blindtest-exit-description">La partie est en cours. Tu retourneras au lobby.</p><button autoFocus type="button" className={styles.primary} onClick={closeExit}>Continuer à jouer</button><button type="button" className={styles.secondary} onClick={onEndGame}>Quitter la partie</button></motion.div></motion.div>}</AnimatePresence>
  </div>;
};
