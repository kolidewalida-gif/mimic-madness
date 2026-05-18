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
  WifiOff,
  AlertTriangle,
  Phone,
  Swords,
  Brain,
  Zap,
  Home as HomeIcon,
  UserX,
  Sparkles,
  MoreVertical,
  Loader2,
  Users,
  Lock,
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
  highlights: string[];
  icon: React.ReactNode;
  accent: string;
}

const MODE_THEMES: ModeTheme[] = [
  {
    id: 'audiophone',
    label: 'Audio Phone',
    tagline: 'Téléphone arabe audio',
    description: 'Une phrase est inversée, chacun tente d\'imiter ce qu\'il entend.',
    highlights: ['Audio inversé', 'Imitation', 'Fou rire garanti'],
    icon: <Phone className="w-5 h-5" />,
    accent: '#f87171',
  },
  {
    id: 'normal',
    label: 'Imitation',
    tagline: 'Mode classique',
    description: 'Un joueur lance un défi vidéo, les autres l\'imitent.',
    highlights: ['Défis vidéo', 'Vote', 'Convivial'],
    icon: <Copy className="w-5 h-5" />,
    accent: '#c084fc',
  },
  {
    id: '2v2',
    label: '2v2',
    tagline: 'Combat en équipes',
    description: 'Affrontement en équipes de 2, score collectif.',
    highlights: ['Équipes', 'Coopération', 'Compétitif'],
    icon: <Swords className="w-5 h-5" />,
    accent: '#fbbf24',
  },
  {
    id: 'quiz',
    label: 'Quiz',
    tagline: 'Connaissances',
    description: 'Questions variées, réponse la plus rapide gagne.',
    highlights: ['Culture G', 'Vitesse', 'Précision'],
    icon: <Brain className="w-5 h-5" />,
    accent: '#38bdf8',
  },
  {
    id: 'pixoguess',
    label: 'BlurRush',
    tagline: 'Devinez l\'image',
    description: 'L\'image se dépixelise, soyez le plus rapide à deviner.',
    highlights: ['Réflexes', 'Dépixelisation', 'Speed'],
    icon: <Zap className="w-5 h-5" />,
    accent: '#34d399',
  },
  {
    id: 'monopoly',
    label: 'Monopoly',
    tagline: 'Plateau aventure',
    description: 'Avancez sur le plateau, défis à chaque case.',
    highlights: ['Plateau', 'Mini-jeux', 'Long format'],
    icon: <HomeIcon className="w-5 h-5" />,
    accent: '#f472b6',
  },
  {
    id: 'undercover',
    label: 'Undercover',
    tagline: 'Trouvez l\'infiltré',
    description: 'Donnez des indices, démasquez l\'imposteur.',
    highlights: ['Bluff', 'Indices', 'Vote'],
    icon: <UserX className="w-5 h-5" />,
    accent: '#cbd5e1',
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
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
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
  const minPlayers = GAME_MODE_META[gameMode].minPlayers;

  const handleStartGame = async () => {
    if (gameMode === '2v2' && teams.length === 0 && !isAdmin) {
      toast({ title: 'Équipes requises', description: "Formez d'abord les équipes", variant: 'destructive' });
      return;
    }
    setIsStarting(true);
    playInkSound('inkSuccess', 0.6);
    try {
      await onStartGame(gameMode);
    } catch (error) {
      console.error('[InkLobby] onStartGame failed:', error);
      setIsStarting(false);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(lobbyCode);
    setCodeCopied(true);
    playInkSound('inkSuccess', 0.3);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenuFor) return;
    const close = () => setOpenMenuFor(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuFor]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0810] text-white relative overflow-hidden">
      {/* Background canvas */}
      <InkLobbyCanvas lobbyId={lobbyId} playerId={currentPlayer.id} />
      <InkCursorParticles />

      {/* Background tints */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0813] via-[#0a0810] to-[#0c0814]" />
        <AnimatePresence mode="sync">
          <motion.div
            key={selectedTheme.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <div
              className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full opacity-25"
              style={{
                background: `radial-gradient(ellipse, ${selectedTheme.accent}66 0%, transparent 70%)`,
                filter: 'blur(90px)',
              }}
            />
            <div
              className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full opacity-20"
              style={{
                background: `radial-gradient(ellipse, ${selectedTheme.accent}55 0%, transparent 70%)`,
                filter: 'blur(80px)',
              }}
            />
          </motion.div>
        </AnimatePresence>
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* HEADER — minimal left/center, big PLAY on the right */}
      <header className="relative z-30 flex items-center justify-between gap-4 px-5 py-3 flex-shrink-0">
        {/* Left cluster */}
        <div className="flex items-center gap-3">
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

          {/* Lobby code */}
          <motion.button
            onClick={handleCopyCode}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border transition-all"
            style={{ borderColor: `${selectedTheme.accent}50` }}
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

          {/* Title */}
          <div
            className="hidden md:block text-base font-black tracking-[0.15em]"
            style={{
              fontFamily: "'Caveat', cursive",
              background: `linear-gradient(180deg, white, ${selectedTheme.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            MIMIC MASTER
          </div>
        </div>

        {/* Right cluster — PLAY is the star */}
        <div className="flex items-center gap-2">
          {/* Invite */}
          <motion.button
            onClick={() => {
              playInkSound('brushTap', 0.3);
              setShowInvitePanel(true);
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: `${selectedTheme.accent}15`,
              border: `1px solid ${selectedTheme.accent}50`,
              color: selectedTheme.accent,
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Inviter</span>
          </motion.button>

          {/* Settings */}
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowSettings(true);
            }}
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.96 }}
            className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] flex items-center justify-center text-white/70 hover:text-white transition-all"
            aria-label="Paramètres"
          >
            <Settings className="w-3.5 h-3.5" />
          </motion.button>

          {/* PLAY — star of the show */}
          {isHost ? (
            <motion.button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              whileHover={canStart && !isStarting ? { scale: 1.04, y: -1 } : undefined}
              whileTap={canStart && !isStarting ? { scale: 0.97 } : undefined}
              animate={
                canStart && !isStarting
                  ? {
                      boxShadow: [
                        `0 4px 20px ${selectedTheme.accent}66`,
                        `0 4px 30px ${selectedTheme.accent}99`,
                        `0 4px 20px ${selectedTheme.accent}66`,
                      ],
                    }
                  : undefined
              }
              transition={
                canStart && !isStarting
                  ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  : undefined
              }
              className={cn(
                'relative ml-2 flex items-center gap-2 px-5 py-2 rounded-lg font-black text-base tracking-wide transition-all overflow-hidden group',
                (!canStart || isStarting) && 'cursor-not-allowed opacity-50',
              )}
              style={
                canStart && !isStarting
                  ? {
                      background: `linear-gradient(135deg, ${selectedTheme.accent}, ${selectedTheme.accent}dd)`,
                      color: 'white',
                    }
                  : {
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                    }
              }
              title={!canStart ? reasons.join(' · ') : 'Lancer la partie'}
            >
              {canStart && !isStarting && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              )}
              <span className="relative flex items-center gap-2">
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Démarrage…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" />
                    <span>JOUER</span>
                  </>
                )}
              </span>
            </motion.button>
          ) : (
            <div className="ml-2 flex items-center gap-2 px-5 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white/50 text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline font-bold">En attente de l'hôte</span>
            </div>
          )}
        </div>
      </header>

      {/* Reasons banner — only for host who can't start */}
      <AnimatePresence>
        {isHost && !canStart && reasons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden relative z-20 px-5 flex-shrink-0"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/[0.1] border border-amber-500/30 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-200/90">{reasons.join(' · ')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN — 2 columns */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden px-5 pb-[88px]">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-3 min-h-0">
          {/* LEFT — Players column */}
          <section className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/8 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-white/50" />
                <h2 className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">
                  Joueurs
                </h2>
                <span
                  className="text-xs font-black"
                  style={{ color: selectedTheme.accent }}
                >
                  {players.length}
                </span>
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                {connectedCount}/{Math.max(players.length, minPlayers)}
                {' · '}
                <span style={{ color: selectedTheme.accent }}>min {minPlayers}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              <div className="space-y-2">
                <AnimatePresence>
                  {players.map((player, idx) => {
                    const isMe = player.id === currentPlayer.id;
                    const isDisc = player.isDisconnected;
                    const playerTeam = teams.find((t) =>
                      t.players?.some((p) => p === player.id),
                    );
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                          isMe ? 'bg-white/[0.05]' : 'bg-black/40 border-white/8 hover:bg-white/[0.03]',
                          isDisc && 'opacity-60',
                        )}
                        style={isMe ? { borderColor: `${selectedTheme.accent}66` } : undefined}
                      >
                        <div className="relative flex-shrink-0">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white',
                              isDisc && 'saturate-50',
                            )}
                            style={{
                              background: `linear-gradient(135deg, ${selectedTheme.accent}, ${selectedTheme.accent}99)`,
                            }}
                          >
                            {player.name[0]?.toUpperCase()}
                          </div>
                          <div
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0810]',
                              isDisc ? 'bg-amber-400' : 'bg-emerald-400',
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate">
                              {player.name}
                            </span>
                            {player.isHost && (
                              <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" />
                            )}
                            {isMe && (
                              <span className="text-[9px] uppercase tracking-wider font-bold text-white/40 flex-shrink-0">
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-white/40">
                            {isDisc ? (
                              <span className="flex items-center gap-1 text-amber-400">
                                <WifiOff className="w-2.5 h-2.5" />
                                Reconnexion
                                {player.disconnectedTimeLeft !== undefined && ` ${player.disconnectedTimeLeft}s`}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                En ligne
                              </span>
                            )}
                            {playerTeam && gameMode === '2v2' && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-bold uppercase tracking-wider">
                                {playerTeam.team_name || `Eq ${playerTeam.team_number}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {isHost && !isMe && (onKickPlayer || onTransferHost) && (
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playInkSound('inkClick', 0.3);
                                setOpenMenuFor(openMenuFor === player.id ? null : player.id);
                              }}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            <AnimatePresence>
                              {openMenuFor === player.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-9 z-50 w-44 rounded-xl bg-[#0a0810]/95 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden"
                                >
                                  {onTransferHost && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playInkSound('inkClick', 0.3);
                                        onTransferHost(player.id);
                                        setOpenMenuFor(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-amber-500/10 hover:text-amber-400 transition-colors text-left"
                                    >
                                      <Crown className="w-3.5 h-3.5" />
                                      Transférer l'hôte
                                    </button>
                                  )}
                                  {onKickPlayer && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playInkSound('inkClick', 0.3);
                                        onKickPlayer(player.id);
                                        setOpenMenuFor(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left border-t border-white/8"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      Exclure du lobby
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, minPlayers - players.length) }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-white/10"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 text-xs font-bold">
                      ?
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white/30">En attente d'un joueur…</div>
                      <div className="text-[10px] text-white/20">Slot requis</div>
                    </div>
                  </div>
                ))}

                {/* Invite CTA */}
                {players.length < 8 && (
                  <button
                    type="button"
                    onClick={() => {
                      playInkSound('brushTap', 0.3);
                      setShowInvitePanel(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-white/10 hover:border-white/25 hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/30 group-hover:text-white/60 transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-xs font-bold text-white/40 group-hover:text-white/70 transition-colors">
                        Inviter un ami
                      </div>
                      <div className="text-[10px] text-white/25">Code, lien, amis en ligne</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT — Mode hero + grid */}
          <section className="flex flex-col min-h-0 gap-3">
            {/* HERO — selected mode preview, big and visible */}
            <div
              className="relative rounded-2xl overflow-hidden border-2 backdrop-blur-md flex-shrink-0"
              style={{
                borderColor: `${selectedTheme.accent}55`,
                background: `linear-gradient(135deg, ${selectedTheme.accent}10 0%, transparent 60%), rgba(0,0,0,0.4)`,
                boxShadow: `0 8px 32px ${selectedTheme.accent}22`,
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${selectedTheme.accent}, transparent)`,
                }}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTheme.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="relative px-5 py-4 flex items-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${selectedTheme.accent}25`,
                      border: `1px solid ${selectedTheme.accent}80`,
                      boxShadow: `0 8px 24px ${selectedTheme.accent}55`,
                    }}
                  >
                    <div style={{ color: selectedTheme.accent }} className="scale-150">
                      {selectedTheme.icon}
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h1
                        className="text-3xl font-black tracking-tight leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          color: selectedTheme.accent,
                        }}
                      >
                        {selectedTheme.label}
                      </h1>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
                        · {selectedTheme.tagline}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 leading-snug">
                      {selectedTheme.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {selectedTheme.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${selectedTheme.accent}15`,
                            border: `1px solid ${selectedTheme.accent}40`,
                            color: selectedTheme.accent,
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* MODE GRID — visual mode picker */}
            <div className="flex-1 rounded-2xl bg-black/35 backdrop-blur-md border border-white/8 overflow-hidden flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">
                  Choisir le mode
                </h2>
                {!isHost && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    <Lock className="w-3 h-3" />
                    Hôte uniquement
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODE_THEMES.map((mode) => {
                    const isActive = mode.id === gameMode;
                    const meta = GAME_MODE_META[mode.id];
                    const enoughPlayers = connectedCount >= meta.minPlayers || isAdmin;
                    const disabled = !isHost;

                    return (
                      <motion.button
                        key={mode.id}
                        type="button"
                        onClick={() => !disabled && handleGameModeChange(mode.id)}
                        whileHover={!disabled ? { y: -2, scale: 1.02 } : undefined}
                        whileTap={!disabled ? { scale: 0.98 } : undefined}
                        disabled={disabled}
                        className={cn(
                          'relative aspect-[3/2] rounded-xl border-2 overflow-hidden flex flex-col items-center justify-center gap-1.5 p-2 text-center transition-all group',
                          isActive ? 'bg-white/[0.06]' : 'bg-black/40 border-white/8 hover:bg-white/[0.03] hover:border-white/15',
                          !enoughPlayers && !isActive && 'opacity-50',
                          disabled && 'cursor-default',
                        )}
                        style={
                          isActive
                            ? {
                                borderColor: mode.accent,
                                boxShadow: `0 0 0 1px ${mode.accent}40, inset 0 0 30px ${mode.accent}10`,
                              }
                            : undefined
                        }
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div
                            className="absolute top-2 right-2 w-2 h-2 rounded-full"
                            style={{
                              background: mode.accent,
                              boxShadow: `0 0 8px ${mode.accent}`,
                            }}
                          />
                        )}

                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                          style={{
                            background: isActive ? `${mode.accent}25` : 'rgba(255,255,255,0.04)',
                            border: isActive ? `1px solid ${mode.accent}66` : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <div style={{ color: mode.accent }}>{mode.icon}</div>
                        </div>

                        {/* Label */}
                        <div
                          className="text-sm font-black leading-tight"
                          style={{ color: isActive ? mode.accent : 'white' }}
                        >
                          {mode.label}
                        </div>
                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                          {meta.minPlayers}+ joueurs
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Floating chat */}
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
