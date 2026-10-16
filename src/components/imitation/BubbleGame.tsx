import { Check, Clapperboard, Eye, Mic, ThumbsUp, Trophy, Users } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { InkBetaLogo, InkBetaMascot } from '@/components/InkBetaBrand';
import { cn } from '@/lib/utils';
import { showSfx, warmShowSfx } from './showSfx';
import styles from './BubbleGame.module.css';

export type BubblePhase = 'preparation' | 'preview' | 'imitation' | 'voting' | 'results';

const STEPS = [
  { id: 'preview', label: 'Le défi', duoLabel: 'Le défi', icon: Eye },
  { id: 'imitation', label: 'Ta prise', duoLabel: 'Vos prises', icon: Mic },
  { id: 'voting', label: 'Les votes', duoLabel: 'Les votes', icon: ThumbsUp },
  { id: 'results', label: 'Le podium', duoLabel: 'Les duos', icon: Trophy },
] as const;

/** Le mot géant dessiné en contour sur le plateau, derrière tout. */
const BACKDROP_WORD: Record<BubblePhase, string> = {
  preparation: 'Prépa',
  preview: 'Le défi',
  imitation: 'Ta prise',
  voting: 'Le vote',
  results: 'Podium',
};

/** La carte-titre qui ouvre chaque phase, comme un générique d'émission. */
const INTRO_WORD: Partial<Record<BubblePhase, [solo: string, duo: string]>> = {
  preview: ['Le défi', 'Le défi'],
  imitation: ['À toi !', 'À vous !'],
  voting: ['Votez !', 'Votez !'],
  results: ['Podium', 'Podium'],
};

/** Mouvement réduit demandé, ou appareil économe : pas de chorégraphie. */
export const prefersCalmMotion = (): boolean => {
  if (typeof window === 'undefined') return true;
  if (document.documentElement.classList.contains('low-power')) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/*
 * Chaque carte-titre ne passe qu'une fois par phase et par manche, même si la
 * scène est remontée par une resynchronisation : la revoir à chaque
 * reconnexion ferait croire à un changement de phase.
 */
const playedIntros = new Set<string>();

export const BubbleGameHeader = ({ phase, round, tools, teamMode = false }: { phase: BubblePhase; round?: number; tools?: ReactNode; teamMode?: boolean }) => {
  const current = STEPS.findIndex(step => step.id === phase);
  return <header className={styles.header}>
    <div className={styles.brand}>
      <InkBetaLogo titleId="bubble-imitation-brand" />
      <span className={styles.modeTag}>{teamMode ? <Users aria-hidden="true" /> : <Mic aria-hidden="true" />}{teamMode ? 'Imitation · 2V2' : 'Imitation'}</span>
    </div>
    {phase === 'preparation'
      ? <span className={styles.prepTag}><Clapperboard aria-hidden="true" />Préparation</span>
      : <ol className={styles.steps} aria-label="Étapes de la manche">{STEPS.map(({ id, label, duoLabel, icon: Icon }, index) =>
        <li key={id} className={cn(index === current && styles.current, index < current && styles.complete)} aria-current={index === current ? 'step' : undefined}>
          <span className={styles.token} aria-hidden="true">{index < current ? <Check /> : <Icon />}</span>
          <strong>{teamMode ? duoLabel : label}</strong>
        </li>)}</ol>}
    <div className={styles.tools}>
      {round ? <span className={styles.round}><small>Manche</small><strong>{String(round).padStart(2, '0')}</strong></span> : null}
      {tools}
    </div>
  </header>;
};

/** Fond de plateau partagé par toutes les phases (et par la préparation). */
export const BubbleBackdrop = ({ phase }: { phase: BubblePhase }) =>
  <div className={styles.backdrop} aria-hidden="true">
    <span className={styles.bigWord}>{BACKDROP_WORD[phase]}</span>
  </div>;

/**
 * Le plateau suit très légèrement le curseur (fond seulement) et chaque
 * bouton fait un petit tic au survol. Rien de tout ça sur écran tactile ou
 * quand le joueur a demandé moins de mouvement.
 */
export const useStageLife = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    warmShowSfx();
    if (!element || prefersCalmMotion() || typeof window.matchMedia !== 'function' || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    let hovered: Element | null = null;
    const onMove = (event: PointerEvent) => {
      x = (event.clientX / window.innerWidth) * 2 - 1;
      y = (event.clientY / window.innerHeight) * 2 - 1;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        element.style.setProperty('--px', x.toFixed(3));
        element.style.setProperty('--py', y.toFixed(3));
      });
    };
    const onOver = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.('button:not(:disabled), summary, [data-sfx-hover]') ?? null;
      if (target === hovered) return;
      hovered = target;
      if (target) showSfx('hover');
    };
    element.addEventListener('pointermove', onMove, { passive: true });
    element.addEventListener('pointerover', onOver, { passive: true });
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerover', onOver);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
};

