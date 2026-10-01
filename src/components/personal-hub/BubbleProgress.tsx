import { useId, useRef, useState, type ElementType } from 'react';
import { Award, CalendarDays, Check, Crown, Flame, Gift, Image, Loader2, MessageCircle, Mic, Shield, Sparkles, Star, ThumbsUp, Trophy, Target, Zap, Eye, Brain, UserPlus, Compass, Circle, Sun, Heart, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useQuests, type QuestWithProgress } from '@/hooks/useQuests';
import { useLoginStreak } from '@/hooks/useLoginStreak';
import { useAchievements } from '@/hooks/useAchievements';
import { usePlayerLevel, LEVEL_REWARDS, type LevelReward } from '@/hooks/usePlayerLevel';
import type { Achievement } from '@/components/AchievementToast';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { rarityStyle } from '@/lib/rarity';
import { cn } from '@/lib/utils';
import { BubbleTabs, Empty, LevelTicket, Meter, Orb, PageHeading, type LevelSummary } from './BubblePlayerUI';
import s from './BubblePlayer.module.css';

const ICONS: Record<string, ElementType> = { trophy: Trophy, star: Star, sparkles: Sparkles, award: Award, crown: Crown, gift: Gift, mic: Mic, zap: Zap, shield: Shield, image: Image, 'thumbs-up': ThumbsUp, 'message-circle': MessageCircle, message: MessageCircle, 'message-square': MessageCircle, eye: Eye, brain: Brain, 'user-plus': UserPlus, target: Target, flame: Flame, compass: Compass, circle: Circle, sun: Sun, heart: Heart };
type View = 'quests' | 'achievements' | 'rewards';

export interface BubbleProgressData {
  level: LevelSummary;
  streak: { current: number; best: number };
  daily: QuestWithProgress[];
  weekly: QuestWithProgress[];
  questsLoading: boolean;
  achievements: Achievement[];
  unlockedAchievementIds: string[];
  rewards: LevelReward[];
  unlockedRewardIds: string[];
}

