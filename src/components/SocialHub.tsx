import { useState, memo, useEffect } from 'react';
import { Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useUnreadCounts } from '@/hooks/useDirectMessages';
import { SocialHubPanel } from '@/components/SocialHubPanel';

interface SocialHubProps {
  currentLobbyCode?: string;
  onJoinFriend?: (lobbyCode: string) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const SocialHubComponent = ({
  currentLobbyCode,
  onJoinFriend,
  position = 'bottom-right',
}: SocialHubProps) => {
  const { user } = useAuth();
  const { pendingRequests } = useFriends();
  const { pendingInvitations } = useGameInvitations();
  const unreadCounts = useUnreadCounts();
  const [isOpen, setIsOpen] = useState(false);

  // Allow other screens (e.g. the Ink home "SOCIAL" button) to open the hub.
  useEffect(() => {
    const open = () => {
      playInkSound('brushTap', 0.4);
      setIsOpen(true);
    };
    window.addEventListener('mimic:open-social', open);
    return () => window.removeEventListener('mimic:open-social', open);
  }, []);

  const totalUnreadMessages = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const totalNotifications =
    pendingRequests.length + pendingInvitations.length + totalUnreadMessages;

  if (!user) return null;

  const handleToggle = () => {
    playInkSound(isOpen ? 'inkClick' : 'brushTap', 0.4);
    setIsOpen(!isOpen);
  };

  const positionClasses = {
    'bottom-right': 'bottom-24 right-6',
    'bottom-left': 'bottom-24 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <>
      {/* Floating action button. Same surface language as the menu icon
          buttons: no pulsing ring, no idle float, no rotation — the unread
          count badge is the only signal it needs. */}
      <div className={cn('fixed z-[60]', positionClasses[position])}>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Fermer le hub social' : 'Ouvrir le hub social'}
          aria-expanded={isOpen}
          data-active={isOpen ? 'true' : 'false'}
          className="if-fab menu-icon-control menu-focus relative"
        >
          {isOpen ? (
            <X className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Users className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          )}

          {totalNotifications > 0 && !isOpen && (
            <span className="if-badge absolute -right-1.5 -top-1.5">
              {totalNotifications > 99 ? '99+' : totalNotifications}
            </span>
          )}
        </button>
      </div>

      {/* Side Panel */}
      <SocialHubPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentLobbyCode={currentLobbyCode}
        onJoinFriend={onJoinFriend}
      />
    </>
  );
};

export const SocialHub = memo(SocialHubComponent);
