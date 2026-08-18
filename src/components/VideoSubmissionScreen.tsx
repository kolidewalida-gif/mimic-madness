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
  Mic,
} from "lucide-react";
import {
  videoStorage,
  VideoClip,
  MAX_UPLOAD_BYTES,
  formatMb,
  UploadTooLargeError,
} from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubmissionStatus } from "@/components/SubmissionStatus";
import { LobbyChat } from "@/components/LobbyChat";
import { cn } from "@/lib/utils";
import { CircularGallery } from "@/components/ui/circular-gallery";
import { generateRhythmoTrack, releaseRhythmoWorker } from "@/lib/rhythmo/generate";
import { isLikelyDecodable } from "@/lib/rhythmo/audio";
import { listRhythmoTracks } from "@/lib/rhythmo/store";
import { RhythmoError, rhythmoErrorLabel, type RhythmoProgress } from "@/lib/rhythmo/types";

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

const ACCENT = "var(--ink-accent)"; // purple — matches the IMITATION/2v2 menu

/**
 * Reject a promise that takes too long.
 *
 * Neither the Supabase client nor `fetch` has a timeout, so a stalled request
 * hangs for ever and the UI has no way to tell. The original promise is not
 * cancelled — it just stops being awaited.
 */
const withTimeout = <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });

