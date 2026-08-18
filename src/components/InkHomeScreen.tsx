import { useState, memo, useCallback, useEffect, type ReactNode } from 'react';
import {
  Bell,
  Check,
  Copy,
  Hash,
  Keyboard,
  LogIn,
  Play,
  Settings,
  Trash2,
  User,
  UsersRound,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { useRecentLobbies } from '@/hooks/useRecentLobbies';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { GAME_MODE_META, INK_GAME_MODE_ORDER, type LobbyGameMode } from '@/lib/gameModes';
import { DeviceSettings } from '@/components/DeviceSettings';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkQuestsPanel } from '@/components/InkQuestsPanel';
import { InkChatColorPicker } from '@/components/InkChatColorPicker';
import { InkDrawer, InkModal } from '@/components/menu/InkOverlay';
import { InkPatchNoteModal, CURRENT_VERSION } from '@/components/InkPatchNoteModal';
import { InkShortcutsModal } from '@/components/InkShortcutsModal';
import { NotificationCenter } from '@/components/NotificationCenter';
import {
  FlatAvatar,
  FlatButton,
  FlatIconButton,
  FlatImage,
  FlatLabel,
  FlatPanel,
  FlatTile,
} from '@/components/ink/InkFlat';
import { toast } from 'sonner';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

interface GameModeInfo {
  id: LobbyGameMode;
  name: string;
  shortLabel: string;
  tagline: string;
  description: string;
  minPlayers: number;
  imageCandidates: string[];
  fallbackEmoji: string;
}

/**
 * Home mode list. Derived from GAME_MODE_META (single source of truth) via
 * INK_GAME_MODE_ORDER so the home and the lobby always offer the same modes.
 */
const GAME_MODES: GameModeInfo[] = INK_GAME_MODE_ORDER.map((id) => {
  const meta = GAME_MODE_META[id];
  return {
    id,
    name: meta.label,
    shortLabel: meta.shortLabel,
    tagline: meta.tagline,
    description: meta.description,
    minPlayers: meta.minPlayers,
    imageCandidates: meta.imageCandidates,
    fallbackEmoji: meta.fallbackEmoji,
  };
});

