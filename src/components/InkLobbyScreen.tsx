import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  Play,
  X,
  Copy,
  Check,
  Crown,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronRight,
  Phone,
  Swords,
  Brain,
  Zap,
  Home as HomeIcon,
  UserX,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { LobbyChat } from '@/components/LobbyChat';
import { DeviceSettings } from '@/components/DeviceSettings';
import { useGameTeams } from '@/hooks/useGameTeams';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InkLobbyCanvas } from '@/components/InkLobbyCanvas';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { LobbyInvitePanel } from '@/components/LobbyInvitePanel';
import { getStartStatus, GAME_MODE_META, type LobbyGameMode } from '@/lib/gameModes';

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

interface ModeTheme {
  id: LobbyGameMode;
  label: string;
  tagline: string;
  icon: React.ReactNode;
  accent: string;
}

const MODE_THEMES: ModeTheme[] = [
  { id: 'audiophone', label: 'Audio Phone', tagline: 'Téléphone arabe audio', icon: <Phone className="w-4 h-4" />, accent: '#ff5050' },
  { id: 'normal', label: 'Imitation', tagline: 'Mode classique', icon: <Copy className="w-4 h-4" />, accent: '#a855f7' },
  { id: '2v2', label: '2v2', tagline: 'Combat en équipes', icon: <Swords className="w-4 h-4" />, accent: '#f59e0b' },
  { id: 'quiz', label: 'Quiz', tagline: 'Connaissances', icon: <Brain className="w-4 h-4" />, accent: '#0ea5e9' },
  { id: 'pixoguess', label: 'BlurRush', tagline: 'Devinez l\'image', icon: <Zap className="w-4 h-4" />, accent: '#10b981' },
  { id: 'monopoly', label: 'Monopoly', tagline: 'Plateau aventure', icon: <HomeIcon className="w-4 h-4" />, accent: '#ec4899' },
  { id: 'undercover', label: 'Undercover', tagline: 'Trouvez l\'infiltré', icon: <UserX className="w-4 h-4" />, accent: '#94a3b8' },
];

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
  const { isAdmin } = useAdmin();
  const [gameMode, setGameMode] = useState<LobbyGameMode>('normal');
  const [codeCopied, setCodeCopied] = useState(false);
  const { teams, assignRandomTeams } = useGameTeams(lobbyId);
  const { toast } = useToast();

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
        (payload: any) => {
          if (payload.new.game_mode) setGameMode(payload.new.game_mode as LobbyGameMode);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const selectedTheme = useMemo(
    () => MODE_THEMES.find((t) => t.id === gameMode) ?? MODE_THEMES[0],
    [gameMode],
  );

  const handleGameModeChange = useCallback(
    async (mode: LobbyGameMode) => {
      if (!isHost) return;
      playInkSound('brushTap', 0.3);
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
    if (gameMode === '2v2' && teams.length === 0) {
      toast({ title: 'Équipes requises', description: "Formez d'abord les équipes", variant: 'destructive' });
      return;
    }
    playInkSound('inkSuccess', 0.5);
    try {
      await onStartGame(gameMode);
    } catch (error) {
      console.error('[InkLobby] onStartGame failed:', error);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(lobbyCode);
    setCodeCopied(true);
    playInkSound('inkSuccess', 0.3);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const minPlayers = GAME_MODE_META[gameMode].minPlayers;
  const playerSlots = Array.from({ length: Math.max(minPlayers, 4) });

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0810] text-white relative overflow-hidden">
      {/* Collaborative Drawing Canvas */}
      <InkLobbyCanvas lobbyId={lobbyId} playerId={currentPlayer.id} />

      {/* Cursor Particles */}
      <InkCursorParticles />

      {/* Background — subtle, no big halos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0813] via-[#0a0810] to-[#0c0814]" />
        <AnimatePresence mode="sync">
          <motion.div
            key={selectedTheme.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-15"
              style={{
                background: `radial-gradient(ellipse, ${selectedTheme.accent}55 0%, transparent 70%)`,
                filter: 'blur(80px)',
              }}
            />
          </motion.div>
        </AnimatePresence>
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* TOP BAR */}
      <header className="relative z-30 flex items-center justify-between px-5 py-3 flex-shrink-0">
        {/* Leave */}
        <motion.button
          onClick={() => {
            playInkSound('brushTap', 0.3);
            setShowLeaveConfirm(true);
          }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all text-white/70 hover:text-white text-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Quitter</span>
        </motion.button>

        {/* Center — code */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-white/40 font-bold uppercase">
              {isHost ? 'Hôte' : 'Connecté'}
            </span>
          </div>
          <motion.button
            onClick={handleCopyCode}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border transition-all"
            style={{ borderColor: `${selectedTheme.accent}40` }}
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Code</span>
            <span
              className="text-base font-black tracking-[0.2em] font-mono"
              style={{ color: selectedTheme.accent }}
            >
              {lobbyCode}
            </span>
            {codeCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-white/40" />
            )}
          </motion.button>
        </div>

        {/* Settings */}
        <motion.button
          onClick={() => {
            playInkSound('inkClick', 0.3);
            setShowSettings(true);
          }}
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.96 }}
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] flex items-center justify-center text-white/70 hover:text-white transition-all"
          aria-label="Paramètres"
        >
          <Settings className="w-3.5 h-3.5" />
        </motion.button>
      </header>

      {/* MAIN */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 px-5 pb-3 min-h-0">
          {/* LEFT — Players */}
          <section className="flex flex-col min-h-0">
            <div className="relative flex-1 rounded-2xl bg-black/30 backdrop-blur-md border border-white/8 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: `${selectedTheme.accent}1a`,
                      border: `1px solid ${selectedTheme.accent}40`,
                    }}
                  >
                    <Users className="w-3.5 h-3.5" style={{ color: selectedTheme.accent }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-tight">Salle d'attente</h2>
                    <p className="text-[10px] text-white/40 leading-tight">
                      {connectedCount}/{players.length} joueur{players.length > 1 ? 's' : ''} · min {minPlayers}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    setShowInvitePanel(true);
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: `${selectedTheme.accent}15`,
                    border: `1px solid ${selectedTheme.accent}50`,
                    color: selectedTheme.accent,
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  Inviter
                </motion.button>
              </div>

              {/* Player grid — compact */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {playerSlots.map((_, idx) => {
                    const player = players[idx];
                    if (player) {
                      const isMe = player.id === currentPlayer.id;
                      const isDisc = player.isDisconnected;
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className={cn(
                            'group relative aspect-square rounded-xl border overflow-hidden flex flex-col items-center justify-center gap-1 transition-all',
                            isMe ? 'bg-white/[0.04]' : 'bg-black/40 border-white/8 hover:border-white/15',
                          )}
                          style={
                            isMe
                              ? { borderColor: `${selectedTheme.accent}66` }
                              : undefined
                          }
                        >
                          {/* Crown */}
                          {player.isHost && (
                            <div className="absolute top-1 left-1">
                              <Crown className="w-3 h-3 text-amber-400" fill="currentColor" />
                            </div>
                          )}

                          {/* Disconnect */}
                          {isDisc && (
                            <div className="absolute top-1 right-1">
                              <WifiOff className="w-3 h-3 text-amber-400" />
                            </div>
                          )}

                          {/* Avatar */}
                          <div
                            className={cn(
                              'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-white',
                              isDisc && 'opacity-50 saturate-50',
                            )}
                            style={{
                              background: `linear-gradient(135deg, ${selectedTheme.accent}, ${selectedTheme.accent}99)`,
                            }}
                          >
                            {player.name[0]?.toUpperCase()}
                          </div>

                          {/* Name */}
                          <p className="text-[10px] font-bold text-white truncate max-w-full px-1">
                            {player.name}
                          </p>

                          {/* Status dot */}
                          <div
                            className={cn(
                              'absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full',
                              isDisc ? 'bg-amber-400' : 'bg-emerald-400',
                            )}
                          />

                          {/* Host actions */}
                          {isHost && !isMe && (onKickPlayer || onTransferHost) && (
                            <div className="absolute inset-x-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                              {onKickPlayer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playInkSound('inkClick', 0.3);
                                    onKickPlayer(player.id);
                                  }}
                                  className="flex-1 py-0.5 rounded bg-red-500/80 hover:bg-red-500 text-white text-[9px] font-bold"
                                >
                                  Kick
                                </button>
                              )}
                              {onTransferHost && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playInkSound('inkClick', 0.3);
                                    onTransferHost(player.id);
                                  }}
                                  className="flex-1 py-0.5 rounded bg-amber-500/80 hover:bg-amber-500 text-white text-[9px] font-bold"
                                >
                                  Hôte
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    }

                    const isRequired = idx < minPlayers;
                    return (
                      <div
                        key={`empty-${idx}`}
                        className={cn(
                          'aspect-square rounded-xl border border-dashed flex items-center justify-center transition-all',
                          isRequired ? 'border-white/10' : 'border-white/[0.04]',
                        )}
                      >
                        <span className="text-[9px] text-white/20 uppercase tracking-wider font-bold">
                          {isRequired ? 'libre' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT — Mode + actions */}
          <section className="flex flex-col gap-3 min-h-0">
            {/* Mode picker / status */}
            {isHost ? (
              <div className="relative flex-1 rounded-2xl bg-black/30 backdrop-blur-md border border-white/8 overflow-hidden flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white/80">Mode de jeu</h3>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Hôte</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                  <div className="grid grid-cols-1 gap-1">
                    {MODE_THEMES.map((mode) => {
                      const isActive = mode.id === gameMode;
                      const meta = GAME_MODE_META[mode.id];
                      const enoughPlayers = connectedCount >= meta.minPlayers || isAdmin;
                      return (
                        <motion.button
                          key={mode.id}
                          type="button"
                          onClick={() => handleGameModeChange(mode.id)}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          className={cn(
                            'relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all',
                            isActive
                              ? 'bg-white/[0.04]'
                              : 'bg-transparent border-white/5 hover:bg-white/[0.03] hover:border-white/10',
                            !enoughPlayers && !isActive && 'opacity-50',
                          )}
                          style={
                            isActive
                              ? { borderColor: `${mode.accent}80` }
                              : undefined
                          }
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isActive ? `${mode.accent}25` : 'rgba(255,255,255,0.04)',
                              border: isActive ? `1px solid ${mode.accent}60` : '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <div style={{ color: mode.accent }}>{mode.icon}</div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className="text-[13px] font-bold leading-tight"
                              style={{ color: isActive ? mode.accent : 'rgba(255,255,255,0.95)' }}
                            >
                              {mode.label}
                            </div>
                            <div className="text-[10px] text-white/40 leading-tight truncate">
                              {mode.tagline}
                            </div>
                          </div>

                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex-shrink-0">
                            {meta.minPlayers}+
                          </span>

                          {isActive && (
                            <ChevronRight
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: mode.accent }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative flex-1 rounded-2xl bg-black/30 backdrop-blur-md border border-white/8 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-white/8">
                  <h3 className="text-sm font-bold text-white/80">Mode de jeu</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center space-y-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
                      style={{
                        background: `${selectedTheme.accent}1a`,
                        border: `1px solid ${selectedTheme.accent}40`,
                      }}
                    >
                      <div style={{ color: selectedTheme.accent }} className="scale-150">
                        {selectedTheme.icon}
                      </div>
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{selectedTheme.label}</p>
                      <p className="text-[11px] text-white/50">{selectedTheme.tagline}</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/8">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                        En attente de l'hôte
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reasons */}
            <AnimatePresence>
              {isHost && !canStart && reasons.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/25">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <ul className="text-[11px] text-amber-200/90 space-y-0.5">
                      {reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* START button — only for host, compact */}
            {isHost && (
              <motion.button
                onClick={handleStartGame}
                disabled={!canStart}
                whileHover={canStart ? { scale: 1.01 } : undefined}
                whileTap={canStart ? { scale: 0.99 } : undefined}
                className={cn(
                  'relative w-full py-3.5 px-5 rounded-xl font-bold text-base tracking-wide transition-all overflow-hidden group flex-shrink-0',
                  !canStart && 'opacity-40 cursor-not-allowed',
                )}
                style={
                  canStart
                    ? {
                        background: `linear-gradient(135deg, ${selectedTheme.accent}, ${selectedTheme.accent}cc)`,
                        color: 'white',
                        boxShadow: `0 4px 20px ${selectedTheme.accent}55`,
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.4)',
                      }
                }
              >
                {canStart && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" fill="currentColor" />
                  Lancer la partie
                </span>
              </motion.button>
            )}
          </section>
        </div>
      </main>

      {/* Lobby Chat */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />

      {/* INVITE DRAWER */}
      <AnimatePresence>
        {showInvitePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setShowInvitePanel(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col bg-[#0a0810]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: selectedTheme.accent }} />
                  <h2 className="text-base font-bold text-white">Inviter</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvitePanel(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <LobbyInvitePanel
                  lobbyCode={lobbyCode}
                  lobbyId={lobbyId}
                  players={players}
                  isHost={isHost}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEAVE CONFIRM */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[#0a0810]/95 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Quitter le lobby ?</h3>
                  <p className="text-xs text-white/55 mt-0.5">
                    {isHost
                      ? 'Le lobby sera transféré ou fermé.'
                      : 'Vous serez déconnecté de la partie.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/70 hover:border-white/25 hover:text-white transition-all text-sm font-bold"
                >
                  Rester
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playInkSound('inkClick', 0.4);
                    onLeaveGame();
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-red-500/90 hover:bg-red-500 transition-all"
                >
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};
