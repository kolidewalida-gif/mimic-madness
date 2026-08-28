import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Link2,
  LogOut,
  MoreVertical,
  Play,
  Settings,
  Share2,
  UserPlus,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAdmin } from '@/hooks/useAdmin';
import { useGameTeams } from '@/hooks/useGameTeams';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  getStartStatus,
  GAME_MODE_META,
  INK_GAME_MODE_ORDER,
  type LobbyGameMode,
} from '@/lib/gameModes';
import { TwitchStyleLobbyChat } from '@/components/TwitchStyleLobbyChat';
import { DeviceSettings } from '@/components/DeviceSettings';
import { LanguageMenu } from '@/components/LanguageMenu';
import { LobbyInvitePanel } from '@/components/LobbyInvitePanel';
import { InkShortcutsModal } from '@/components/InkShortcutsModal';
import { InkBetaLogo, InkBetaMascot } from '@/components/InkBetaBrand';
import { InkModal } from '@/components/menu/InkOverlay';
import {
  GameBackdrop,
  GameButton,
  GameCard,
  GameIconButton,
  GameImage,
  GameLabel,
  GameLogo,
  GameTag,
  ModeChip,
  ModeHero,
  ModeShelf,
} from '@/components/game-ui/GameUI';

/** Room capacity, matching the default used by LobbyInvitePanel. */
const MAX_PLAYERS = 8;

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

interface InkLobbyScreenProps {
  players: Player[];
  lobbyCode: string;
  lobbyId: string;
  isHost: boolean;
  currentPlayer: Player;
  onStartGame: (gameMode: LobbyGameMode) => void | Promise<void>;
  onLeaveGame: () => void;
  onKickPlayer?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
  onOpenSocial: () => void;
  isSocialOpen: boolean;
  variant?: 'default' | 'inkBeta';
}

/** Modes available in the lobby (Monopoly and Mimic excluded). */
const MODE_CARDS = INK_GAME_MODE_ORDER.map((id) => {
  const meta = GAME_MODE_META[id];
  return {
    id,
    label: meta.label,
    tagline: meta.tagline,
    minPlayers: meta.minPlayers,
    accent: meta.accent,
    imageCandidates: meta.imageCandidates,
    fallbackEmoji: meta.fallbackEmoji,
  };
});

/** Copy with a DOM fallback for browsers where the Clipboard API is unavailable. */
const copyText = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy below.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
};

/**
 * Portrait d'un joueur dans la DA beta : l'avatar choisi occupe le cercle
 * cerclé de la mascotte. Une image cassée retombe sur Mimo plutôt que sur un
 * cadre vide, comme sur l'accueil.
 */
const InkBetaSeatPortrait = memo(({ imageUrl, alt }: { imageUrl: string; alt: string }) => {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  if (hasImageError) return <InkBetaMascot />;

  return (
    <div className="ik-mascot ik-mascot--avatar">
      <div className="ik-mascot-avatar-frame">
        <img
          src={imageUrl}
          alt={alt}
          className="ik-mascot-avatar-image"
          draggable={false}
          onError={() => setHasImageError(true)}
        />
      </div>
      <span className="ik-mascot-pulse ik-mascot-pulse--one" aria-hidden="true" />
      <span className="ik-mascot-pulse ik-mascot-pulse--two" aria-hidden="true" />
    </div>
  );
});
InkBetaSeatPortrait.displayName = 'InkBetaSeatPortrait';

