import { useRef, useState } from 'react';
import { Check, Crown, Loader2, Lock, Palette, Shield, Sparkles, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { usePlayerLoadout } from '@/hooks/usePlayerLoadout';
import { LEVEL_REWARDS, usePlayerLevel, type LevelReward } from '@/hooks/usePlayerLevel';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { rarityStyle } from '@/lib/rarity';
import { cn } from '@/lib/utils';
import { Orb, PageHeading } from './BubblePlayerUI';
import s from './BubblePlayer.module.css';

export interface AppearanceData {
  name: string; avatarUrl?: string; level: number;
  title: LevelReward | null; titles: LevelReward[]; unlockedIds: string[];
  frame: 'none' | 'bronze' | 'silver' | 'gold'; effect: 'none' | 'sparkle' | 'glow';
  badge: string; prestige: number;
}
const FRAMES = { none: 'Standard', bronze: 'Bronze', silver: 'Argent', gold: 'Or' };
const EFFECTS = { none: 'Aucun', sparkle: 'Étincelles', glow: 'Halo lumineux' };

export const BubbleAppearanceView = ({ data, signedIn, loading = false, onEquip, onRemove }: { data: AppearanceData; signedIn: boolean; loading?: boolean; onEquip: (id: string) => Promise<boolean>; onRemove: () => Promise<boolean> }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const change = async (id: string | null) => {
    if (pending.current || !signedIn || loading || (id !== null && !data.unlockedIds.includes(id))) return;
    pending.current = true; setBusy(id || 'remove');
    try {
      const success = await (id ? onEquip(id) : onRemove());
      if (success) { toast.success(id ? 'Ton nouveau titre est équipé !' : 'Titre retiré.'); playInkSound('cartoonDing', .3); }
      else toast.error('Impossible de changer le titre. Réessaie.');
    } catch { toast.error('La connexion a été interrompue. Réessaie.'); }
    finally { pending.current = false; setBusy(null); }
  };
  return <div className={s.page}>
    <PageHeading icon={Palette} tone="pink" title="Un style bien à toi." copy="Choisis ta signature. Le reste se débloque au fil de tes parties." />
    <div className={s.appearanceGrid}>
      <aside className={cn(s.card, s.look)} aria-label="Aperçu de ton apparence"><span className={s.eyebrow}>Ta carte de joueur</span><div className={s.lookStage}><Avatar className={cn(s.avatar, data.frame === 'gold' && s.goldFrame, data.frame === 'silver' && s.silverFrame, data.frame === 'bronze' && s.bronzeFrame)}><AvatarImage src={data.avatarUrl} alt={`Avatar de ${data.name}`} /><AvatarFallback>{data.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar></div><h3>{data.name}</h3><span className={s.nameplate}><Crown aria-hidden="true" />{data.title?.name || 'Sans titre'}</span><p className={s.note}>Niveau {data.level} · {data.prestige} points de prestige</p><dl className={s.loadout}><div><dt>Cadre actif</dt><dd>{FRAMES[data.frame]}</dd></div><div><dt>Effet actif</dt><dd>{EFFECTS[data.effect]}</dd></div><div><dt>Badge vedette</dt><dd>{data.badge}</dd></div><div><dt>Équipement</dt><dd>Automatique</dd></div></dl></aside>
      <div className={s.wardrobe}>
        <section aria-label="Choisir un titre"><header className={s.sectionTitle}><div><span className={s.eyebrow}>Sous ton pseudo, partout en jeu</span><h3>Quel titre pour toi ?</h3></div><span className={s.count}>{data.unlockedIds.filter(id => data.titles.some(title => title.id === id)).length}/{data.titles.length}</span></header>{!signedIn && <p className={s.inlineNotice}>Connecte-toi pour équiper un titre et sauvegarder ton style.</p>}<div className={s.titleCards}>{data.titles.map(title => {
          const unlocked = data.unlockedIds.includes(title.id); const equipped = data.title?.id === title.id;
          return <article key={title.id} className={cn(s.card, s.titleCard, equipped && s.equipped, !unlocked && s.locked)}>{equipped && <span className={s.status} aria-label="Titre équipé"><Check /></span>}<Orb icon={title.icon === 'crown' ? Crown : title.icon === 'shield' ? Shield : UserRound} tone={title.rarity === 'legendary' ? '' : title.rarity === 'epic' ? 'pink' : 'mint'} /><div><h4>{title.name}</h4><span className={s.tag}>{rarityStyle(title.rarity).label} · Niv. {title.level}</span><p className={s.note}>{title.perk || title.description}</p></div>{equipped ? <button className={cn(s.button, s.quiet)} type="button" disabled={Boolean(busy) || loading || !signedIn} aria-busy={busy === 'remove'} onClick={() => void change(null)} aria-label={`Retirer le titre ${title.name}`}>{busy === 'remove' ? <Loader2 className={s.spinner} aria-hidden="true" /> : <Check aria-hidden="true" />}Retirer</button> : unlocked ? <button className={s.button} type="button" disabled={Boolean(busy) || loading || !signedIn} aria-busy={busy === title.id} onClick={() => void change(title.id)} aria-label={`Équiper le titre ${title.name}`}>{busy === title.id ? <Loader2 className={s.spinner} aria-hidden="true" /> : <Crown aria-hidden="true" />}Équiper</button> : <span className={s.claimed}><Lock aria-hidden="true" />Au niveau {title.level}</span>}</article>;
        })}</div></section>
        <aside className={cn(s.card, s.autoInfo)}><Orb icon={Sparkles} tone="mint" /><div><strong>Tu joues, ton avatar évolue.</strong><p className={s.note}>Ton meilleur cadre, ton effet et ton badge s’activent automatiquement. Les titres, c’est toi qui choisis.</p></div></aside>
      </div>
    </div>
  </div>;
};

export const BubbleAppearance = ({ playerId, playerName }: { playerId?: string; playerName?: string }) => {
  const { user, profile } = useAuth();
  const { level, unlockedRewards } = usePlayerLevel();
  const title = useEquippedTitle();
  const { frameTier, effectTier, featuredBadge, prestigeScore } = usePlayerLoadout(user?.id || playerId);
  const { avatarData } = useGlobalPlayerAvatar(user?.id || playerId || '');
  const avatarUrl = avatarData.type === 'image' && avatarData.imageUrl ? avatarData.imageUrl : profile?.avatar_url || undefined;
  return <BubbleAppearanceView signedIn={Boolean(user)} loading={title.isLoading} onEquip={title.equipTitle} onRemove={title.unequipTitle} data={{ name: profile?.display_name || playerName || 'Joueur', avatarUrl, level, title: title.equippedTitle, titles: LEVEL_REWARDS.filter(reward => reward.type === 'title'), unlockedIds: unlockedRewards, frame: frameTier, effect: effectTier, badge: featuredBadge?.name || 'À débloquer', prestige: prestigeScore }} />;
};
