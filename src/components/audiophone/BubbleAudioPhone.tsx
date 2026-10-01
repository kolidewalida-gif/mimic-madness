import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Headphones, Home, Loader2, Mic, Pause, Play, RotateCcw, Send, Sparkles, Square, Users, Volume2 } from 'lucide-react';
import { InkBetaLogo } from '@/components/InkBetaBrand';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { cn } from '@/lib/utils';
import s from './BubbleAudioPhone.module.css';

export type AudioPhonePhase = 'instructions' | 'recording_all' | 'imitation' | 'waiting_reveal' | 'reveal';
const stages = [{ id: 'instructions', title: 'Les règles', icon: Sparkles }, { id: 'recording_all', title: 'Ta phrase', icon: Mic }, { id: 'imitation', title: 'À l’envers', icon: Headphones }, { id: 'reveal', title: 'La révélation', icon: Volume2 }];

/** Presentation only: the round, recordings and shared playback stay owned by the game. */
export function AudioPhoneShell({ phase, step, tools, sidebar, children }: { phase: AudioPhonePhase; step?: string; tools?: ReactNode; sidebar?: ReactNode; children: ReactNode }) {
  const current = phase === 'waiting_reveal' ? 3 : stages.findIndex(item => item.id === phase);
  return <div className={cn('ik-root', s.root)} data-audiophone-phase={phase}>
    <div className="ik-party-bg" aria-hidden="true" /><div className="ik-party-dots" aria-hidden="true" />
    <div className={s.bubbles} aria-hidden="true"><i /><i /><i /><i /></div>
    <header className={s.header}>
      <div className={s.brand}><InkBetaLogo titleId="bubble-audiophone-brand" /><span><Headphones />Audiophone</span></div>
      <ol className={s.steps} aria-label="Étapes de l’Audiophone">{stages.map(({ id, title, icon: Icon }, i) => <li key={id} className={cn(i === current && s.current, i < current && s.complete)} aria-current={i === current ? 'step' : undefined}><span>{i < current ? <Check /> : <Icon />}</span><strong>{title}</strong>{i < stages.length - 1 && <ChevronRight className={s.chevron} />}</li>)}</ol>
      <div className={s.tools}>{step && <span className={s.pill}>{step}</span>}{tools}</div>
    </header>
    <div className={cn(s.workspace, sidebar && s.withChat)}><main className={s.main}><div className={s.content}>{children}</div></main>{sidebar && <div className={s.sidebar}>{sidebar}</div>}</div>
  </div>;
}

export function AudioPhoneHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return <header className={s.heading}><span>{eyebrow}</span><h1>{title}</h1>{children && <p>{children}</p>}</header>;
}

export function AudioPhonePanel({ title, label, aside, children, className }: { title?: string; label?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn(s.panel, className)}>{title && <header className={s.panelHead}><div>{label && <small>{label}</small>}<h2>{title}</h2></div>{aside}</header>}<div className={s.panelBody}>{children}</div></section>;
}

export function AudioPhoneButton({ children, onClick, disabled, secondary, yellow, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean; yellow?: boolean; label?: string }) {
  return <button type="button" className={cn(s.button, secondary && s.secondary, yellow && s.yellow)} onClick={onClick} disabled={disabled} aria-label={label}>{children}</button>;
}

/** A code-native cassette, with spinning reels only while actual media is active. */
export function AudioPhoneTape({ title, subtitle, active = false, reversed = false, level = 0, faceLabel, children }: { title: string; subtitle: string; active?: boolean; reversed?: boolean; level?: number; faceLabel?: string; children?: ReactNode }) {
  return <div className={cn(s.tapeScene, active && s.tapeActive, reversed && s.tapeReversed)}>
    <span className={s.tapeSticker}>{faceLabel ?? (reversed ? 'FACE B · À L’ENVERS' : 'FACE A · TA VOIX')}</span>
    <div className={s.tape}><span className={s.screw} /><span className={s.screw} /><span className={s.screw} /><span className={s.screw} />
      <div className={s.tapeLabel}><small>MIMIC MASTER / AUDIO CLUB</small><strong>{title}</strong><span>{subtitle}</span></div>
      <div className={s.tapeWindow}><i className={s.reel} /><div className={s.signal} aria-hidden="true">{Array.from({ length: 13 }, (_, i) => <i key={i} style={{ height: `${8 + (i % 4 + 1) * 5 + Math.min(1, Math.max(0, level)) * (i % 3 + 1) * 12}px`, animationDelay: `${i * .06}s` } as CSSProperties} />)}</div><i className={s.reel} /></div>
      <div className={s.tapeFoot}><span>AUDIO / 01</span><i /><span>TOUT SAUF SÉRIEUX</span></div>
    </div>
    {children}
  </div>;
}

