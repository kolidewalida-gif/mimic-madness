import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VideoUploadSimple } from "@/components/VideoUploadSimple";
import {
  ArrowLeft,
  Send,
  ChevronDown,
  ChevronUp,
  Video as VideoIcon,
  Sparkles,
  Clapperboard,
  ListChecks,
  Users,
  Crown,
} from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubmissionStatus } from "@/components/SubmissionStatus";
import { LobbyChat } from "@/components/LobbyChat";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface VideoSubmissionScreenProps {
  currentPlayer: Player;
  lobbyId: string;
  players: Player[];
  isHost: boolean;
  onBackToLobby: () => void;
  onSubmitChallenges: (selectedClips: VideoClip[]) => void;
  onStartActualGame: () => void;
}

const ACCENT = "#a855f7"; // purple — matches the IMITATION/2v2 menu
const GRAFFITI_TEXT_SHADOW =
  "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810";
const GRAFFITI_TEXT_SHADOW_SM =
  "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810";

export const VideoSubmissionScreen = ({
  currentPlayer,
  lobbyId,
  players,
  isHost,
  onBackToLobby,
  onSubmitChallenges,
  onStartActualGame,
}: VideoSubmissionScreenProps) => {
  const [savedClips, setSavedClips] = useState<VideoClip[]>([]);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadCollapsed, setUploadCollapsed] = useState(false);
  const [clipUrls, setClipUrls] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadPlayerClips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer.id]);

  useEffect(() => {
    if (savedClips.length > 0) setUploadCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedClips.length > 0]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = { ...clipUrls };
      for (const clip of savedClips) {
        if (next[clip.id]) continue;
        const url = await videoStorage.getVideoUrl(clip.id);
        if (url) next[clip.id] = url;
      }
      if (!cancelled) setClipUrls(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedClips]);

  const loadPlayerClips = async () => {
    try {
      const clips = await videoStorage.getVideoClipsByPlayer(currentPlayer.id);
      setSavedClips(clips);
    } catch (error) {
      console.error("Error loading clips:", error);
    }
  };

  const handleClipSaved = (newClip: VideoClip) => {
    setSavedClips([...savedClips, newClip]);
    setUploadCollapsed(true);
  };

  const toggleClipSelection = (clipId: string) => {
    setSelectedClips((prev) => {
      if (prev.includes(clipId)) {
        return prev.filter((id) => id !== clipId);
      } else {
        if (prev.length >= 3) {
          toast({
            title: "Limite atteinte",
            description:
              "Vous ne pouvez sélectionner que 3 défis maximum pour cette partie.",
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, clipId];
      }
    });
  };

  const handleSubmitChallenges = async () => {
    if (selectedClips.length === 0) {
      toast({
        title: "Aucun défi sélectionné",
        description:
          "Veuillez sélectionner au moins un extrait vidéo comme défi.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const clipsToSubmit = savedClips.filter((clip) =>
        selectedClips.includes(clip.id),
      );

      const { error: linkError } = await supabase
        .from("video_clips")
        .update({ lobby_id: lobbyId, round_number: null })
        .in(
          "id",
          clipsToSubmit.map((c) => c.id),
        );

      if (linkError) throw linkError;

      const { error } = await supabase.from("player_submissions").upsert(
        {
          lobby_id: lobbyId,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          challenges_count: clipsToSubmit.length,
        },
        { onConflict: "lobby_id,player_id" },
      );

      if (error) throw error;

      onSubmitChallenges(clipsToSubmit);

      toast({
        title: "Défis envoyés !",
        description: `${selectedClips.length} défi(s) prêt(s) pour la partie.`,
      });

      setSelectedClips([]);
    } catch (error) {
      console.error("Error submitting challenges:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer les défis. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0510] text-white relative overflow-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0d2e] via-[#0a0510] to-[#160a26]" />
        <div
          className="absolute top-0 left-1/3 w-[800px] h-[400px] rounded-full opacity-30"
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
        <div className="max-w-7xl mx-auto space-y-5">
          {/* HEADER */}
          <div className="flex items-center justify-between gap-4">
            <motion.button
              type="button"
              onClick={onBackToLobby}
              whileHover={{ scale: 1.04, rotate: -1 }}
              whileTap={{ scale: 0.96 }}
              className="relative flex items-center gap-2 px-4 py-2 rounded-2xl text-white"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
                border: "2.5px solid #0a0810",
                boxShadow: "0 3px 0 #0a0810",
              }}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              <span
                className="text-base font-black uppercase tracking-wider leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Lobby
              </span>
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: -2 }}
                transition={{ type: "spring", stiffness: 280, damping: 16 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2"
                style={{
                  background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                  border: "3px solid #0a0810",
                  boxShadow: "0 4px 0 #0a0810",
                }}
              >
                <Clapperboard className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                <span
                  className="text-xs font-black uppercase tracking-wider text-white leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  Préparation
                </span>
              </motion.div>
              <h1
                className="text-4xl md:text-5xl font-black leading-none tracking-tight text-white"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW,
                }}
              >
                Tes défis vidéo
              </h1>
            </motion.div>

            <div className="w-24" />
          </div>

          <p
            className="text-center text-base text-white/70 max-w-xl mx-auto font-bold"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Importe tes vidéos puis choisis-en jusqu'à{" "}
            <span
              className="text-purple-300"
              style={{ textShadow: `0 2px 8px ${ACCENT}88` }}
            >
              3 défis
            </span>{" "}
            pour cette partie.
          </p>

          {/* GRID */}
          <div className="grid md:grid-cols-3 gap-4 items-start">
            {/* Column 1 — Upload */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-1"
            >
              {uploadCollapsed ? (
                <motion.button
                  type="button"
                  onClick={() => setUploadCollapsed(false)}
                  whileHover={{ scale: 1.02, rotate: -0.5 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full p-4 rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                    border: "3px solid #0a0810",
                    boxShadow: "0 4px 0 #0a0810",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                          border: "2.5px solid #0a0810",
                          boxShadow: "0 2px 0 #0a0810",
                        }}
                      >
                        <VideoIcon
                          className="w-4 h-4 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <span
                        className="text-xl font-black text-white leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        Ajouter une vidéo
                      </span>
                    </div>
                    <ChevronDown
                      className="w-4 h-4 text-white/50"
                      strokeWidth={2.5}
                    />
                  </div>
                </motion.button>
              ) : (
                <CartoonCard accent={ACCENT}>
                  <div className="space-y-3">
                    {savedClips.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setUploadCollapsed(true)}
                          className="flex items-center gap-1 text-xs text-white/55 hover:text-white transition-colors font-black"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          <ChevronUp className="w-3 h-3" />
                          Réduire
                        </button>
                      </div>
                    )}
                    <VideoUploadSimple
                      playerId={currentPlayer.id}
                      playerName={currentPlayer.name}
                      maxVideos={5}
                      onVideoSaved={handleClipSaved}
                      lobbyId={lobbyId}
                    />
                  </div>
                </CartoonCard>
              )}
            </motion.div>

            {/* Column 2 — Selection */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-1"
            >
              <CartoonCard accent={ACCENT} highlighted>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [-3, 3, -3] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                        border: "2.5px solid #0a0810",
                        boxShadow: "0 3px 0 #0a0810",
                      }}
                    >
                      <ListChecks
                        className="w-4 h-4 text-white"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                    <span
                      className="text-2xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Tes défis
                    </span>
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-sm font-black"
                      style={{
                        background:
                          "linear-gradient(180deg, #fbbf24, #d97706)",
                        border: "2px solid #0a0810",
                        boxShadow: "0 2px 0 #0a0810",
                        color: "white",
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
                      {selectedClips.length}/3
                    </span>
                  </div>

                  {savedClips.length > 0 ? (
                    <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                      {savedClips.map((clip, idx) => {
                        const isSelected = selectedClips.includes(clip.id);
                        return (
                          <motion.button
                            key={clip.id}
                            type="button"
                            onClick={() => toggleClipSelection(clip.id)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            whileHover={{ scale: 1.02, rotate: -0.5 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative w-full p-3 rounded-2xl text-left"
                            style={{
                              background: isSelected
                                ? `linear-gradient(180deg, ${ACCENT}33, ${ACCENT}10)`
                                : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                              border: isSelected
                                ? "3px solid #fbbf24"
                                : "3px solid #0a0810",
                              boxShadow: isSelected
                                ? "0 3px 0 #0a0810, 0 0 12px rgba(251,191,36,0.4)"
                                : "0 3px 0 #0a0810",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="flex-shrink-0 w-16 h-12 rounded-xl overflow-hidden bg-black/60"
                                style={{
                                  border: "2.5px solid #0a0810",
                                  boxShadow: "0 2px 0 #0a0810",
                                }}
                              >
                                {clipUrls[clip.id] ? (
                                  <video
                                    src={`${clipUrls[clip.id]}#t=${Math.max(
                                      0.1,
                                      clip.startTime || 0.1,
                                    )}`}
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                    muted
                                    playsInline
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <VideoIcon className="w-4 h-4 text-white/30" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4
                                  className="text-base font-black truncate text-white leading-none"
                                  style={{
                                    fontFamily: "'Caveat', cursive",
                                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                                  }}
                                >
                                  {clip.name}
                                </h4>
                                <p
                                  className="text-[11px] text-white/50 font-bold mt-0.5"
                                  style={{ fontFamily: "'Caveat', cursive" }}
                                >
                                  {Math.round(clip.duration)}s ·{" "}
                                  {clip.createdAt.toLocaleDateString()}
                                </p>
                              </div>

                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  background: isSelected
                                    ? "linear-gradient(180deg, #fbbf24, #d97706)"
                                    : "rgba(0,0,0,0.5)",
                                  border: "2.5px solid #0a0810",
                                  boxShadow: "0 2px 0 #0a0810",
                                }}
                              >
                                {isSelected && (
                                  <Send
                                    className="w-3.5 h-3.5 text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <motion.div
                        animate={{ rotate: [-3, 3, -3] }}
                        transition={{ duration: 2.4, repeat: Infinity }}
                        className="text-5xl mb-2 inline-block"
                      >
                        🎬
                      </motion.div>
                      <p
                        className="text-xl font-black text-white/80 mb-1 leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        Aucune vidéo
                      </p>
                      <p
                        className="text-sm text-white/55 font-bold"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Importe-en pour créer tes défis
                      </p>
                    </div>
                  )}

                  {savedClips.length > 0 && (
                    <motion.button
                      type="button"
                      onClick={handleSubmitChallenges}
                      disabled={selectedClips.length === 0 || isSubmitting}
                      whileHover={
                        selectedClips.length > 0 && !isSubmitting
                          ? { scale: 1.04, rotate: -1.5 }
                          : undefined
                      }
                      whileTap={
                        selectedClips.length > 0 && !isSubmitting
                          ? { scale: 0.96 }
                          : undefined
                      }
                      className={cn(
                        "relative w-full py-3 rounded-2xl flex items-center justify-center gap-2",
                        (selectedClips.length === 0 || isSubmitting) &&
                          "opacity-50 cursor-not-allowed",
                      )}
                      style={{
                        background:
                          selectedClips.length > 0
                            ? "linear-gradient(180deg, #fbbf24, #d97706)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
                        border: "3px solid #0a0810",
                        boxShadow: "0 4px 0 #0a0810",
                      }}
                    >
                      <Send
                        className="w-5 h-5 text-white"
                        strokeWidth={2.5}
                      />
                      <span
                        className="text-xl font-black text-white leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW,
                        }}
                      >
                        {isSubmitting
                          ? "Envoi…"
                          : `Soumettre ${selectedClips.length} défi${
                              selectedClips.length > 1 ? "s" : ""
                            }`}
                      </span>
                    </motion.button>
                  )}
                </div>
              </CartoonCard>
            </motion.div>

            {/* Column 3 — Submission Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-1"
            >
              <CartoonCard accent="#06b6d4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [-3, 3, -3] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #06b6d4, #0e7490)",
                        border: "2.5px solid #0a0810",
                        boxShadow: "0 3px 0 #0a0810",
                      }}
                    >
                      <Users className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <span
                      className="text-2xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Statut joueurs
                    </span>
                    {isHost && (
                      <span
                        className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                        style={{
                          background:
                            "linear-gradient(180deg, #fbbf24, #d97706)",
                          border: "2px solid #0a0810",
                          boxShadow: "0 2px 0 #0a0810",
                          color: "white",
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        <Crown
                          className="w-3 h-3"
                          fill="currentColor"
                          strokeWidth={2.5}
                        />
                        Hôte
                      </span>
                    )}
                  </div>
                  <SubmissionStatus
                    lobbyId={lobbyId}
                    players={players}
                    isHost={isHost}
                    onStartGame={onStartActualGame}
                  />
                </div>
              </CartoonCard>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating chat */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.6); }
      `}</style>
    </div>
  );
};

/* ============================================================
   Cartoon card wrapper
============================================================ */
const CartoonCard = ({
  accent,
  highlighted = false,
  children,
}: {
  accent: string;
  highlighted?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className="relative rounded-3xl overflow-hidden p-4"
    style={{
      background:
        "linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)",
      border: "4px solid #0a0810",
      boxShadow: highlighted
        ? `0 8px 0 #0a0810, 0 14px 30px ${accent}55, inset 0 2px 0 rgba(255,255,255,0.08)`
        : "0 6px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
  >
    <div
      className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
      style={{ border: `2px solid ${accent}66` }}
    />
    <Sparkles
      className="absolute -top-1 -right-1 w-4 h-4"
      style={{
        color: accent,
        filter: "drop-shadow(1px 1px 0 #0a0810)",
      }}
    />
    <div className="relative">{children}</div>
  </div>
);
