import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Mail, UserPlus, MessageCircle, Wifi, X, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationCenter, type NotifType } from '@/hooks/useNotificationCenter';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const ICONS: Record<NotifType, React.ElementType> = {
  invite: Mail,
  friend_request: UserPlus,
  friend_online: Wifi,
  comment: MessageCircle,
};

const ACCENT: Record<NotifType, string> = {
  invite: '#34d399',
  friend_request: '#fbbf24',
  friend_online: 'var(--ink-text-dim)',
  comment: 'var(--ink-accent)',
};

const timeAgo = (ts: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
};

/**
 * NotificationCenter — a bell button with an unread badge and a dropdown feed.
 * Fed by useNotifications (invites, friend requests, friends online, comments).
 * Actions route to the existing panels via window events so no accept/join
 * logic is duplicated here.
 */
export const NotificationCenter = () => {
  const { items, unreadCount, markRead, markAllRead, remove, clear } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    playInkSound('inkClick', 0.3);
    setOpen((o) => !o);
  };

  const act = (type: NotifType, id: string) => {
    markRead(id);
    if (type === 'invite' || type === 'friend_request') {
      window.dispatchEvent(new CustomEvent('mimic:open-friends'));
    } else if (type === 'comment') {
      window.dispatchEvent(new CustomEvent('mimic:open-social'));
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="if-icon-btn menu-icon-control menu-focus relative"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lues` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="if-badge absolute -right-1.5 -top-1.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            role="dialog"
            aria-label="Centre de notifications"
            className="if-panel absolute right-0 top-12 z-[120] w-[min(22rem,calc(100vw-2rem))] overflow-hidden"
            style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--ink-line)] px-4 py-3">
              <span className="if-label">Notifications</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead} className="menu-icon-control rounded-lg p-1.5 text-white/60 hover:text-white" title="Tout marquer comme lu" aria-label="Tout marquer comme lu">
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                {items.length > 0 && (
                  <button type="button" onClick={clear} className="menu-icon-control rounded-lg p-1.5 text-white/60 hover:text-rose-300" title="Tout effacer" aria-label="Tout effacer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="menu-icon-control rounded-lg p-1.5 text-white/60 hover:text-white" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[min(24rem,60vh)] overflow-y-auto custom-scrollbar">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-white/45">
                  <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm font-bold">Aucune notification</p>
                  <p className="mt-1 text-xs">Invitations, amis et commentaires s’afficheront ici.</p>
                </div>
              ) : (
                items.map((n) => {
                  const Icon = ICONS[n.type];
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-stretch border-b border-white/5 transition-colors',
                        !n.read && 'bg-primary/[0.06]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => act(n.type, n.id)}
                        className="menu-focus flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                        aria-label={`${n.title}${n.read ? '' : ', non lue'}`}
                      >
                        <span
                          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ background: `${ACCENT[n.type]}22`, border: `1.5px solid ${ACCENT[n.type]}55` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: ACCENT[n.type] }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-white leading-snug">{n.title}</span>
                          {n.body && <span className="mt-0.5 block truncate text-xs text-white/55">{n.body}</span>}
                          <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/35">{timeAgo(n.ts)}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(n.id)}
                        className="menu-icon-control m-2 self-center rounded-md p-1 text-white/40 hover:text-white"
                        aria-label="Ignorer la notification"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