export const InkLobbyScreen = ({
  players,
  lobbyCode,
  lobbyId,
  isHost,
  currentPlayer,
  onStartGame,
  onLeaveGame,
  onKickPlayer,
  onTransferHost,
  onOpenSocial,
  isSocialOpen,
  variant = 'default',
}: InkLobbyScreenProps) => {
  const isInkBeta = variant === 'inkBeta';
  const [showSettings, setShowSettings] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [linkShared, setLinkShared] = useState(false);
  const { isAdmin } = useAdmin();
  const [gameMode, setGameMode] = useState<LobbyGameMode>('normal');
  const [codeCopied, setCodeCopied] = useState(false);
  const { teams, assignRandomTeams } = useGameTeams(lobbyId);
  const { toast } = useToast();

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);

  // Sync game mode with backend
  useEffect(() => {
    const fetchGameMode = async () => {
      const { data } = await supabase
        .from('lobbies')
        .select('game_mode')
        .eq('id', lobbyId)
        .single();
      if (data?.game_mode) setGameMode(data.game_mode as LobbyGameMode);
    };
    fetchGameMode();

    const channel = supabase
      .channel(`lobby-mode:${lobbyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` },
        (payload) => {
          const next = (payload.new as { game_mode?: string | null } | null)?.game_mode;
          if (next) setGameMode(next as LobbyGameMode);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const selectedCard = GAME_MODE_META[gameMode];

  const handleGameModeChange = useCallback(
    async (mode: LobbyGameMode) => {
      if (!isHost) return;
      playInkSound('cartoonPop', 0.4);
      try {
        const { error } = await supabase.from('lobbies').update({ game_mode: mode }).eq('id', lobbyId);
        if (error) throw error;
        setGameMode(mode);
        if (mode === '2v2' && players.length >= 4 && players.length % 2 === 0) {
          await assignRandomTeams(players);
        }
      } catch (error) {
        console.error('Error updating game mode:', error);
        toast({ title: 'Erreur', description: 'Impossible de changer le mode', variant: 'destructive' });
      }
    },
    [isHost, lobbyId, players, assignRandomTeams, toast],
  );

  /*
   * Position du mode dans le dock beta. Les flèches reprennent la navigation
   * cyclique de l'accueil, mais passent par `handleGameModeChange` : c'est ce
   * chemin qui écrit dans `lobbies.game_mode` et propage le choix aux invités.
   */
  const modeIndex = Math.max(0, MODE_CARDS.findIndex((card) => card.id === gameMode));

  const goToLobbyMode = useCallback(
    (index: number) => {
      if (!isHost) return;
      const next = MODE_CARDS[(index + MODE_CARDS.length) % MODE_CARDS.length];
      void handleGameModeChange(next.id);
    },
    [handleGameModeChange, isHost],
  );

  const connectedCount = players.filter((p) => !p.isDisconnected).length;
  const { canStart, reasons } = getStartStatus({
    mode: gameMode,
    connectedCount,
    teamsCount: teams.length,
    isAdmin,
  });

  const handleStartGame = async () => {
    if (!isHost || !canStart || isStarting) return;
    if (gameMode === '2v2' && teams.length === 0 && !isAdmin) {
      toast({ title: 'Équipes requises', description: "Formez d'abord les équipes", variant: 'destructive' });
      return;
    }
    setIsStarting(true);
    playInkSound('cartoonFanfare', 0.6);
    try {
      await onStartGame(gameMode);
    } catch (error) {
      console.error('[InkLobby] onStartGame failed:', error);
      setIsStarting(false);
    }
  };

  const handleCopyCode = useCallback(async () => {
    const copied = await copyText(lobbyCode);
    if (!copied) {
      toast({ title: 'Copie impossible', description: `Sélectionne le code manuellement : ${lobbyCode}`, variant: 'destructive' });
      return;
    }
    setCodeCopied(true);
    playInkSound('cartoonPop', 0.3);
    toast({ title: 'Code copié', description: lobbyCode });
    setTimeout(() => setCodeCopied(false), 1500);
  }, [lobbyCode, toast]);

  // Share lobby link via Web Share API or copy to clipboard.
  const handleShareLink = useCallback(async () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('code', lobbyCode);
    const link = url.toString();
    const shareData = {
      title: 'Mimic Master',
      text: `Rejoins-moi sur Mimic Master ! Code lobby : ${lobbyCode}`,
      url: link,
    };
    playInkSound('cartoonPop', 0.3);

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setLinkShared(true);
        setTimeout(() => setLinkShared(false), 1800);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Some desktop implementations expose share but reject this payload;
        // clipboard remains a reliable fallback.
      }
    }

    const copied = await copyText(link);
    if (copied) {
      setLinkShared(true);
      toast({ title: 'Lien copié', description: link });
      setTimeout(() => setLinkShared(false), 1800);
      return;
    }

    toast({
      title: 'Partage impossible',
      description: `Copie ce lien manuellement : ${link}`,
      variant: 'destructive',
    });
    window.prompt('Copie ce lien pour inviter tes amis :', link);
  }, [lobbyCode, toast]);

  // Global lobby shortcuts
  const lobbyAnyModalOpen =
    isSocialOpen ||
    showSettings || showInvitePanel || showLeaveConfirm || showShortcuts || !!openMenuFor;
  useKeyboardShortcuts([
    {
      /*
       * Ne reste ici que le menu contextuel d'un joueur : ce n'est pas un
       * dialogue de la coquille partagée. Les quatre autres branches de cette
       * cascade ont été retirées — réglages, invitations, confirmation de départ
       * et raccourcis passent tous par `InkDrawer` / `InkModal`, dont
       * `useDialogBehaviour` gère déjà Échap, le piège de focus et le retour du
       * focus au déclencheur.
       */
      key: 'Escape',
      enabled: !!openMenuFor,
      handler: () => setOpenMenuFor(null),
      label: 'Fermer le menu du joueur',
    },
    {
      key: '?',
      shift: true,
      enabled: !lobbyAnyModalOpen,
      handler: () => setShowShortcuts(true),
      label: 'Afficher les raccourcis',
    },
    {
      key: 's',
      enabled: !lobbyAnyModalOpen,
      handler: () => setShowSettings(true),
      label: 'Ouvrir les paramètres',
    },
    {
      key: 'i',
      enabled: !lobbyAnyModalOpen && isHost,
      handler: () => setShowInvitePanel(true),
      label: 'Inviter des amis',
    },
    {
      key: 'c',
      enabled: !lobbyAnyModalOpen,
      handler: () => { void handleCopyCode(); },
      label: 'Copier le code lobby',
    },
    {
      key: 'l',
      enabled: !lobbyAnyModalOpen,
      handler: () => handleShareLink(),
      label: 'Partager le lien',
    },
    {
      key: 'Enter',
      enabled: !lobbyAnyModalOpen && isHost && canStart && !isStarting,
      handler: () => {
        void handleStartGame();
      },
      label: 'Lancer la partie (host)',
    },
  ]);

  // Close the player context menu on any outside click.
  useEffect(() => {
    if (!openMenuFor) return;
    const close = () => setOpenMenuFor(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuFor]);

  /*
   * Les dialogues sont partagés par les deux présentations : le lobby beta
   * n'est qu'une autre disposition du même salon, pas un second écran avec ses
   * propres réglages, invitations ou confirmation de départ.
   */
  const overlays = (
    <>
      {/* ============== INVITE PANEL ============== */}
      <InkModal
        className={isInkBeta ? 'ik-party-overlay ik-lobby-overlay' : undefined}
        isOpen={showInvitePanel}
        onClose={() => setShowInvitePanel(false)}
        title="Inviter des amis"
        subtitle={`${players.length}/${MAX_PLAYERS} joueurs`}
        icon={<Link2 className="h-5 w-5" />}
      >
        <LobbyInvitePanel
          lobbyCode={lobbyCode}
          lobbyId={lobbyId}
          players={players}
          maxPlayers={MAX_PLAYERS}
          isHost={isHost}
          inlineMode
        />
      </InkModal>

      {/* ============== SETTINGS ============== */}
      <InkModal
        className={isInkBeta ? 'ik-party-overlay ik-lobby-overlay' : undefined}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Paramètres"
        subtitle="Micro, caméra et son"
        icon={<Settings className="h-5 w-5" />}
      >
        <DeviceSettings embedded showPreview onClose={() => setShowSettings(false)} />
      </InkModal>

      {/* ============== LEAVE CONFIRM ============== */}
      <InkModal
        className={isInkBeta ? 'ik-party-overlay ik-lobby-overlay' : undefined}
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title="Quitter le lobby ?"
        icon={<LogOut className="h-5 w-5" />}
      >
        <p className="if-muted text-sm">
          Tu vas quitter le salon {lobbyCode}. Les autres joueurs resteront dans la partie.
        </p>
        <div className="mt-4 flex gap-2">
          <GameButton variant="ghost" block onClick={() => setShowLeaveConfirm(false)}>
            Annuler
          </GameButton>
          <GameButton
            variant="danger"
            block
            data-autofocus
            onClick={() => {
              playInkSound('cartoonSwoosh', 0.4);
              setShowLeaveConfirm(false);
              onLeaveGame();
            }}
            icon={<LogOut className="h-4 w-4" />}
          >
            Quitter
          </GameButton>
        </div>
      </InkModal>

      {/* ============== SHORTCUTS ============== */}
      <InkShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        extra={[
          { keys: ['S'], label: 'Ouvrir les paramètres' },
          { keys: ['I'], label: 'Inviter des amis (host)' },
          { keys: ['L'], label: 'Partager le lien' },
          { keys: ['C'], label: 'Copier le code lobby' },
          { keys: ['Enter'], label: 'Lancer la partie (host)' },
        ]}
      />
    </>
  );

  /*
   * ================= LOBBY INK BETA =================
   * Le salon reprend la grammaire du menu beta plutôt que la coquille `.gm-*` :
   * même barre de marque, même cadre de scène, même panneau à onglets, même
   * dock de modes. Seules la disposition et l'habillage changent — états,
   * canaux temps réel, chat et actions d'hôte restent ceux d'au-dessus.
   */
  if (isInkBeta) {
    const selfAvatar = getAvatar(currentPlayer.id);

    return (
      <div
        className="ik-root ik-layout-v2 ik-lobby-v2 menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
        style={{ ['--accent' as string]: selectedCard.accent }}
      >
        <div className="ik-party-bg" aria-hidden="true" />
        <div className="ik-party-rays" aria-hidden="true" />
        <div className="ik-party-dots" aria-hidden="true" />

        <header className="ik-topbar relative z-[8] flex-shrink-0">
          <InkBetaLogo titleId="ik-lobby-brand" />

          <div className="ik-topbar-side ik-topbar-side--start">
            <button
              type="button"
              onClick={handleCopyCode}
              className="ik-code-chip menu-focus"
              aria-label={`Copier le code du salon ${lobbyCode}`}
              title="Copier le code du lobby"
            >
              <span>Salon</span>
              <strong>{lobbyCode}</strong>
              {codeCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </button>
          </div>

          <div className="ik-topbar-side ik-topbar-side--end">
            <div className="ik-tools">
              <button
                type="button"
                onClick={() => {
                  playInkSound('brushTap', 0.3);
                  onOpenSocial();
                }}
                className="ik-tool menu-focus"
                aria-label="Ouvrir le Social Studio"
              >
                <Users aria-hidden="true" />
                <span>Social</span>
              </button>

              <button
                type="button"
                onClick={handleShareLink}
                className="ik-tool menu-focus"
                aria-label={linkShared ? 'Lien du lobby copié' : 'Partager le lobby'}
              >
                {linkShared ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
                <span>{linkShared ? 'Copié' : 'Partager'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playInkSound('cartoonPop', 0.3);
                  setShowSettings(true);
                }}
                className="ik-tool menu-focus"
                aria-label="Paramètres"
              >
                <Settings aria-hidden="true" />
                <span>Options</span>
              </button>

              <LanguageMenu className="shrink-0" />

              <button
                type="button"
                data-back={showLeaveConfirm ? undefined : true}
                onClick={() => {
                  playInkSound('cartoonSwoosh', 0.3);
                  setShowLeaveConfirm(true);
                }}
                className="ik-tool ik-tool--leave menu-focus"
                aria-label="Quitter le lobby"
              >
                <LogOut aria-hidden="true" />
                <span>Quitter</span>
              </button>
            </div>
          </div>
        </header>

        <main className="ik-main custom-scrollbar relative z-[2] min-h-0 flex-1 overflow-y-auto">
          <div className="ik-canvas ik-lobby-canvas">
            <section className="ik-play-panel ik-lobby-play" aria-labelledby="ik-lobby-mode-title">
              <div className="ik-panel-tabs" aria-label="Actions du salon">
                <span className="ik-panel-tab is-active">Le salon</span>
                <button
                  type="button"
                  className="ik-panel-tab menu-focus"
                  disabled={!isHost}
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    setShowInvitePanel(true);
                  }}
                >
                  Inviter des amis
                </button>
              </div>

              <div className="ik-play-title">
                <span className="ik-play-title-spark" aria-hidden="true">✦</span>
                <h2 id="ik-lobby-mode-title">{selectedCard.label}</h2>
                <span className="ik-play-title-spark" aria-hidden="true">✦</span>
              </div>

              <div className="ik-play-content">
                <div className="ik-mascot-zone">
                  <div className="ik-lobby-portrait">
                    {selfAvatar.type === 'image' && selfAvatar.imageUrl ? (
                      <InkBetaSeatPortrait
                        imageUrl={selfAvatar.imageUrl}
                        alt={`Avatar de ${currentPlayer.name}`}
                      />
                    ) : (
                      <InkBetaMascot />
                    )}
                  </div>
                  <span className="ik-mascot-caption">
                    {isHost ? <Crown aria-hidden="true" /> : <Users aria-hidden="true" />}
                    {currentPlayer.name} · {isHost ? 'Hôte du salon' : 'Invité'}
                  </span>
                </div>

                <div className="ik-start-card">
                  <div className="ik-start-heading">
                    <span>01</span>
                    <div>
                      <p>{isHost ? 'Lance la partie' : 'Prépare-toi'}</p>
                      <small>
                        {connectedCount}/{MAX_PLAYERS} joueurs connectés
                      </small>
                    </div>
                  </div>

                  <div className="ik-current-mode" aria-live="polite">
                    <span className="ik-current-mode-icon">
                      <GameImage
                        candidates={selectedCard.imageCandidates}
                        alt=""
                        fallback={<span aria-hidden="true">{selectedCard.fallbackEmoji}</span>}
                      />
                    </span>
                    <span>
                      <small>Mode sélectionné</small>
                      <strong>{selectedCard.label}</strong>
                    </span>
                    {isHost && (
                      <button
                        type="button"
                        className="menu-focus"
                        onClick={() => goToLobbyMode(modeIndex + 1)}
                      >
                        Changer
                      </button>
                    )}
                  </div>

                  {isHost ? (
                    <button
                      type="button"
                      className="ik-primary-action menu-focus"
                      disabled={!canStart || isStarting}
                      onClick={handleStartGame}
                    >
                      <span className="ik-primary-action-icon">
                        <Play fill="currentColor" aria-hidden="true" />
                      </span>
                      <span>{isStarting ? 'Lancement…' : 'Lancer la partie'}</span>
                    </button>
                  ) : (
                    <p className="ik-lobby-waiting" role="status">
                      <span aria-hidden="true" />
                      En attente du lancement par l'hôte…
                    </p>
                  )}

                  {isHost && !canStart && reasons.length > 0 ? (
                    <p className="ik-start-hint" role="status">
                      <AlertTriangle aria-hidden="true" /> {reasons.join(' · ')}
                    </p>
                  ) : (
                    <p className="ik-start-hint">
                      {isHost
                        ? 'Entrée pour lancer · C pour copier le code'
                        : `Code du salon : ${lobbyCode}`}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <aside className="ik-lobby-seats-panel" aria-labelledby="ik-lobby-seats-title">
              <div className="ik-lobby-panel-head">
                <div>
                  <span>Étape 02</span>
                  <h2 id="ik-lobby-seats-title">La troupe</h2>
                </div>
                <p className="ik-lobby-count">
                  <strong>{String(players.length).padStart(2, '0')}</strong>
                  <span>/ {String(MAX_PLAYERS).padStart(2, '0')}</span>
                </p>
              </div>

              {connectedCount !== players.length && (
                <p className="ik-lobby-reconnect" role="status">
                  <WifiOff aria-hidden="true" /> {players.length - connectedCount} en reconnexion
                </p>
              )}

              <div className="ik-seats custom-scrollbar">
                {players.map((p) => {
                  const av = getAvatar(p.id);
                  const hasPortrait = av.type === 'image' && !!av.imageUrl;
                  const canModerate =
                    isHost && p.id !== currentPlayer.id && (!!onKickPlayer || !!onTransferHost);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'ik-seat',
                        p.id === currentPlayer.id && 'is-self',
                        p.isDisconnected && 'is-away',
                      )}
                    >
                      {p.isHost && (
                        <Crown className="ik-seat-crown" fill="currentColor" aria-label="Hôte" />
                      )}

                      {canModerate && (
                        <span className="ik-seat-actions">
                          <button
                            type="button"
                            className="ik-seat-menu menu-focus"
                            aria-label={`Actions pour ${p.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              playInkSound('cartoonPop', 0.3);
                              setOpenMenuFor(openMenuFor === p.id ? null : p.id);
                            }}
                          >
                            <MoreVertical aria-hidden="true" />
                          </button>
                          {openMenuFor === p.id && (
                            <div
                              className="ik-seat-popover"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {onTransferHost && (
                                <button
                                  type="button"
                                  className="menu-focus"
                                  onClick={() => {
                                    playInkSound('cartoonDing', 0.3);
                                    onTransferHost(p.id);
                                    setOpenMenuFor(null);
                                  }}
                                >
                                  <Crown aria-hidden="true" /> Transférer l'hôte
                                </button>
                              )}
                              {onKickPlayer && (
                                <button
                                  type="button"
                                  className="menu-focus is-danger"
                                  onClick={() => {
                                    playInkSound('cartoonZap', 0.3);
                                    onKickPlayer(p.id);
                                    setOpenMenuFor(null);
                                  }}
                                >
                                  <X aria-hidden="true" /> Exclure
                                </button>
                              )}
                            </div>
                          )}
                        </span>
                      )}

                      <span
                        className={cn('ik-seat-avatar', hasPortrait && 'has-portrait')}
                        style={
                          av.type === 'initials' && av.backgroundColor
                            ? { background: av.backgroundColor }
                            : undefined
                        }
                      >
                        {hasPortrait ? (
                          <img src={av.imageUrl} alt="" draggable={false} />
                        ) : (
                          (p.name[0] ?? '?').toUpperCase()
                        )}
                      </span>

                      <span className="ik-seat-name">{p.name}</span>
                      <span className="ik-seat-meta">
                        {p.isDisconnected
                          ? 'Absent'
                          : p.id === currentPlayer.id
                            ? 'Toi'
                            : 'Prêt'}
                      </span>
                    </div>
                  );
                })}

                {Array.from({ length: Math.max(0, MAX_PLAYERS - players.length) }).map((_, i) => (
                  <div key={`seat-free-${i}`} className="ik-seat is-free">
                    <span className="ik-seat-avatar" aria-hidden="true">
                      <UserPlus />
                    </span>
                    <span className="ik-seat-name">Libre</span>
                  </div>
                ))}
              </div>

              {players.length <= 1 && (
                <p className="ik-lobby-alone">
                  Encore tout seul&nbsp;! Partage le code <strong>{lobbyCode}</strong> pour remplir
                  le salon.
                </p>
              )}
            </aside>

            <aside className="ik-lobby-chat-panel" aria-label="Discussion du salon">
              <TwitchStyleLobbyChat
                lobbyId={lobbyId}
                playerId={currentPlayer.id}
                playerName={currentPlayer.name}
                className="h-full"
              />
            </aside>

            <section className="ik-mode-panel ik-lobby-modes" aria-labelledby="ik-lobby-modes-title">
              <div className="ik-mode-panel-head">
                <span>Étape 03</span>
                <h2 id="ik-lobby-modes-title">{isHost ? 'Choisis un mode' : 'Mode du salon'}</h2>
              </div>

              <div
                className="ik-mode-feature"
                style={{ ['--mode-accent' as string]: selectedCard.accent }}
              >
                <span className="ik-mode-feature-icon">
                  <GameImage
                    candidates={selectedCard.imageCandidates}
                    alt=""
                    fallback={<span aria-hidden="true">{selectedCard.fallbackEmoji}</span>}
                  />
                </span>
                <div>
                  <strong>{selectedCard.label}</strong>
                  <p>{selectedCard.tagline}</p>
                </div>
                <span className="ik-mode-players">{selectedCard.minPlayers}+</span>
              </div>

              <p className="ik-mode-description">
                {isHost ? selectedCard.description : "L'hôte choisit le mode de la partie."}
              </p>

              <div className="ik-mode-grid" role="group" aria-label="Modes de jeu">
                {MODE_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    aria-pressed={card.id === gameMode}
                    aria-label={`${card.label} — ${card.tagline}`}
                    title={card.label}
                    disabled={!isHost}
                    onClick={() => handleGameModeChange(card.id)}
                    className={cn('ik-mode menu-focus', card.id === gameMode && 'is-selected')}
                    style={{ ['--mode-accent' as string]: card.accent }}
                  >
                    <span className="ik-mode-icon">
                      <GameImage
                        candidates={card.imageCandidates}
                        alt=""
                        fallback={<span aria-hidden="true">{card.fallbackEmoji}</span>}
                      />
                    </span>
                    <span className="ik-mode-name">{card.label}</span>
                    <span className="ik-mode-check" aria-hidden="true">✓</span>
                  </button>
                ))}
              </div>

              <div className="ik-mode-nav" aria-label="Navigation entre les modes">
                <button
                  type="button"
                  className="ik-mode-nav-btn menu-focus"
                  disabled={!isHost}
                  onClick={() => goToLobbyMode(modeIndex - 1)}
                  aria-label="Mode précédent"
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <p className="ik-mode-position" aria-live="polite">
                  <strong>{String(modeIndex + 1).padStart(2, '0')}</strong>
                  <span>/ {String(MODE_CARDS.length).padStart(2, '0')}</span>
                </p>
                <button
                  type="button"
                  className="ik-mode-nav-btn menu-focus"
                  disabled={!isHost}
                  onClick={() => goToLobbyMode(modeIndex + 1)}
                  aria-label="Mode suivant"
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </section>
          </div>
        </main>

        {overlays}
      </div>
    );
  }

  return (
    <div
      className="ibs-shell if-root menu-surface menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
      style={{ ['--accent' as string]: selectedCard.accent }}
    >
      <GameBackdrop src="/lobby/backgroundlobby.png" />

      {/* ============== HEADER ============== */}
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-8 sm:py-3.5 [@media(max-height:640px)_and_(orientation:landscape)]:flex-nowrap [@media(max-height:640px)_and_(orientation:landscape)]:py-1.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <GameLogo candidates={['/lobby/logo.png', '/home/logo.png']} imgClassName="hidden h-7 w-auto min-[420px]:block sm:h-9 [@media(max-height:640px)_and_(orientation:landscape)]:h-7" />
          <button
            type="button"
            onClick={handleCopyCode}
            className="if-btn if-btn--neutral menu-focus min-h-[44px] min-w-0 px-2 sm:px-3"
            title="Copier le code du lobby"
          >
            <span className="if-label hidden sm:inline">Code</span>
            <span className="truncate font-mono text-base font-bold tracking-[0.16em] sm:text-lg sm:tracking-[0.28em]">{lobbyCode}</span>
            {codeCopied ? (
              <Check className="h-4 w-4 text-[var(--c-green)]" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="custom-scrollbar flex w-full min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto sm:w-auto sm:gap-2 [@media(max-height:640px)_and_(orientation:landscape)]:w-auto [@media(max-height:640px)_and_(orientation:landscape)]:gap-1">
          <GameButton
            variant="neutral"
            size="sm"
            className="min-h-[44px] min-w-[44px] shrink-0 px-2 sm:px-3"
            aria-label="Ouvrir le Social Studio"
            onClick={() => {
              playInkSound('brushTap', 0.3);
              onOpenSocial();
            }}
            icon={<Users className="h-4 w-4" />}
          >
            <span className="hidden sm:inline [@media(max-height:640px)_and_(orientation:landscape)]:hidden">
              Social
            </span>
          </GameButton>
          <GameButton
            variant="neutral"
            size="sm"
            className="min-h-[44px] min-w-[44px] shrink-0 px-2 sm:px-3"
            aria-label={linkShared ? 'Lien du lobby copié' : 'Partager le lobby'}
            onClick={handleShareLink}
            icon={linkShared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          >
            <span className="hidden sm:inline [@media(max-height:640px)_and_(orientation:landscape)]:hidden">
              {linkShared ? 'Copié' : 'Partager'}
            </span>
          </GameButton>
          <GameIconButton
            label="Paramètres"
            onClick={() => {
              playInkSound('cartoonPop', 0.3);
              setShowSettings(true);
            }}
          >
            <Settings className="h-[18px] w-[18px]" />
          </GameIconButton>
          <LanguageMenu className="shrink-0" />
          <GameIconButton
            label="Quitter le lobby"
            data-back={showLeaveConfirm ? undefined : true}
            onClick={() => {
              playInkSound('cartoonSwoosh', 0.3);
              setShowLeaveConfirm(true);
            }}
          >
            <LogOut className="h-[18px] w-[18px]" />
          </GameIconButton>
        </div>
      </header>

      {/* ============== MAIN GRID ============== */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-8 sm:pb-6 min-[1101px]:overflow-hidden">
      <div className="gm-lobby mx-auto max-w-[1600px]">
        {/* ---------- RIGHT: chat, full column height ---------- */}
        <aside className="order-2 flex min-h-[22rem] flex-col min-[1101px]:order-2 min-[1101px]:min-h-0">
          <GameCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TwitchStyleLobbyChat
              lobbyId={lobbyId}
              playerId={currentPlayer.id}
              playerName={currentPlayer.name}
              className="h-full"
            />
          </GameCard>
        </aside>

        {/* ---------- MAIN STAGE: featured mode, start, shelf ---------- */}
        <section className="order-1 flex min-h-0 flex-col gap-4 min-[1101px]:order-1">
          <motion.div
            className="flex-shrink-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
          >
            <ModeHero
              name={selectedCard.label}
              tagline={selectedCard.tagline}
              description={selectedCard.description}
              accent={selectedCard.accent}
              meta={
                <>
                  <GameTag accent={selectedCard.accent}>
                    {selectedCard.minPlayers}+ joueurs
                  </GameTag>
                  {!isHost && <GameTag>L'hôte choisit le mode</GameTag>}
                  {gameMode === '2v2' && teams.length > 0 && (
                    <GameTag>
                      {teams.length} équipe{teams.length > 1 ? 's' : ''}
                    </GameTag>
                  )}
                </>
              }
              art={
                <GameImage
                  candidates={selectedCard.imageCandidates}
                  alt=""
                  fallback={<span aria-hidden="true">{selectedCard.fallbackEmoji}</span>}
                />
              }
              aside={
                <div className="flex flex-col gap-2.5">
                  {isHost && !canStart && reasons.length > 0 && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-[var(--ink-radius-sm)] border border-[rgba(255,206,61,0.3)] bg-[rgba(255,206,61,0.1)] px-3 py-2.5"
                    >
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--c-yellow)]"
                        aria-hidden="true"
                      />
                      <span className="text-xs text-[var(--c-yellow)]">
                        {reasons.join(' · ')}
                      </span>
                    </div>
                  )}

                  {isHost ? (
                    <GameButton
                      variant="primary"
                      size="xl"
                      accent={selectedCard.accent}
                      className="w-full sm:w-auto sm:min-w-[280px]"
                      disabled={!canStart}
                      loading={isStarting}
                      loadingLabel="Lancement…"
                      onClick={handleStartGame}
                      icon={<Play className="h-5 w-5" fill="currentColor" />}
                    >
                      Lancer la partie
                    </GameButton>
                  ) : (
                    <p className="if-mute text-sm">
                      En attente du lancement par l'hôte…
                    </p>
                  )}
                </div>
              }
            />
          </motion.div>

          {/* Mode shelf */}
          <div className="flex-shrink-0">
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <GameLabel>{isHost ? 'Change de mode' : 'Modes du salon'}</GameLabel>
              <span className="if-mute text-xs">{MODE_CARDS.length} modes</span>
            </div>
            <ModeShelf label="Modes de jeu">
              {MODE_CARDS.map((card) => (
                <ModeChip
                  key={card.id}
                  name={card.label}
                  accent={card.accent}
                  selected={card.id === gameMode}
                  disabled={!isHost}
                  onClick={() => handleGameModeChange(card.id)}
                  art={
                    <GameImage
                      candidates={card.imageCandidates}
                      alt=""
                      fallback={<span aria-hidden="true">{card.fallbackEmoji}</span>}
                    />
                  }
                />
              ))}
            </ModeShelf>
          </div>

          {/* ---------- Roster — grows into the remaining space ---------- */}
          <GameCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--ink-line)] px-4 py-3">
              <GameLabel className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Joueurs {players.length}/{MAX_PLAYERS}
                {connectedCount !== players.length && (
                  <span className="text-[var(--c-orange)]">
                    · {players.length - connectedCount} en reconnexion
                  </span>
                )}
              </GameLabel>
              {isHost && (
                <GameButton
                  variant="neutral"
                  size="sm"
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    setShowInvitePanel(true);
                  }}
                  icon={<UserPlus className="h-4 w-4" />}
                >
                  Inviter des amis
                </GameButton>
              )}
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3.5">
              <div className="gm-players-grid">
                {players.map((p) => {
                  const av = getAvatar(p.id);
                  const canModerate =
                    isHost && p.id !== currentPlayer.id && (!!onKickPlayer || !!onTransferHost);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'gm-player',
                        p.id === currentPlayer.id && 'is-self',
                        p.isDisconnected && 'is-away',
                      )}
                    >
                      {p.isHost && (
                        <Crown
                          className="gm-player-crown h-3.5 w-3.5"
                          fill="currentColor"
                          aria-label="Hôte"
                        />
                      )}

                      {canModerate && (
                        <span className="gm-player-actions">
                          <GameIconButton
                            label={`Actions pour ${p.name}`}
                            className="h-7 w-7 min-w-0 border-transparent bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              playInkSound('cartoonPop', 0.3);
                              setOpenMenuFor(openMenuFor === p.id ? null : p.id);
                            }}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </GameIconButton>
                          {openMenuFor === p.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="if-panel if-fade absolute right-0 top-8 z-50 w-44 overflow-hidden p-1 text-left"
                            >
                              {onTransferHost && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playInkSound('cartoonDing', 0.3);
                                    onTransferHost(p.id);
                                    setOpenMenuFor(null);
                                  }}
                                  className="menu-focus flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-[var(--ink-text-dim)] transition-colors hover:bg-white/10 hover:text-[var(--ink-text)]"
                                >
                                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                                  Transférer l'hôte
                                </button>
                              )}
                              {onKickPlayer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playInkSound('cartoonZap', 0.3);
                                    onKickPlayer(p.id);
                                    setOpenMenuFor(null);
                                  }}
                                  className="menu-focus flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-[var(--ink-text-dim)] transition-colors hover:bg-[rgba(255,107,91,0.14)] hover:text-[var(--c-coral)]"
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  Exclure
                                </button>
                              )}
                            </div>
                          )}
                        </span>
                      )}

                      <span className="gm-player-avatar">
                        {av.type === 'image' && av.imageUrl ? (
                          <img src={av.imageUrl} alt="" draggable={false} />
                        ) : (
                          (p.name[0] ?? '?').toUpperCase()
                        )}
                      </span>

                      <span className="gm-player-name">{p.name}</span>
                      <span className="gm-player-meta">
                        {p.isDisconnected ? (
                          <span className="flex items-center gap-1 text-[var(--c-orange)]">
                            <WifiOff className="h-3 w-3" aria-hidden="true" />
                            Absent
                          </span>
                        ) : p.id === currentPlayer.id ? (
                          'Toi'
                        ) : (
                          'Prêt'
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* Free seats, so the room reads as "waiting" rather than empty */}
                {Array.from({ length: Math.max(0, MAX_PLAYERS - players.length) }).map((_, i) => (
                  <div key={`slot-${i}`} className="gm-slot">
                    <span className="gm-slot-ring" aria-hidden="true">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span>Libre</span>
                  </div>
                ))}
              </div>
            </div>

            {players.length <= 1 && (
              <div className="flex flex-shrink-0 items-center gap-3 border-t border-[var(--ink-line)] px-4 py-3">
                <GameImage
                  candidates={['/lobby/mascot.png']}
                  alt=""
                  className="h-14 w-auto flex-shrink-0"
                  fallback={<span className="text-3xl">🎤</span>}
                />
                <div className="min-w-0">
                  <p className="if-h2">Encore tout seul&nbsp;!</p>
                  <p className="if-mute text-xs">
                    Partage le code{' '}
                    <span className="font-mono font-bold text-[var(--ink-text)]">
                      {lobbyCode}
                    </span>{' '}
                    pour remplir le salon.
                  </p>
                </div>
              </div>
            )}
          </GameCard>
        </section>
      </div>
      </div>

      {overlays}
    </div>
  );
};
