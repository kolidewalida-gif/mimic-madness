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
  Users,
  MoreVertical,
  Loader2,
  ShieldCheck,
  Info,
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
  rules: string[];
  icon: React.ReactNode;
  accent: string;
}

const MODE_THEMES: ModeTheme[] = [
  {
    id: 'audiophone',
    label: 'Audio Phone',
    tagline: 'Téléphone arabe audio',
    description: 'Enregistrez, écoutez, imitez. Fou rire garanti.',
    rules: [
      'Une phrase est enregistrée puis inversée',
      'Chacun écoute et tente d\'imiter ce qu\'il entend',
      'La révélation finale décide du gagnant',
    ],
    icon: <Phone className="w-4 h-4" />,
    accent: '#ff5050',
  },
  {
    id: 'normal',
    label: 'Imitation',
    tagline: 'Mode classique',
    description: 'Imitez les défis vidéo des autres joueurs.',
    rules: [
      'Un joueur lance un défi vidéo',
      'Les autres l\'imitent au plus proche',
      'Vote pour la meilleure imitation',
    ],
    icon: <Copy className="w-4 h-4" />,
    accent: '#a855f7',
  },
  {
    id: '2v2',
    label: '2v2',
    tagline: 'Combat en équipes',
    description: 'Affrontement en équipes de 2, score collectif.',
    rules: [
      'Équipes de 2 joueurs',
      'Collaboration sur les défis',
      'L\'équipe avec le plus de points gagne',
    ],
    icon: <Swords className="w-4 h-4" />,
    accent: '#f59e0b',
  },
  {
    id: 'quiz',
    label: 'Quiz',
    tagline: 'Connaissances',
    description: 'Questions variées, réponse la plus rapide gagne.',
    rules: [
      'Culture générale, jeux, films…',
      'Plus rapide = plus de points',
      'Précision compte aussi',
    ],
    icon: <Brain className="w-4 h-4" />,
    accent: '#0ea5e9',
  },
  {
    id: 'pixoguess',
    label: 'BlurRush',
    tagline: 'Devinez l\'image',
    description: 'L\'image se dépixelise, soyez le plus rapide.',
    rules: [
      'L\'image se révèle progressivement',
      'Premier à deviner remporte la manche',
      'Plus rapide = plus de points',
    ],
    icon: <Zap className="w-4 h-4" />,
    accent: '#10b981',
  },
  {
    id: 'monopoly',
    label: 'Monopoly',
    tagline: 'Plateau aventure',
    description: 'Avancez sur le plateau, défis à chaque case.',
    rules: [
      'Lancez les dés pour avancer',
      'Chaque case = un mini-jeu',
      'Premier au tour final gagne',
    ],
    icon: <HomeIcon className="w-4 h-4" />,
    accent: '#ec4899',
  },
  {
    id: 'undercover',
    label: 'Undercover',
    tagline: 'Trouvez l\'infiltré',
    description: 'Donnez des indices, démasquez l\'imposteur.',
    rules: [
      'Chaque joueur reçoit un mot secret',
      'L\'undercover a un mot proche mais différent',
      'Indices et votes pour éliminer',
    ],
    icon: <UserX className="w-4 h-4" />,
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
    if (gameMode === '2v2' && teams.length === 0) {
      toast({ title: 'Équipes requises', description: "Formez d'abord les équipes", variant: 'destructive' });
      return;
    }
    setIsStarting(true);
    playInkSound('inkSuccess', 0.5);
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
      {/* Background canvas (collaborative drawing) */}
      <InkLobbyCanvas lobbyId={lobbyId} playerId={currentPlayer.id} />

      {/* Cursor particles */}
      <InkCursorParticles />

      {/* Background tints */}
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
              className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full opacity-20"
              style={{
                background: `radial-gradient(ellipse, ${selectedTheme.accent}55 0%, transparent 70%)`,
                filter: 'blur(80px)',
              }}
            />
            <div
              className="absolute bottom-0 right-1/4 w-[400px] h-[250px] rounded-full opacity-15"
              style={{
                background: `radial-gradient(ellipse, ${selectedTheme.accent}44 0%, transparent 70%)`,
                filter: 'blur(70px)',
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

      {/* HEADER */}
      <header className="relative z-30 flex items-center justify-between px-5 py-3 flex-shrink-0">
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

        <div className="flex items-center gap-4">
          <div
            className="hidden md:block text-lg font-black tracking-[0.15em]"
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

        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => {
              playInkSound('brushTap', 0.3);
              setShowInvitePanel(true);
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: `${selectedTheme.accent}15`,
              border: `1px solid ${selectedTheme.accent}50`,
              color: selectedTheme.accent,
            }}
          >
            <Sparkles className="w-3 h-3" />
            Inviter
          </motion.button>
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
        </div>
      </header>

      {/* MAIN — packed grid */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden px-5 pb-3 gap-3">
        {/* Mode HERO bar */}
        <section
          className="flex-shrink-0 rounded-2xl bg-black/30 backdrop-blur-md border overflow-hidden relative"
          style={{ borderColor: `${selectedTheme.accent}40` }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${selectedTheme.accent}, transparent)`,
            }}
          />
          <div className="relative px-5 py-3 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `${selectedTheme.accent}1f`,
                border: `1px solid ${selectedTheme.accent}66`,
                boxShadow: `0 4px 16px ${selectedTheme.accent}33`,
              }}
            >
              <div style={{ color: selectedTheme.accent }} className="scale-150">
                {selectedTheme.icon}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTheme.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-baseline gap-2">
                    <h1
                      className="text-2xl font-black tracking-tight leading-none"
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
                  <p className="text-xs text-white/50 mt-0.5 truncate">{selectedTheme.description}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Joueurs</div>
                <div className="text-lg font-black text-white">
                  {connectedCount}
                  <span className="text-white/30 text-sm">/{Math.max(minPlayers, players.length)}</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Min requis</div>
                <div className="text-lg font-black" style={{ color: selectedTheme.accent }}>
                  {minPlayers}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE — three columns: players, modes, mode info */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr_1fr] gap-3 min-h-0">
          {/* PLAYERS PANEL */}
          <section className="rounded-2xl bg-black/30 backdrop-blur-md border border-white/8 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-white/50" />
                <h2 className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">
                  Joueurs ({players.length})
                </h2>
              </div>
              {isHost && (
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Hôte
                </span>
              )}
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
                          isMe
                            ? 'bg-white/[0.05]'
                            : 'bg-black/40 border-white/8 hover:bg-white/[0.03]',
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
                {players.length >= minPlayers && players.length < 8 && (
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
                      <div className="text-[10px] text-white/25">Ajoute encore plus de joueurs</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* MODE PICKER */}
          <section className="rounded-2xl bg-black/30 backdrop-blur-md border border-white/8 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">
                Modes
              </h2>
              {isHost ? (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: selectedTheme.accent }}
                >
                  Choisir
                </span>
              ) : (
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  Lecture
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <div className="grid grid-cols-1 gap-1">
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
                      whileHover={!disabled ? { x: 2 } : undefined}
                      whileTap={!disabled ? { scale: 0.99 } : undefined}
                      disabled={disabled}
                      className={cn(
                        'relative w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all',
                        isActive
                          ? 'bg-white/[0.05]'
                          : 'bg-transparent border-white/5 hover:bg-white/[0.03] hover:border-white/10',
                        !enoughPlayers && !isActive && 'opacity-50',
                        disabled && 'cursor-default',
                      )}
                      style={isActive ? { borderColor: `${mode.accent}80` } : undefined}
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
                          className="text-[12px] font-bold leading-tight truncate"
                          style={{ color: isActive ? mode.accent : 'rgba(255,255,255,0.95)' }}
                        >
                          {mode.label}
                        </div>
                        <div className="text-[10px] text-white/40 leading-tight truncate">
                          {meta.minPlayers}+ joueurs
                        </div>
                      </div>

                      {isActive && (
                        <ShieldCheck
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: mode.accent }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* MODE INFO PANEL — rules/tips for selected mode */}
          <section className="rounded-2xl bg-black/30 backdrop-blur-md border border-white/8 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-white/50" />
                <h2 className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">
                  Comment jouer
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTheme.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  {/* Mode preview hero */}
                  <div
                    className="rounded-xl p-4 flex items-center gap-3 border"
                    style={{
                      background: `linear-gradient(135deg, ${selectedTheme.accent}15, transparent)`,
                      borderColor: `${selectedTheme.accent}33`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${selectedTheme.accent}25`,
                      }}
                    >
                      <div style={{ color: selectedTheme.accent }}>
                        {selectedTheme.icon}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-base font-black leading-tight"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          color: selectedTheme.accent,
                        }}
                      >
                        {selectedTheme.label}
                      </div>
                      <div className="text-[10px] text-white/50 leading-tight">
                        {selectedTheme.tagline}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-white/60 leading-relaxed">
                    {selectedTheme.description}
                  </p>

                  {/* Rules */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mb-1.5">
                      Règles principales
                    </div>
                    {selectedTheme.rules.map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-white/70 leading-relaxed"
                      >
                        <div
                          className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: selectedTheme.accent }}
                        />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>

                  {/* Min players badge */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-white/40">
                        Joueurs requis
                      </span>
                      <span
                        className="text-sm font-black"
                        style={{ color: selectedTheme.accent }}
                      >
                        {GAME_MODE_META[selectedTheme.id].minPlayers}+
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* BOTTOM — Start CTA */}
        <section className="flex-shrink-0">
          <AnimatePresence>
            {isHost && !canStart && reasons.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/25">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] text-amber-200/90">
                    {reasons.join(' · ')}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isHost ? (
            <motion.button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              whileHover={canStart && !isStarting ? { scale: 1.005 } : undefined}
              whileTap={canStart && !isStarting ? { scale: 0.995 } : undefined}
              className={cn(
                'relative w-full py-3.5 px-5 rounded-xl font-bold text-base tracking-wide transition-all overflow-hidden group',
                (!canStart || isStarting) && 'cursor-not-allowed',
              )}
              style={
                canStart && !isStarting
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
              {canStart && !isStarting && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Démarrage…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" />
                    Lancer la partie
                  </>
                )}
              </span>
            </motion.button>
          ) : (
            <div className="w-full py-3.5 px-5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center gap-2 text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
              <span className="text-white/60 font-bold">
                En attente du lancement par l'hôte
              </span>
            </div>
          )}
        </section>
      </main>

      {/* Floating chat (kept as designed, bottom-left bubble) */}
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
