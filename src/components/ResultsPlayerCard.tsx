import { memo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Download,
  Loader2,
  Play,
  RefreshCcw,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { VideoWithAudioOverlay } from "@/components/VideoWithAudioOverlay";
import { cn } from "@/lib/utils";
import type { VideoClip } from "@/lib/videoStorageSupabase";

export interface ResultsPlayerResult {
  playerId: string;
  playerName: string;
  likes: number;
  dislikes: number;
  score: number;
}

export type ResultsClipState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; clip: VideoClip }
  | { status: "missing" }
  | { status: "error" };

interface ResultsPlayerCardProps {
  result: ResultsPlayerResult;
  rank: number;
  color: string;
  isWinner: boolean;
  isSolo: boolean;
  isCurrentPlayer: boolean;
  challengeVideoClipId: string;
  clipState: ResultsClipState;
  isDownloading: boolean;
  isSharing: boolean;
  canShare: boolean;
  hasShared: boolean;
  onRequestClip: (playerId: string) => void;
  onDownload: (playerId: string, playerName: string) => void;
  onShare: (playerId: string, playerName: string) => void;
}

const FONT = "'Outfit', sans-serif";
const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";

const requestLabel = (state: ResultsClipState) => {
  if (state.status === "missing") return "Rechercher à nouveau";
  if (state.status === "error") return "Réessayer";
  return "Voir l’imitation";
};

export const ResultsPlayerCard = memo(function ResultsPlayerCard({
  result,
  rank,
  color,
  isWinner,
  isSolo,
  isCurrentPlayer,
  challengeVideoClipId,
  clipState,
  isDownloading,
  isSharing,
  canShare,
  hasShared,
  onRequestClip,
  onDownload,
  onShare,
}: ResultsPlayerCardProps) {
  const scoreColor = result.score > 0
    ? "#34d399"
    : result.score < 0
      ? "#ef4444"
      : "rgba(255,255,255,0.58)";
  const cardStyle = {
    "--ik-result-accent": color,
    borderColor: isWinner ? color : "var(--ink-line)",
  } as CSSProperties;

  return (
    <article
      className={cn(
        "ik-results-player-card relative min-w-0 overflow-hidden rounded-3xl border-4 bg-black/30",
        isWinner && "is-winner",
        isSolo && "is-solo",
      )}
      style={cardStyle}
      aria-label={`${rank}${rank === 1 ? "er" : "e"} : ${result.playerName}, ${result.score} points`}
    >
      <div className="ik-results-player-media relative aspect-video overflow-hidden bg-black/50">
        {clipState.status === "ready" ? (
          <VideoWithAudioOverlay
            videoClipId={challengeVideoClipId}
            audioClipId={clipState.clip.id}
            className="ik-results-player-video h-full w-full"
          />
        ) : (
          <div className="ik-results-media-state absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
            {clipState.status === "loading" ? (
              <>
                <Loader2 className="h-9 w-9 animate-spin text-[var(--ink-accent-text)]" aria-hidden="true" />
                <strong>Préparation de l’imitation…</strong>
              </>
            ) : clipState.status === "missing" ? (
              <>
                <AlertCircle className="h-9 w-9 text-amber-300" aria-hidden="true" />
                <strong>Imitation introuvable</strong>
                <small>Le dépôt peut encore être en cours de synchronisation.</small>
              </>
            ) : clipState.status === "error" ? (
              <>
                <AlertCircle className="h-9 w-9 text-rose-300" aria-hidden="true" />
                <strong>Impossible de charger l’imitation</strong>
                <small>La carte reste en place. Tu peux relancer uniquement ce média.</small>
              </>
            ) : (
              <>
                <span className="ik-results-play-orb" aria-hidden="true">
                  <Play />
                </span>
                <strong>Découvrir l’imitation</strong>
              </>
            )}

            {clipState.status !== "loading" && (
              <button
                type="button"
                className="ik-results-media-action menu-focus"
                onClick={() => onRequestClip(result.playerId)}
              >
                {(clipState.status === "missing" || clipState.status === "error") && <RefreshCcw aria-hidden="true" />}
                {requestLabel(clipState)}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="ik-results-player-info">
        <div className="ik-results-player-identity">
          <div className="ik-results-avatar-wrap">
            <PlayerAvatar
              playerId={result.playerId}
              playerName={result.playerName}
              size={isWinner ? "xl" : "lg"}
              showTitle={false}
            />
            <span className="ik-results-rank" aria-label={`Rang ${rank}`}>{rank}</span>
          </div>
          <div className="min-w-0">
            <span className="ik-results-player-kicker">
              {isWinner ? "Gagnant de la manche" : `Place ${rank}`}
            </span>
            <h3 style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
              {isCurrentPlayer ? "Toi" : result.playerName}
            </h3>
          </div>
        </div>

        <div className="ik-results-scoreboard" aria-label={`${result.likes} avis positifs, ${result.dislikes} avis négatifs`}>
          <span className="is-like"><ThumbsUp aria-hidden="true" />{result.likes}</span>
          <span className="is-dislike"><ThumbsDown aria-hidden="true" />{result.dislikes}</span>
          <strong style={{ color: scoreColor }}>
            {result.score > 0 ? "+" : ""}{result.score} pts
          </strong>
        </div>

        <div className="ik-results-card-actions">
          {clipState.status !== "ready" && clipState.status !== "loading" && (
            <motion.button
              type="button"
              onClick={() => onRequestClip(result.playerId)}
              whileHover={{ y: -1 }}
              whileTap={{ y: 1 }}
              className="ik-results-card-main menu-focus"
            >
              {clipState.status === "idle" ? <Play aria-hidden="true" /> : <RefreshCcw aria-hidden="true" />}
              {requestLabel(clipState)}
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={() => onDownload(result.playerId, result.playerName)}
            disabled={isDownloading}
            whileHover={{ y: -1 }}
            whileTap={{ y: 1 }}
            className="ik-results-card-tool menu-focus"
            aria-label={`Télécharger l’imitation de ${result.playerName}`}
          >
            {isDownloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          </motion.button>
          {canShare && (
            <motion.button
              type="button"
              onClick={() => onShare(result.playerId, result.playerName)}
              disabled={isSharing}
              whileHover={{ y: -1 }}
              whileTap={{ y: 1 }}
              className="ik-results-card-tool is-share menu-focus"
              aria-label={`Partager l’imitation de ${result.playerName}`}
            >
              {isSharing
                ? <Loader2 className="animate-spin" aria-hidden="true" />
                : hasShared
                  ? <Check aria-hidden="true" />
                  : <Share2 aria-hidden="true" />}
            </motion.button>
          )}
        </div>
      </div>
    </article>
  );
});