/** Phases jouées sur la scène vidéo plein cadre (voir VideoStage). */
const usesVideoStage = (phase: BubblePhase) => phase === 'preview' || phase === 'imitation' || phase === 'voting';

interface BubbleGameStageProps {
  phase: BubblePhase;
  round?: number;
  tools?: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
  teamMode?: boolean;
  /** Pas de carte-titre (écran de chargement, d'erreur…). */
  quiet?: boolean;
}

export const BubbleGameStage = ({ phase, round, tools, children, sidebar, teamMode = false, quiet = false }: BubbleGameStageProps) => {
  const life = useStageLife();
  const introKey = `${phase}:${round ?? 0}:${teamMode ? 'duo' : 'solo'}`;
  const words = INTRO_WORD[phase];
  const wantsIntro = !quiet && Boolean(words) && !playedIntros.has(introKey) && !prefersCalmMotion();
  const [intro, setIntro] = useState<{ key: string; on: boolean }>(() => ({ key: introKey, on: wantsIntro }));
  // Nouvelle phase : la décision se prend pendant le rendu, pour que la scène
  // entrante connaisse déjà son délai d'entrée dès sa première image.
  if (intro.key !== introKey) setIntro({ key: introKey, on: wantsIntro });
  const introOn = intro.key === introKey ? intro.on : wantsIntro;

  useEffect(() => {
    if (!introOn) return;
    playedIntros.add(introKey);
    showSfx('whoosh');
    const slam = window.setTimeout(() => showSfx('stamp'), 330);
    const done = window.setTimeout(() => setIntro(current => current.key === introKey ? { ...current, on: false } : current), 1250);
    return () => {
      window.clearTimeout(slam);
      window.clearTimeout(done);
    };
  }, [introKey, introOn]);

  return <div ref={life} className={`ik-root ${styles.root}`} data-game-phase={phase} data-team-mode={teamMode || undefined}
    data-stage={usesVideoStage(phase) || undefined} data-intro={introOn ? 'on' : undefined}>
    <BubbleBackdrop phase={phase} />
    <BubbleGameHeader phase={phase} round={round} tools={tools} teamMode={teamMode} />
    <div className={cn(styles.workspace, sidebar && styles.withChat)}>
      <main className={`${styles.main} custom-scrollbar`}><div className={styles.content}>{children}</div></main>
      {sidebar && <div className={styles.sidebar}>{sidebar}</div>}
    </div>
    {introOn && words && <div className={styles.intro} aria-hidden="true">
      <div className={styles.introBand}>
        {round ? <span className={styles.introRound}>Manche {round}</span> : null}
        <strong className={styles.introWord}>{teamMode ? words[1] : words[0]}</strong>
      </div>
    </div>}
  </div>;
};

export const BubbleHeading = ({ label, title, children, aside }: { label: string; title: ReactNode; children?: ReactNode; aside?: ReactNode }) =>
  <header className={styles.heading}><div><span>{label}</span><h1>{title}</h1>{children && <p>{children}</p>}</div>{aside}</header>;

export const BubblePanel = ({ title, eyebrow, aside, children, className }: { title?: string; eyebrow?: string; aside?: ReactNode; children: ReactNode; className?: string }) =>
  <section className={cn(styles.panel, className)}>
    {(title || aside) && <header className={styles.panelHeader}><div>{eyebrow && <small>{eyebrow}</small>}{title && <h2>{title}</h2>}</div>{aside}</header>}
    <div className={styles.panelBody}>{children}</div>
  </section>;

/** Attente plein cadre : la mascotte tient la scène pendant qu'on synchronise. */
export const BubbleHold = ({ title, children, action, icon }: { title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) =>
  <div className={styles.hold}>
    <BubblePanel className={styles.holdCard}>
      <div className={styles.waiting} role="status">
        {icon ?? <span className={styles.mascot}><InkBetaMascot /></span>}
        <h2>{title}</h2>
        {children && <p>{children}</p>}
        {!action && <span className={styles.loadingDots} aria-hidden="true"><i /><i /><i /></span>}
        {action}
      </div>
    </BubblePanel>
  </div>;

export { styles as bubbleGameStyles };