export function AudioPhoneRules({ isHost, playerCount, isStarting, onStart, error }: { isHost: boolean; playerCount: number; isStarting: boolean; onStart: () => void; error?: string }) {
  return <>
    <AudioPhoneHeading eyebrow="Audiophone · le téléphone arabe à l’envers" title={<>Une phrase.<br />Un grand <em>n’importe quoi.</em></>}>Ta voix passe à l’envers. Les autres l’imitent. On remet tout à l’endroit… et on découvre les dégâts.</AudioPhoneHeading>
    <div className={s.rulesGrid}>
      <AudioPhonePanel className={s.rulesToy}><div className={s.speech}>« Salut la bande ! »<span>… devient quoi, à l’envers ?</span></div><AudioPhoneTape title="Ta voix, méconnaissable." subtitle="Une petite phrase. Beaucoup de surprises." reversed /><p className={s.toyNote}><Headphones /> Un casque, un micro, et zéro pression.</p></AudioPhonePanel>
      <AudioPhonePanel title="Le petit mode d’emploi" label="Tout le monde joue">
        <ol className={s.rulesList}>{[
          { icon: Mic, title: 'Dis ce qui te passe par la tête.', desc: 'Chacun enregistre sa propre phrase.' },
          { icon: Headphones, title: 'Écoute le son à l’envers.', desc: 'Les autres phrases arrivent une par une.' },
          { icon: RotateCcw, title: 'Reproduis ce que tu entends.', desc: 'Le rythme compte. Pas besoin de comprendre !' },
          { icon: Sparkles, title: 'Écoutez le résultat ensemble.', desc: 'L’original, l’audio inversé, puis vos versions.' },
        ].map(({ icon: Icon, title, desc }, i) => <li key={title}><span><Icon /><b>{i + 1}</b></span><div><strong>{title}</strong><p>{desc}</p></div></li>)}</ol>
        <div className={s.ruleLaunch}>{isHost ? <AudioPhoneButton yellow onClick={onStart} disabled={isStarting}>{isStarting ? <Loader2 className={s.spin} /> : <Play />} {isStarting ? 'On branche les micros…' : 'C’est parti !'}</AudioPhoneButton> : <p className={s.notice}><Loader2 className={s.spin} /> L’hôte lance la partie.</p>}<small><Users /> {playerCount} joueur{playerCount > 1 ? 's' : ''} dans la bande</small>{error && <p className={s.error} role="alert">{error}</p>}</div>
      </AudioPhonePanel>
    </div>
  </>;
}

export interface AudioPhoneStudioProps {
  title: string; description: string; tapeTitle: string; maxSeconds: number; recordingTime: number; audioLevel: number;
  isRecording: boolean; isStarting: boolean; isStopping: boolean; isSubmitting: boolean;
  previewUrl: string | null; hasRecording: boolean; startRecording: () => void; stopRecording: () => void; onSubmit: () => void;
  error?: string; canRecord?: boolean; listening?: ReactNode; status?: 'sent' | 'author' | 'spectator'; sidebar: ReactNode;
}

