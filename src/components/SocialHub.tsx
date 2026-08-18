import { useState, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      {/* CARTOON FAB */}
      <motion.div
        className={cn('fixed z-[60]', positionClasses[position])}
        initial={{ scale: 0, opacity: 0, rotate: -45 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }}
      >
        {/* Pulsing ring when notifications */}
        {totalNotifications > 0 && !isOpen && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              scale: [1, 1.3, 1.3],
              opacity: [0.8, 0, 0],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{
              background: 'rgba(168,85,247,0.4)',
              border: '3px solid #a855f7',
            }}
          />
        )}

        <motion.button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Fermer le hub social' : 'Ouvrir le hub social'}
          aria-expanded={isOpen}
          whileHover={{ scale: 1.08, rotate: isOpen ? -90 : -3 }}
          whileTap={{ scale: 0.92 }}
          animate={
            !isOpen && totalNotifications === 0
              ? { y: [0, -3, 0] }
              : !isOpen
                ? { rotate: [-3, 3, -3] }
                : undefined
          }
          transition={
            !isOpen && totalNotifications === 0
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              : !isOpen
                ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                : undefined
          }
          className="menu-icon-control menu-focus relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: isOpen
              ? 'linear-gradient(180deg, #ef4444, #b91c1c)'
              : 'linear-gradient(180deg, #a855f7 0%, #6b21a8 100%)',
            border: '1px solid var(--ink-line)',
            boxShadow:
              'none',
          }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-7 h-7 text-white" strokeWidth={3} aria-hidden="true" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <Users className="w-7 h-7 text-white" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification badge — graffiti style */}
          <AnimatePresence>
            {totalNotifications > 0 && !isOpen && (
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 8 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="absolute -top-2 -right-2 min-w-[26px] h-7 px-1.5 rounded-full text-sm font-black flex items-center justify-center"
                style={{
                  background: 'linear-gradient(180deg, #ef4444, #b91c1c)',
                  color: 'white',
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                  fontFamily: "'Outfit', sans-serif",
                  textShadow:
                    'none',
                }}
              >
                {totalNotifications > 99 ? '99+' : totalNotifications}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

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
