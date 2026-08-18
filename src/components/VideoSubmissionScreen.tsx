import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Video as VideoIcon,
  Sparkles,
  Clapperboard,
  ListChecks,
  Users,
  Crown,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubmissionStatus } from "@/components/SubmissionStatus";
import { LobbyChat } from "@/components/LobbyChat";
import { cn } from "@/lib/utils";
import { CircularGallery } from "@/components/ui/circular-gallery";

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
  "none";
const GRAFFITI_TEXT_SHADOW_SM =
  "none";

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
  const [isUploading, setIsUploading] = useState(false);
  const [clipUrls, setClipUrls] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayerClips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clipsToLoad = savedClips.filter((clip) => !clipUrls[clip.id]);
      if (clipsToLoad.length === 0) return;
      const entries = await Promise.all(
        clipsToLoad.map(async (clip) => {
          const url = await videoStorage.getVideoUrl(clip.id);
          return url ? [clip.id, url] as const : null;
        })
      );
      if (cancelled) return;
      const next = { ...clipUrls };
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setClipUrls(next);
    })();
    return () => { cancelled = true; };
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

  // ── Multi-file import (click or drag & drop) ─────────────────────────────
  const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.ogg', '.m4v'];
  const isVideoFile = (name: string) =>
    VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

  const importFiles = async (files: File[]) => {
    const videoFiles = files.filter((f) => f.type.startsWith('video/') || f.type === '' || isVideoFile(f.name));
    if (videoFiles.length === 0) {
      toast({ title: 'Aucune vidéo', description: 'Aucun fichier vidéo détecté.', variant: 'destructive' });
      return;
    }
    // Dedup by name against existing clips
    const existingNames = new Set(savedClips.map((c) => c.name));
    const newFiles = videoFiles.filter((f) => !existingNames.has(f.name.replace(/\.[^/.]+$/, '')));
    if (newFiles.length === 0) {
      toast({ title: '✅ Déjà importées', description: 'Toutes ces vidéos sont déjà dans ta bibliothèque.' });
      return;
    }

    setIsUploading(true);
    try {
      const results = await Promise.all(newFiles.map(async (file) => {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const clipData = {
          id: `${currentPlayer.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: baseName,
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          startTime: 0,
          endTime: 0,
          isMuted: false,
        };
        try {
          return await videoStorage.uploadVideo(file, clipData);
        } catch (err) {
          console.error('[import] error for', file.name, err);
          return null;
        }
      }));
      const imported = results.filter(Boolean) as VideoClip[];
      if (imported.length > 0) {
        setSavedClips((prev) => [...prev, ...imported]);
        toast({ title: `📂 ${imported.length} vidéo${imported.length > 1 ? 's' : ''} importée${imported.length > 1 ? 's' : ''} !` });
      }
      const failed = newFiles.length - imported.length;
      if (failed > 0) {
        toast({ title: `⚠️ ${failed} échec${failed > 1 ? 's' : ''}`, description: 'Certains fichiers n\'ont pas pu être uploadés.', variant: 'destructive' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void importFiles(Array.from(files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void importFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const wipeLibrary = async () => {
    try {
      const clips = await videoStorage.getVideoClipsByPlayer(currentPlayer.id);
      await Promise.all(clips.map((c) => videoStorage.deleteVideoClip(c.id).catch(() => {})));
      setSavedClips([]);
      setSelectedClips([]);
      setClipUrls({});
      toast({ title: '🗑️ Bibliothèque vidée', description: `${clips.length} vidéo(s) supprimée(s).` });
    } catch (err) {
      console.error('[wipe] error:', err);
      toast({ title: 'Erreur', description: 'Impossible de vider.', variant: 'destructive' });
    }
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
    <div className="h-[100dvh] bg-[#0a0510] text-white relative overflow-hidden flex flex-col">
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

      {/* SCROLLABLE CONTENT — internal scroll so zoom / small viewports never
          clip the lobby button or the action area at the bottom. */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-5 py-4 pb-[140px]">
        <div className="max-w-7xl mx-auto space-y-4">
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
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              <span
                className="text-base font-black uppercase tracking-wider leading-none"
                style={{
                  fontFamily: "'Outfit', sans-serif",
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
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                <Clapperboard className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                <span
                  className="text-xs font-black uppercase tracking-wider text-white leading-none"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  Préparation
                </span>
              </motion.div>
              <h1
                className="font-black leading-none tracking-tight text-white"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: GRAFFITI_TEXT_SHADOW,
                  fontSize: "clamp(1.75rem, 3vw, 3rem)",
                }}
              >
                Tes défis vidéo
              </h1>
            </motion.div>

            <div className="w-24" />
          </div>

          <p
            className="text-center text-base text-white/70 max-w-xl mx-auto font-bold"
            style={{ fontFamily: "'Outfit', sans-serif" }}
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

          {/* GRID — always shows import zone + thumbnails + status */}
          <div className="grid md:grid-cols-[1fr_320px] gap-4 items-start">
            {/* LEFT — Import + thumbnail grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CartoonCard accent={ACCENT} highlighted>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [-3, 3, -3] }}
                      transition={{ duration: 2.4, repeat: Infinity }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                        border: '1px solid var(--ink-line)',
                        boxShadow: 'none',
                      }}
                    >
                      <ListChecks className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <span
                      className="text-2xl font-black text-white leading-none"
                      style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW }}
                    >
                      Tes vidéos
                    </span>
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-sm font-black"
                      style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none', color: "white", fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                    >
                      {selectedClips.length}/3
                    </span>
                  </div>

                  {/* Hidden file input — accepts multiple */}
                  <input ref={fileInputRef} type="file" multiple accept="video/*,.mkv,.avi,.mov,.m4v"
                    onChange={handleFileInput} style={{ display: 'none' }} />

                  {/* DROP ZONE — always visible, click or drag */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative rounded-2xl py-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
                      isDragging && "scale-[1.02]"
                    )}
                    style={{
                      background: isDragging ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.05)",
                      border: isDragging ? `3px solid ${ACCENT}` : "3px dashed rgba(168,85,247,0.4)",
                    }}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-purple-300" strokeWidth={2} />
                    )}
                    <span className="text-base font-black text-purple-200" style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}>
                      {isUploading ? "Upload en cours..." : isDragging ? "Lâche ici !" : "Glisse tes vidéos ici ou clique"}
                    </span>
                    <span className="text-xs text-white/40" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      MP4, WebM, MOV, MKV — plusieurs fichiers à la fois
                    </span>
                  </div>

                  {/* CIRCULAR GALLERY — drag with the cursor to browse, click center to (de)select */}
                  {savedClips.length > 0 && (
                    <div className="space-y-1">
                      <CircularGallery
                        height={300}
                        initialIndex={0}
                        items={savedClips.map((clip) => ({
                          common: clip.name,
                          binomial: "",
                          photo: { url: "" },
                          videoUrl: clipUrls[clip.id],
                        }))}
                        selectedIndices={savedClips.reduce<number[]>((acc, c, i) => {
                          if (selectedClips.includes(c.id)) acc.push(i);
                          return acc;
                        }, [])}
                        badges={savedClips.reduce<Record<number, React.ReactNode>>((acc, c, i) => {
                          const slot = selectedClips.indexOf(c.id);
                          if (slot >= 0) {
                            acc[i] = (
                              <span
                                className="text-base font-black text-white leading-none"
                                style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                              >
                                {slot + 1}
                              </span>
                            );
                          }
                          return acc;
                        }, {})}
                        onItemClick={(i) => toggleClipSelection(savedClips[i].id)}
                      />
                      <p
                        className="text-center text-xs text-white/50"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      >
                        Glisse avec la souris pour parcourir · clique sur la vidéo centrale pour la (dé)sélectionner
                      </p>
                    </div>
                  )}

                  {/* Wipe + Submit buttons */}
                  <div className="flex gap-2">
                    {savedClips.length > 0 && (
                      <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { if (window.confirm(`Supprimer ${savedClips.length} vidéo(s) ?`)) void wipeLibrary(); }}
                        className="px-3 py-2.5 rounded-2xl flex items-center gap-1.5"
                        style={{ background: "rgba(239,68,68,0.1)", border: "2.5px solid rgba(239,68,68,0.4)" }}>
                        <Trash2 className="w-4 h-4 text-red-300" />
                        <span className="text-sm font-black text-red-300" style={{ fontFamily: "'Outfit', sans-serif" }}>Vider</span>
                      </motion.button>
                    )}
                    <motion.button
                      type="button"
                      onClick={handleSubmitChallenges}
                      disabled={selectedClips.length === 0 || isSubmitting}
                      whileHover={selectedClips.length > 0 && !isSubmitting ? { scale: 1.02 } : undefined}
                      whileTap={selectedClips.length > 0 && !isSubmitting ? { scale: 0.98 } : undefined}
                      className={cn("flex-1 py-3 rounded-2xl flex items-center justify-center gap-2", (selectedClips.length === 0 || isSubmitting) && "opacity-50 cursor-not-allowed")}
                      style={{
                        background: selectedClips.length > 0 ? "linear-gradient(180deg, #fbbf24, #d97706)" : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
                        border: '1px solid var(--ink-line)', boxShadow: 'none',
                      }}
                    >
                      <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
                      <span className="text-xl font-black text-white leading-none" style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW }}>
                        {isSubmitting ? "Envoi…" : `Soumettre ${selectedClips.length} défi${selectedClips.length > 1 ? "s" : ""}`}
                      </span>
                    </motion.button>
                  </div>
                </div>
              </CartoonCard>
            </motion.div>

            {/* RIGHT — Submission Status (always present) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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
                        border: '1px solid var(--ink-line)',
                        boxShadow: 'none',
                      }}
                    >
                      <Users className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <span
                      className="text-2xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Statut joueurs
                    </span>
                    {isHost && (
                      <span
                        className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                        style={{
                          background: "linear-gradient(180deg, #fbbf24, #d97706)",
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                          color: "white",
                          fontFamily: "'Outfit', sans-serif",
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
      border: '1px solid var(--ink-line)',
      boxShadow: highlighted
        ? `0 0 0 rgba(0,0,0,0), 0 14px 30px ${accent}55, inset 0 0 0 rgba(255,255,255,0.08)`
        : "0 0 0 rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0.06)",
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
        filter: "none",
      }}
    />
    <div className="relative">{children}</div>
  </div>
);