export function AudioPhoneStudio({ title, description, tapeTitle, maxSeconds, recordingTime, audioLevel, isRecording, isStarting, isStopping, isSubmitting, previewUrl, hasRecording, startRecording, stopRecording, onSubmit, error, canRecord = true, listening, status, sidebar }: AudioPhoneStudioProps) {
  const busy = isStarting || isStopping || isSubmitting;
  return <>
    <AudioPhoneHeading eyebrow={listening ? 'À l’envers · à toi de suivre' : 'Première étape · chacun sa phrase'} title={title}>{description}</AudioPhoneHeading>
    <div className={s.studioGrid}>
      <AudioPhonePanel className={s.console}>
        <div className={s.consoleTop}><span className={cn(s.pill, isRecording && s.live)}>{isRecording ? <><i /> Enregistrement</> : status === 'sent' ? <><Check /> Envoyé</> : <><Mic /> Ton petit studio</>}</span><span className={s.duration}>{isRecording ? recordingTime.toFixed(1) : maxSeconds}<small>{isRecording ? ` / ${maxSeconds} s` : ' s max'}</small></span></div>
        {status ? <div className={s.status}><span>{status === 'sent' ? <Check /> : status === 'author' ? <Headphones /> : <Users />}</span><h2>{status === 'sent' ? 'C’est dans la boîte !' : status === 'author' ? 'Cette fois, c’est ta phrase.' : 'Installe-toi, profite du spectacle.'}</h2><p>{status === 'sent' ? 'Ta voix a été envoyée. La suite arrive dès que la bande est prête.' : status === 'author' ? 'Les autres tentent de t’imiter. Tu découvriras leurs versions à la révélation.' : 'Tu es arrivé après le début : tu joueras à la prochaine manche.'}</p></div> : <>
          {listening || <AudioPhoneTape title={tapeTitle} subtitle={isRecording ? 'Parle à ton rythme. On t’écoute.' : 'Courte, drôle, bizarre… c’est toi qui choisis.'} active={isRecording} level={audioLevel} />}
          <div className={s.recorder}>
            {hasRecording && !isRecording ? <>
              <div className={s.reviewTitle}><Check /><strong>Ta prise est prête.</strong><span>Écoute-la avant de l’envoyer.</span></div>
              <AudioPhonePlayer key={previewUrl} src={previewUrl} label="Écouter ma prise" suspended={busy} />
              <div className={s.actions}><AudioPhoneButton secondary onClick={startRecording} disabled={busy}><RotateCcw /> Refaire</AudioPhoneButton><AudioPhoneButton onClick={onSubmit} disabled={busy}>{isSubmitting ? <Loader2 className={s.spin} /> : <Send />} {isSubmitting ? 'Envoi…' : 'Envoyer ma prise'}</AudioPhoneButton></div>
            </> : <>
              <button type="button" className={cn(s.mic, isRecording && s.micLive)} disabled={(!isRecording && !canRecord) || busy} onClick={isRecording ? stopRecording : startRecording} aria-label={isStarting ? 'Autorisation du micro en cours' : isStopping ? 'Préparation de la prise' : isRecording ? 'Arrêter l’enregistrement' : 'Démarrer l’enregistrement'} style={{ '--voice-level': Math.min(1, Math.max(0, audioLevel)) } as CSSProperties}>{busy ? <Loader2 className={s.spin} /> : isRecording ? <Square fill="currentColor" /> : <Mic />}</button>
              <div className={s.micCopy}><strong>{isStarting ? 'On attend ton micro…' : isStopping ? 'On prépare ta prise…' : isRecording ? 'À toi de parler !' : canRecord ? 'Appuie. Parle. C’est tout.' : 'D’abord, écoute la phrase.'}</strong><p>{isStarting ? 'Autorise le micro dans ton navigateur.' : isRecording ? 'Appuie à nouveau pour arrêter.' : canRecord ? 'Tu peux réécouter et refaire avant d’envoyer.' : 'Le micro se débloque à la fin de l’écoute.'}</p></div>
              {isRecording && <progress className={s.recordProgress} value={recordingTime} max={maxSeconds} aria-label="Durée enregistrée" />}
            </>}
            {error && <p className={s.error} role="alert">{error}</p>}
          </div>
        </>}
      </AudioPhonePanel>
      {sidebar}
    </div>
  </>;
}

/** Native media events own the state; rejected autoplay never leaves a false pause button. */
export function AudioPhonePlayer({ src, label, suspended = false }: { src: string | null; label: string; suspended?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    const media = audio.current;
    setPlaying(false); setTime(0); setDuration(0); setError('');
    return () => { generation.current++; media?.pause(); };
  }, [src]);
  useEffect(() => { if (suspended) { audio.current?.pause(); setPlaying(false); } }, [suspended]);
  const toggle = async () => {
    if (!audio.current) return;
    if (playing) { audio.current.pause(); return; }
    const request = generation.current;
    try { await audio.current.play(); if (request === generation.current) setError(''); }
    catch { if (request === generation.current) { setPlaying(false); setError('Lecture indisponible. Réessaie.'); } }
  };
  const format = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  const updateDuration = () => { const d = audio.current?.duration; setDuration(d && Number.isFinite(d) ? d : 0); };
  return <div className={s.player}>
    <audio ref={audio} src={src ?? undefined} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0); if (audio.current) audio.current.currentTime = 0; }} onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)} onLoadedMetadata={updateDuration} onDurationChange={updateDuration} onError={() => { setPlaying(false); setError('Cet audio est indisponible.'); }} />
    <button type="button" disabled={!src || suspended} aria-label={playing ? 'Mettre ma prise en pause' : label} onClick={() => void toggle()}>{playing ? <Pause /> : <Play fill="currentColor" />}</button><div><strong>{label}</strong><input type="range" min={0} max={duration || 1} step={.01} value={Math.min(time, duration || 1)} disabled={!duration || suspended} aria-label="Position dans ma prise" onChange={event => { if (audio.current) { audio.current.currentTime = Number(event.target.value); setTime(Number(event.target.value)); } }} /></div><time>{format(time)} / {duration ? format(duration) : '—'}</time>{error && <p role="alert">{error}</p>}
  </div>;
}

