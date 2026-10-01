import { Check, ChevronRight, Clapperboard, Crown, Eye, Mic, Sparkles, ThumbsUp, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { InkBetaLogo } from '@/components/InkBetaBrand';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { cn } from '@/lib/utils';
import styles from './BubbleGame.module.css';

export type BubblePhase = 'preparation' | 'preview' | 'imitation' | 'voting' | 'results';
const STEPS = [
  { id: 'preview', label: 'Le défi', icon: Eye },
  { id: 'imitation', label: 'Ta prise', icon: Mic },
  { id: 'voting', label: 'Les votes', icon: ThumbsUp },
  { id: 'results', label: 'Le podium', icon: Trophy },
];

export const BubbleGameHeader = ({ phase, round, tools }: { phase: BubblePhase; round?: number; tools?: ReactNode }) => {
  const current = STEPS.findIndex(step => step.id === phase);
  return <header className={styles.header}>
    <div className={styles.brand}><InkBetaLogo titleId="bubble-imitation-brand" /><span><Mic />Imitation</span></div>
    {phase === 'preparation' ? <span className={styles.prepPill}><Clapperboard /> On prépare la scène</span> :
      <ol className={styles.steps} aria-label="Étapes de la manche">{STEPS.map(({ id, label, icon: Icon }, index) =>
        <li key={id} className={cn(index === current && styles.current, index < current && styles.complete)} aria-current={index === current ? 'step' : undefined}>
          <span>{index < current ? <Check /> : <Icon />}</span><strong>{label}</strong>{index < 3 && <ChevronRight className={styles.chevron} />}
        </li>)}</ol>}
    <div className={styles.tools}>{round && <span className={styles.round}>Manche <strong>{String(round).padStart(2, '0')}</strong></span>}{tools}</div>
  </header>;
};

export const BubbleGameStage = ({ phase, round, tools, children, sidebar }: { phase: BubblePhase; round?: number; tools?: ReactNode; children: ReactNode; sidebar?: ReactNode }) =>
  <div className={`ik-root ${styles.root}`} data-game-phase={phase}>
    <div className="ik-party-bg" aria-hidden="true" /><div className="ik-party-dots" aria-hidden="true" />
    <div className={styles.decor} aria-hidden="true"><i /><i /><i /><i /></div>
    <BubbleGameHeader phase={phase} round={round} tools={tools} />
    <div className={cn(styles.workspace, sidebar && styles.withChat)}>
      <main className={`${styles.main} custom-scrollbar`}><div className={styles.content}>{children}</div></main>
      {sidebar && <div className={styles.sidebar}>{sidebar}</div>}
    </div>
  </div>;

export const BubbleHeading = ({ label, title, children, aside }: { label: string; title: ReactNode; children?: ReactNode; aside?: ReactNode }) =>
  <header className={styles.heading}><div><span>{label}</span><h1>{title}</h1>{children && <p>{children}</p>}</div>{aside}</header>;

export const BubblePanel = ({ title, eyebrow, aside, children, className }: { title?: string; eyebrow?: string; aside?: ReactNode; children: ReactNode; className?: string }) =>
  <section className={cn(styles.panel, className)}>{(title || aside) && <header className={styles.panelHeader}><div>{eyebrow && <small>{eyebrow}</small>}<h2>{title}</h2></div>{aside}</header>}<div className={styles.panelBody}>{children}</div></section>;

export const BubblePlayers = ({ players, ready, self, label = 'La bande' }: { players: { id: string; name: string; isHost?: boolean }[]; ready: string[]; self: string; label?: string }) =>
  <section className={styles.players} aria-label={label}><div className={styles.playersHeading}><Sparkles /><strong>{label}</strong><small>{ready.filter(id => players.some(player => player.id === id)).length}/{players.length} prêts</small></div>
    <ul>{players.map(player => <li key={player.id} className={cn(ready.includes(player.id) && styles.ready)}>
      <span className={styles.playerPortrait}><PlayerAvatar playerId={player.id} playerName={player.name} size="lg" showTitle={false} />{player.isHost && <Crown className={styles.crown} />}{ready.includes(player.id) && <Check className={styles.readyMark} />}</span>
      <strong>{player.id === self ? `${player.name} · toi` : player.name}</strong><small>{ready.includes(player.id) ? 'Prêt !' : 'À son rythme'}</small>
    </li>)}</ul></section>;

export { styles as bubbleGameStyles };
