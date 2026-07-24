import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Gift, Zap, ChevronUp, Loader2, Ban, Megaphone, Gamepad2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { AdminAnnouncementsTab, AdminBansTab, AdminLobbiesTab } from './AdminSuperPanel';

type AdminTab = 'account' | 'bans' | 'announce' | 'lobbies';

const TABS: Array<{ id: AdminTab; label: string; icon: any }> = [
  { id: 'account', label: 'Compte', icon: Shield },
  { id: 'bans', label: 'Bans', icon: Ban },
  { id: 'announce', label: 'Annonces', icon: Megaphone },
  { id: 'lobbies', label: 'Lobbies', icon: Gamepad2 },
];

export const AdminPanel = () => {
  const { isAdmin, isLoading, giveAllRewards, giveAllAchievements, setLevel, setStats } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('account');
  const [busyAction, setBusyAction] = useState<'rewards' | 'level' | 'stats' | null>(null);
  const [levelInput, setLevelInput] = useState('30');

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  if (isLoading || !isAdmin) return null;

  const handleGiveAll = async () => {
    if (busyAction) return;
    setBusyAction('rewards');
    try {
      const [rewards, achievements] = await Promise.all([giveAllRewards(), giveAllAchievements()]);
      if (rewards && achievements) toast.success('Toutes les récompenses et succès sont débloqués.');
      else toast.error('Déblocage partiel.');
    } finally { setBusyAction(null); }
  };

  const handleSetLevel = async () => {
    if (busyAction) return;
    const level = parseInt(levelInput);
    if (level < 1 || level > 30) return;
    setBusyAction('level');
    try { (await setLevel(level)) ? toast.success(`Niveau défini à ${level}`) : toast.error('Erreur de niveau.'); }
    finally { setBusyAction(null); }
  };

  const handleMaxStats = async () => {
    if (busyAction) return;
    setBusyAction('stats');
    try {
      const ok = await setStats({ games_played: 999, games_won: 888, current_streak: 50, best_streak: 50, games_hosted: 200, messages_sent: 5000, recordings_made: 500, quiz_games: 300, audio_phone_games: 200, standard_games: 200 });
      ok ? toast.success('Statistiques maximisées.') : toast.error('Erreur de statistiques.');
    } finally { setBusyAction(null); }
  };

  return (
    <>
      <motion.button type="button" onClick={() => setIsOpen((open) => !open)}
        className="menu-focus fixed z-[200] flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-primary text-primary-foreground shadow-lg"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))', left: 'max(1rem, env(safe-area-inset-left, 0px))' }}
        aria-label={isOpen ? 'Fermer le panneau administrateur' : 'Ouvrir le panneau administrateur'} aria-expanded={isOpen}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}><Shield className="h-5 w-5" /></motion.button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[10100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm force-cursor">
            <motion.section onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: .97 }}
              className="ibs-panel menu-dialog relative flex w-full max-w-3xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl"
              role="dialog" aria-modal="true" aria-labelledby="admin-panel-title">
              <header className="flex flex-shrink-0 items-center justify-between border-b border-primary/30 bg-primary/15 p-3 text-foreground">
                <div><span className="ibs-eyebrow">COMMAND CENTER</span><h2 id="admin-panel-title" className="mt-0.5 flex items-center gap-2 text-lg font-black"><Shield className="h-4 w-4 text-primary" /> Administration</h2></div>
                <button type="button" data-back onClick={() => setIsOpen(false)} className="menu-icon-control rounded-lg p-2" aria-label="Fermer le panneau administrateur"><X className="h-4 w-4" /></button>
              </header>

              <nav className="grid flex-shrink-0 grid-cols-4 gap-px border-b border-border bg-black/20" aria-label="Sections administrateur">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-current={active ? 'page' : undefined}
                    className={cn('menu-focus flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold transition-colors sm:flex-row sm:gap-1.5 sm:text-xs', active ? 'border-b-2 border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground')}>
                    <Icon className="h-3.5 w-3.5" />{tab.label}
                  </button>;
                })}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {activeTab === 'account' && <AccountCommands levelInput={levelInput} onLevelChange={setLevelInput} busyAction={busyAction} onGiveAll={handleGiveAll} onSetLevel={handleSetLevel} onMaxStats={handleMaxStats} />}
                {activeTab === 'bans' && <AdminBansTab />}
                {activeTab === 'announce' && <AdminAnnouncementsTab />}
                {activeTab === 'lobbies' && <AdminLobbiesTab onClose={() => setIsOpen(false)} />}
              </div>
            </motion.section>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};


const AccountCommands = ({
  levelInput, onLevelChange, busyAction, onGiveAll, onSetLevel, onMaxStats,
}: {
  levelInput: string;
  onLevelChange: (value: string) => void;
  busyAction: 'rewards' | 'level' | 'stats' | null;
  onGiveAll: () => void;
  onSetLevel: () => void;
  onMaxStats: () => void;
}) => (
  <div className="space-y-4">
    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
      <span className="ibs-eyebrow">COMPTE ADMIN</span>
      <h3 className="mt-1 text-base font-black">Progression & récompenses</h3>
      <p className="mt-1 text-xs text-muted-foreground">Ces actions ne concernent que votre propre compte administrateur.</p>
    </div>

    <AdminButton icon={Gift} label="Débloquer toutes les récompenses et succès" onClick={onGiveAll} disabled={busyAction !== null} loading={busyAction === 'rewards'} />

    <div className="rounded-xl border border-border bg-background/40 p-3">
      <label className="mb-2 block text-xs font-bold text-muted-foreground" htmlFor="admin-level">Niveau du compte</label>
      <div className="flex items-center gap-2">
        <input id="admin-level" type="number" min="1" max="30" value={levelInput} onChange={(event) => onLevelChange(event.target.value)} className="h-11 w-20 rounded-lg border border-border bg-background text-center text-sm font-bold" />
        <AdminButton icon={ChevronUp} label={`Définir niveau ${levelInput}`} onClick={onSetLevel} disabled={busyAction !== null} loading={busyAction === 'level'} className="flex-1" />
      </div>
    </div>

    <AdminButton icon={Zap} label="Maximiser les statistiques de test" onClick={onMaxStats} disabled={busyAction !== null} loading={busyAction === 'stats'} />
  </div>
);

const AdminButton = ({ icon: Icon, label, onClick, disabled, loading = false, className }: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled: boolean;
  loading?: boolean;
  className?: string;
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-busy={loading}
    className={cn('menu-action menu-focus flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-left text-sm font-bold transition-colors hover:border-primary/45 hover:bg-primary/[0.06] disabled:cursor-not-allowed disabled:opacity-50', className)}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" /> : <Icon className="h-4 w-4 text-primary" aria-hidden="true" />}
    <span>{label}</span>
  </button>
);