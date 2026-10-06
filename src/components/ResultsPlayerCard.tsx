import { memo, type CSSProperties } from "react";
import {
  AlertCircle,
  Check,
  Crown,
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
import styles from "./ResultsPlayerCard.module.css";

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
  presentation?: 'ranked' | 'teamReplay';
}

const requestLabel = (state: ResultsClipState) => {
  if (state.status === "missing") return "Rechercher à nouveau";
  if (state.status === "error") return "Réessayer";
  return "Voir l’imitation";
};

/**
 * Une prise de la manche : la vidéo d'abord, puis qui, puis le score.
 * Le gagnant est plus grand, cerclé d'or. Mise en page portée par
 * ResultsPlayerCard.module.css (valeurs de repli si la coque n'est pas là).
 */
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
  presentation = 'ranked',
}: ResultsPlayerCardProps) {
  const scoreTone = result.score > 0 ? styles.positive : result.score < 0 ? styles.negative : undefined;
  const cardStyle = { "--result-accent": color } as CSSProperties;

  return (
    <article
      className={cn(styles.card, isWinner && styles.winner, isSolo && styles.solo, presentation === 'ranked' && !isWinner && !isSolo && styles.side)}
      style={cardStyle}
      aria-label={presentation === 'teamReplay' ? `Prise de ${result.playerName}` : `${rank}${rank === 1 ? "er" : "e"} : ${result.playerName}, ${result.score} points`}
    >
      <div className={styles.media}>
        {clipState.status === "ready" ? (
          <VideoWithAudioOverlay
            videoClipId={challengeVideoClipId}
            audioClipId={clipState.clip.id}
            className="h-full w-full"
          />
        ) : (
          <div className={styles.state}>
            {clipState.status === "loading" ? (
              <>
                <Loader2 className={cn(styles.stateIcon, "animate-spin")} aria-hidden="true" />
                <strong>Préparation de l’imitation…</strong>
              </>
            ) : clipState.status === "missing" ? (
              <>
                <AlertCircle className={styles.stateIcon} aria-hidden="true" />
                <strong>Imitation introuvable</strong>
                <small>Le dépôt peut encore être en cours de synchronisation.</small>
              </>
            ) : clipState.status === "error" ? (
              <>
                <AlertCircle className={styles.stateIcon} aria-hidden="true" />
                <strong>Impossible de charger l’imitation</strong>
                <small>La carte reste en place. Tu peux relancer uniquement ce média.</small>
              </>
            ) : (
              <>
                <span className={styles.orb} aria-hidden="true">
                  <Play />
                </span>
              </>
            )}

            {clipState.status !== "loading" && (
              <button type="button" className={styles.mediaAction} onClick={() => onRequestClip(result.playerId)}>
                {(clipState.status === "missing" || clipState.status === "error") && <RefreshCcw aria-hidden="true" />}
                {requestLabel(clipState)}
              </button>
            )}
          </div>
        )}
        {presentation === 'ranked' && isWinner && (
          <span className={styles.crown}><Crown aria-hidden="true" />Gagnant</span>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.identity}>
          <div className={styles.avatar}>
            <PlayerAvatar
              playerId={result.playerId}
              playerName={result.playerName}
              size={isWinner ? "xl" : "lg"}
              showTitle={false}
            />
            {presentation === 'ranked' && <span className={styles.rank} aria-label={`Rang ${rank}`}>{rank}</span>}
          </div>
          <div className={styles.who}>
            <span className={styles.kicker}>
              {presentation === 'teamReplay' ? 'Prise individuelle du duo' : isWinner ? "Gagnant de la manche" : `Place ${rank}`}
            </span>
            <h3>{isCurrentPlayer ? "Toi" : result.playerName}</h3>
          </div>
          {presentation === 'ranked' && (
            <strong className={cn(styles.points, scoreTone)}>
              {result.score > 0 ? "+" : ""}{result.score}<small>pts</small>
            </strong>
          )}
        </div>

        <div className={styles.footer}>
          {presentation === 'ranked' && (
            <div className={styles.votes} aria-label={`${result.likes} avis positifs, ${result.dislikes} avis négatifs`}>
              <span className={styles.like}><ThumbsUp aria-hidden="true" />{result.likes}</span>
              <span className={styles.dislike}><ThumbsDown aria-hidden="true" />{result.dislikes}</span>
            </div>
          )}
          <div className={styles.tools}>
            <button
              type="button"
              onClick={() => onDownload(result.playerId, result.playerName)}
              disabled={isDownloading}
              className={styles.tool}
              aria-label={`Télécharger l’imitation de ${result.playerName}`}
            >
              {isDownloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={() => onShare(result.playerId, result.playerName)}
                disabled={isSharing}
                className={cn(styles.tool, styles.share)}
                aria-label={`Partager l’imitation de ${result.playerName}`}
              >
                {isSharing
                  ? <Loader2 className="animate-spin" aria-hidden="true" />
                  : hasShared
                    ? <Check aria-hidden="true" />
                    : <Share2 aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
