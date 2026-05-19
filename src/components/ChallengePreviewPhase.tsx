import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { VideoPreview } from "@/components/VideoPreview";
import {
  Play,
  Check,
  Users,
  Eye,
  Loader2,
  Sparkles,
  Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playInkSound } from "@/hooks/useInkSoundEffects";
import { cn } from "@/lib/utils";
import { useMultiplePlayerAvatars } from "@/hooks/useGlobalPlayerAvatar";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Challenge {
  id: string;
  playerId: string;
  playerName: string;
}

interface ChallengePreviewPhaseProps {
  lobbyId: string;
  roundNumber: number;
  currentPlayer: Player;
  players: Player[];
  currentChallenge: Challenge;
  onAllReady: () => void;
}

const ACCENT = "#06b6d4"; // cyan — matches the lobby/menu DA
const GRAFFITI_TEXT_SHADOW =
  "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810";
const GRAFFITI_TEXT_SHADOW_SM =
  "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810";

export const ChallengePreviewPhase = ({
  lobbyId,
  roundNumber,
  currentPlayer,
  players,
  currentChallenge,
  onAllReady,
}: ChallengePreviewPhaseProps) => {
  const [isReady, setIsReady] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);

  useEffect(() => {
    let isMounted = true;
    const fetchReadyPlayers = async () => {
      const { data } = await supabase
        .from("player_imitations")
        .select("player_id, is_ready")
        .eq("lobby_id", lobbyId)
        .eq("round_number", roundNumber);

      if (data && isMounted) {
        setReadyPlayers(data.filter((p) => p.is_ready).map((p) => p.player_id));
      }
    };

    fetchReadyPlayers();

    const channel = supabase
      .channel(`preview:${lobbyId}:${roundNumber}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_imitations",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => {
          if (isMounted) fetchReadyPlayers();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber]);

  useEffect(() => {
    if (
      currentPlayer.isHost &&
      readyPlayers.length === players.length &&
      readyPlayers.length > 0
    ) {
      onAllReady();
    }
  }, [readyPlayers.length, players.length, onAllReady, currentPlayer.isHost]);

  const handleReady = async () => {
    try {
      playInkSound("cartoonPop", 0.4);
      const { error } = await supabase
        .from("player_imitations")
        .upsert(
          {
            lobby_id: lobbyId,
            round_number: roundNumber,
            player_id: currentPlayer.id,
            player_name: currentPlayer.name,
            is_ready: true,
          },
          { onConflict: "lobby_id,round_number,player_id" },
        );
      if (error) throw error;
      setIsReady(true);
    } catch (error) {
      console.error("Error marking ready:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0510] text-white relative overflow-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0820] via-[#0a0510] to-[#160a26]" />
        <div
          className="absolute top-0 left-1/3 w-[700px] h-[400px] rounded-full opacity-30"
          style={{
            background: `radial-gradient(ellipse, ${ACCENT}66, transparent 70%)`,
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full opacity-20"
          style={{
            background: `radial-gradient(ellipse, ${ACCENT}55, transparent 70%)`,
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen px-5 py-6 pb-[200px]">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* HEADER PILL */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: -2 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                border: "3px solid #0a0810",
                boxShadow: "0 4px 0 #0a0810",
              }}
            >
              <Eye className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span
                className="text-sm font-black uppercase tracking-wider text-white leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Phase d'observation · Manche {roundNumber}
              </span>
            </motion.div>

            <h2
              className="text-5xl md:text-6xl font-black leading-none text-white"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              Aperçu du défi
            </h2>

            <p
              className="text-base text-white/70 font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Vidéo de{" "}
              <span
                className="text-cyan-300"
                style={{ textShadow: `0 2px 8px ${ACCENT}88` }}
              >
                {currentChallenge.playerName}
              </span>
            </p>
            <p
              className="text-xs text-white/45 italic font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              ⚠️ La vidéo peut être sans son
            </p>
          </motion.div>

          {/* VIDEO CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", damping: 22 }}
            className="relative rounded-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)",
              border: "4px solid #0a0810",
              boxShadow:
                "0 8px 0 #0a0810, 0 14px 30px rgba(6,182,212,0.35), inset 0 2px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none z-[1]"
              style={{ border: `2px solid ${ACCENT}66` }}
            />
            <Sparkles
              className="absolute top-3 left-4 w-4 h-4 text-amber-400 z-10 select-none pointer-events-none"
              style={{ filter: "drop-shadow(1px 1px 0 #0a0810)" }}
            />
            <Sparkles
              className="absolute top-3 right-4 w-4 h-4 text-pink-400 z-10 select-none pointer-events-none"
              style={{ filter: "drop-shadow(1px 1px 0 #0a0810)" }}
            />

            <div className="relative p-5 space-y-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                    border: "2.5px solid #0a0810",
                    boxShadow: "0 3px 0 #0a0810",
                  }}
                >
                  <Play className="w-4 h-4 text-white" strokeWidth={2.5} />
                </motion.div>
                <h3
                  className="text-2xl font-black leading-none text-white"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  Vidéo à imiter
                </h3>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "3px solid #0a0810",
                  boxShadow: "0 4px 0 #0a0810",
                }}
              >
                <VideoPreview
                  clipId={currentChallenge.id}
                  className="w-full aspect-video"
                />
              </div>

              {/* READY BUTTON */}
              <motion.button
                onClick={handleReady}
                disabled={isReady}
                whileHover={!isReady ? { scale: 1.03, rotate: -1 } : undefined}
                whileTap={!isReady ? { scale: 0.97 } : undefined}
                className={cn(
                  "relative w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-opacity",
                  isReady && "opacity-90 cursor-not-allowed",
                )}
                style={{
                  background: isReady
                    ? "linear-gradient(180deg, #34d399, #059669)"
                    : `linear-gradient(180deg, #fbbf24, #d97706)`,
                  border: "4px solid #0a0810",
                  boxShadow:
                    "0 6px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)",
                }}
              >
                {isReady ? (
                  <Check className="w-6 h-6 text-white" strokeWidth={3} />
                ) : (
                  <Sparkles
                    className="w-5 h-5 text-white"
                    strokeWidth={2.5}
                  />
                )}
                <span
                  className="text-2xl font-black text-white leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  {isReady ? "En attente des autres…" : "J'ai vu, je suis prêt !"}
                </span>
              </motion.button>

              {isReady && (
                <div className="flex items-center justify-center gap-2 text-cyan-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span
                    className="text-sm font-black"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {readyPlayers.length}/{players.length} joueurs prêts
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* PLAYERS GRID */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative rounded-3xl overflow-hidden p-4 pt-3"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
              border: "3px solid #0a0810",
              boxShadow: "0 4px 0 #0a0810",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-white/70" />
              <span
                className="text-base font-black text-white leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Statut des joueurs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {players.map((player, idx) => {
                const ready = readyPlayers.includes(player.id);
                const isMe = player.id === currentPlayer.id;
                const av = getAvatar(player.id);
                const hasImage = av.type === "image" && av.imageUrl;
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: idx % 2 === 0 ? -1 : 1,
                    }}
                    transition={{ delay: idx * 0.04 }}
                    className="relative rounded-2xl p-3 flex flex-col items-center gap-2"
                    style={{
                      background: ready
                        ? "linear-gradient(180deg, rgba(52,211,153,0.18), rgba(5,150,105,0.05))"
                        : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                      border: "3px solid #0a0810",
                      boxShadow: ready
                        ? "0 3px 0 #0a0810, 0 0 12px rgba(52,211,153,0.4)"
                        : "0 3px 0 #0a0810",
                    }}
                  >
                    <div
                      className="relative w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: isMe
                          ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`
                          : "linear-gradient(135deg, #a855f7, #6b21a8)",
                        border: "3px solid #0a0810",
                        boxShadow: "0 3px 0 #0a0810",
                      }}
                    >
                      {hasImage ? (
                        <img
                          src={av.imageUrl}
                          alt={player.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0a0810]"
                        />
                      ) : (
                        <span
                          className="text-2xl font-black text-white leading-none"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {player.name[0]?.toUpperCase()}
                        </span>
                      )}
                      {player.isHost && (
                        <Crown
                          className="absolute -top-2 -right-1 w-4 h-4 text-amber-400"
                          fill="currentColor"
                          style={{
                            filter: "drop-shadow(1.5px 1.5px 0 #0a0810)",
                            transform: "rotate(15deg)",
                          }}
                        />
                      )}
                    </div>
                    <p
                      className="text-base font-black truncate text-white text-center max-w-full leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
                      {player.name}
                    </p>
                    <span
                      className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: ready
                          ? "linear-gradient(180deg, #34d399, #059669)"
                          : "rgba(255,255,255,0.08)",
                        border: "2px solid #0a0810",
                        color: "white",
                        boxShadow: "0 2px 0 #0a0810",
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
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
