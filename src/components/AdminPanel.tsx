import { useCallback, useState, memo, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  X,
  Gift,
  Zap,
  ChevronUp,
  Loader2,
  Ban,
  Megaphone,
  Gamepad2,
  type LucideIcon,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDialogBehaviour } from '@/components/menu/InkOverlay';
import {
  AdminAnnouncementsTab,
  AdminBansTab,
  AdminLobbiesTab,
} from './AdminSuperPanel';

type AdminTab = 'account' | 'bans' | 'announce' | 'lobbies';

interface AdminTabDefinition {
  id: AdminTab;
  label: string;
  mobileLabel: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const TABS: AdminTabDefinition[] = [
  {
    id: 'account',
    label: 'Compte',
    mobileLabel: 'Compte',
    title: 'Compte administrateur',
    description: 'Progression, récompenses et données de test de ton compte.',
    icon: Shield,
    accent: 'var(--c-violet)',
  },
  {
    id: 'bans',
    label: 'Modération',
    mobileLabel: 'Bans',
    title: 'Modération des joueurs',
    description: 'Recherche un joueur, applique une sanction ou lève un ban actif.',
    icon: Ban,
    accent: 'var(--c-coral)',
  },
  {
    id: 'announce',
    label: 'Annonces',
    mobileLabel: 'Annonces',
    title: 'Annonces globales',
    description: 'Diffuse un message à tous les joueurs et gère les annonces récentes.',
    icon: Megaphone,
    accent: 'var(--c-yellow)',
  },
  {
    id: 'lobbies',
    label: 'Parties actives',
    mobileLabel: 'Parties',
    title: 'Parties actives',
    description: 'Observe les salons en cours ou rejoins-les avec les droits admin.',
    icon: Gamepad2,
    accent: 'var(--c-green)',
  },
];

export const AdminPanel = () => {
  const {
    isAdmin,
    isLoading,
    giveAllRewards,
    giveAllAchievements,
    setLevel,
    setStats,
  } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('account');
  const [busyAction, setBusyAction] = useState<'rewards' | 'level' | 'stats' | null>(null);
  const [levelInput, setLevelInput] = useState('30');

  const handleClose = useCallback(() => setIsOpen(false), []);
  const panelRef = useDialogBehaviour(isOpen, handleClose);
  useBodyScrollLock(isOpen);

  const handleGiveAll = useCallback(async () => {
    if (busyAction) return;
    setBusyAction('rewards');
    try {
      const [rewards, achievements] = await Promise.all([
        giveAllRewards(),
        giveAllAchievements(),
      ]);
      if (rewards && achievements) {
        toast.success('Toutes les récompenses et succès sont débloqués.');
      } else {
        toast.error('Déblocage partiel.');
      }
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, giveAllAchievements, giveAllRewards]);

  const handleSetLevel = useCallback(async () => {
    if (busyAction) return;
    const level = parseInt(levelInput, 10);
    if (!Number.isFinite(level) || level < 1 || level > 30) {
      toast.error('Niveau invalide : choisis une valeur entre 1 et 30.');
      return;
    }
    setBusyAction('level');
    try {
      (await setLevel(level))
        ? toast.success(`Niveau défini à ${level}`)
        : toast.error('Erreur de niveau.');
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, levelInput, setLevel]);

  const handleMaxStats = useCallback(async () => {
    if (busyAction) return;
    setBusyAction('stats');
    try {
      const ok = await setStats({
        games_played: 999,
        games_won: 888,
        current_streak: 50,
        best_streak: 50,
        games_hosted: 200,
        messages_sent: 5000,
        recordings_made: 500,
        quiz_games: 300,
        audio_phone_games: 200,
        standard_games: 200,
      });
      ok ? toast.success('Statistiques maximisées.') : toast.error('Erreur de statistiques.');
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, setStats]);

  if (isLoading || !isAdmin) return null;

  const activeDefinition = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const ActiveIcon = activeDefinition.icon;
  const accentStyle = {
    '--admin-accent': activeDefinition.accent,
  } as CSSProperties;

  const renderNavigation = (mobile: boolean) => (
    <nav
      className={mobile ? 'admin-mobile-nav' : 'admin-nav'}
      aria-label="Sections administrateur"
      aria-orientation={mobile ? 'horizontal' : 'vertical'}
      role="tablist"
    >
      {TABS.map((tab, index) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            tabIndex={active ? 0 : -1}
            aria-selected={active}
            aria-controls="admin-active-panel"
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => {
              let nextIndex: number | null = null;
              if (event.key === 'Home') nextIndex = 0;
              if (event.key === 'End') nextIndex = TABS.length - 1;
              if ((mobile && event.key === 'ArrowLeft') || (!mobile && event.key === 'ArrowUp')) {
                nextIndex = (index - 1 + TABS.length) % TABS.length;
              }
              if ((mobile && event.key === 'ArrowRight') || (!mobile && event.key === 'ArrowDown')) {
                nextIndex = (index + 1) % TABS.length;
              }
              if (nextIndex === null) return;

              event.preventDefault();
              setActiveTab(TABS[nextIndex].id);
              const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              tabs?.[nextIndex]?.focus();
            }}
            className={cn('admin-nav-item menu-focus', active && 'is-active')}
            style={{ '--admin-accent': tab.accent } as CSSProperties}
          >
            <span className="admin-nav-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="admin-nav-copy">
              <strong>{mobile ? tab.mobileLabel : tab.label}</strong>
              {!mobile && <small>{tab.description}</small>}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="admin-launcher menu-focus"
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
          left: 'max(1rem, env(safe-area-inset-left, 0px))',
        }}
        aria-label={isOpen ? 'Fermer le panneau administrateur' : 'Ouvrir le panneau administrateur'}
        aria-expanded={isOpen}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
      >
        <Shield aria-hidden="true" />
        <span>Admin</span>
      </motion.button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="admin-overlay force-cursor">
                <motion.button
                  type="button"
                  className="admin-backdrop"
                  aria-label="Fermer le panneau administrateur"
                  onClick={handleClose}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                <motion.div
                  ref={panelRef}
                  tabIndex={-1}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-panel-title"
                  className="admin-shell menu-dialog"
                  style={accentStyle}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <header className="admin-shell-header">
                    <div className="admin-brand">
                      <span className="admin-brand-icon" aria-hidden="true">
                        <Shield />
                      </span>
                      <div className="min-w-0">
                        <span className="admin-kicker">OUTILS INTERNES</span>
                        <h2 id="admin-panel-title">Administration</h2>
                      </div>
                    </div>
                    <div className="admin-header-actions">
                      <span className="admin-access-badge">ACCÈS ADMIN</span>
                      <button
                        type="button"
                        data-back
                        onClick={handleClose}
                        className="ink-close-button menu-icon-control menu-focus"
                        aria-label="Fermer le panneau administrateur"
                      >
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  </header>

                  <div className="admin-shell-body">
                    <aside className="admin-sidebar">
                      <span className="admin-sidebar-label">NAVIGATION</span>
                      {renderNavigation(false)}
                      <p className="admin-sidebar-note">
                        Les actions s’appliquent immédiatement. Vérifie toujours la cible avant de confirmer.
                      </p>
                    </aside>

                    <main className="admin-workspace">
                      {renderNavigation(true)}
                      <header className="admin-section-header">
                        <span className="admin-section-icon" aria-hidden="true">
                          <ActiveIcon />
                        </span>
                        <div className="min-w-0">
                          <span className="admin-section-kicker">ADMINISTRATION</span>
                          <h3>{activeDefinition.title}</h3>
                          <p>{activeDefinition.description}</p>
                        </div>
                      </header>

                      <section
                        id="admin-active-panel"
                        role="tabpanel"
                        className="admin-content custom-scrollbar"
                        aria-label={activeDefinition.title}
                      >
                        {activeTab === 'account' && (
                          <AccountCommands
                            levelInput={levelInput}
                            onLevelChange={setLevelInput}
                            busyAction={busyAction}
                            onGiveAll={handleGiveAll}
                            onSetLevel={handleSetLevel}
                            onMaxStats={handleMaxStats}
                          />
                        )}
                        {activeTab === 'bans' && <AdminBansTab />}
                        {activeTab === 'announce' && <AdminAnnouncementsTab />}
                        {activeTab === 'lobbies' && <AdminLobbiesTab onClose={handleClose} />}
                      </section>
                    </main>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

const AccountCommands = memo(
  ({
    levelInput,
    onLevelChange,
    busyAction,
    onGiveAll,
    onSetLevel,
    onMaxStats,
  }: {
    levelInput: string;
    onLevelChange: (value: string) => void;
    busyAction: 'rewards' | 'level' | 'stats' | null;
    onGiveAll: () => void;
    onSetLevel: () => void;
    onMaxStats: () => void;
  }) => (
    <div className="admin-account-grid">
      <section className="admin-account-summary admin-card">
        <span className="admin-card-icon" aria-hidden="true">
          <Shield />
        </span>
        <div>
          <span className="admin-card-kicker">COMPTE ADMIN</span>
          <h4>Commandes de progression</h4>
          <p>Ces outils modifient uniquement ton propre compte administrateur.</p>
        </div>
      </section>

      <section className="admin-command-card admin-card">
        <div className="admin-command-heading">
          <span className="admin-card-icon is-reward" aria-hidden="true">
            <Gift />
          </span>
          <div>
            <h4>Récompenses</h4>
            <p>Débloque tous les paliers et les succès disponibles.</p>
          </div>
        </div>
        <AdminButton
          icon={Gift}
          label="Tout débloquer"
          onClick={onGiveAll}
          disabled={busyAction !== null}
          loading={busyAction === 'rewards'}
        />
      </section>

      <section className="admin-command-card admin-card">
        <div className="admin-command-heading">
          <span className="admin-card-icon is-stats" aria-hidden="true">
            <Zap />
          </span>
          <div>
            <h4>Statistiques de test</h4>
            <p>Remplit les statistiques avec des valeurs élevées.</p>
          </div>
        </div>
        <AdminButton
          icon={Zap}
          label="Maximiser les statistiques"
          onClick={onMaxStats}
          disabled={busyAction !== null}
          loading={busyAction === 'stats'}
        />
      </section>

      <section className="admin-level-card admin-card">
        <div className="admin-command-heading">
          <span className="admin-card-icon is-level" aria-hidden="true">
            <ChevronUp />
          </span>
          <div>
            <h4>Niveau du compte</h4>
            <p>Choisis une valeur comprise entre 1 et 30.</p>
          </div>
        </div>
        <div className="admin-level-controls">
          <label htmlFor="admin-level">Niveau</label>
          <input
            id="admin-level"
            type="number"
            min="1"
            max="30"
            value={levelInput}
            onChange={(event) => onLevelChange(event.target.value)}
            className="admin-field admin-level-input"
          />
          <AdminButton
            icon={ChevronUp}
            label={`Définir au niveau ${levelInput}`}
            onClick={onSetLevel}
            disabled={busyAction !== null}
            loading={busyAction === 'level'}
            className="admin-level-submit"
          />
        </div>
      </section>
    </div>
  ),
);
AccountCommands.displayName = 'AccountCommands';

const AdminButton = memo(
  ({
    icon: Icon,
    label,
    onClick,
    disabled,
    loading = false,
    className,
  }: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    disabled: boolean;
    loading?: boolean;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
      className={cn('admin-action-button menu-action menu-focus', className)}
    >
      {loading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Icon aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  ),
);
AdminButton.displayName = 'AdminButton';
