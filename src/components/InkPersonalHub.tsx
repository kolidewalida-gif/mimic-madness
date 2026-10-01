import { memo, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type ElementType } from 'react';
import {
  Bell,
  CheckCheck,
  ChevronRight,
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

import { DeviceSettings } from '@/components/DeviceSettings';
import { FriendsMessenger } from '@/components/messaging/FriendsMessenger';
import messengerStyles from '@/components/messaging/Messenger.module.css';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkModal } from '@/components/menu/InkOverlay';
import {
  useNotificationCenter,
  type CenterNotification,
  type NotifType,
} from '@/hooks/useNotificationCenter';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';
import type { PersonalHubTab } from '@/components/personal-hub/types';
import bubbleHub from '@/components/settings/BubbleHub.module.css';
import { BubbleProfilePage } from '@/components/personal-hub/BubblePlayerUI';
import { BubbleProgress } from '@/components/personal-hub/BubbleProgress';
import { BubbleAppearance } from '@/components/personal-hub/BubbleAppearance';

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
    <BubbleProfilePage onNavigate={onNavigate}><InkProfileSidebar variant="hub" /></BubbleProfilePage>
  </div>
);

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
  const contentRef = useRef<HTMLElement>(null);
  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  // Each destination starts at its heading, not halfway down the previous page.
  // Run before paint so switching sections doesn't show a scroll jump.
  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab, isOpen]);

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
      className={cn('ik-party-overlay ik-personal-hub', bubbleHub.root)}
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

        <main ref={contentRef} className="ik-hub-content custom-scrollbar">
          {activeTab === 'profile' && <HubProfile onNavigate={navigate} />}
          {activeTab === 'friends' && (
            <div className={`ik-hub-page ik-hub-friends-page ${messengerStyles.page}`}>
              <HubSectionHeading eyebrow="Ta bande" title="Messages & amis" copy="Discute en privé, retrouve tes amis ou rassemble-les dans un groupe." />
              <FriendsMessenger currentLobbyCode={currentLobbyCode} onJoinFriend={onJoinLobby} onAcceptGameInvitation={onAcceptInvitation} onDeclineGameInvitation={onDeclineInvitation} />
            </div>
          )}
          {activeTab === 'progress' && <div className="ik-hub-page ik-hub-progress-page"><BubbleProgress /></div>}
          {activeTab === 'appearance' && <div className="ik-hub-page ik-hub-appearance-page"><BubbleAppearance playerId={playerId} playerName={playerName} /></div>}
          {activeTab === 'notifications' && <HubNotifications {...notifications} onNavigate={navigate} onOpenSocial={openSocial} />}
          {activeTab === 'settings' && (
            <div className="ik-hub-page ik-hub-settings-page">
              <DeviceSettings embedded playerId={playerId} playerName={playerName} />
            </div>
          )}
        </main>
      </div>
    </InkModal>
  );
};

export const InkPersonalHub = memo(InkPersonalHubComponent);
