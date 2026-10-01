import { useRef, type ElementType, type ReactNode } from 'react';
import { ArrowRight, Crown, Gamepad2, Sparkles, Target, Trophy, UsersRound, Flame } from 'lucide-react';
import { usePlayerLevel, LEVEL_XP_REQUIREMENTS } from '@/hooks/usePlayerLevel';
import type { PersonalHubTab } from './types';
import { cn } from '@/lib/utils';
import s from './BubblePlayer.module.css';

export const Orb = ({ icon: Icon, tone = '' }: { icon: ElementType; tone?: string }) => <span className={cn(s.orb, tone === 'mint' && s.mint, tone === 'pink' && s.pink)} aria-hidden="true"><Icon /></span>;

export const PageHeading = ({ icon, title, copy, tone }: { icon: ElementType; title: string; copy: string; tone?: string }) => <header className={s.heading}><Orb icon={icon} tone={tone} /><div><h2>{title}</h2><p>{copy}</p></div></header>;

export const Meter = ({ value, label }: { value: number; label: string }) => <div className={s.meter} role="progressbar" aria-label={label} aria-valuenow={Math.max(0, Math.min(100, value))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;

export const Empty = ({ title, copy }: { title: string; copy: string }) => <div className={cn(s.card, s.empty)}><Orb icon={Sparkles} tone="mint" /><h3>{title}</h3><p className={s.note}>{copy}</p></div>;

export const BubbleTabs = <T extends string,>({ value, onChange, items, label, panelId }: { value: T; onChange: (value: T) => void; items: { id: T; label: string; icon?: ElementType }[]; label: string; panelId: string }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={s.tabs} role="tablist" aria-label={label}>{items.map(({ id, label: text, icon: Icon }, index) => <button key={id} ref={node => { refs.current[index] = node; }} id={`${panelId}-tab-${id}`} type="button" role="tab" aria-selected={value === id} aria-controls={panelId} tabIndex={value === id ? 0 : -1} onClick={() => onChange(id)} onKeyDown={event => {
    const next = event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1;
    if (next < 0) return; event.preventDefault(); onChange(items[next].id); refs.current[next]?.focus();
  }}>{Icon && <Icon aria-hidden="true" />}{text}</button>)}</div>;
};

export interface LevelSummary { level: number; totalXp: number; currentXp: number; xpForNextLevel: number; xpForCurrentLevel: number; progressPercent: number }
export const LevelTicket = ({ data }: { data: LevelSummary }) => {
  const maximum = data.level >= LEVEL_XP_REQUIREMENTS.length;
  const remaining = Math.max(0, data.xpForNextLevel - data.totalXp);
  return <section className={cn(s.card, s.level)} aria-label="Progression de niveau"><span className={s.eyebrow}>Ton niveau</span><div className={s.levelTop}><span className={s.levelBadge}>{data.level}</span><div><h3>{maximum ? 'Au sommet !' : `Cap sur le niveau ${data.level + 1}`}</h3><p className={s.note}>{maximum ? 'Tous les paliers de niveau sont atteints.' : `Encore ${remaining.toLocaleString('fr-FR')} XP pour le prochain palier.`}</p></div></div><Meter value={maximum ? 100 : data.progressPercent} label="Progression du niveau" /><div className={s.levelFooter}><small>XP gagnés au total</small><strong>{data.totalXp.toLocaleString('fr-FR')} <small>XP</small></strong></div></section>;
};

export const BubbleProfileDashboard = ({ identity, stats }: { identity: ReactNode; stats: { games_played: number; games_won: number; current_streak: number; best_streak: number } | null }) => {
  const data = usePlayerLevel();
  const played = stats?.games_played || 0;
  const won = stats?.games_won || 0;
  const rate = played > 0 ? Math.round(won / played * 100) : 0;
  return <div className={s.page}><div className={s.profileGrid}><section className={cn(s.card, s.passport)}><span className={s.eyebrow}>Ton passeport Mimic</span>{identity}</section><div className={s.profileRight}><LevelTicket data={data} /><section className={cn(s.card, s.performance)}><div className={s.scoreRing} style={{ background: `conic-gradient(#f0a6cf ${Math.min(100, rate) * 3.6}deg,var(--bp-well) 0deg)` }} role="img" aria-label={`Taux de victoire : ${rate}%`}><span><strong>{rate}%</strong><small>de victoires</small></span></div><div><h3>{played === 0 ? 'À toi de jouer !' : rate >= 60 ? 'Belle série !' : 'Chaque partie compte.'}</h3><p className={s.note}>{played ? `${won} victoire${won > 1 ? 's' : ''} sur ${played} partie${played > 1 ? 's' : ''}.` : 'Tes premières statistiques arrivent après une partie.'}</p></div></section></div></div><div className={s.metrics} aria-label="Statistiques de jeu">{[{ icon: Gamepad2, label: 'Parties jouées', value: played },{ icon: Trophy, label: 'Victoires', value: won },{ icon: Flame, label: 'Série actuelle', value: stats?.current_streak || 0 },{ icon: Target, label: 'Meilleure série', value: stats?.best_streak || 0 }].map(({ icon: Icon, label, value }) => <article className={s.metric} key={label}><Icon aria-hidden="true" /><div><strong>{value.toLocaleString('fr-FR')}</strong><small>{label}</small></div></article>)}</div></div>;
};

export const BubbleProfilePage = ({ children, onNavigate }: { children: ReactNode; onNavigate: (tab: PersonalHubTab) => void }) => <div className={s.page}><PageHeading icon={Gamepad2} tone="mint" title="Bienvenue dans ta bulle." copy="Ton profil, tes exploits et la suite de l’aventure." />{children}<nav className={s.shortcuts} aria-label="Raccourcis de mon espace">{[{ tab: 'appearance' as const, icon: Crown, title: 'Mon vestiaire', copy: 'Un style bien à toi', tone: 'pink' },{ tab: 'progress' as const, icon: Trophy, title: 'Mes missions', copy: 'Joue, progresse, débloque', tone: '' },{ tab: 'friends' as const, icon: UsersRound, title: 'Ma bande', copy: 'On se retrouve ?', tone: 'mint' }].map(({ tab, icon, title, copy, tone }) => <button className={cn(s.card, s.shortcut)} key={tab} type="button" onClick={() => onNavigate(tab)}><Orb icon={icon} tone={tone} /><span><strong>{title}</strong><small>{copy}</small></span><ArrowRight aria-hidden="true" /></button>)}</nav></div>;
