import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Sparkles, Gamepad2 } from 'lucide-react';
import { useDialogBehaviour } from '@/components/menu/InkOverlay';
import { Button } from '@/components/ui/button';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { playSample } from '@/lib/sfx/samples';
import { cn } from '@/lib/utils';

interface GameInvitation {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  lobby_code: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface GameInvitationNotificationProps {
  invitation: GameInvitation;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  onClose: () => void;
  variant?: 'default' | 'inkBeta';
}

export const GameInvitationNotification = ({
  invitation,
  onAccept,
  onDecline,
  onClose,
  variant = 'default',
}: GameInvitationNotificationProps) => {
  const { playSound } = useSoundEffects();
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const titleId = useId();
  const descriptionId = useId();

  // Son d'invitation dédié. Il empruntait celui des succès débloqués, doublé
  // d'un `powerUp` — un empilement qui ne voulait rien dire.
  useEffect(() => {
    if (!playSample('inviteReceived', 0.6)) playSound('achievementEarned', 0.6);
  }, [playSound]);

  // Auto-dismiss countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsVisible(false);
          setTimeout(onClose, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  const handleAccept = useCallback(() => {
    if (!playSample('inviteAccepted', 0.5)) playSound('success', 0.5);
    setIsVisible(false);
    setTimeout(() => onAccept(invitation.id), 300);
  }, [invitation.id, onAccept, playSound]);

  const handleDecline = useCallback(() => {
    if (!playSample('inviteDeclined', 0.4)) playSound('error', 0.3);
    setIsVisible(false);
    setTimeout(() => onDecline(invitation.id), 300);
  }, [invitation.id, onDecline, playSound]);

  const dialogRef = useDialogBehaviour(
    variant === 'inkBeta' && isVisible,
    handleDecline,
  );

  if (variant === 'inkBeta') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="ik-game-invite-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="ik-game-invite-backdrop" aria-hidden="true" />
            <motion.div
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className="ik-game-invite-modal"
              initial={{ opacity: 0, scale: 0.9, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            >
              <div className="ik-game-invite-stripe" aria-hidden="true" />
              <button
                type="button"
                onClick={handleDecline}
                aria-label="Fermer et refuser l'invitation"
                className="ik-game-invite-close menu-focus"
              >
                <X aria-hidden="true" />
              </button>

              <header className="ik-game-invite-topline">
                <span>
                  <Sparkles aria-hidden="true" />
                  Nouvelle invitation
                </span>
                <strong className={cn(countdown <= 5 && 'is-urgent')} aria-hidden="true">
                  {countdown}s
                </strong>
                <span className="sr-only">Tu as quinze secondes pour répondre.</span>
              </header>

              <div className="ik-game-invite-content">
                <div className="ik-game-invite-host">
                  <div className="ik-game-invite-emblem" aria-hidden="true">
                    <Gamepad2 />
                    <span />
                  </div>
                  <p>Invitation de</p>
                  <h2 id={titleId}>{invitation.sender_name || 'Un ami'}</h2>
                  <p id={descriptionId} className="ik-game-invite-lead">
                    Une place est réservée pour toi. Rejoins le salon avant que la
                    troupe ne lance la partie.
                  </p>
                  <div className="ik-game-invite-promise">
                    <Users aria-hidden="true" />
                    <span>Invitation directe · une décision suffit</span>
                  </div>
                </div>

                <div className="ik-game-invite-ticket">
                  <div className="ik-game-invite-ticket-head">
                    <span>Accès au salon</span>
                    <i aria-hidden="true" />
                  </div>

                  <div className="ik-game-invite-code">
                    <span>Code de la partie</span>
                    <strong>{invitation.lobby_code}</strong>
                    <small>Salon privé de {invitation.sender_name || 'ton ami'}</small>
                  </div>

                  <div className="ik-game-invite-actions">
                    <button
                      type="button"
                      onClick={handleDecline}
                      className="ik-game-invite-decline menu-focus"
                    >
                      <X aria-hidden="true" />
                      <span>Pas maintenant</span>
                    </button>
                    <button
                      type="button"
                      data-autofocus
                      onClick={handleAccept}
                      className="ik-game-invite-accept menu-focus"
                    >
                      <Users aria-hidden="true" />
                      <span>Rejoindre la troupe</span>
                    </button>
                  </div>
                </div>
              </div>

              <footer className="ik-game-invite-footer">
                <div className="ik-game-invite-progress" aria-hidden="true">
                  <motion.span
                    key={invitation.id}
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 15, ease: 'linear' }}
                  />
                </div>
                <p>L'invitation se range automatiquement, sans être refusée.</p>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
          }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 300,
            x: {
              duration: 0.6,
              ease: 'easeInOut',
              times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
            },
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl blur-xl opacity-60"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            className="relative bg-card/95 backdrop-blur-xl border border-primary/40 rounded-2xl p-5 shadow-2xl shadow-primary/30 min-w-[380px] max-w-[440px]"
            animate={{
              rotate: [0, -1, 1, -1, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: 3,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
          >
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
                  backgroundSize: '200% 100%',
                  animation: 'gradientSlide 2s linear infinite',
                  opacity: 0.3,
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleDecline}
              aria-label="Fermer et refuser l'invitation"
              className="menu-icon-control menu-focus absolute top-3 right-3 text-foreground-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Gamepad2 className="h-7 w-7 text-white" />
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-warning animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Invitation de jeu!</h3>
                  <p className="text-foreground-muted text-sm">
                    <span className="text-primary font-semibold">{invitation.sender_name}</span> vous invite
                  </p>
                </div>
              </div>

              <div className="bg-background/60 rounded-xl p-3 text-center border border-primary/20">
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Code du Lobby</p>
                <p className="text-2xl font-bold tracking-[0.2em] text-primary">{invitation.lobby_code}</p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleDecline}
                  variant="outline"
                  className="menu-focus flex-1 h-12 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <X className="h-4 w-4 mr-2" aria-hidden="true" />
                  Refuser
                </Button>
                <Button
                  type="button"
                  onClick={handleAccept}
                  className="menu-focus flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity group"
                >
                  <Users className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  Rejoindre
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-foreground-muted text-xs">
                <div className="w-full bg-background/50 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 15, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-primary to-accent"
                  />
                </div>
                <span
                  className={cn(
                    'font-mono font-semibold min-w-[28px] text-right',
                    countdown <= 5 && 'text-warning animate-pulse',
                  )}
                >
                  {countdown}s
                </span>
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {[...Array(6)].map((_, index) => (
                <motion.div
                  key={index}
                  className="absolute w-1.5 h-1.5 bg-primary/60 rounded-full"
                  initial={{
                    x: Math.random() * 100 + '%',
                    y: '110%',
                    opacity: 0,
                  }}
                  animate={{
                    y: '-10%',
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: index * 0.3,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
