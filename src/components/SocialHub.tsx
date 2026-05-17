import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, UserPlus, Mail, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useUnreadCounts } from '@/hooks/useDirectMessages';
import { SocialHubPanel } from '@/components/SocialHubPanel';

/**
 * SocialHub — Floating Action Button (FAB) pour accéder rapidement au réseau social
 * Toujours visible, affiche les notifications, ouvre un panneau latéral complet
 */

interface SocialHubProps {
  /** Code du lobby actuel (pour inviter des amis) */
  currentLobbyCode?: string;
  /** Callback pour rejoindre un ami */
  onJoinFriend?: (lobbyCode: string) => void;
  /** Position du FAB */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const SocialHubComponent = ({ 
  currentLobbyCode, 
  onJoinFriend,
  position = 'bottom-right' 
}: SocialHubProps) => {
  const { user } = useAuth();
  const { pendingRequests } = useFriends();
  const { pendingInvitations } = useGameInvitations();
  const unreadCounts = useUnreadCounts();
  const [isOpen, setIsOpen] = useState(false);

  // Calculer le total de notifications
  const totalUnreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  const totalNotifications = pendingRequests.length + pendingInvitations.length + totalUnreadMessages;

  // Si pas connecté, ne rien afficher
  if (!user) return null;

  const handleToggle = () => {
    playInkSound(isOpen ? 'inkClick' : 'brushTap', 0.4);
    setIsOpen(!isOpen);
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className={cn(
          'fixed z-[60]',
          positionClasses[position]
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.button
          onClick={handleToggle}
          className={cn(
            'relative w-16 h-16 rounded-full shadow-2xl',
            'flex items-center justify-center',
            'transition-all duration-300',
            isOpen
              ? 'bg-primary/90 text-primary-foreground'
              : 'bg-card/90 backdrop-blur-xl border-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/10'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={totalNotifications > 0 && !isOpen ? {
            boxShadow: [
              '0 0 0 0 hsl(var(--primary) / 0.4)',
              '0 0 0 12px hsl(var(--primary) / 0)',
            ]
          } : {}}
          transition={{
            boxShadow: {
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut'
            }
          }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-7 h-7" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Users className="w-7 h-7" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badge de notifications */}
          <AnimatePresence>
            {totalNotifications > 0 && !isOpen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg border-2 border-background"
              >
                {totalNotifications > 99 ? '99+' : totalNotifications}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Quick actions (mini menu radial) - optionnel, désactivé pour l'instant */}
        {/* <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute bottom-20 right-0 flex flex-col gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <QuickActionButton icon={<MessageCircle />} label="Messages" badge={totalUnreadMessages} />
              <QuickActionButton icon={<Mail />} label="Invitations" badge={pendingInvitations.length} />
              <QuickActionButton icon={<UserPlus />} label="Demandes" badge={pendingRequests.length} />
            </motion.div>
          )}
        </AnimatePresence> */}
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
