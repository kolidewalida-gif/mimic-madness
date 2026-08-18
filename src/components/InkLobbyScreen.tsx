import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
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
import { LobbyInvitePanel } from '@/components/LobbyInvitePanel';
import { InkShortcutsModal } from '@/components/InkShortcutsModal';
import { InkModal } from '@/components/menu/InkOverlay';
import {
  FlatAvatar,
  FlatButton,
  FlatIconButton,
  FlatImage,
  FlatLabel,
  FlatPanel,
  FlatTag,
  FlatTile,
} from '@/components/ink/InkFlat';

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
}

/** Modes available in the Ink lobby (Monopoly and Mimic excluded). */
const MODE_CARDS = INK_GAME_MODE_ORDER.map((id) => {
  const meta = GAME_MODE_META[id];
  return {
    id,
    label: meta.shortLabel,
    tagline: meta.tagline,
    minPlayers: meta.minPlayers,
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

/** Headerless overlay for panels that render their own header. */
const BareOverlay = ({
  onClose,
  label,
  children,
  className,
}: {
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
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
      className={cn(
        'menu-dialog menu-dialog-safe if-panel if-fade relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  </div>
);

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
}: InkLobbyScreenProps) => {
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
    showSettings || showInvitePanel || showLeaveConfirm || showShortcuts || !!openMenuFor;
  useKeyboardShortcuts([
    {
      key: 'Escape',
      enabled: lobbyAnyModalOpen,
      handler: () => {
        if (showShortcuts) setShowShortcuts(false);
        else if (showSettings) setShowSettings(false);
        else if (showInvitePanel) setShowInvitePanel(false);
        else if (showLeaveConfirm) setShowLeaveConfirm(false);
        else if (openMenuFor) setOpenMenuFor(null);
      },
      label: 'Fermer la modale',
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

  return (
    <div className="ibs-shell if-root menu-surface menu-screen-safe flex h-screen w-full flex-col overflow-hidden">
      {/* ============== TOP BAR ============== */}
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--ink-line)] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="if-h2 truncate">Salon</span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="if-btn if-btn--neutral if-btn--sm menu-focus"
            title="Copier le code du lobby"
          >
            <span className="font-mono text-base font-bold tracking-[0.25em]">{lobbyCode}</span>
            {codeCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <FlatButton
            variant="ghost"
            size="sm"
            onClick={handleShareLink}
            icon={linkShared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          >
            {linkShared ? 'Copié' : 'Partager'}
          </FlatButton>
          <FlatIconButton
            label="Paramètres"
            onClick={() => {
              playInkSound('cartoonPop', 0.3);
              setShowSettings(true);
            }}
          >
            <Settings className="h-4 w-4" />
          </FlatIconButton>
          <FlatIconButton
            label="Quitter le lobby"
            data-back={showLeaveConfirm ? undefined : true}
            onClick={() => {
              playInkSound('cartoonSwoosh', 0.3);
              setShowLeaveConfirm(true);
            }}
          >
            <LogOut className="h-4 w-4" />
          </FlatIconButton>
        </div>
      </header>

      {/* ============== MAIN GRID ============== */}
      <div className="custom-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-[300px_1fr] md:overflow-hidden">
        {/* ---------- LEFT: players + chat ---------- */}
        <aside className="order-2 flex min-h-[28rem] flex-col gap-4 md:order-1 md:min-h-0">
          <FlatPanel className="flex flex-shrink-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--ink-line)] px-3 py-2.5">
              <FlatLabel className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Joueurs
              </FlatLabel>
              <FlatTag>{connectedCount}/{players.length}</FlatTag>
            </div>

            <ul className="custom-scrollbar max-h-[240px] overflow-y-auto p-1.5">
              {players.map((p) => {
                const av = getAvatar(p.id);
                const canModerate =
                  isHost && p.id !== currentPlayer.id && (!!onKickPlayer || !!onTransferHost);
                return (
                  <li
                    key={p.id}
                    className={cn('if-row', p.id === currentPlayer.id && 'is-self')}
                  >
                    <FlatAvatar
                      name={p.name}
                      src={av.type === 'image' ? av.imageUrl : undefined}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{p.name}</span>
                        {p.isHost && (
                          <Crown
                            className="h-3.5 w-3.5 flex-shrink-0 text-amber-400"
                            fill="currentColor"
                            aria-label="Hôte"
                          />
                        )}
                      </span>
                      {p.isDisconnected ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-400">
                          <WifiOff className="h-3 w-3" aria-hidden="true" />
                          Reconnexion
                        </span>
                      ) : (
                        <span className="if-mute mt-0.5 block text-xs">En ligne</span>
                      )}
                    </span>

                    {canModerate && (
                      <span className="relative flex-shrink-0">
                        <FlatIconButton
                          label={`Actions pour ${p.name}`}
                          className="h-8 w-8 min-w-0 border-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            playInkSound('cartoonPop', 0.3);
                            setOpenMenuFor(openMenuFor === p.id ? null : p.id);
                          }}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </FlatIconButton>
                        {openMenuFor === p.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="if-panel if-fade absolute right-0 top-9 z-50 w-44 overflow-hidden p-1"
                          >
                            {onTransferHost && (
                              <button
                                type="button"
                                onClick={() => {
                                  playInkSound('cartoonDing', 0.3);
                                  onTransferHost(p.id);
                                  setOpenMenuFor(null);
                                }}
                                className="menu-focus flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-[var(--ink-text-dim)] transition-colors hover:bg-[var(--ink-surface-3)] hover:text-[var(--ink-text)]"
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
                                className="menu-focus flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs text-[var(--ink-text-dim)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                                Exclure
                              </button>
                            )}
                          </div>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-[var(--ink-line)] p-2">
              <FlatButton
                variant="ghost"
                size="sm"
                block
                onClick={() => {
                  playInkSound('cartoonPop', 0.3);
                  setShowInvitePanel(true);
                }}
                icon={<UserPlus className="h-4 w-4" />}
              >
                Inviter des amis
              </FlatButton>
            </div>
          </FlatPanel>

          {/* Chat */}
          <FlatPanel className="flex min-h-[16rem] flex-1 flex-col overflow-hidden">
            <TwitchStyleLobbyChat
              lobbyId={lobbyId}
              playerId={currentPlayer.id}
              playerName={currentPlayer.name}
              className="h-full"
            />
          </FlatPanel>
        </aside>

        {/* ---------- RIGHT: mode picker + start ---------- */}
        <section className="order-1 flex min-h-0 flex-col gap-4 md:order-2">
          <FlatPanel className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ink-line)] px-4 py-3">
              <div className="min-w-0">
                <FlatLabel>Mode de jeu</FlatLabel>
                <p className="if-h2 mt-0.5 truncate">{selectedCard.label}</p>
              </div>
              {!isHost && <FlatTag>L'hôte choisit le mode</FlatTag>}
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {MODE_CARDS.map((card) => (
                  <FlatTile
                    key={card.id}
                    selected={card.id === gameMode}
                    disabled={!isHost}
                    onClick={() => handleGameModeChange(card.id)}
                    title={card.label}
                    subtitle={card.tagline}
                    art={
                      <FlatImage
                        candidates={card.imageCandidates}
                        alt=""
                        fallback={<span aria-hidden="true">{card.fallbackEmoji}</span>}
                      />
                    }
                    trailing={
                      card.id === gameMode ? (
                        <Check
                          className="h-4 w-4 flex-shrink-0 text-[var(--ink-accent)]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="if-mute flex-shrink-0 text-xs">
                          {card.minPlayers}+
                        </span>
                      )
                    }
                  />
                ))}
              </div>

              <p className="if-muted mt-4 text-sm">{selectedCard.description}</p>

              {gameMode === '2v2' && teams.length > 0 && (
                <p className="if-mute mt-2 text-xs">
                  {teams.length} équipe{teams.length > 1 ? 's' : ''} formée
                  {teams.length > 1 ? 's' : ''}.
                </p>
              )}
            </div>

            {/* Start area */}
            <div className="flex flex-col gap-3 border-t border-[var(--ink-line)] p-4">
              {isHost && !canStart && reasons.length > 0 && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-[var(--ink-radius-sm)] border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                >
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-amber-200/90">{reasons.join(' · ')}</span>
                </div>
              )}

              {isHost ? (
                <FlatButton
                  variant="primary"
                  size="lg"
                  block
                  disabled={!canStart}
                  loading={isStarting}
                  loadingLabel="Lancement…"
                  onClick={handleStartGame}
                  icon={<Play className="h-4 w-4" />}
                >
                  Lancer la partie
                </FlatButton>
              ) : (
                <p className="if-mute py-2 text-center text-sm">
                  En attente du lancement par l'hôte…
                </p>
              )}
            </div>
          </FlatPanel>
        </section>
      </div>

      {/* ============== INVITE PANEL ============== */}
      {showInvitePanel && (
        <BareOverlay label="Inviter des amis" onClose={() => setShowInvitePanel(false)}>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--ink-line)] px-4 py-3">
            <span className="if-h2 flex items-center gap-2">
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Inviter des amis
            </span>
            <button
              type="button"
              onClick={() => setShowInvitePanel(false)}
              className="ink-close-button menu-icon-control menu-focus"
              aria-label="Fermer les invitations"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            <LobbyInvitePanel
              lobbyCode={lobbyCode}
              lobbyId={lobbyId}
              players={players}
              isHost={isHost}
              inlineMode
            />
          </div>
        </BareOverlay>
      )}

      {/* ============== SETTINGS ============== */}
      {showSettings && (
        <BareOverlay label="Paramètres" onClose={() => setShowSettings(false)}>
          <div className="flex min-h-0 flex-1 flex-col">
            <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
          </div>
        </BareOverlay>
      )}

      {/* ============== LEAVE CONFIRM ============== */}
      <InkModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title="Quitter le lobby ?"
        icon={<LogOut className="h-5 w-5" />}
      >
        <p className="if-muted text-sm">
          Tu vas quitter le salon {lobbyCode}. Les autres joueurs resteront dans la partie.
        </p>
        <div className="mt-4 flex gap-2">
          <FlatButton variant="ghost" block onClick={() => setShowLeaveConfirm(false)}>
            Annuler
          </FlatButton>
          <FlatButton
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
          </FlatButton>
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
    </div>
  );
};