export function AudioPhoneListening({ author, isPlaying, hasListened, audioMissing, disabled, onToggle }: { author: string; isPlaying: boolean; hasListened: boolean; audioMissing: boolean; disabled?: boolean; onToggle: () => void }) {
  return <div className={s.listening}><AudioPhoneTape title={`La phrase de ${author}`} subtitle={isPlaying ? 'Écoute le rythme, les syllabes, les petits bruits.' : 'Pas besoin de comprendre. Fais comme tu entends !'} active={isPlaying} reversed />
    {audioMissing ? <p className={s.notice}><Volume2 /> Audio indisponible. Tu peux quand même enregistrer ta version.</p> : <AudioPhoneButton secondary onClick={onToggle} disabled={disabled}>{isPlaying ? <Pause /> : <Headphones />}{isPlaying ? 'Pause' : hasListened ? 'Réécouter la phrase' : 'Écouter la phrase inversée'}</AudioPhoneButton>}
    {hasListened && <p className={s.listened}><Check /> À toi de refaire ce son.</p>}
  </div>;
}

export function AudioPhoneProgress({ completed, total, title = 'La bande au micro', children }: { completed: number; total: number; title?: string; children?: ReactNode }) {
  return <AudioPhonePanel className={s.progressPanel} title={title} label="Chacun à son rythme" aside={<span className={s.count}>{completed}<small> / {total}</small></span>}><progress value={Math.min(completed, total)} max={Math.max(total, 1)} aria-label={title} /><p className={s.progressCopy}>{completed >= total && total > 0 ? 'Tout le monde est prêt !' : 'La suite arrive quand tout le monde a terminé.'}</p>{children}</AudioPhonePanel>;
}

export function AudioPhoneRoster({ names, ids = [], readyIds = [], pending = [] }: { names: string[]; ids?: string[]; readyIds?: string[]; pending?: string[] }) {
  return <ul className={s.roster}>{names.map((name, i) => { const id = ids[i]; const done = id ? readyIds.includes(id) : !pending.includes(name); return <li key={id || `${name}-${i}`}><span className={s.avatar}>{id ? <PlayerAvatar playerId={id} playerName={name} size="sm" showTitle={false} /> : name.slice(0, 2).toUpperCase()}</span><strong>{name}</strong><small className={done ? s.ready : ''}>{done ? <><Check /> Prêt</> : <><Mic /> Au micro</>}</small></li>; })}</ul>;
}

export function AudioPhoneWaiting({ isHost, phraseCount, isPreparing, onStart }: { isHost: boolean; phraseCount: number; isPreparing: boolean; onStart: () => void }) {
  return <><AudioPhoneHeading eyebrow="Tout est enregistré" title={<>Prêts à entendre <em>les dégâts ?</em></>}>Toutes vos versions sont dans la boîte. Place à l’écoute collective.</AudioPhoneHeading><AudioPhonePanel className={s.waiting}><AudioPhoneTape title="La compilation de la bande." subtitle={`${phraseCount} phrase${phraseCount > 1 ? 's' : ''} · toutes vos versions · beaucoup de surprises`} /><ol className={s.waitingFlow}><li><Mic /> L’original</li><li><RotateCcw /> À l’envers</li><li><Users /> Vos versions</li></ol>{isHost ? <AudioPhoneButton yellow onClick={onStart} disabled={isPreparing}>{isPreparing ? <Loader2 className={s.spin} /> : <Play />}{isPreparing ? 'Préparation des audios…' : 'Lancer la révélation'}</AudioPhoneButton> : <p className={s.notice}><Loader2 className={s.spin} /> L’hôte lance la révélation pour tout le monde.</p>}</AudioPhonePanel></>;
}

