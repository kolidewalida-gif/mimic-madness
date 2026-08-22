import { useState, memo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Check,
  Copy,
  Crown,
  Gift,
  Hash,
  Keyboard,
  LogIn,
  Palette,
  Play,
  Settings,
  Share2,
  Target,
  Trash2,
  User,
  UsersRound,
  Volume2,
  VolumeX,
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
import { InkDrawer, InkMenuTile, InkModal, InkSection } from '@/components/menu/InkOverlay';
import { TitleSelector } from '@/components/TitleSelector';
import { AchievementsPanel } from '@/components/AchievementsPanel';
import { RewardsPanel } from '@/components/RewardsPanel';
import { InkPatchNoteModal, CURRENT_VERSION } from '@/components/InkPatchNoteModal';
import { InkShortcutsModal } from '@/components/InkShortcutsModal';
import { NotificationCenter } from '@/components/NotificationCenter';
import {
  GameAvatar,
  GameBackdrop,
  GameButton,
  GameIconButton,
  GameImage,
  GameInput,
  GameLabel,
  GameLogo,
  GameTag,
  ModeChip,
  ModeHero,
  ModeShelf,
} from '@/components/game-ui/GameUI';
import { toast } from 'sonner';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
  onOpenSocial: () => void;
  isSocialOpen: boolean;
}

interface GameModeInfo {
  id: LobbyGameMode;
  name: string;
  tagline: string;
  description: string;
  minPlayers: number;
  accent: string;
  imageCandidates: string[];
  fallbackEmoji: string;
}

/**
 * Home mode list, derived from GAME_MODE_META (single source of truth) via
 * INK_GAME_MODE_ORDER so home and lobby always offer the same modes.
 */
const GAME_MODES: GameModeInfo[] = INK_GAME_MODE_ORDER.map((id) => {
  const meta = GAME_MODE_META[id];
  return {
    id,
    name: meta.label,
    tagline: meta.tagline,
    description: meta.description,
    minPlayers: meta.minPlayers,
    accent: meta.accent,
    imageCandidates: meta.imageCandidates,
    fallbackEmoji: meta.fallbackEmoji,
  };
});

