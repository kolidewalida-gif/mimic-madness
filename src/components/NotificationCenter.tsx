import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Mail, UserPlus, MessageCircle, Wifi, X, CheckCheck } from 'lucide-react';
import { useNotificationCenter, type NotifType } from '@/hooks/useNotificationCenter';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const ICONS: Record<NotifType, any> = {
  invite: Mail,
  friend_request: UserPlus,
  friend_online: Wifi,
  comment: MessageCircle,
};

const ACCENT: Record<NotifType, string> = {
  invite: '#34d399',
  friend_request: '#fbbf24',
  friend_online: '#22d3ee',
  comment: '#a855f7',
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
  const { items, unreadCount, markAllRead, remove, clear } = useNotificationCenter();
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
    setOpen((o) => {
      const next = !o;
      if (next && unreadCount > 0) markAllRead();
      return next;
    });
  };

  const act = (type: NotifType, id: string) => {
    if (type === 'invite' || type === 'friend_request') {
      window.dispatchEvent(new CustomEvent('mimic:open-friends'));
    } else if (type === 'comment') {
      window.dispatchEvent(new CustomEvent('mimic:open-social'));
    }
    remove(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="notification-center relative">
      <motion.button
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.94 }}
        className="menu-focus relative h-12 w-12 rounded-xl flex items-center justify-center text-white"
        style={{
          background: 'linear-gradient(180deg, rgba(168,85,247,0.3), rgba(126,34,206,0.3))',
          border: '2.5px solid #0a0810',
          boxShadow: '0 4px 0 #0a0810',
        }}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lues` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" strokeWidth={2.5} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '2px solid #0a0810' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            role="dialog"
            aria-label="Centre de notifications"
            className="absolute right-0 top-14 z-[120] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, #1a0d2e 0%, #160a26 60%, #0f0820 100%)',
              border: '3px solid #0a0810',
              boxShadow: '0 10px 0 #0a0810, 0 18px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-black text-white uppercase tracking-wider">Notifications</span>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <button type="button" onClick={clear} className="menu-icon-control rounded-lg p-1.5 text-white/60 hover:text-white" title="Tout effacer" aria-label="Tout effacer">
                    <CheckCheck className="h-4 w-4" />
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
                  const actionable = n.type !== 'friend_online';
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b border-white/5 transition-colors',
                        actionable && 'cursor-pointer hover:bg-white/5',
                        !n.read && 'bg-primary/[0.06]',
                      )}
                      onClick={actionable ? () => act(n.type, n.id) : undefined}
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${ACCENT[n.type]}22`, border: `1.5px solid ${ACCENT[n.type]}55` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: ACCENT[n.type] }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white leading-snug">{n.title}</div>
                        {n.body && <div className="mt-0.5 truncate text-xs text-white/55">{n.body}</div>}
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{timeAgo(n.ts)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                        className="menu-icon-control rounded-md p-1 text-white/40 hover:text-white"
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
