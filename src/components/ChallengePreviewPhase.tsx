import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoPreview } from "@/components/VideoPreview";
import { Play, Check, Users, Eye, Loader2, Sparkles, Crown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playInkSound } from "@/hooks/useInkSoundEffects";
import { cn } from "@/lib/utils";
import { useMultiplePlayerAvatars } from "@/hooks/useGlobalPlayerAvatar";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

interface Player { id: string; name: string; isHost: boolean; }
interface Challenge { id: string; playerId: string; playerName: string; }
interface ChallengePreviewPhaseProps {
  lobbyId: string; roundNumber: number; currentPlayer: Player;
  players: Player[]; currentChallenge: Challenge; onAllReady: () => void;
}

const SHADOW = "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810";
const SHADOW_SM = "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810";
const FONT = "'Caveat', cursive";
const ACCENT = "#06b6d4";

export const ChallengePreviewPhase = ({
  lobbyId, roundNumber, currentPlayer, players, currentChallenge, onAllReady,
}: ChallengePreviewPhaseProps) => {
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  // Derive isReady from DB state — survives page reloads and prevents desync
  const isReady = readyPlayers.includes(currentPlayer.id);
  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);
  const { setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();

  // Music: switch to a calmer "preview" track for the build-up before the
  // round starts. Cleared on unmount so the next phase (imitation) can pick
  // up its own track.
  useEffect(() => {
    if (autoMode) {
      setSituation("preview", { priority: 2, source: "preview-phase" });
    }
    return () => {
      if (autoMode) clearSituationOverride("preview-phase");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

  // Single channel for both sending and receiving "player ready" broadcasts.
  // Also fetches from DB as fallback for reconnections.
  const readyBroadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchReady = async () => {
      const { data } = await supabase.from("player_imitations").select("player_id, is_ready")
        .eq("lobby_id", lobbyId).eq("round_number", roundNumber);
      if (data && isMounted) setReadyPlayers(data.filter((p) => p.is_ready).map((p) => p.player_id));
    };
    fetchReady();

    // Single broadcast channel — self:true so sender also receives their own event
    const ch = supabase
      .channel(`ready-sync:${lobbyId}:${roundNumber}`, { config: { broadcast: { self: true, ack: false } } })
      .on('broadcast', { event: 'player_ready' }, (msg) => {
        if (!isMounted) return;
        const pid = msg.payload?.playerId as string | undefined;
        if (pid) setReadyPlayers((prev) => prev.includes(pid) ? prev : [...prev, pid]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') readyBroadcastRef.current = ch;
      });

    // Postgres realtime as fallback
    const pgChannel = supabase.channel(`preview-pg:${lobbyId}:${roundNumber}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_imitations", filter: `lobby_id=eq.${lobbyId}` }, () => { if (isMounted) fetchReady(); })
      .subscribe();

    return () => {
      isMounted = false;
      readyBroadcastRef.current = null;
      supabase.removeChannel(ch);
      supabase.removeChannel(pgChannel);
    };
  }, [lobbyId, roundNumber]);

  useEffect(() => {
    if (currentPlayer.isHost && readyPlayers.length === players.length && readyPlayers.length > 0) onAllReady();
  }, [readyPlayers.length, players.length, onAllReady, currentPlayer.isHost]);

  const handleReady = async () => {
    if (isReady) return;
    try {
      playInkSound("cartoonPop", 0.4);
      // Broadcast instantly to all clients
      readyBroadcastRef.current?.send({ type: 'broadcast', event: 'player_ready', payload: { playerId: currentPlayer.id } });
      // Optimistic update
      setReadyPlayers((prev) => prev.includes(currentPlayer.id) ? prev : [...prev, currentPlayer.id]);
      // Persist to DB
      const { error } = await supabase.from("player_imitations").upsert(
        { lobby_id: lobbyId, round_number: roundNumber, player_id: currentPlayer.id, player_name: currentPlayer.name, is_ready: true },
        { onConflict: "lobby_id,round_number,player_id" }
      );
      if (error) {
        setReadyPlayers((prev) => prev.filter((id) => id !== currentPlayer.id));
        console.error('Ready failed:', error);
      }
    } catch (e) {
      setReadyPlayers((prev) => prev.filter((id) => id !== currentPlayer.id));
      console.error(e);
    }
  };

  return (
    <div className="h-[100dvh] text-white relative overflow-hidden flex flex-col" style={{ background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}>
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${ACCENT}55, transparent 70%)`, filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[10%] right-[8%] w-6 h-6 text-amber-400/30" />
        <Sparkles className="absolute bottom-[20%] left-[5%] w-5 h-5 text-pink-400/25" />
        <Zap className="absolute top-[40%] right-[3%] w-4 h-4 text-cyan-400/20" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 py-5 pb-[140px]">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Phase badge */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -2 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`, border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
              <Eye className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                👁️ Observation · Manche {roundNumber}
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-black leading-none text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
              Aperçu du défi
            </h2>
            <p className="text-base text-white/70 font-bold" style={{ fontFamily: FONT }}>
              Vidéo de <span style={{ color: ACCENT, textShadow: `0 2px 8px ${ACCENT}88` }}>{currentChallenge.playerName}</span>
            </p>
          </motion.div>

          {/* Video card */}
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", damping: 22 }}
            className="relative rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(180deg, #1a0d2e, #0f0820)", border: "4px solid #0a0810", boxShadow: `0 8px 0 #0a0810, 0 0 30px ${ACCENT}33` }}>
            <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: `2px solid ${ACCENT}44` }} />
            <Sparkles className="absolute top-3 left-4 w-4 h-4 text-amber-400 z-10" style={{ filter: "drop-shadow(1px 1px 0 #0a0810)" }} />
            <Sparkles className="absolute top-3 right-4 w-4 h-4 text-pink-400 z-10" style={{ filter: "drop-shadow(1px 1px 0 #0a0810)" }} />

            <div className="relative p-5 space-y-4">
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 2, repeat: Infinity }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, border: "2.5px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
                  <Play className="w-4 h-4 text-white" strokeWidth={2.5} />
                </motion.div>
                <h3 className="text-2xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Vidéo à imiter</h3>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
                <VideoPreview clipId={currentChallenge.id} className="w-full aspect-video" />
              </div>

              {/* Ready button */}
              <motion.button onClick={handleReady} disabled={isReady}
                whileHover={!isReady ? { scale: 1.03, rotate: -1 } : undefined}
                whileTap={!isReady ? { scale: 0.97 } : undefined}
                className={cn("relative w-full py-4 rounded-2xl flex items-center justify-center gap-3", isReady && "cursor-not-allowed")}
                style={{
                  background: isReady ? "linear-gradient(180deg, #34d399, #059669)" : "linear-gradient(180deg, #fbbf24, #d97706)",
                  border: "4px solid #0a0810", boxShadow: "0 6px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)",
                }}>
                {isReady ? <Check className="w-6 h-6 text-white" strokeWidth={3} /> : <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />}
                <span className="text-2xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                  {isReady ? "En attente des autres…" : "J'ai vu, je suis prêt !"}
                </span>
              </motion.button>

              {isReady && (
                <div className="flex items-center justify-center gap-2 text-cyan-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-sm font-black" style={{ fontFamily: FONT }}>
                    {readyPlayers.length}/{players.length} joueurs prêts
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Players grid */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative rounded-3xl overflow-hidden p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Statut des joueurs</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {players.map((player, idx) => {
                const ready = readyPlayers.includes(player.id);
                const isMe = player.id === currentPlayer.id;
                const av = getAvatar(player.id);
                return (
                  <motion.div key={player.id} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="relative rounded-2xl p-3 flex flex-col items-center gap-2"
                    style={{
                      background: ready ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
                      border: "3px solid #0a0810",
                      boxShadow: ready ? "0 3px 0 #0a0810, 0 0 12px rgba(52,211,153,0.3)" : "0 3px 0 #0a0810",
                    }}>
                    <div className="relative w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: isMe ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)` : "linear-gradient(135deg, #a855f7, #6b21a8)", border: "3px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
                      {av.type === "image" && av.imageUrl
                        ? <img src={av.imageUrl} alt={player.name} className="w-9 h-9 rounded-full object-cover" />
                        : <span className="text-xl font-black text-white" style={{ fontFamily: FONT }}>{player.name[0]?.toUpperCase()}</span>}
                      {player.isHost && <Crown className="absolute -top-2 -right-1 w-4 h-4 text-amber-400" fill="currentColor" style={{ filter: "drop-shadow(1.5px 1.5px 0 #0a0810)" }} />}
                    </div>
                    <p className="text-sm font-black truncate text-white text-center max-w-full" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>{player.name}</p>
                    <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full"
                      style={{ background: ready ? "linear-gradient(180deg, #34d399, #059669)" : "rgba(255,255,255,0.08)", border: "2px solid #0a0810", color: "white", boxShadow: "0 2px 0 #0a0810", fontFamily: FONT, textShadow: SHADOW_SM }}>
                      {ready ? "✓ Prêt" : "En cours"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