/** Headerless overlay used for panels that already render their own header. */
const BareOverlay = ({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  label: string;
  children: ReactNode;
}) => (
  <div className="ink-z-modal fixed inset-0 flex items-center justify-center p-4">
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="absolute inset-0 h-full w-full cursor-default bg-black/70"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="menu-dialog menu-dialog-safe if-panel if-fade relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden"
    >
      {children}
    </div>
  </div>
);

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile, friendCode } = useAuth();
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem('playerName') ?? ''; } catch { return ''; }
  });
  const [lobbyCode, setLobbyCode] = useState(() => {
    try { return sessionStorage.getItem('mimic.joinCode') ?? ''; } catch { return ''; }
  });
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPatchNote, setShowPatchNote] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false);
  const [modeIndex, setModeIndex] = useState(1); // Audio Phone by default
  const [codeCopied, setCodeCopied] = useState(false);
  const { play, volume, setVolume } = useBackgroundMusic();
  const { level } = usePlayerLevel();
  const isMuted = volume === 0;
  const {
    recent: recentLobbies,
    pushLobby: pushRecentLobby,
    removeLobby: removeRecentLobby,
  } = useRecentLobbies();

  const selectedMode = GAME_MODES[modeIndex];

  /** Select a mode by index, wrapping around at both ends. */
  const goToMode = useCallback((next: number) => {
    const len = GAME_MODES.length;
    setModeIndex(((next % len) + len) % len);
  }, []);

  const toggleMute = useCallback(() => {
    if (volume === 0) setVolume(0.5);
    else setVolume(0);
  }, [volume, setVolume]);

  // Auto-fill lobby code from URL query param (?code=ABCD or ?lobby=ABCD)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const param = url.searchParams.get('code') || url.searchParams.get('lobby');
      if (param) {
        const cleaned = param.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        if (cleaned.length === 4) {
          setLobbyCode(cleaned);
          setShowJoinDialog(true);
          // Clean the URL so it doesn't reopen on refresh
          url.searchParams.delete('code');
          url.searchParams.delete('lobby');
          window.history.replaceState({}, '', url.toString());
          toast.success('Code lobby détecté !', {
            description: `Code ${cleaned} pré-rempli`,
          });
        }
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  // Keep the identity used by invitations and restore unfinished join codes.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const name = playerName.trim();
        if (name) localStorage.setItem('playerName', name);
        else localStorage.removeItem('playerName');
      } catch { /* storage can be disabled */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [playerName]);

  useEffect(() => {
    try {
      if (lobbyCode) sessionStorage.setItem('mimic.joinCode', lobbyCode);
      else sessionStorage.removeItem('mimic.joinCode');
    } catch { /* storage can be disabled */ }
  }, [lobbyCode]);

  // Notification centre can request opening the friends drawer (invites /
  // friend requests are handled there).
  useEffect(() => {
    const openFriends = () => setShowFriendsDrawer(true);
    window.addEventListener('mimic:open-friends', openFriends);
    return () => window.removeEventListener('mimic:open-friends', openFriends);
  }, []);

  const anyModalOpen =
    showJoinDialog ||
    showSettings ||
    showPatchNote ||
    showShortcuts ||
    showProfileDrawer ||
    showFriendsDrawer;

  // Global keyboard shortcuts on the home screen
  useKeyboardShortcuts([
    {
      key: 'Escape',
      enabled: anyModalOpen,
      handler: () => {
        if (showShortcuts) setShowShortcuts(false);
        else if (showJoinDialog) setShowJoinDialog(false);
        else if (showSettings) setShowSettings(false);
        else if (showPatchNote) setShowPatchNote(false);
        else if (showProfileDrawer) setShowProfileDrawer(false);
        else if (showFriendsDrawer) setShowFriendsDrawer(false);
      },
      label: 'Fermer la modale',
    },
    {
      key: '?',
      shift: true,
      enabled: !anyModalOpen,
      handler: () => setShowShortcuts(true),
      label: 'Afficher les raccourcis',
    },
    {
      key: 'm',
      enabled: !anyModalOpen,
      handler: () => {
        toggleMute();
        toast(isMuted ? 'Son activé' : 'Son coupé', { duration: 1500 });
      },
      label: 'Couper / activer le son',
    },
    {
      key: 's',
      enabled: !anyModalOpen,
      handler: () => setShowSettings(true),
      label: 'Ouvrir les paramètres',
    },
    {
      key: 'c',
      enabled: !anyModalOpen && !!friendCode,
      handler: () => {
        if (!friendCode) return;
        navigator.clipboard.writeText(friendCode).catch(() => {});
        toast.success('Code ami copié !');
      },
      label: 'Copier le code ami',
    },
    {
      key: 'j',
      enabled: !anyModalOpen && !!playerName.trim(),
      handler: () => {
        playInkSound('brushTap', 0.3);
        setShowJoinDialog(true);
      },
      label: 'Rejoindre une partie',
    },
    {
      key: 'Enter',
      enabled: !anyModalOpen && !!playerName.trim(),
      handler: () => {
        playInkSound('inkSuccess', 0.5);
        play();
        onCreateGame(playerName.trim(), selectedMode.id);
      },
      label: 'Lancer la partie',
    },
    {
      key: 'ArrowLeft',
      enabled: !anyModalOpen,
      handler: () => {
        playInkSound('brushTap', 0.25);
        goToMode((modeIndex - 1 + GAME_MODES.length) % GAME_MODES.length);
      },
      label: 'Mode précédent',
    },
    {
      key: 'ArrowRight',
      enabled: !anyModalOpen,
      handler: () => {
        playInkSound('brushTap', 0.25);
        goToMode((modeIndex + 1) % GAME_MODES.length);
      },
      label: 'Mode suivant',
    },
  ]);

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onCreateGame(playerName.trim(), selectedMode.id);
    }
  }, [playerName, play, onCreateGame, selectedMode.id]);

  const handleJoinGame = useCallback(() => {
    const code = lobbyCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (playerName.trim() && code.length === 4) {
      play();
      playInkSound('inkSuccess', 0.5);
      pushRecentLobby(code);
      try { sessionStorage.removeItem('mimic.joinCode'); } catch { /* storage can be disabled */ }
      onJoinGame(playerName.trim(), code);
    }
  }, [playerName, lobbyCode, play, onJoinGame, pushRecentLobby]);

  const handleCopyFriendCode = useCallback(async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCodeCopied(true);
    playInkSound('inkSuccess', 0.4);
    setTimeout(() => setCodeCopied(false), 1500);
  }, [friendCode]);

  const nameReady = !!playerName.trim();
  const joinReady = nameReady && lobbyCode.trim().length === 4;
  const displayName = profile?.display_name || playerName || 'Joueur';

  return (
    <div className="ibs-shell if-root menu-surface menu-screen-safe flex h-screen w-full flex-col overflow-hidden">
      {/* ============== TOP BAR ============== */}
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--ink-line)] px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => {
            playInkSound('inkClick', 0.3);
            setShowProfileDrawer(true);
          }}
          className="if-row menu-focus -ml-2 min-w-0"
        >
          <FlatAvatar name={displayName} src={profile?.avatar_url ?? undefined} />
          <span className="min-w-0 text-left">
            <span className="block max-w-[150px] truncate text-sm font-semibold">
              {displayName}
            </span>
            <span className="if-mute block text-xs">Niveau {level}</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="if-mute mr-1 hidden text-sm font-semibold tracking-tight sm:block">
            MIMIC MASTER
          </span>
          <NotificationCenter />
          <FlatIconButton
            label="Mes amis"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowFriendsDrawer(true);
            }}
          >
            <UsersRound className="h-4 w-4" />
          </FlatIconButton>
          <FlatIconButton
            label="Social"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              window.dispatchEvent(new CustomEvent('mimic:open-social'));
            }}
          >
            <Bell className="h-4 w-4" />
          </FlatIconButton>
          <FlatIconButton
            label="Paramètres"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowSettings(true);
            }}
          >
            <Settings className="h-4 w-4" />
          </FlatIconButton>
        </div>
      </header>

      {/* ============== MAIN ============== */}
      <main className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4">
          {/* Identity + actions */}
          <FlatPanel className="p-5">
            <label htmlFor="ink-player-name" className="if-label mb-2 block">
              Ton pseudo
            </label>
            <input
              id="ink-player-name"
              className="if-input"
              placeholder="Entre ton pseudo"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
            />

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <FlatButton
                variant="primary"
                size="lg"
                block
                disabled={!nameReady}
                onClick={handleCreateGame}
                icon={<Play className="h-4 w-4" />}
              >
                Créer une partie
              </FlatButton>
              <FlatButton
                variant="neutral"
                size="lg"
                block
                disabled={!nameReady}
                onClick={() => {
                  playInkSound('brushTap', 0.3);
                  setShowJoinDialog(true);
                }}
                icon={<LogIn className="h-4 w-4" />}
              >
                Rejoindre avec un code
              </FlatButton>
            </div>

            {!nameReady && (
              <p className="if-mute mt-3 text-xs">
                Choisis un pseudo pour créer ou rejoindre une partie.
              </p>
            )}
          </FlatPanel>

          {/* Mode picker */}
          <FlatPanel className="p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <FlatLabel>Mode de jeu</FlatLabel>
              <span className="if-mute text-xs">
                {selectedMode.minPlayers}+ joueurs
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {GAME_MODES.map((mode, idx) => (
                <FlatTile
                  key={mode.id}
                  selected={idx === modeIndex}
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    goToMode(idx);
                  }}
                  title={mode.shortLabel}
                  subtitle={mode.tagline}
                  art={
                    <FlatImage
                      candidates={mode.imageCandidates}
                      alt=""
                      fallback={<span aria-hidden="true">{mode.fallbackEmoji}</span>}
                    />
                  }
                  trailing={
                    idx === modeIndex ? (
                      <Check
                        className="h-4 w-4 flex-shrink-0 text-[var(--ink-accent)]"
                        aria-hidden="true"
                      />
                    ) : null
                  }
                />
              ))}
            </div>

            <p className="if-muted mt-3 text-sm">{selectedMode.description}</p>
          </FlatPanel>
        </div>
      </main>

      {/* ============== FOOTER ============== */}
      <footer className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--ink-line)] px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          {friendCode && (
            <button
              type="button"
              onClick={handleCopyFriendCode}
              className="if-btn if-btn--ghost if-btn--sm menu-focus"
              title="Copier mon code ami"
            >
              <FlatLabel>Code ami</FlatLabel>
              <span className="font-mono text-sm font-bold tracking-wider text-[var(--ink-text)]">
                {friendCode}
              </span>
              {codeCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <FlatIconButton
            label={isMuted ? 'Activer le son' : 'Couper le son'}
            className="h-9 w-9 min-w-0 border-transparent"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              toggleMute();
            }}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </FlatIconButton>
          <FlatIconButton
            label="Raccourcis clavier"
            className="h-9 w-9 min-w-0 border-transparent"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowShortcuts(true);
            }}
          >
            <Keyboard className="h-4 w-4" />
          </FlatIconButton>
          <button
            type="button"
            onClick={() => {
              playInkSound('brushTap', 0.2);
              setShowPatchNote(true);
            }}
            className="if-btn if-btn--ghost if-btn--sm menu-focus"
          >
            v{CURRENT_VERSION}
          </button>
        </div>
      </footer>

      {/* ============== PROFILE DRAWER ============== */}
      <InkDrawer
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        side="left"
        title="Mon profil"
        subtitle={`Niveau ${level}`}
        icon={<User className="h-5 w-5" />}
      >
        <div className="flex flex-col gap-3">
          <InkProfileSidebar />
          <InkQuestsPanel />
          <InkChatColorPicker />
        </div>
      </InkDrawer>

      {/* ============== FRIENDS DRAWER ============== */}
      <InkDrawer
        isOpen={showFriendsDrawer}
        onClose={() => setShowFriendsDrawer(false)}
        title="Mes amis"
        icon={<UsersRound className="h-5 w-5" />}
      >
        <InkFriendsSidebar
          onJoinFriend={(code) => {
            setLobbyCode(code);
            setShowFriendsDrawer(false);
            if (playerName.trim()) {
              onJoinGame(playerName.trim(), code);
            }
          }}
        />
      </InkDrawer>

      {/* ============== JOIN DIALOG ============== */}
      <InkModal
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        title="Rejoindre une partie"
        subtitle="Code à 4 caractères"
        icon={<Hash className="h-5 w-5" />}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinGame();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="ink-lobby-code" className="if-label mb-2 block">
              Code du lobby
            </label>
            <input
              id="ink-lobby-code"
              data-autofocus
              className="if-input if-code-input"
              placeholder="XXXX"
              value={lobbyCode}
              onChange={(e) =>
                setLobbyCode(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
                )
              }
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {recentLobbies.length > 0 && (
            <div>
              <FlatLabel className="mb-2 block">Lobbies récents</FlatLabel>
              <ul className="flex flex-col gap-1">
                {recentLobbies.map((it) => (
                  <li key={it.code} className="if-row justify-between gap-2 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLobbyCode(it.code);
                        playInkSound('brushTap', 0.3);
                      }}
                      className="menu-focus flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left"
                    >
                      <span className="font-mono text-sm font-bold tracking-widest">
                        {it.code}
                      </span>
                      <span className="if-mute truncate text-xs">
                        {new Date(it.joinedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </button>
                    <FlatIconButton
                      label={`Supprimer le lobby récent ${it.code}`}
                      className="h-8 w-8 min-w-0 border-transparent"
                      onClick={() => removeRecentLobby(it.code)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </FlatIconButton>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <FlatButton
              variant="ghost"
              block
              onClick={() => setShowJoinDialog(false)}
              icon={<X className="h-4 w-4" />}
            >
              Annuler
            </FlatButton>
            <FlatButton variant="primary" type="submit" block disabled={!joinReady}>
              Rejoindre
            </FlatButton>
          </div>

          {!joinReady && lobbyCode.length > 0 && (
            <p className="if-mute text-xs">Le code doit contenir 4 caractères.</p>
          )}
        </form>
      </InkModal>

      {/* ============== SETTINGS ============== */}
      {showSettings && (
        <BareOverlay label="Paramètres" onClose={() => setShowSettings(false)}>
          <div className="flex min-h-0 flex-1 flex-col">
            <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
          </div>
        </BareOverlay>
      )}

      {/* ============== PATCH NOTE ============== */}
      <InkPatchNoteModal forceOpen={showPatchNote} onClose={() => setShowPatchNote(false)} />

      {/* ============== SHORTCUTS ============== */}
      <InkShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        extra={[
          { keys: ['M'], label: 'Couper / activer le son' },
          { keys: ['S'], label: 'Ouvrir les paramètres' },
          { keys: ['C'], label: 'Copier le code ami' },
          { keys: ['J'], label: 'Rejoindre une partie' },
          { keys: ['←'], label: 'Mode précédent' },
          { keys: ['→'], label: 'Mode suivant' },
          { keys: ['Enter'], label: 'Lancer la partie' },
        ]}
      />
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
