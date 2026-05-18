import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoPreview } from "@/components/VideoPreview";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Play, Check, Users, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DoodleBorder, DoodleStage } from "@/components/doodle/Doodle";
import { playInkSound } from "@/hooks/useInkSoundEffects";
import { cn } from "@/lib/utils";

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

const ACCENT = '#38bdf8';

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

  useEffect(() => {
    let isMounted = true;
    const fetchReadyPlayers = async () => {
      const { data } = await supabase
        .from('player_imitations')
        .select('player_id, is_ready')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber);

      if (data && isMounted) {
        setReadyPlayers(data.filter((p) => p.is_ready).map((p) => p.player_id));
      }
    };

    fetchReadyPlayers();

    const channel = supabase
      .channel(`preview:${lobbyId}:${roundNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_imitations',
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
      playInkSound('cartoonPop', 0.4);
      const { error } = await supabase
        .from('player_imitations')
        .upsert(
          {
            lobby_id: lobbyId,
            round_number: roundNumber,
            player_id: currentPlayer.id,
            player_name: currentPlayer.name,
            is_ready: true,
          },
          { onConflict: 'lobby_id,round_number,player_id' },
        );

      if (error) throw error;
      setIsReady(true);
    } catch (error) {
      console.error('Error marking ready:', error);
    }
  };

  return (
    <DoodleStage accent={ACCENT}>
      <div className="relative z-10 min-h-screen px-5 py-6 pb-[120px]">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 relative">
              <DoodleBorder color={ACCENT} filled />
              <Eye className="relative w-3.5 h-3.5" style={{ color: ACCENT }} />
              <span
                className="relative text-xs uppercase tracking-[0.25em] font-bold"
                style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
              >
                Phase d'observation · Manche {roundNumber}
              </span>
            </div>

            <h2
              className="text-3xl md:text-5xl font-black leading-none text-white"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: `0 0 18px ${ACCENT}33, 0 2px 8px rgba(0,0,0,0.5)`,
              }}
            >
              Aperçu du défi
            </h2>

            <p className="text-sm text-white/60">
              Vidéo de{' '}
              <span style={{ color: ACCENT }} className="font-bold">
                {currentChallenge.playerName}
              </span>
            </p>
            <p className="text-[11px] text-white/35 italic">
              ⚠️ La vidéo peut être sans son
            </p>
          </motion.div>

          {/* VIDEO CARD */}
          <motion.div
            initial={{ opacity: 0, y: 10, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.1 }}
            className="relative px-5 py-5"
          >
            <DoodleBorder color={ACCENT} rotation={1} thick />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" style={{ color: ACCENT }} />
                <h3
                  className="text-xl font-black"
                  style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                >
                  Vidéo à imiter
                </h3>
              </div>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <VideoPreview
                  clipId={currentChallenge.id}
                  className="w-full aspect-video"
                />
              </div>

              <div className="text-center pt-2">
                <motion.button
                  onClick={handleReady}
                  disabled={isReady}
                  whileHover={!isReady ? { scale: 1.02, y: -2 } : undefined}
                  whileTap={!isReady ? { scale: 0.98 } : undefined}
                  className={cn(
                    'relative w-full max-w-md mx-auto px-6 py-4 disabled:opacity-50',
                  )}
                >
                  <DoodleBorder
                    color={isReady ? '#34d399' : ACCENT}
                    filled
                    rotation={-1}
                    thick
                  />
                  <div className="relative flex items-center justify-center gap-2">
                    <Check
                      className="w-5 h-5"
                      style={{ color: isReady ? '#34d399' : ACCENT }}
                    />
                    <span
                      className="text-xl font-black"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        color: isReady ? '#34d399' : ACCENT,
                      }}
                    >
                      {isReady
                        ? 'En attente des autres…'
                        : "J'ai vu, je suis prêt !"}
                    </span>
                  </div>
                </motion.button>

                {isReady && (
                  <div className="flex items-center justify-center gap-2 text-white/55 mt-3">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs font-bold">
                      {readyPlayers.length}/{players.length} joueurs prêts
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* PLAYERS GRID */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative px-4 py-4"
          >
            <DoodleBorder color="rgba(255,255,255,0.18)" rotation={-1} />
            <div className="relative space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/60" />
                <span
                  className="text-base font-black"
                  style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                >
                  Statut des joueurs
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {players.map((player, idx) => {
                  const ready = readyPlayers.includes(player.id);
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="relative px-3 py-3 text-center"
                    >
                      <DoodleBorder
                        color={ready ? '#34d399' : 'rgba(255,255,255,0.12)'}
                        filled={ready}
                        rotation={idx % 2 === 0 ? -1 : 1}
                      />
                      <div className="relative flex flex-col items-center gap-2">
                        <PlayerAvatar
                          playerId={player.id}
                          playerName={player.name}
                          size="sm"
                          isHost={player.isHost}
                        />
                        <p
                          className="text-sm font-bold truncate text-white"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          {player.name}
                        </p>
                        <span
                          className="text-[10px] uppercase tracking-wider font-bold"
                          style={{ color: ready ? '#34d399' : 'rgba(255,255,255,0.4)' }}
                        >
                          {ready ? '✓ Prêt' : 'En cours'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DoodleStage>
  );
};
