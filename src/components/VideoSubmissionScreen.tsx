import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VideoUploadSimple } from "@/components/VideoUploadSimple";
import { ArrowLeft, Send, ChevronDown, ChevronUp, Video as VideoIcon, Sparkles, Clapperboard, ListChecks, Users } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubmissionStatus } from "@/components/SubmissionStatus";
import { LobbyChat } from "@/components/LobbyChat";
import { DoodleBorder, DoodleStage } from "@/components/doodle/Doodle";
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

const ACCENT = '#c084fc';

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
  }, [currentPlayer.id]);

  useEffect(() => {
    if (savedClips.length > 0) setUploadCollapsed(true);
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
            description: "Vous ne pouvez sélectionner que 3 défis maximum pour cette partie.",
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
        description: "Veuillez sélectionner au moins un extrait vidéo comme défi.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const clipsToSubmit = savedClips.filter((clip) => selectedClips.includes(clip.id));

      const { error: linkError } = await supabase
        .from("video_clips")
        .update({ lobby_id: lobbyId, round_number: null })
        .in("id", clipsToSubmit.map((c) => c.id));

      if (linkError) throw linkError;

      const { error } = await supabase
        .from("player_submissions")
        .upsert(
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
    <DoodleStage accent={ACCENT}>
      <div className="relative z-10 min-h-screen px-5 py-6 pb-[120px]">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* HEADER */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToLobby}
              className="relative flex items-center gap-2 px-3 py-1.5 text-white/70 hover:text-white transition-colors group"
            >
              <DoodleBorder color="rgba(255,255,255,0.15)" />
              <ArrowLeft className="relative w-3.5 h-3.5" />
              <span
                className="relative text-sm font-bold uppercase tracking-wider"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                Lobby
              </span>
            </button>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-1 relative">
                <DoodleBorder color={ACCENT} filled />
                <Clapperboard className="relative w-3 h-3" style={{ color: ACCENT }} />
                <span
                  className="relative text-[10px] uppercase tracking-[0.2em] font-bold"
                  style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
                >
                  Préparation
                </span>
              </div>
              <h1
                className="text-2xl md:text-4xl font-black leading-none tracking-tight text-white"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: `0 0 18px ${ACCENT}33, 0 2px 8px rgba(0,0,0,0.5)`,
                }}
              >
                Tes défis vidéo
              </h1>
            </motion.div>

            <div className="w-20" />
          </div>

          <p className="text-center text-sm text-white/55 max-w-xl mx-auto">
            Importe tes vidéos puis choisis-en jusqu'à <span style={{ color: ACCENT }} className="font-black">3 défis</span> pour cette partie.
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
                <button
                  type="button"
                  onClick={() => setUploadCollapsed(false)}
                  className="relative w-full px-4 py-4 group"
                >
                  <DoodleBorder color="rgba(255,255,255,0.18)" rotation={1} />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="w-4 h-4" style={{ color: ACCENT }} />
                      <span
                        className="text-base font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                      >
                        Ajouter une vidéo
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  </div>
                </button>
              ) : (
                <div className="relative px-4 py-4">
                  <DoodleBorder color="rgba(255,255,255,0.18)" rotation={-1} />
                  <div className="relative">
                    {savedClips.length > 0 && (
                      <div className="flex justify-end mb-2">
                        <button
                          type="button"
                          onClick={() => setUploadCollapsed(true)}
                          className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
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
                </div>
              )}
            </motion.div>

            {/* Column 2 — Selection */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-1"
            >
              <div className="relative px-4 py-4">
                <DoodleBorder color={ACCENT} rotation={1} />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4" style={{ color: ACCENT }} />
                    <span
                      className="text-xl font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                    >
                      Tes défis
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider font-bold text-white/40">
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
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={cn(
                              'relative w-full px-3 py-2.5 text-left transition-all',
                            )}
                          >
                            <DoodleBorder
                              color={isSelected ? ACCENT : 'rgba(255,255,255,0.12)'}
                              filled={isSelected}
                              rotation={idx % 2 === 0 ? -0.5 : 0.5}
                            />
                            <div className="relative flex items-center gap-3">
                              {/* Thumbnail */}
                              <div className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-black/60 border border-white/10">
                                {clipUrls[clip.id] ? (
                                  <video
                                    src={`${clipUrls[clip.id]}#t=${Math.max(0.1, clip.startTime || 0.1)}`}
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
                                  className="text-sm font-black truncate"
                                  style={{
                                    fontFamily: "'Caveat', cursive",
                                    color: isSelected ? ACCENT : 'white',
                                  }}
                                >
                                  {clip.name}
                                </h4>
                                <p className="text-[10px] text-white/40">
                                  {Math.round(clip.duration)}s · {clip.createdAt.toLocaleDateString()}
                                </p>
                              </div>

                              {/* Checkbox */}
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                                )}
                                style={{
                                  borderColor: isSelected ? ACCENT : 'rgba(255,255,255,0.3)',
                                  background: isSelected ? ACCENT : 'transparent',
                                }}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <VideoIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p
                        className="text-base font-black mb-1"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Aucune vidéo
                      </p>
                      <p className="text-xs">Importe-en pour créer tes défis</p>
                    </div>
                  )}

                  {savedClips.length > 0 && (
                    <motion.button
                      type="button"
                      onClick={handleSubmitChallenges}
                      disabled={selectedClips.length === 0 || isSubmitting}
                      whileHover={
                        selectedClips.length > 0 && !isSubmitting
                          ? { scale: 1.02, y: -2 }
                          : undefined
                      }
                      whileTap={
                        selectedClips.length > 0 && !isSubmitting
                          ? { scale: 0.98 }
                          : undefined
                      }
                      className="relative w-full px-5 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <DoodleBorder
                        color={selectedClips.length > 0 ? ACCENT : 'rgba(255,255,255,0.2)'}
                        filled={selectedClips.length > 0}
                        rotation={-1}
                        thick={selectedClips.length > 0}
                      />
                      <div className="relative flex items-center justify-center gap-2">
                        <Send
                          className="w-4 h-4"
                          style={{
                            color: selectedClips.length > 0 ? ACCENT : 'rgba(255,255,255,0.4)',
                          }}
                        />
                        <span
                          className="text-base font-black"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            color: selectedClips.length > 0 ? ACCENT : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {isSubmitting
                            ? 'Envoi en cours…'
                            : `Soumettre ${selectedClips.length} défi${selectedClips.length > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Column 3 — Submission Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-1"
            >
              <div className="relative px-4 py-4">
                <DoodleBorder color="rgba(255,255,255,0.18)" rotation={-1} />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white/60" />
                    <span
                      className="text-xl font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                    >
                      Statut joueurs
                    </span>
                    {isHost && (
                      <span
                        className="ml-auto text-[10px] uppercase tracking-wider font-bold flex items-center gap-1"
                        style={{ color: ACCENT }}
                      >
                        <Sparkles className="w-3 h-3" />
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
              </div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </DoodleStage>
  );
};
