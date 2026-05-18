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
  description: string;
  icon: React.ReactNode;
  gradient: string;
  accent: string;
}

const MODE_THEMES: ModeTheme[] = [
  {
    id: 'audiophone',
    label: 'Audio Phone',
    tagline: 'Le téléphone arabe audio',
    description: 'Enregistrez, écoutez, imitez',
    icon: <Phone className="w-5 h-5" />,
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accent: '#ff2b2b',
  },
  {
    id: 'normal',
    label: 'Imitation',
    tagline: 'Mode classique',
    description: 'Imitez les défis vidéo',
    icon: <Copy className="w-5 h-5" />,
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    accent: '#a855f7',
  },
  {
    id: '2v2',
    label: '2v2',
    tagline: 'Combat en équipes',
    description: 'Affrontement en équipes de 2',
    icon: <Swords className="w-5 h-5" />,
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    accent: '#f59e0b',
  },
  {
    id: 'quiz',
    label: 'Quiz',
    tagline: 'Testez vos connaissances',
    description: 'Questions en temps réel',
    icon: <Brain className="w-5 h-5" />,
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    accent: '#0ea5e9',
  },
  {
    id: 'pixoguess',
    label: 'BlurRush',
    tagline: 'Devinez l\'image',
    description: 'L\'image se dépixelise',
    icon: <Zap className="w-5 h-5" />,
    gradient: 'from-emerald-400 via-green-500 to-teal-600',
    accent: '#10b981',
  },
  {
    id: 'monopoly',
    label: 'Monopoly',
    tagline: 'Plateau aventure',
    description: 'Avancez sur le plateau',
    icon: <HomeIcon className="w-5 h-5" />,
    gradient: 'from-pink-400 via-pink-500 to-rose-600',
    accent: '#ec4899',
  },
  {
    id: 'undercover',
    label: 'Undercover',
    tagline: 'Trouvez l\'infiltré',
    description: 'Démasquez l\'imposteur',
    icon: <UserX className="w-5 h-5" />,
    gradient: 'from-slate-400 via-zinc-500 to-stone-600',
    accent: '#94a3b8',
  },
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
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobbyId}`,
        },
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

      playInkSound('brushTap', 0.4);
      try {
        const { error } = await supabase
          .from('lobbies')
          .update({ game_mode: mode })
          .eq('id', lobbyId);

        if (error) throw error;
        setGameMode(mode);

        if (mode === '2v2' && players.length >= 4 && players.length % 2 === 0) {
          await assignRandomTeams(players);
        }
      } catch (error) {
        console.error('Error updating game mode:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de changer le mode de jeu',
          variant: 'destructive',
        });
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
      toast({
        title: 'Équipes requises',
        description: "Veuillez d'abord former les équipes",
        variant: 'destructive',
      });
      return;
    }
    playInkSound('inkSuccess', 0.6);
    try {
      await onStartGame(gameMode);
    } catch (error) {
      console.error('[InkLobby] onStartGame failed:', error);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(lobbyCode);
    setCodeCopied(true);
    playInkSound('inkSuccess', 0.4);
    toast({ title: 'Code copié !', description: lobbyCode });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const minPlayers = GAME_MODE_META[gameMode].minPlayers;
  const playerSlots = Array.from({ length: Math.max(minPlayers, 4) });

  return (
    <div className="h-screen w-full flex flex-col bg-[#08070d] text-white relative overflow-hidden">
      {/* Collaborative Drawing Canvas (background, low z) */}
      <InkLobbyCanvas lobbyId={lobbyId} playerId={currentPlayer.id} />

      {/* Cursor Particles */}
      <InkCursorParticles />

      {/* Animated background — mode-tinted */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0510] via-[#08070d] to-[#0a0512]" />

        <AnimatePresence mode="sync">
          <motion.div
            key={selectedTheme.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] rounded-full opacity-25"
              style={{
                background: `radial-gradient(circle, ${selectedTheme.accent}66 0%, transparent 70%)`,
                filter: 'blur(120px)',
              }}
            />
            <div
              className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-20 animate-pulse"
              style={{
                background: `radial-gradient(circle, ${selectedTheme.accent}88 0%, transparent 70%)`,
                filter: 'blur(80px)',
              }}
            />
            <div
              className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, ${selectedTheme.accent}66 0%, transparent 70%)`,
                filter: 'blur(100px)',
              }}
            />
          </motion.div>
        </AnimatePresence>

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/60 pointer-events-none" />
      </div>

      {/* TOP BAR */}
      <header className="relative z-30 flex items-center justify-between px-6 py-4 flex-shrink-0">
        {/* Leave button */}
        <motion.button
          onClick={() => {
            playInkSound('brushTap', 0.3);
            setShowLeaveConfirm(true);
          }}
          whileHover={{ scale: 1.04, x: -2 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">Quitter</span>
        </motion.button>

        {/* Center — Lobby code */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] tracking-[0.3em] text-white/40 font-bold uppercase">
              {isHost ? 'Vous êtes l\'hôte' : 'Connecté'}
            </span>
          </div>
          <motion.button
            onClick={handleCopyCode}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative group"
          >
            <div
              className="absolute -inset-2 rounded-2xl opacity-50 blur-lg"
              style={{ background: `radial-gradient(circle, ${selectedTheme.accent}, transparent)` }}
            />
            <div
              className="relative flex items-center gap-3 px-5 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border-2 transition-all"
              style={{
                borderColor: `${selectedTheme.accent}88`,
                boxShadow: `0 0 30px ${selectedTheme.accent}55, inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">Code</span>
              <span
                className="text-2xl font-black tracking-[0.3em] font-mono"
                style={{ color: selectedTheme.accent }}
              >
                {lobbyCode}
              </span>
              <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                {codeCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-white/60" />
                )}
              </div>
            </div>
          </motion.button>
        </div>

        {/* Settings button */}
        <motion.button
          onClick={() => {
            playInkSound('inkClick', 0.3);
            setShowSettings(true);
          }}
          whileHover={{ scale: 1.04, rotate: 90 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all text-white/80 hover:text-white"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">Paramètres</span>
        </motion.button>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 px-6 pb-4 min-h-0">
          {/* LEFT — Players card */}
          <section className="flex flex-col min-h-0">
            <div
              className="relative flex-1 rounded-3xl bg-black/50 backdrop-blur-2xl border-2 border-white/10 overflow-hidden flex flex-col"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}
            >
              {/* Top accent line */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${selectedTheme.accent}, transparent)`,
                }}
              />

              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${selectedTheme.accent}33, ${selectedTheme.accent}11)`,
                      border: `1px solid ${selectedTheme.accent}66`,
                    }}
                  >
                    <Users className="w-5 h-5" style={{ color: selectedTheme.accent }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Caveat', cursive" }}>
                      Salle d'attente
                    </h2>
                    <p className="text-xs text-white/50">
                      {connectedCount}/{players.length} joueur{players.length > 1 ? 's' : ''}
                      {' · '}
                      <span style={{ color: selectedTheme.accent }}>
                        {minPlayers} min
                      </span>
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    setShowInvitePanel(true);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${selectedTheme.accent}, ${selectedTheme.accent}cc)`,
                    boxShadow: `0 0 20px ${selectedTheme.accent}66`,
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Inviter
                </motion.button>
              </div>

              {/* Player grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {playerSlots.map((_, idx) => {
                    const player = players[idx];
                    if (player) {
                      const isMe = player.id === currentPlayer.id;
                      const isDisc = player.isDisconnected;
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, scale: 0.85, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ delay: idx * 0.04, type: 'spring', stiffness: 200, damping: 18 }}
                          className={cn(
                            'relative aspect-[4/5] rounded-2xl overflow-hidden border-2 backdrop-blur-md flex flex-col items-center justify-center gap-2 transition-all',
                            isMe ? 'border-white/40 bg-white/5' : 'border-white/10 bg-black/40',
                          )}
                          style={
                            isMe
                              ? { boxShadow: `0 0 30px ${selectedTheme.accent}66, inset 0 0 30px ${selectedTheme.accent}22` }
                              : undefined
                          }
                        >
                          {/* Card mode-tint overlay */}
                          <div
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{
                              background: `linear-gradient(180deg, transparent, ${selectedTheme.accent})`,
                            }}
                          />

                          {/* Host crown */}
                          {player.isHost && (
                            <div className="absolute top-2 left-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{
                                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                  boxShadow: '0 0 15px rgba(251, 191, 36, 0.6)',
                                }}
                              >
                                <Crown className="w-3.5 h-3.5 text-white" fill="white" />
                              </div>
                            </div>
                          )}

                          {/* Disconnect indicator */}
                          {isDisc && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                              <WifiOff className="w-3 h-3 text-amber-400" />
                              {player.disconnectedTimeLeft !== undefined && (
                                <span className="text-[10px] font-bold text-amber-400">
                                  {player.disconnectedTimeLeft}s
                                </span>
                              )}
                            </div>
                          )}

                          {/* Avatar */}
                          <div
                            className={cn(
                              'relative w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white overflow-hidden',
                              isDisc && 'opacity-50 saturate-50',
                            )}
                            style={{
                              background: `linear-gradient(135deg, ${selectedTheme.accent}, ${selectedTheme.accent}aa)`,
                              boxShadow: `0 8px 24px ${selectedTheme.accent}66`,
                            }}
                          >
                            {player.name[0]?.toUpperCase()}
                          </div>

                          {/* Name */}
                          <div className="px-2 text-center w-full">
                            <p className="text-sm font-bold text-white truncate">{player.name}</p>
                            {isMe && (
                              <span className="text-[10px] uppercase tracking-wider font-bold text-white/50">
                                Vous
                              </span>
                            )}
                          </div>

                          {/* Online dot */}
                          <div
                            className={cn(
                              'absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full',
                              isDisc ? 'bg-amber-400' : 'bg-emerald-400',
                            )}
                            style={{
                              boxShadow: isDisc
                                ? '0 0 8px rgba(251, 191, 36, 0.6)'
                                : '0 0 8px rgba(52, 211, 153, 0.6)',
                            }}
                          />

                          {/* Host actions menu (only host can kick others) */}
                          {isHost && !isMe && (
                            <div className="absolute inset-x-2 bottom-2 opacity-0 hover:opacity-100 transition-opacity flex gap-1 justify-center pointer-events-none hover:pointer-events-auto">
                              {onKickPlayer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playInkSound('inkClick', 0.3);
                                    onKickPlayer(player.id);
                                  }}
                                  className="flex-1 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-bold transition-colors"
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
                                  className="flex-1 py-1 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-white text-[10px] font-bold transition-colors"
                                >
                                  Hôte
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    }

                    // Empty slot
                    const isRequired = idx < minPlayers;
                    return (
                      <div
                        key={`empty-${idx}`}
                        className={cn(
                          'relative aspect-[4/5] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all',
                          isRequired ? 'border-white/15' : 'border-white/5',
                        )}
                      >
                        <motion.div
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-white/30 text-xs uppercase tracking-wider font-bold text-center px-2"
                        >
                          {isRequired ? 'En attente' : 'Slot libre'}
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT — Mode + actions */}
          <section className="flex flex-col gap-4 min-h-0">
            {/* Mode showcase card */}
            <div
              className="relative rounded-3xl overflow-hidden border-2 backdrop-blur-2xl bg-black/50 flex-shrink-0"
              style={{
                borderColor: `${selectedTheme.accent}66`,
                boxShadow: `0 0 50px ${selectedTheme.accent}55, 0 0 100px ${selectedTheme.accent}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', selectedTheme.gradient)} />
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${selectedTheme.accent}, transparent)`,
                }}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTheme.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative px-6 py-5 flex items-center gap-4"
                >
                  {/* Mode icon */}
                  <div
                    className={cn(
                      'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                      selectedTheme.gradient,
                    )}
                    style={{ boxShadow: `0 10px 30px ${selectedTheme.accent}88` }}
                  >
                    <div className="text-white scale-150">{selectedTheme.icon}</div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-3xl font-black tracking-tight leading-tight"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        color: selectedTheme.accent,
                        textShadow: `0 0 20px ${selectedTheme.accent}88`,
                      }}
                    >
                      {selectedTheme.label}
                    </h2>
                    <p className="text-xs font-bold text-white/70 uppercase tracking-[0.15em] mb-0.5">
                      {selectedTheme.tagline}
                    </p>
                    <p className="text-xs text-white/50">{selectedTheme.description}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Mode picker (host) or read-only mode (guest) */}
            {isHost ? (
              <div
                className="relative flex-1 rounded-3xl bg-black/50 backdrop-blur-2xl border-2 border-white/10 overflow-hidden flex flex-col min-h-0"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}
              >
                <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-[0.15em]">
                    Choisir le mode
                  </h3>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Hôte
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  <div className="grid grid-cols-1 gap-2">
                    {MODE_THEMES.map((mode) => {
                      const isActive = mode.id === gameMode;
                      const meta = GAME_MODE_META[mode.id];
                      const enoughPlayers = connectedCount >= meta.minPlayers || isAdmin;
                      return (
                        <motion.button
                          key={mode.id}
                          type="button"
                          onClick={() => handleGameModeChange(mode.id)}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            'relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all',
                            isActive
                              ? 'bg-white/5'
                              : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/15',
                            !enoughPlayers && !isActive && 'opacity-50',
                          )}
                          style={
                            isActive
                              ? {
                                  borderColor: `${mode.accent}aa`,
                                  boxShadow: `0 0 25px ${mode.accent}55, inset 0 0 20px ${mode.accent}11`,
                                }
                              : undefined
                          }
                        >
                          {/* Mode icon */}
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                              isActive ? `bg-gradient-to-br ${mode.gradient}` : 'bg-white/5',
                            )}
                            style={
                              isActive
                                ? { boxShadow: `0 4px 12px ${mode.accent}88` }
                                : undefined
                            }
                          >
                            <div
                              className="text-white"
                              style={isActive ? undefined : { color: mode.accent }}
                            >
                              {mode.icon}
                            </div>
                          </div>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-bold truncate"
                              style={{ color: isActive ? mode.accent : 'white' }}
                            >
                              {mode.label}
                            </div>
                            <div className="text-[11px] text-white/50 truncate">
                              {mode.tagline}
                            </div>
                          </div>

                          {/* Min players badge */}
                          <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex-shrink-0">
                            {meta.minPlayers}+
                          </div>

                          {/* Active indicator */}
                          {isActive && (
                            <ChevronRight
                              className="w-4 h-4 flex-shrink-0"
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
              <div
                className="relative flex-1 rounded-3xl bg-black/50 backdrop-blur-2xl border-2 border-white/10 overflow-hidden flex items-center justify-center p-6"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-sm font-bold text-white">En attente du lancement</p>
                  <p className="text-xs text-white/50">L'hôte choisit le mode et lance la partie</p>
                </div>
              </div>
            )}

            {/* START button (host) */}
            {isHost && (
              <div className="flex-shrink-0 space-y-2">
                {/* Reasons (if cannot start) */}
                <AnimatePresence>
                  {!canStart && reasons.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <ul className="text-xs text-amber-200 space-y-0.5">
                          {reasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  whileHover={canStart ? { scale: 1.02, y: -2 } : undefined}
                  whileTap={canStart ? { scale: 0.98 } : undefined}
                  className={cn(
                    'relative w-full py-5 px-6 rounded-2xl font-black text-2xl tracking-wider transition-all overflow-hidden group text-white border-2',
                    !canStart && 'opacity-40 cursor-not-allowed',
                  )}
                  style={
                    canStart
                      ? {
                          background: `linear-gradient(135deg, ${selectedTheme.accent}, ${selectedTheme.accent}dd)`,
                          borderColor: selectedTheme.accent,
                          boxShadow: `0 0 50px ${selectedTheme.accent}aa, 0 10px 30px ${selectedTheme.accent}88, inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 0 rgba(0,0,0,0.3)`,
                        }
                      : {
                          background: 'rgba(255,255,255,0.05)',
                          borderColor: 'rgba(255,255,255,0.1)',
                        }
                  }
                >
                  {canStart && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                      <div className="absolute -top-1 -right-1 opacity-70 pointer-events-none">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    </>
                  )}
                  <span className="relative flex items-center justify-center gap-3">
                    <Play className="w-7 h-7" fill="currentColor" />
                    LANCER LA PARTIE
                  </span>
                </motion.button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Lobby Chat (its own positioning) */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />

      {/* INVITE PANEL DRAWER */}
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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col bg-[#08070d]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: selectedTheme.accent }} />
                  <h2 className="text-lg font-bold text-white">Inviter des joueurs</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvitePanel(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-50 bg-red-500/40" />
              <div className="relative bg-[#08070d]/95 backdrop-blur-2xl border-2 border-red-500/50 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Quitter le lobby ?</h3>
                    <p className="text-xs text-white/60">
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
                    className="flex-1 py-3 rounded-2xl border-2 border-white/15 text-white/80 hover:border-white/30 hover:text-white transition-all font-bold"
                  >
                    Rester
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playInkSound('inkClick', 0.4);
                      onLeaveGame();
                    }}
                    className="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all"
                  >
                    Quitter
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCROLLBAR */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
        .bg-gradient-radial { background: radial-gradient(circle at center, var(--tw-gradient-stops)); }
      `}</style>
    </div>
  );
};