export interface AudioPhoneRevealViewProps {
  author: string; phraseIndex: number; phraseCount: number; chain: { key: string; label: string; available: boolean }[]; step: string; isPlaying: boolean; isHost: boolean;
  requiresInteraction: boolean; message: string | null; onRetry: () => void; onToggle: () => void; onNext: () => void; onPrevious: () => void; onPlayAgain: () => void; onEnd: () => void; complete: boolean;
}
export function AudioPhoneRevealView({ author, phraseIndex, phraseCount, chain, step, isPlaying, isHost, requiresInteraction, message, onRetry, onToggle, onNext, onPrevious, onPlayAgain, onEnd, complete }: AudioPhoneRevealViewProps) {
  const active = chain.findIndex(item => item.key === step);
  const current = chain[active];
  return <><AudioPhoneHeading eyebrow={`La révélation · phrase ${phraseIndex + 1} sur ${phraseCount}`} title={<>Alors, qu’est devenue <em>la phrase de {author} ?</em></>}>L’original, le son à l’envers, puis chaque imitation remise à l’endroit.</AudioPhoneHeading>
    <div className={s.revealGrid}>
      <AudioPhonePanel className={s.revealConsole}><div className={s.consoleTop}><span className={s.pill}><Users /> Écoute collective</span><span className={s.pill}>{phraseIndex + 1} / {phraseCount}</span></div><AudioPhoneTape title={current?.label ?? (step === 'complete' ? 'C’était quelque chose !' : `La phrase de ${author}`)} subtitle={step === 'original' ? 'La phrase, telle qu’elle a été enregistrée.' : step === 'reversed' ? 'Voilà ce que les autres ont entendu.' : step.startsWith('imitation_') ? 'Son imitation, remise à l’endroit.' : 'La bande écoute la même séquence.'} reversed={step === 'reversed'} faceLabel={step === 'reversed' ? 'FACE B · À L’ENVERS' : 'FACE A · À L’ENDROIT'} active={isPlaying} />
        <div className={s.revealControls}>{isHost ? <><AudioPhoneButton yellow onClick={requiresInteraction ? onRetry : onToggle}>{requiresInteraction ? <RotateCcw /> : isPlaying ? <Pause /> : <Play />}{requiresInteraction ? 'Relancer ce son' : isPlaying ? 'Pause' : step === 'idle' ? 'Écouter la séquence' : step === 'complete' ? 'Réécouter' : 'Reprendre'}</AudioPhoneButton><div className={s.actions}><AudioPhoneButton secondary label="Phrase précédente" onClick={onPrevious} disabled={phraseIndex === 0 || isPlaying}><ArrowLeft /> Précédente</AudioPhoneButton><AudioPhoneButton secondary label="Phrase suivante" onClick={onNext} disabled={phraseIndex >= phraseCount - 1 || isPlaying}>Suivante <ArrowRight /></AudioPhoneButton></div></> : requiresInteraction ? <AudioPhoneButton onClick={onRetry}><Volume2 /> Activer la lecture</AudioPhoneButton> : <p className={s.notice}>{isPlaying ? <Volume2 /> : <Headphones />}{isPlaying ? 'Lecture en cours pour la bande.' : 'L’hôte pilote la lecture.'}</p>}{message && <p role="status" className={s.error}>{message}</p>}</div>
      </AudioPhonePanel>
      <AudioPhonePanel title="Le trajet de la phrase" label="À écouter, dans cet ordre" aside={<span className={s.count}>{chain.length}<small> sons</small></span>}>
        <ol className={s.chain}>{chain.map((item, i) => <li key={item.key} aria-current={step === item.key ? 'step' : undefined} className={cn(step === item.key && s.chainActive, (active > i || step === 'complete') && s.chainDone, !item.available && s.chainMissing)}><span>{step === item.key && isPlaying ? <Volume2 /> : active > i || step === 'complete' ? <Check /> : String(i + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><small>{!item.available ? 'Audio indisponible · étape ignorée' : item.key === 'original' ? 'L’original' : item.key === 'reversed' ? 'Le son à imiter' : 'Imitation remise à l’endroit'}</small></div>{step === item.key && <b>{isPlaying ? 'À l’écoute' : 'En pause'}</b>}</li>)}</ol>
        {complete && <p className={s.listened}><Sparkles /> Fin de la compilation. Bien joué la bande !</p>}
        {isHost && <div className={s.endActions}><AudioPhoneButton secondary onClick={onPlayAgain} disabled={isPlaying}><RotateCcw /> Nouvelle manche</AudioPhoneButton><AudioPhoneButton secondary onClick={onEnd} disabled={isPlaying}><Home /> Retour au lobby</AudioPhoneButton></div>}
      </AudioPhonePanel>
    </div>
  </>;
}
