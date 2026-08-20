/**
 * Rythmo preview — plays a clip with its real bande rythmo overlay so the
 * player can see exactly how it will render during the imitation phase.
 *
 * It reuses the exact same <RhythmoBand> component and data the game uses,
 * so "what you preview" is literally "what you get".
 */
import { useEffect, useRef, useState } from "react";
import { X, Loader2, RotateCcw } from "lucide-react";
import { RhythmoBand } from "@/components/rhythmo/RhythmoBand";
import { clearRhythmoTrackCache, loadRhythmoTrack } from "@/lib/rhythmo/store";
import type { RhythmoTrack } from "@/lib/rhythmo/types";

interface RhythmoPreviewDialogProps {
  clipId: string;
  clipName: string;
  videoUrl: string;
  onClose: () => void;
}

export const RhythmoPreviewDialog = ({
  clipId,
  clipName,
  videoUrl,
  onClose,
}: RhythmoPreviewDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [track, setTrack] = useState<RhythmoTrack | null>(null);
  const [loading, setLoading] = useState(true);
  /** Bumped by Réessayer to re-run the load. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // The store bounds this call, so the spinner always resolves instead of
    // hanging when Storage is slow or unreachable.
    loadRhythmoTrack(clipId)
      .then((loaded) => {
        if (!cancelled) setTrack(loaded);
      })
      .catch(() => {
        if (!cancelled) setTrack(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clipId, attempt]);

  const retry = () => {
    // Drop the short negative cache so the retry really hits Storage again.
    clearRhythmoTrackCache(clipId);
    setAttempt((value) => value + 1);
  };

  // Close on Escape.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(5,2,12,0.82)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de la bande rythmo — ${clipName}`}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl p-4 space-y-3"
        style={{
          background: "linear-gradient(180deg, #1a0d2e, #0f0820)",
          border: "1px solid var(--ink-line)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className="min-w-0 truncate text-sm font-black text-[var(--ink-accent-text)]"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Aperçu — {clipName}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu"
            className="shrink-0 rounded-full p-1.5"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--ink-line)" }}
          >
            <X className="h-4 w-4 text-white" strokeWidth={2.5} />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--ink-line)" }}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="w-full max-h-[52vh] bg-black"
          />
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center gap-2 py-4 text-xs font-black text-white/60"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de la bande rythmo…
          </div>
        ) : track ? (
          <RhythmoBand track={track} videoRef={videoRef} leadSeconds={0} accent="var(--c-violet)" />
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <p
              className="text-center text-xs font-black text-white/50"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Bande rythmo indisponible — soit elle n'est pas encore générée,
              soit la connexion a échoué.
            </p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black text-white"
              style={{
                fontFamily: "'Outfit', sans-serif",
                background: "var(--c-violet)",
                border: "1px solid var(--ink-line)",
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