export const BubbleProgressView = ({ data, onClaim, signedIn }: { data: BubbleProgressData; onClaim: (id: string) => Promise<number | null>; signedIn: boolean }) => {
  const [view, setView] = useState<View>('quests');
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Set<string>>(() => new Set());
  const pending = useRef(false);
  const panelId = useId();
  const periodId = useId();
  const quests = period === 'daily' ? data.daily : data.weekly;
  const claim = async (quest: QuestWithProgress) => {
    if (pending.current || !signedIn || !quest.isComplete || quest.isClaimed || claimed.has(`${quest.periodKey}:${quest.id}`)) return;
    pending.current = true; setClaiming(quest.id);
    try {
      const xp = await onClaim(quest.id);
      if (xp && xp > 0) {
        // Confirm locally only after the atomic server claim succeeds. Realtime
        // will update the level; this prevents a second click during that delay.
        setClaimed(previous => new Set(previous).add(`${quest.periodKey}:${quest.id}`));
        toast.success(`Mission accomplie ! +${xp} XP`); playInkSound('cartoonDing', .35);
      }
      else toast.error('Impossible de récupérer les XP. Réessaie.');
    } catch { toast.error('La connexion a été interrompue. Réessaie.'); }
    finally { pending.current = false; setClaiming(null); }
  };
  const list = view === 'achievements'
    ? data.achievements.map(item => ({ id: item.id, name: item.title, copy: item.description, icon: item.icon, rarity: item.rarity, unlocked: data.unlockedAchievementIds.includes(item.id), level: null }))
    : data.rewards.map(item => ({ id: item.id, name: item.name, copy: item.description, icon: item.icon, rarity: item.rarity, unlocked: data.unlockedRewardIds.includes(item.id), level: item.level }));
  const unlocked = list.filter(item => item.unlocked).length;
  const visible = list.filter(item => filter === 'all' || (filter === 'unlocked' ? item.unlocked : !item.unlocked));

  return <div className={s.page}>
    <PageHeading icon={Trophy} title="Chaque partie, un peu plus haut." copy="Des petites missions, de beaux souvenirs et des récompenses à garder." />
    <div className={s.progressTop}><LevelTicket data={data.level} /><section className={cn(s.card, s.streak)} aria-label="Série de connexion"><Orb icon={Flame} tone="pink" /><div><span className={s.eyebrow}>Le rendez-vous de la bande</span><strong>{data.streak.current} jour{data.streak.current > 1 ? 's' : ''} de suite</strong><p className={s.note}>Ton record : {data.streak.best} jour{data.streak.best > 1 ? 's' : ''}.<br />Reviens jouer pour continuer ta série.</p></div></section></div>
    <BubbleTabs value={view} onChange={next => { setView(next); setFilter('all'); playInkSound('cartoonPop', .2); }} label="Sections de progression" panelId={panelId} items={[{ id: 'quests', label: 'Missions', icon: Sparkles },{ id: 'achievements', label: 'Succès', icon: Award },{ id: 'rewards', label: 'Récompenses', icon: Gift }]} />
    <section id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${view}`}>
      {view === 'quests' ? <><div className={s.toolbar}><h3>{period === 'daily' ? 'Les missions du jour' : 'Le défi de la semaine'}</h3><BubbleTabs<'daily' | 'weekly'> value={period} onChange={setPeriod} panelId={periodId} label="Période des missions" items={[{ id: 'daily', label: 'Aujourd’hui', icon: CalendarDays },{ id: 'weekly', label: 'Cette semaine' }]} /></div>{!signedIn && <p className={s.inlineNotice}>Connecte-toi pour sauvegarder tes missions et récupérer les XP.</p>}<div id={periodId} role="tabpanel" aria-labelledby={`${periodId}-tab-${period}`} className={s.missions}>
        {data.questsLoading ? <p className={s.note} role="status">Chargement de tes missions…</p> : quests.length === 0 ? <Empty title="Une petite pause." copy="De nouvelles missions arrivent avec la prochaine période." /> : quests.map(quest => <article key={quest.id} className={cn(s.card, s.mission)}><Orb icon={ICONS[quest.icon] || Sparkles} tone={(quest.isClaimed || claimed.has(`${quest.periodKey}:${quest.id}`)) ? 'mint' : quest.icon.includes('message') ? 'pink' : ''} /><div><h4>{quest.title}<span className={s.missionProgress}>{Math.min(quest.progress, quest.target)} / {quest.target}</span></h4><p className={s.note}>{quest.description}</p><Meter value={quest.target > 0 ? quest.progress / quest.target * 100 : 0} label={`Progression : ${quest.title}`} />{quest.bonusReward && <p className={s.note}>{quest.bonusReward.emoji} {quest.bonusReward.label}</p>}</div>{(quest.isClaimed || claimed.has(`${quest.periodKey}:${quest.id}`)) ? <span className={s.claimed}><Check aria-hidden="true" /> Récupéré</span> : quest.isComplete ? <button className={cn(s.button, s.yellow)} type="button" disabled={!signedIn || claiming !== null} aria-busy={claiming === quest.id} aria-label={`Récupérer ${quest.xpReward} XP pour ${quest.title}`} onClick={() => void claim(quest)}>{claiming === quest.id ? <Loader2 className={s.spinner} aria-hidden="true" /> : <Gift aria-hidden="true" />}+{quest.xpReward} XP</button> : <div className={s.rewardStamp}><strong>+{quest.xpReward}</strong><small>XP À GAGNER</small></div>}</article>)}
      </div></> : <><div className={s.toolbar}><div><h3>{view === 'achievements' ? 'Tes exploits en collection' : 'Les étapes de ton aventure'}</h3><p className={s.note}>{unlocked} sur {list.length} débloqué{unlocked > 1 ? 's' : ''} · {view === 'rewards' ? 'Gains automatiques de niveau' : 'Gagnés en jouant'}</p></div><div className={s.tabs} aria-label="Filtrer la collection">{[{ id: 'all' as const, label: 'Tout' },{ id: 'unlocked' as const, label: 'Gagnés' },{ id: 'locked' as const, label: 'À venir' }].map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div></div>{visible.length === 0 ? <Empty title={filter === 'locked' ? 'Collection complète !' : 'Le premier est pour bientôt.'} copy={filter === 'locked' ? 'Tu as tout débloqué. Profite de tes récompenses !' : 'Continue à jouer pour remplir cette collection.'} /> : <div className={s.collectionGrid}>{visible.map(item => <article className={cn(s.card, s.collectible, !item.unlocked && s.locked)} key={item.id}><Orb icon={ICONS[item.icon] || Star} tone={item.rarity === 'legendary' ? '' : 'mint'} /><div><h4>{item.name}</h4><p className={s.note}>{item.copy}</p><span className={s.tag}>{item.unlocked ? <Check aria-hidden="true" /> : <Lock aria-hidden="true" />}{item.unlocked ? 'Débloqué' : item.level ? `Niveau ${item.level}` : 'À décrocher'} · {rarityStyle(item.rarity).label}</span></div></article>)}</div>}</>}
    </section>
  </div>;
};

export const BubbleProgress = () => {
  const { user } = useAuth();
  const level = usePlayerLevel();
  const quests = useQuests();
  const streak = useLoginStreak();
  const achievements = useAchievements();
  return <BubbleProgressView signedIn={Boolean(user)} onClaim={quests.claim} data={{ level, streak, daily: quests.dailyQuests, weekly: quests.weeklyQuests, questsLoading: quests.loading, achievements: [...achievements.getUnlockedAchievements(), ...achievements.getLockedAchievements()], unlockedAchievementIds: achievements.unlockedIds, rewards: LEVEL_REWARDS, unlockedRewardIds: level.unlockedRewards }} />;
};
