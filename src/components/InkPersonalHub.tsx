import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties, type ElementType } from 'react';
import {
  Award,
  Bell,
  CheckCheck,
  ChevronRight,
  Crown,
  Gift,
  Mail,
  MessageCircle,
  Palette,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
  UserRound,
  UsersRound,
  Wifi,
  X,
} from 'lucide-react';

import { AchievementsPanel } from '@/components/AchievementsPanel';
import { DeviceSettings } from '@/components/DeviceSettings';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkQuestsPanel } from '@/components/InkQuestsPanel';
import { RewardsPanel } from '@/components/RewardsPanel';
import { TitleSelector } from '@/components/TitleSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InkModal } from '@/components/menu/InkOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import {
  useNotificationCenter,
  type CenterNotification,
  type NotifType,
} from '@/hooks/useNotificationCenter';
import { LEVEL_REWARDS, usePlayerLevel } from '@/hooks/usePlayerLevel';
import { usePlayerLoadout } from '@/hooks/usePlayerLoadout';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';
import type { PersonalHubTab } from '@/components/personal-hub/types';

interface InkPersonalHubProps {
  isOpen: boolean;
  activeTab: PersonalHubTab;
  onTabChange: (tab: PersonalHubTab) => void;
  onOpenSocial: () => void;
  onClose: () => void;
  onJoinLobby: (lobbyCode: string) => void | Promise<void>;
  onAcceptInvitation: (invitationId: string) => void | Promise<void>;
  onDeclineInvitation: (invitationId: string) => void | Promise<void>;
  onUnreadCountChange?: (count: number) => void;
  currentLobbyCode?: string;
  playerId?: string;
  playerName?: string;
}

interface HubNavItem {
  id: PersonalHubTab | 'social';
  label: string;
  shortLabel: string;
  description: string;
  icon: ElementType;
  accent: string;
}

const NAV_ITEMS: HubNavItem[] = [
  { id: 'profile', label: 'Mon espace', shortLabel: 'Moi', description: 'Profil et aperçu', icon: UserRound, accent: '#2df2d0' },
  { id: 'friends', label: 'Amis', shortLabel: 'Amis', description: 'Messages et invitations', icon: UsersRound, accent: '#65edb5' },
  { id: 'social', label: 'Social', shortLabel: 'Social', description: 'Vidéos de la communauté', icon: Share2, accent: '#ff62b6' },
  { id: 'progress', label: 'Progression', shortLabel: 'Progrès', description: 'Quêtes, succès et gains', icon: Trophy, accent: '#ffd34e' },
  { id: 'appearance', label: 'Apparence', shortLabel: 'Style', description: 'Titre et équipement', icon: Palette, accent: '#b497ff' },
  { id: 'notifications', label: 'Notifications', shortLabel: 'Alertes', description: 'Toute ton activité', icon: Bell, accent: '#6ec8ff' },
  { id: 'settings', label: 'Réglages', shortLabel: 'Options', description: 'Audio, volume et thème', icon: Settings, accent: '#f4f0ff' },
];

const NOTIFICATION_ICONS: Record<NotifType, ElementType> = {
  invite: Mail,
  friend_request: UserPlus,
  friend_online: Wifi,
  comment: MessageCircle,
};

const NOTIFICATION_ACCENTS: Record<NotifType, string> = {
  invite: '#65edb5',
  friend_request: '#ffd34e',
  friend_online: '#6ec8ff',
  comment: '#ff62b6',
};

const timeAgo = (timestamp: number) => {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
};