const InkHomeScreenComponent = ({
  onCreateGame,
  onJoinGame,
  onOpenSocial,
  isSocialOpen,
}: InkHomeScreenProps) => {
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
  /*
   * Destinations du pôle profil. L'état vit ici et non dans
   * `InkProfileSidebar` : ces tiroirs y étaient montés *à l'intérieur* du
   * tiroir profil, au même z-index, si bien que deux gestionnaires d'Échap
   * concurrents pouvaient fermer les deux d'un coup.
   */
  const [showQuests, setShowQuests] = useState(false);
  const [showChatColor, setShowChatColor] = useState(false);
  const [showTitles, setShowTitles] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  /** Quitte le pôle pour une destination : un seul tiroir ouvert à la fois. */
  const goFromProfile = useCallback((open: (value: boolean) => void) => {
    playInkSound('inkClick', 0.3);
    setShowProfileDrawer(false);
    open(true);
  }, []);

  /** Revient au pôle en fermant la destination, pour ne pas perdre le fil. */
  const backToProfile = useCallback((close: (value: boolean) => void) => {
    close(false);
    setShowProfileDrawer(true);
  }, []);

  /*
   * Les réglages ont deux points d'entrée : le bouton de l'en-tête, doublé du
   * raccourci « s », et la grille de menus du profil. On retient l'origine pour
   * que « fermer » ne ramène au profil que dans le second cas.
   */
  const [settingsFromProfile, setSettingsFromProfile] = useState(false);

  const openSettings = useCallback(() => {
    setSettingsFromProfile(false);
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    if (settingsFromProfile) {
      setSettingsFromProfile(false);
      setShowProfileDrawer(true);
    }
  }, [settingsFromProfile]);
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

  /* Friend-related notifications still open the dedicated Ink drawer. Comment
   * notifications are handled by Index and now open Social Studio itself. */
  useEffect(() => {
    const openFriends = () => setShowFriendsDrawer(true);
    window.addEventListener('mimic:open-friends', openFriends);
    return () => window.removeEventListener('mimic:open-friends', openFriends);
  }, []);

  /*
   * Sert uniquement à museler les raccourcis à lettre unique pendant qu'un
   * dialogue est ouvert : sans ça, taper « s » dans un champ de texte
   * rouvrirait les réglages par-dessus.
   */
  const anyModalOpen =
    isSocialOpen ||
    showJoinDialog ||
    showSettings ||
    showPatchNote ||
    showShortcuts ||
    showProfileDrawer ||
    showFriendsDrawer ||
    showQuests ||
    showChatColor ||
    showTitles ||
    showAchievements ||
    showRewards;

  /*
   * La branche « Escape » qui vivait ici a été retirée. Elle rejouait à la main
   * une cascade de fermetures que `useDialogBehaviour` assure déjà pour chaque
   * `InkDrawer` / `InkModal`, en plus du piège de focus et du retour du focus au
   * déclencheur. Elle n'existait que parce que les réglages passaient par
   * `GameModal`, qui n'a pas de gestion d'Échap ; ils utilisent maintenant
   * `InkModal` comme les autres.
   */
  useKeyboardShortcuts([
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
      handler: openSettings,
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
    <div
      className="ibs-shell if-root menu-surface menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
      style={{ ['--accent' as string]: selectedMode.accent }}
    >
      <GameBackdrop src="/home/background.png" />

      {/* ============== HEADER — logo left, actions right ============== */}
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
        <GameLogo />

        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
          <NotificationCenter />
          <GameIconButton
            label="Mes amis"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowFriendsDrawer(true);
            }}
          >
            <UsersRound className="h-[18px] w-[18px]" />
          </GameIconButton>
          <GameButton
            variant="neutral"
            size="sm"
            onClick={() => {
              playInkSound('brushTap', 0.3);
              onOpenSocial();
            }}
            icon={<Share2 className="h-4 w-4" />}
          >
            Social
          </GameButton>
          <GameIconButton
            label="Paramètres"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              openSettings();
            }}
          >
            <Settings className="h-[18px] w-[18px]" />
          </GameIconButton>
          <button
            type="button"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowProfileDrawer(true);
            }}
            className="if-row menu-focus min-w-0 pl-1 pr-2.5"
          >
            <GameAvatar name={displayName} src={profile?.avatar_url ?? undefined} />
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[130px] truncate text-sm font-semibold">
                {displayName}
              </span>
              <span className="if-mute block text-xs">Niveau {level}</span>
            </span>
          </button>
        </div>
      </header>

      {/* ============== MAIN ==============
          Wide focal panel + side rail, then the mode shelf across the full
          width. pb-32 clears the floating music bar. */}
      <main className="custom-scrollbar relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 pb-28 sm:px-8 [justify-content:safe_center]">
        {/* Rails publicitaires : dans les grandes marges latérales vides, donc
            jamais au-dessus du contenu jouable. Masqués sous 1440px. */}
        <AdSlot
          slot={import.meta.env.VITE_ADSENSE_SLOT_RAIL_LEFT}
          format="vertical"
          className="pointer-events-auto absolute left-6 top-1/2 hidden h-[600px] w-[160px] -translate-y-1/2 [@media(min-width:1440px)]:flex"
        />
        <AdSlot
          slot={import.meta.env.VITE_ADSENSE_SLOT_RAIL_RIGHT}
          format="vertical"
          className="pointer-events-auto absolute right-6 top-1/2 hidden h-[600px] w-[160px] -translate-y-1/2 [@media(min-width:1440px)]:flex"
        />
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">

          {/* One focal panel: the selected mode and everything needed to play
              it. Splitting these into two side-by-side cards is what left a
              large void inside the panel. */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
          >
            <ModeHero
              name={selectedMode.name}
              tagline={selectedMode.tagline}
              description={selectedMode.description}
              accent={selectedMode.accent}
              meta={
                <>
                  <GameTag accent={selectedMode.accent}>
                    {selectedMode.minPlayers}+ joueurs
                  </GameTag>
                  <span className="if-mute text-xs">
                    Mode {modeIndex + 1} sur {GAME_MODES.length}
                  </span>
                </>
              }
              art={
                <GameImage
                  candidates={selectedMode.imageCandidates}
                  alt=""
                  fallback={<span aria-hidden="true">{selectedMode.fallbackEmoji}</span>}
                />
              }
              aside={
                <div className="gm-hero-actions">
                  <label
                    htmlFor="ink-player-name"
                    className="if-label mb-1.5 flex items-center gap-1.5"
                  >
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                    Ton pseudo
                  </label>
                  <GameInput
                    id="ink-player-name"
                    placeholder="Entre ton pseudo"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    autoComplete="nickname"
                  />

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <GameButton
                      variant="primary"
                      size="xl"
                      accent={selectedMode.accent}
                      className="flex-1"
                      disabled={!nameReady}
                      onClick={handleCreateGame}
                      icon={<Play className="h-5 w-5" fill="currentColor" />}
                    >
                      Créer la partie
                    </GameButton>
                    <GameButton
                      variant="neutral"
                      size="xl"
                      className="sm:w-auto"
                      disabled={!nameReady}
                      onClick={() => {
                        playInkSound('brushTap', 0.3);
                        setShowJoinDialog(true);
                      }}
                      icon={<LogIn className="h-[18px] w-[18px]" />}
                    >
                      Rejoindre
                    </GameButton>
                  </div>

                  {!nameReady && (
                    <p className="if-mute mt-2 text-xs">
                      Entre un pseudo pour commencer.
                    </p>
                  )}
                </div>
              }
            />
          </motion.div>

          {/* Mode shelf — one row, so seven modes never leave a gap */}
          <div className="flex-shrink-0">
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <GameLabel>Choisis ton mode</GameLabel>
              <span className="if-mute text-xs">
                Flèches ← → pour naviguer
              </span>
            </div>

            <ModeShelf label="Modes de jeu">
              {GAME_MODES.map((mode, idx) => (
                <ModeChip
                  key={mode.id}
                  name={mode.name}
                  accent={mode.accent}
                  selected={idx === modeIndex}
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    goToMode(idx);
                  }}
                  art={
                    <GameImage
                      candidates={mode.imageCandidates}
                      alt=""
                      fallback={<span aria-hidden="true">{mode.fallbackEmoji}</span>}
                    />
                  }
                />
              ))}
            </ModeShelf>
          </div>
        </div>
      </main>

      {/* ============== FOOTER ============== */}
      <footer className="flex flex-shrink-0 items-center justify-between gap-2 px-4 py-1.5 sm:px-8">
        {friendCode ? (
          <button
            type="button"
            onClick={handleCopyFriendCode}
            className="if-btn if-btn--ghost if-btn--sm menu-focus"
            title="Copier mon code ami"
          >
            <span className="if-label">Code ami</span>
            <span className="font-mono text-sm font-bold tracking-wider text-[var(--ink-text)]">
              {friendCode}
            </span>
            {codeCopied ? (
              <Check className="h-3.5 w-3.5 text-[var(--c-green)]" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1">
          <GameIconButton
            label={isMuted ? 'Activer le son' : 'Couper le son'}
            className="h-9 w-9 min-w-0 border-transparent bg-transparent"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              toggleMute();
            }}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </GameIconButton>
          <GameIconButton
            label="Raccourcis clavier"
            className="h-9 w-9 min-w-0 border-transparent bg-transparent"
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowShortcuts(true);
            }}
          >
            <Keyboard className="h-4 w-4" />
          </GameIconButton>
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

      {/* ============== PROFILE DRAWER — pôle de navigation ==============
          Auparavant trois cartes autonomes empilées dans un seul tiroir, avec
          quatre styles de titre, une zone de défilement imbriquée dans une
          autre, et trois destinations atteignables seulement en fouillant la
          carte de profil. Chaque fonction a maintenant son tiroir, ouvert
          depuis une grille lisible. */}
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

          <InkSection title="Mes menus" hint="Tout est ici, à un clic.">
            <div className="grid grid-cols-2 gap-2">
              <InkMenuTile
                icon={<Target className="h-4 w-4" />}
                label="Quêtes"
                hint="Défis du jour"
                accent="var(--c-green)"
                onClick={() => goFromProfile(setShowQuests)}
              />
              <InkMenuTile
                icon={<Crown className="h-4 w-4" />}
                label="Titres"
                hint="Sous ton pseudo"
                accent="var(--c-violet)"
                onClick={() => goFromProfile(setShowTitles)}
              />
              <InkMenuTile
                icon={<Award className="h-4 w-4" />}
                label="Succès"
                hint="Badges obtenus"
                accent="var(--c-yellow)"
                onClick={() => goFromProfile(setShowAchievements)}
              />
              <InkMenuTile
                icon={<Gift className="h-4 w-4" />}
                label="Récompenses"
                hint="Par niveau"
                accent="var(--c-coral)"
                onClick={() => goFromProfile(setShowRewards)}
              />
              <InkMenuTile
                icon={<Palette className="h-4 w-4" />}
                label="Couleur du chat"
                hint="Ta couleur de message"
                accent="var(--c-cyan)"
                onClick={() => goFromProfile(setShowChatColor)}
              />
              <InkMenuTile
                icon={<Settings className="h-4 w-4" />}
                label="Paramètres"
                hint="Micro, caméra, son"
                accent="var(--c-blue)"
                onClick={() => {
                  setSettingsFromProfile(true);
                  goFromProfile(setShowSettings);
                }}
              />
            </div>
          </InkSection>
        </div>
      </InkDrawer>

      {/* Les destinations du pôle. Chacune revient au profil en se fermant,
          pour que « fermer » ne renvoie jamais l'utilisateur au néant. */}
      <InkDrawer
        isOpen={showQuests}
        onClose={() => backToProfile(setShowQuests)}
        side="left"
        title="Quêtes"
        subtitle="Défis du jour et de la semaine"
        icon={<Target className="h-5 w-5" />}
      >
        <InkQuestsPanel />
      </InkDrawer>

      <InkDrawer
        isOpen={showChatColor}
        onClose={() => backToProfile(setShowChatColor)}
        side="left"
        title="Couleur du chat"
        subtitle={`Niveau ${level}`}
        icon={<Palette className="h-5 w-5" />}
      >
        <InkChatColorPicker />
      </InkDrawer>

      <TitleSelector isOpen={showTitles} onClose={() => backToProfile(setShowTitles)} />
      <AchievementsPanel
        isOpen={showAchievements}
        onClose={() => backToProfile(setShowAchievements)}
      />
      <RewardsPanel isOpen={showRewards} onClose={() => backToProfile(setShowRewards)} />

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
            <GameInput
              id="ink-lobby-code"
              code
              data-autofocus
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
              <GameLabel className="mb-2 block">Lobbies récents</GameLabel>
              <ul className="flex flex-col gap-1">
                {recentLobbies.map((it) => (
                  <li key={it.code} className="if-row justify-between gap-2 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLobbyCode(it.code);
                        playInkSound('brushTap', 0.3);
                      }}
                      className="menu-focus flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left"
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
                    <GameIconButton
                      label={`Supprimer le lobby récent ${it.code}`}
                      className="h-8 w-8 min-w-0 border-transparent bg-transparent"
                      onClick={() => removeRecentLobby(it.code)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </GameIconButton>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <GameButton variant="ghost" block onClick={() => setShowJoinDialog(false)}>
              Annuler
            </GameButton>
            <GameButton variant="primary" type="submit" block disabled={!joinReady}>
              Rejoindre
            </GameButton>
          </div>

          {!joinReady && lobbyCode.length > 0 && (
            <p className="if-mute text-xs">Le code doit contenir 4 caractères.</p>
          )}
        </form>
      </InkModal>

      {/* ============== SETTINGS ==============
          `InkModal` et non plus `GameModal` : ce dernier n'offre ni fermeture au
          clavier, ni piège de focus, ni bouton de fermeture visible. Les
          réglages étaient le seul dialogue de l'accueil dans ce cas. */}
      <InkModal
        isOpen={showSettings}
        onClose={closeSettings}
        title="Paramètres"
        subtitle="Micro, caméra et son"
        icon={<Settings className="h-5 w-5" />}
      >
        <DeviceSettings showPreview onClose={closeSettings} />
      </InkModal>

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
