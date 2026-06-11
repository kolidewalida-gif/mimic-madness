import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  Users,
  Crown,
  Copy,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  X,
  Sparkles,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { useGameTeams } from "@/hooks/useGameTeams";
import { getStartStatus, GAME_MODE_META, type LobbyGameMode } from "@/lib/gameModes";
import { useMultiplePlayerAvatars } from "@/hooks/useGlobalPlayerAvatar";
import { NeverLikeThatModeCarousel } from "@/components/neverlikethat/NeverLikeThatModeCarousel";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { DeviceSettings } from "@/components/DeviceSettings";
import { LobbyChat } from "@/components/LobbyChat";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

interface NeverLikeThatLobbyScreenProps {
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

export const NeverLikeThatLobbyScreen = ({
  players,
  lobbyCode,
  lobbyId,
  isHost,
  currentPlayer,
  onStartGame,
  onLeaveGame,
}: NeverLikeThatLobbyScreenProps) => {
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const { teams, assignRandomTeams } = useGameTeams(lobbyId);
  const [gameMode, setGameMode] = useState<LobbyGameMode>("normal");
  const [showSettings, setShowSettings] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);

  // Sync game mode with backend
  useEffect(() => {
    const fetchGameMode = async () => {
      const { data } = await supabase.from("lobbies").select("game_mode").eq("id", lobbyId).single();
      if (data?.game_mode) setGameMode(data.game_mode as LobbyGameMode);
    };
    fetchGameMode();

    const channel = supabase
      .channel(`lobby-mode-nlt:${lobbyId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lobbies", filter: `id=eq.${lobbyId}` },
        (payload: any) => {
          if (payload.new.game_mode) setGameMode(payload.new.game_mode as LobbyGameMode);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const handleGameModeChange = useCallback(
    async (mode: LobbyGameMode) => {
      if (!isHost) return;
      try {
        const { error } = await supabase.from("lobbies").update({ game_mode: mode }).eq("id", lobbyId);
        if (error) throw error;
        setGameMode(mode);
        if (mode === "2v2" && players.length >= 4 && players.length % 2 === 0) {
          await assignRandomTeams(players);
        }
      } catch (e) {
        console.error("Error updating game mode:", e);
        toast({ title: "Erreur", description: "Impossible de changer le mode", variant: "destructive" });
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
    if (gameMode === "2v2" && teams.length === 0 && !isAdmin) {
      toast({ title: "Équipes requises", description: "Formez d'abord les équipes", variant: "destructive" });
      return;
    }
    setIsLaunching(true);
    // Show the shader transition briefly, then launch
    await new Promise((r) => setTimeout(r, 1100));
    try {
      await onStartGame(gameMode);
    } catch (e) {
      console.error("[NLT] onStartGame failed:", e);
      setIsLaunching(false);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(lobbyCode);
    setCodeCopied(true);
    toast({ title: "📋 Code copié !", description: lobbyCode });
    setTimeout(() => setCodeCopied(false), 1500);
  };

  return (
    <div className="h-screen w-full flex flex-col text-white relative overflow-hidden">
      {/* TOP BAR */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.04, x: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onLeaveGame}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/80 hover:text-white hover:border-rose-400/40 hover:bg-rose-500/15 backdrop-blur-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">Quitter</span>
        </motion.button>

        <div className="text-center">
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-sky-300"
          >
            MIMIC MASTER
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-sky-300/70 font-bold">
              Never Like That
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/80 hover:text-white hover:border-sky-400/40 hover:bg-sky-500/15 backdrop-blur-md transition-all"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">Réglages</span>
        </motion.button>
      </header>

      {/* MAIN — carousel centerpiece + side rail */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 px-5 pb-5 overflow-hidden">
        {/* CENTER STAGE — the carousel is the hero */}
        <main className="flex flex-col items-center justify-center min-h-0 overflow-y-auto custom-scrollbar py-2">
          <div className="w-full max-w-2xl">
            <NeverLikeThatModeCarousel
              large
              gameMode={gameMode}
              onGameModeChange={handleGameModeChange}
              playerCount={connectedCount}
              isAdmin={isAdmin}
              disabled={!isHost}
            />

            {/* Reasons / launch */}
            <div className="mt-5 flex flex-col items-center gap-3">
              {isHost && !canStart && reasons.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-sm">
                  {reasons.join(" · ")}
                </div>
              )}

              {isHost ? (
                <motion.button
                  whileHover={canStart ? { scale: 1.03 } : undefined}
                  whileTap={canStart ? { scale: 0.97 } : undefined}
                  onClick={handleStartGame}
                  disabled={!canStart || isLaunching}
                  className={cn(
                    "relative flex items-center justify-center gap-3 w-full max-w-md py-4 rounded-2xl text-xl font-black tracking-wide transition-all overflow-hidden",
                    canStart && !isLaunching
                      ? "bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 text-white shadow-[0_0_30px_hsl(217_91%_60%/0.5)] hover:brightness-110"
                      : "bg-white/5 text-white/40 border border-white/10 cursor-not-allowed",
                  )}
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" /> Lancement…
                    </>
                  ) : (
                    <>
                      <Rocket className="w-6 h-6" /> Lancer la partie
                    </>
                  )}
                </motion.button>
              ) : (
                <div className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-bold">En attente de l'hôte…</span>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* SIDE RAIL — lobby code + players */}
        <aside className="flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Lobby code */}
          <div
            className="flex-shrink-0 rounded-2xl p-4 backdrop-blur-md"
            style={{
              background: "linear-gradient(160deg, hsl(240 22% 9% / 0.8), hsl(240 28% 5% / 0.85))",
              border: "1px solid hsl(217 91% 60% / 0.22)",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-sky-300/70 font-bold mb-2">
              Code du lobby
            </p>
            <button
              onClick={handleCopyCode}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 hover:border-sky-400/40 transition-all group"
            >
              <span className="text-3xl font-black tracking-[0.3em] text-white">{lobbyCode}</span>
              {codeCopied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Copy className="w-5 h-5 text-white/40 group-hover:text-sky-300" />
              )}
            </button>
          </div>

          {/* Players */}
          <div
            className="flex-1 min-h-0 flex flex-col rounded-2xl backdrop-blur-md overflow-hidden"
            style={{
              background: "linear-gradient(160deg, hsl(240 22% 9% / 0.8), hsl(240 28% 5% / 0.85))",
              border: "1px solid hsl(217 91% 60% / 0.22)",
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
              <Users className="w-4 h-4 text-sky-300" />
              <span className="text-sm font-black text-white">JOUEURS ({players.length})</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
              <AnimatePresence>
                {players.map((player, idx) => {
                  const isMe = player.id === currentPlayer.id;
                  const isDisc = player.isDisconnected;
                  const av = getAvatar(player.id);
                  const hasImage = av.type === "image" && av.imageUrl;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                        isMe ? "bg-sky-500/10 border border-sky-400/20" : "bg-white/[0.03]",
                        isDisc && "opacity-60",
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-black text-white border-2 border-white/15"
                          style={{ background: "linear-gradient(135deg, #38bdf8, #6366f1)" }}
                        >
                          {hasImage ? (
                            <img src={av.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            player.name[0]?.toUpperCase()
                          )}
                        </div>
                        <div
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0e1f]",
                            isDisc ? "bg-amber-400" : "bg-emerald-400",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white truncate">{player.name}</span>
                          {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="currentColor" />}
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-bold">
                          {isDisc ? (
                            <span className="flex items-center gap-1 text-amber-400">
                              <WifiOff className="w-2.5 h-2.5" /> Reconnexion
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Wifi className="w-2.5 h-2.5" /> En ligne
                            </span>
                          )}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating lobby chat */}
      <LobbyChat lobbyId={lobbyId} playerId={currentPlayer.id} playerName={currentPlayer.name} />

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(180deg, hsl(240 24% 8%), hsl(240 30% 4%))",
                border: "1px solid hsl(217 91% 60% / 0.3)",
                boxShadow: "0 24px 60px hsl(240 60% 2% / 0.7)",
              }}
            >
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-rose-500/20"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col min-h-0 flex-1">
                <DeviceSettings
                  showPreview
                  playerId={currentPlayer.id}
                  playerName={currentPlayer.name}
                  lobbyId={lobbyId}
                  onClose={() => setShowSettings(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LAUNCH TRANSITION — shader animation */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          >
            <div className="absolute inset-0">
              <ShaderAnimation />
            </div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative z-10 text-center pointer-events-none"
            >
              <Sparkles className="w-10 h-10 text-white mx-auto mb-3 animate-pulse" />
              <p className="text-4xl sm:text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(56,189,248,0.8)]">
                {GAME_MODE_META[gameMode].label}
              </p>
              <p className="mt-2 text-white/70 font-bold uppercase tracking-[0.3em] text-sm">
                Préparez-vous…
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56,189,248,0.5); }
      `}</style>
    </div>
  );
};