const HubSectionHeading = ({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) => (
  <header className="ik-hub-section-heading">
    <span>{eyebrow}</span>
    <h3>{title}</h3>
    <p>{copy}</p>
  </header>
);

const HubProfile = ({ onNavigate }: { onNavigate: (tab: PersonalHubTab) => void }) => (
  <div className="ik-hub-page ik-hub-profile-page">
    <HubSectionHeading eyebrow="Identité" title="Ton espace joueur" copy="Ton profil, ton rythme et les raccourcis utiles réunis dans un tableau de bord sans détour." />
    <div className="ik-hub-profile-layout">
      <div className="ik-hub-profile-main">
        <InkProfileSidebar variant="hub" />
      </div>
      <aside className="ik-hub-shortcuts" aria-label="Raccourcis de mon espace">
        <div className="ik-hub-shortcuts-heading">
          <span className="ik-hub-kicker">Actions rapides</span>
          <p>Continue exactement là où tu en as besoin.</p>
        </div>
        {[
          { tab: 'appearance' as const, icon: Crown, title: 'Composer mon style', copy: 'Titre, avatar et équipement', accent: '#b497ff' },
          { tab: 'progress' as const, icon: Trophy, title: 'Continuer mon parcours', copy: 'Quêtes, succès et récompenses', accent: '#ffd34e' },
          { tab: 'friends' as const, icon: UsersRound, title: 'Retrouver ma troupe', copy: 'Messages, demandes et parties', accent: '#65edb5' },
        ].map(({ tab, icon: Icon, title, copy, accent }) => (
          <button key={tab} type="button" className="ik-hub-shortcut menu-focus" onClick={() => onNavigate(tab)} style={{ '--hub-item-accent': accent } as CSSProperties}>
            <span><Icon aria-hidden="true" /></span>
            <span><strong>{title}</strong><small>{copy}</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </aside>
    </div>
  </div>
);

type ProgressView = 'quests' | 'achievements' | 'rewards';

const HubProgress = () => {
  const [view, setView] = useState<ProgressView>('quests');
  const views: { id: ProgressView; label: string; copy: string; icon: ElementType }[] = [
    { id: 'quests', label: 'Quêtes', copy: 'Objectifs actifs', icon: Sparkles },
    { id: 'achievements', label: 'Succès', copy: 'Badges gagnés', icon: Award },
    { id: 'rewards', label: 'Récompenses', copy: 'Gains de niveau', icon: Gift },
  ];

  return (
    <div className="ik-hub-page ik-hub-progress-page">
      <HubSectionHeading eyebrow="Progression" title="Continue sur ta lancée" copy="Un parcours clair : réalise tes quêtes, décroche des succès et vois ce que chaque niveau débloque." />
      <div className="ik-hub-subnav" role="tablist" aria-label="Sections de progression">
        {views.map(({ id, label, copy, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              id={`ik-progress-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`ik-progress-panel-${id}`}
              className={cn('ik-hub-subnav-item menu-focus', active && 'is-active')}
              onClick={() => { playInkSound('cartoonPop', 0.25); setView(id); }}
            >
              <Icon aria-hidden="true" />
              <span><strong>{label}</strong><small>{copy}</small></span>
            </button>
          );
        })}
      </div>
      <section
        id={`ik-progress-panel-${view}`}
        className="ik-hub-embedded-panel"
        role="tabpanel"
        aria-labelledby={`ik-progress-tab-${view}`}
      >
        {view === 'quests' && <InkQuestsPanel />}
        {view === 'achievements' && <AchievementsPanel embedded />}
        {view === 'rewards' && <RewardsPanel embedded />}
      </section>
    </div>
  );
};

const FRAME_LABELS = {
  none: 'Cadre standard',
  bronze: 'Cadre bronze',
  silver: 'Cadre argent',
  gold: 'Cadre or',
} as const;

const EFFECT_LABELS = {
  none: 'Aucun effet',
  sparkle: 'Étincelles',
  glow: 'Halo lumineux',
} as const;

const HubAppearance = ({ playerId, playerName }: { playerId?: string; playerName?: string }) => {
  const { user, profile } = useAuth();
  const { level, isRewardUnlocked } = usePlayerLevel();
  const { equippedTitle } = useEquippedTitle();
  const { frameTier, effectTier, featuredBadge, prestigeScore } = usePlayerLoadout(user?.id || playerId);
  const { avatarData } = useGlobalPlayerAvatar(user?.id || playerId || '');
  const avatarUrl = avatarData.type === 'image' && avatarData.imageUrl
    ? avatarData.imageUrl
    : profile?.avatar_url || undefined;
  const displayName = profile?.display_name || playerName || 'Joueur';
  const unlockedCosmetics = useMemo(
    () => LEVEL_REWARDS.filter((reward) => reward.type !== 'title' && isRewardUnlocked(reward.id)),
    [isRewardUnlocked],
  );

  return (
    <div className="ik-hub-page ik-hub-appearance-page">
      <HubSectionHeading eyebrow="Apparence" title="Ton identité en jeu" copy="Le titre est ton choix. Les cadres, badges et effets apparaissent automatiquement avec ta progression." />
      <div className="ik-hub-appearance-layout">
        <aside className="ik-hub-look-preview">
          <span className="ik-hub-kicker">Aperçu actuel</span>
          <Avatar className="ik-hub-look-avatar">
            <AvatarImage src={avatarUrl} alt={`Avatar de ${displayName}`} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <h4>{displayName}</h4>
          <span className="ik-hub-level-pill">Niveau {level}</span>
          <div className="ik-hub-title-preview">
            <Crown aria-hidden="true" />
            <span><small>Titre équipé</small><strong>{equippedTitle?.name || 'Aucun titre'}</strong></span>
          </div>
          <div className="ik-hub-auto-loadout">
            <div className="ik-hub-loadout-heading">
              <span><Sparkles aria-hidden="true" /><strong>{unlockedCosmetics.length}</strong></span>
              <p>éléments visuels débloqués · équipement automatique</p>
            </div>
            <dl className="ik-hub-loadout-grid">
              <div><dt>Cadre actif</dt><dd>{FRAME_LABELS[frameTier]}</dd></div>
              <div><dt>Effet actif</dt><dd>{EFFECT_LABELS[effectTier]}</dd></div>
              <div><dt>Badge vedette</dt><dd>{featuredBadge?.name || 'À débloquer'}</dd></div>
              <div><dt>Prestige</dt><dd>{prestigeScore} pts</dd></div>
            </dl>
          </div>
        </aside>
        <section className="ik-hub-embedded-panel ik-hub-title-panel">
          <TitleSelector embedded />
        </section>
      </div>
    </div>
  );
};

const HubNotifications = ({
  items,
  unreadCount,
  markRead,
  markAllRead,
  remove,
  clear,
  onNavigate,
  onOpenSocial,
}: {
  items: CenterNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  onNavigate: (tab: PersonalHubTab) => void;
  onOpenSocial: () => void;
}) => {
  const act = (notification: CenterNotification) => {
    markRead(notification.id);
    if (notification.type === 'comment') onOpenSocial();
    else onNavigate('friends');
  };

  return (
    <div className="ik-hub-page ik-hub-notifications-page">
      <div className="ik-hub-notifications-heading">
        <HubSectionHeading eyebrow="Activité" title="Rien ne t’échappe" copy="Invitations, demandes d’amis et commentaires sont regroupés ici." />
        <div className="ik-hub-notification-actions">
          {unreadCount > 0 && <button type="button" className="menu-focus" onClick={markAllRead}><CheckCheck aria-hidden="true" /> Tout lire</button>}
          {items.length > 0 && <button type="button" className="menu-focus is-danger" onClick={clear}><X aria-hidden="true" /> Effacer</button>}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="ik-hub-empty">
          <span><Bell aria-hidden="true" /></span>
          <h4>Tout est calme</h4>
          <p>Les nouvelles invitations, demandes et réactions apparaîtront ici.</p>
        </div>
      ) : (
        <div className="ik-hub-notification-list">
          {items.map((notification) => {
            const Icon = NOTIFICATION_ICONS[notification.type];
            const accent = NOTIFICATION_ACCENTS[notification.type];
            return (
              <article key={notification.id} className={cn('ik-hub-notification', !notification.read && 'is-unread')} style={{ '--hub-item-accent': accent } as CSSProperties}>
                <button type="button" className="ik-hub-notification-open menu-focus" onClick={() => act(notification)}>
                  <span className="ik-hub-notification-icon"><Icon aria-hidden="true" /></span>
                  <span><strong>{notification.title}</strong>{notification.body && <small>{notification.body}</small>}<time>{timeAgo(notification.ts)}</time></span>
                  <ChevronRight aria-hidden="true" />
                </button>
                <button type="button" className="ik-hub-notification-dismiss menu-focus" onClick={() => remove(notification.id)} aria-label={`Ignorer : ${notification.title}`}><X aria-hidden="true" /></button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const InkPersonalHubComponent = ({
  isOpen,
  activeTab,
  onTabChange,
  onOpenSocial,
  onClose,
  onJoinLobby,
  onAcceptInvitation,
  onDeclineInvitation,
  onUnreadCountChange,
  currentLobbyCode,
  playerId,
  playerName,
}: InkPersonalHubProps) => {
  const notifications = useNotificationCenter();
  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  useEffect(() => {
    onUnreadCountChange?.(notifications.unreadCount);
  }, [notifications.unreadCount, onUnreadCountChange]);

  const navigate = useCallback((tab: PersonalHubTab) => {
    playInkSound('cartoonPop', 0.25);
    onTabChange(tab);
  }, [onTabChange]);

  const openSocial = useCallback(() => {
    playInkSound('brushTap', 0.3);
    onOpenSocial();
  }, [onOpenSocial]);

  const isTopLayer = useCallback(() => {
    if (typeof document === 'undefined') return true;
    return document.querySelector([
      '.social-viewer-overlay',
      '.social-public-profile-overlay',
      '.ik-game-invite-layer',
      '[data-radix-portal] [role="dialog"][data-state="open"]',
    ].join(',')) === null;
  }, []);

  return (
    <InkModal
      isOpen={isOpen}
      onClose={onClose}
      title={activeItem.label}
      subtitle={activeItem.description}
      icon={<ActiveIcon className="h-5 w-5" />}
      iconGradient={activeItem.accent}
      className="ik-party-overlay ik-personal-hub"
      bodyClassName="ik-personal-hub-body"
      closeLabel="Fermer mon espace"
      size="hub"
      isTopLayer={isTopLayer}
      lockBody
    >
      <div className="ik-hub-shell">
        <nav className="ik-hub-nav custom-scrollbar" aria-label="Navigation de mon espace">
          <div className="ik-hub-nav-brand">
            <span><Sparkles aria-hidden="true" /></span>
            <div><strong>Centre joueur</strong><small>Tout ton univers Mimic</small></div>
          </div>
          <span className="ik-hub-nav-heading">Navigation</span>
          {NAV_ITEMS.map(({ id, label, shortLabel, description, icon: Icon, accent }) => {
            const opensDialog = id === 'social';
            const active = !opensDialog && id === activeTab;
            const badge = id === 'notifications' ? notifications.unreadCount : 0;
            return (
              <button
                key={id}
                type="button"
                className={cn('ik-hub-nav-item menu-focus', active && 'is-active', opensDialog && 'is-dialog-action')}
                onClick={() => opensDialog ? openSocial() : navigate(id)}
                aria-current={active ? 'page' : undefined}
                aria-haspopup={opensDialog ? 'dialog' : undefined}
                style={{ '--hub-item-accent': accent } as CSSProperties}
              >
                <span className="ik-hub-nav-icon"><Icon aria-hidden="true" />{badge > 0 && <b aria-label={`${badge} notification${badge > 1 ? 's' : ''} non lue${badge > 1 ? 's' : ''}`}>{badge > 9 ? '9+' : badge}</b>}</span>
                <span className="ik-hub-nav-copy"><strong>{label}</strong><small>{description}</small></span>
                <span className="ik-hub-nav-short">{shortLabel}</span>
                {opensDialog && <ChevronRight className="ik-hub-nav-launch" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        <main className="ik-hub-content custom-scrollbar">
          {activeTab === 'profile' && <HubProfile onNavigate={navigate} />}
          {activeTab === 'friends' && (
            <div className="ik-hub-page ik-hub-friends-page">
              <HubSectionHeading eyebrow="Communauté" title="Ta troupe" copy="Discute, accepte les demandes et rejoins une partie sans quitter ton espace." />
              <InkFriendsSidebar mode="hub" currentLobbyCode={currentLobbyCode} onJoinFriend={onJoinLobby} onAcceptGameInvitation={onAcceptInvitation} onDeclineGameInvitation={onDeclineInvitation} />
            </div>
          )}
          {activeTab === 'progress' && <HubProgress />}
          {activeTab === 'appearance' && <HubAppearance playerId={playerId} playerName={playerName} />}
          {activeTab === 'notifications' && <HubNotifications {...notifications} onNavigate={navigate} onOpenSocial={openSocial} />}
          {activeTab === 'settings' && (
            <div className="ik-hub-page ik-hub-settings-page">
              <HubSectionHeading eyebrow="Réglages" title="À ta façon" copy="Teste ton micro, règle les volumes et change l’ambiance sans multiplier les fenêtres." />
              <DeviceSettings embedded playerId={playerId} playerName={playerName} />
            </div>
          )}
        </main>
      </div>
    </InkModal>
  );
};

export const InkPersonalHub = memo(InkPersonalHubComponent);