/** Player-facing label for a rythmo generation stage. */
const rhythmoLabel = (progress: RhythmoProgress): string => {
  switch (progress.phase) {
    case 'extracting':
      return "Extraction de l'audio…";
    case 'loading-model':
      return progress.ratio >= 1
        ? 'Modèle prêt…'
        : `Téléchargement du modèle vocal… ${Math.round(progress.ratio * 100)}%`;
    case 'transcribing':
      return 'Création de la bande rythmo…';
    case 'done':
      return 'Bande rythmo prête';
    default:
      return 'Bande rythmo…';
  }
};
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
  /** Which file is uploading and how far along the batch is. */
  const [uploadStatus, setUploadStatus] = useState<{
    done: number;
    total: number;
    current: string;
  } | null>(null);
  const [clipUrls, setClipUrls] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ── Rythmo band generation ──────────────────────────────────────────────
  // Never automatic: transcription costs a model download and a minute of
  // compute, and a band is only useful on clips where the words matter. The
  // player asks for it, per clip.
  //
  // One state object because the panel shows which clip is being processed,
  // which stage it is at, and the model download progress.
  const [rhythmo, setRhythmo] = useState<{
    clipName: string;
    index: number;
    total: number;
    progress: RhythmoProgress;
  } | null>(null);
  const rhythmoAbortRef = useRef<AbortController | null>(null);
  /** Which clips already have a band. Drives the badges and the button state. */
  const [rhythmoReady, setRhythmoReady] = useState<Record<string, boolean>>({});
  /**
   * Files kept from this session's imports, keyed by clip id. Lets a band be
   * generated without downloading the video back. Clips from earlier sessions
   * are not here and fall back to the signed URL.
   */
  const importedFilesRef = useRef<Record<string, File>>({});

  // Abort in-flight work and free the model if the player leaves this screen.
  useEffect(() => () => {
    rhythmoAbortRef.current?.abort();
    releaseRhythmoWorker();
  }, []);

  // Which clips already have a band. One folder listing answers for the whole
  // library, instead of one request per clip.
  useEffect(() => {
    let cancelled = false;
    if (savedClips.length === 0) return;
    (async () => {
      const withBand = await listRhythmoTracks(currentPlayer.id);
      if (cancelled) return;
      setRhythmoReady(
        Object.fromEntries(savedClips.map((clip) => [clip.id, withBand.has(clip.id)])),
      );
    })();
    return () => { cancelled = true; };
  }, [savedClips, currentPlayer.id]);

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
    const deduped = videoFiles.filter((f) => !existingNames.has(f.name.replace(/\.[^/.]+$/, '')));
    if (deduped.length === 0) {
      toast({ title: '✅ Déjà importées', description: 'Toutes ces vidéos sont déjà dans ta bibliothèque.' });
      return;
    }

    // Told up-front, before any request. The server does not answer on an
    // oversized upload, it drops the connection, which the browser reports as
    // a bare "NetworkError" — indistinguishable from a hang.
    const tooBig = deduped.filter((f) => f.size > MAX_UPLOAD_BYTES);
    const newFiles = deduped.filter((f) => f.size <= MAX_UPLOAD_BYTES);

    if (tooBig.length > 0) {
      toast({
        title: `📦 ${tooBig.length} vidéo${tooBig.length > 1 ? 's' : ''} trop lourde${tooBig.length > 1 ? 's' : ''}`,
        description: `Limite ${formatMb(MAX_UPLOAD_BYTES)} par vidéo. ${tooBig
          .map((f) => `${f.name.replace(/\.[^/.]+$/, '')} (${formatMb(f.size)})`)
          .join(', ')} — découpe la vidéo ou réduis sa qualité.`,
        variant: 'destructive',
      });
    }

    if (newFiles.length === 0) return;

    setIsUploading(true);
    setUploadStatus({ done: 0, total: newFiles.length, current: newFiles[0].name });
    try {
      // Sequential, not parallel: several large videos at once saturate the
      // uplink and make every one of them slow, with no way to show which is
      // progressing. One at a time gives a real "3/5" and a name.
      const results: ({ clip: VideoClip; file: File } | null)[] = [];
      let firstFailure: string | null = null;

      for (const [index, file] of newFiles.entries()) {
        setUploadStatus({ done: index, total: newFiles.length, current: file.name });

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
          // Bounded so a stalled request cannot leave the screen spinning for
          // ever. Scaled to the file size, because a big video legitimately
          // takes minutes on a slow connection.
          const budgetMs = Math.max(60_000, Math.ceil(file.size / (20 * 1024)) * 1000);
          const clip = await withTimeout(
            videoStorage.uploadVideo(file, clipData),
            budgetMs,
            `L'upload de « ${baseName} » n'a pas abouti. Fichier trop lourd ou connexion trop lente.`,
          );
          results.push({ clip, file });
        } catch (err) {
          console.error('[import] échec pour', file.name, `(${formatMb(file.size)})`, err);
          results.push(null);
          if (!firstFailure) {
            firstFailure =
              err instanceof UploadTooLargeError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : 'Erreur inconnue.';
          }
        }
      }

      const imported = results.filter((r): r is { clip: VideoClip; file: File } => r !== null);
      if (imported.length > 0) {
        // Keep the File around so a band asked for later in this session can
        // read the audio locally instead of downloading the video back.
        for (const { clip, file } of imported) {
          importedFilesRef.current[clip.id] = file;
        }
        setSavedClips((prev) => [...prev, ...imported.map((r) => r.clip)]);
        toast({ title: `📂 ${imported.length} vidéo${imported.length > 1 ? 's' : ''} importée${imported.length > 1 ? 's' : ''} !` });
      }
      const failed = newFiles.length - imported.length;
      if (failed > 0) {
        toast({
          title: `⚠️ ${failed} échec${failed > 1 ? 's' : ''}`,
          description:
            firstFailure ??
            "Regarde la console pour la raison exacte (taille du fichier, format refusé par le bucket…).",
          variant: 'destructive',
        });
      }
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
    }
  };

  /**
   * Get the media for a clip. Prefers the File from this session's import;
   * otherwise downloads the clip back from storage, which is what makes it
   * possible to add a band to a clip imported before.
   */
  const getClipMedia = async (clip: VideoClip): Promise<{ blob: Blob; fileName: string }> => {
    const local = importedFilesRef.current[clip.id];
    if (local) return { blob: local, fileName: local.name };

    const url = clipUrls[clip.id] ?? (await videoStorage.getVideoUrl(clip.id));
    if (!url) throw new RhythmoError('engine', 'Vidéo introuvable.');

    console.info('[rythmo] téléchargement de la vidéo depuis le stockage', clip.name);
    const response = await withTimeout(
      fetch(url),
      120_000,
      'Téléchargement de la vidéo trop long.',
    );
    if (!response.ok) throw new RhythmoError('engine', 'Téléchargement de la vidéo impossible.');
    // The stored path carries the real extension; the clip name does not.
    return { blob: await response.blob(), fileName: clip.storagePath };
  };

  /**
   * Generate bands for the given clips, one at a time.
   *
   * Sequential on purpose: a single Whisper model is held in one worker, and
   * running clips in parallel would compete for the same compute while making
   * progress impossible to report meaningfully.
   */
  const buildRhythmoBands = async (clips: VideoClip[]) => {
    if (clips.length === 0 || rhythmo) return;

    const controller = new AbortController();
    rhythmoAbortRef.current = controller;

    let done = 0;
    let failures = 0;
    let lastReason: RhythmoError | null = null;

    for (const [index, clip] of clips.entries()) {
      if (controller.signal.aborted) break;

      setRhythmo({
        clipName: clip.name,
        index: index + 1,
        total: clips.length,
        progress: { phase: 'extracting' },
      });

      try {
        console.info('[rythmo] début', clip.name);
        const { blob, fileName } = await getClipMedia(clip);

        // Containers the browser cannot decode are rejected here rather than
        // after a pointless model load.
        if (!isLikelyDecodable(fileName)) {
          throw new RhythmoError('unsupported-container', 'Format non décodable.');
        }

        await generateRhythmoTrack({
          clipId: clip.id,
          file: blob,
          fileName,
          signal: controller.signal,
          onProgress: (progress) =>
            setRhythmo((prev) => (prev ? { ...prev, progress } : prev)),
        });

        console.info('[rythmo] terminé', clip.name);
        setRhythmoReady((prev) => ({ ...prev, [clip.id]: true }));
        done += 1;
      } catch (error) {
        if (error instanceof RhythmoError && error.reason === 'cancelled') break;
        failures += 1;
        if (error instanceof RhythmoError) lastReason = error;
        console.warn('[rythmo] échec pour', clip.name, error);
        // A non-typed failure would otherwise be reported as a generic
        // problem; keep its message so the player can act on it.
        if (!(error instanceof RhythmoError)) {
          lastReason = new RhythmoError(
            'engine',
            error instanceof Error ? error.message : 'Erreur inconnue.',
          );
        }
      }
    }

    setRhythmo(null);
    rhythmoAbortRef.current = null;

    if (done > 0) {
      toast({
        title: `🎤 Bande rythmo prête (${done}/${clips.length})`,
        description: "Le texte défilera sous la vidéo pendant l'imitation.",
      });
    } else if (failures > 0 && !controller.signal.aborted) {
      // Report the actual reason: a container we cannot decode is a very
      // different problem from a clip with no speech. Engine failures carry a
      // specific message worth showing verbatim.
      toast({
        title: '🎤 Bande rythmo impossible',
        description: lastReason
          ? lastReason.reason === 'engine'
            ? lastReason.message
            : rhythmoErrorLabel(lastReason.reason)
          : 'Les vidéos restent jouables, sans texte défilant.',
        variant: 'destructive',
      });
    }
  };

  /** Selected clips that do not have a band yet. */
  const rhythmoTargets = selectedClips
    .map((id) => savedClips.find((c) => c.id === id))
    .filter((c): c is VideoClip => !!c && rhythmoReady[c.id] !== true);

  const cancelRhythmo = () => {
    rhythmoAbortRef.current?.abort();
    setRhythmo(null);
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
      // The bands went with the clips (deleteVideoClip removes the cue file).
      setRhythmoReady({});
      importedFilesRef.current = {};
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
              className="text-[var(--ink-accent-text)]"
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
                      background: isDragging ? "var(--ink-accent-soft)" : "var(--ink-accent-soft)",
                      border: isDragging ? `3px solid ${ACCENT}` : "3px dashed var(--ink-accent-soft)",
                    }}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-[var(--ink-accent-text)] animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-[var(--ink-accent-text)]" strokeWidth={2} />
                    )}
                    <span className="text-base font-black text-[var(--ink-accent-text)]" style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}>
                      {isUploading
                        ? uploadStatus
                          ? `Upload ${uploadStatus.done + 1}/${uploadStatus.total}…`
                          : "Upload en cours..."
                        : isDragging ? "Lâche ici !" : "Glisse tes vidéos ici ou clique"}
                    </span>
                    <span className="max-w-full truncate px-4 text-xs text-white/40" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {isUploading && uploadStatus
                        ? uploadStatus.current
                        : "MP4, WebM, MOV, MKV — plusieurs fichiers à la fois"}
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

                  {/* RYTHMO PROGRESS — the first run downloads the speech model
                      (~80 Mo, cached afterwards), so the player needs to see
                      that something is happening and be able to give up. */}
                  {rhythmo && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-3 space-y-2"
                      style={{ background: "var(--ink-accent-soft)", border: "1px solid var(--ink-line)" }}
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[var(--ink-accent-text)]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black truncate text-[var(--ink-accent-text)]"
                            style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {rhythmoLabel(rhythmo.progress)}
                          </p>
                          <p className="text-[10px] text-white/45 truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {rhythmo.clipName} · {rhythmo.index}/{rhythmo.total}
                          </p>
                        </div>
                        <button type="button" onClick={cancelRhythmo}
                          className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] px-2 py-1 rounded-full text-white/55 hover:text-white transition-colors"
                          style={{ fontFamily: "'Outfit', sans-serif", border: "1px solid var(--ink-line)" }}>
                          Annuler
                        </button>
                      </div>

                      {/* Determinate only while the model downloads; inference
                          gives no usable percentage, so it stays indeterminate
                          rather than faking one. */}
                      {rhythmo.progress.phase === 'loading-model' && (
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.09)" }}>
                          <div className="h-full rounded-full transition-[width] duration-200"
                            style={{ width: `${Math.round(rhythmo.progress.ratio * 100)}%`, background: ACCENT }} />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* RYTHMO — opt-in, on the clips the player has selected.
                      Deliberately a separate action from submitting: a band is
                      worth the wait on a dialogue clip and pointless on a
                      wordless one, and only the player knows which. */}
                  {selectedClips.length > 0 && !rhythmo && (
                    <div className="rounded-2xl p-3 space-y-2"
                      style={{ background: "var(--ink-accent-soft)", border: "1px solid var(--ink-line)" }}>
                      <div className="flex items-start gap-2">
                        <Mic className="w-4 h-4 mt-0.5 shrink-0 text-[var(--ink-accent-text)]" strokeWidth={2.5} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-[var(--ink-accent-text)]"
                            style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Bande rythmo <span className="text-white/40">(optionnel)</span>
                          </p>
                          <p className="text-[10px] leading-snug text-white/45"
                            style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Le texte défile sous la vidéo pendant l'imitation. Transcription
                            faite sur ton ordi, sans rien envoyer.
                          </p>
                        </div>
                      </div>

                      {/* Per-clip state, so the player sees what he would be
                          paying the wait for. */}
                      <div className="flex flex-wrap gap-1.5">
                        {selectedClips.map((id) => {
                          const clip = savedClips.find((c) => c.id === id);
                          if (!clip) return null;
                          const ready = rhythmoReady[clip.id] === true;
                          return (
                            <span key={clip.id}
                              className="max-w-[48%] truncate text-[10px] font-black px-2 py-0.5 rounded-full"
                              style={{
                                fontFamily: "'Outfit', sans-serif",
                                color: ready ? "#34d399" : "rgba(255,255,255,0.45)",
                                border: "1px solid var(--ink-line)",
                              }}>
                              {ready ? "✓ " : "· "}{clip.name}
                            </span>
                          );
                        })}
                      </div>

                      <motion.button type="button"
                        onClick={() => void buildRhythmoBands(rhythmoTargets)}
                        disabled={rhythmoTargets.length === 0}
                        whileHover={rhythmoTargets.length > 0 ? { scale: 1.02 } : undefined}
                        whileTap={rhythmoTargets.length > 0 ? { scale: 0.98 } : undefined}
                        className={cn(
                          "w-full py-2 rounded-xl flex items-center justify-center gap-1.5",
                          rhythmoTargets.length === 0 && "opacity-45 cursor-not-allowed",
                        )}
                        style={{ background: ACCENT, border: "1px solid var(--ink-line)" }}>
                        <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        <span className="text-xs font-black text-white leading-none"
                          style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {rhythmoTargets.length === 0
                            ? "Bandes déjà générées"
                            : `Générer la bande rythmo (${rhythmoTargets.length})`}
                        </span>
                      </motion.button>
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
              <CartoonCard accent="var(--ink-text-dim)">
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
                        background: "linear-gradient(135deg, var(--ink-text-dim), var(--ink-text-dim))",
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--ink-accent-soft); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--ink-accent-soft); }
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
