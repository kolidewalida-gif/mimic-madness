import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { VictoryAnimation } from "@/components/VictoryAnimation";
import { ResultsPlayerCard, type ResultsClipState, type ResultsPlayerResult } from "@/components/ResultsPlayerCard";
import { RoundBreakAd } from "@/components/RoundBreakAd";
import {
  Trophy, ThumbsUp, ThumbsDown, ArrowRight, Sparkles, Swords,
} from "lucide-react";
import { juice } from "@/lib/juice";
import { supabase } from "@/integrations/supabase/client";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { equalJitterBackoff } from "@/lib/syncState";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Team {
  teamNumber: number;
  players: { id: string; name: string }[];
}

interface ResultsPhaseProps {
  lobbyId: string;
  roundNumber: number;
  challengeVideoClipId: string;
  players: Player[];
  currentPlayer: Player;
  gameMode?: 'normal' | '2v2' | 'quiz';
  teams?: Team[];
  onNextRound: () => void;
  onEndGame: () => void;
  variant?: 'default' | 'inkBeta';
  isRoundReconnecting?: boolean;
}

interface TeamResult {
  teamNumber: number;
  playerNames: string[];
  likes: number;
  dislikes: number;
  score: number;
}

type PlayerResult = ResultsPlayerResult;

const IDLE_CLIP_STATE: ResultsClipState = { status: "idle" };

export const ResultsPhase = ({
  lobbyId,
  roundNumber,
  challengeVideoClipId,
  players,
  currentPlayer,
  gameMode = 'normal',
  teams = [],
  onNextRound,
  onEndGame,
  variant = 'default',
  isRoundReconnecting = false,
}: ResultsPhaseProps) => {
  const isInkBeta = variant === 'inkBeta';
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [isResultsSynchronized, setIsResultsSynchronized] = useState(false);
  const [resultsRetryKey, setResultsRetryKey] = useState(0);
  const resultsRetryAttemptRef = useRef(0);
  const hasCertifiedResultsRef = useRef(false);
  const celebratedRoundRef = useRef<number | null>(null);
  const victoryTimersRef = useRef<{
    wave: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(false);
  const [downloadingPlayer, setDownloadingPlayer] = useState<string | null>(null);
  const [sharedClipIds, setSharedClipIds] = useState<Set<string>>(new Set());
  const [sharingPlayer, setSharingPlayer] = useState<string | null>(null);
  // Chaque média possède un état explicite. Une absence de clip ne peut plus
  // être confondue avec un chargement, et un lecteur prêt reste monté.
  const [playerClips, setPlayerClips] = useState<Record<string, ResultsClipState>>({});
  const clipRequestsRef = useRef<Set<string>>(new Set());
  const resolvedClipPlayersRef = useRef<Set<string>>(new Set());
  const { publish: publishSocial } = useSocialFeed('mine');
  const { user: authUser } = useAuth();
  const { playSound } = useSoundEffects();
  const { toast } = useToast();
  const { setSituation, clearSituationOverride, play, autoMode } = useBackgroundMusic();

  // La musique de victoire attend elle aussi un classement certifié : arriver
  // sur un écran encore vide ne doit pas annoncer un gagnant imaginaire.
  // NOTE: `play` reste volontairement hors dépendances (sa référence change à
  // chaque piste et créerait une boucle avec le mode automatique).
  useEffect(() => {
    if (!autoMode || !isResultsSynchronized) return;
    setSituation("victory", { priority: 3, holdMs: 4500, source: "results-phase" });
    play();
    return () => clearSituationOverride("results-phase");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, isResultsSynchronized]);

  const handleDownloadImitation = async (playerId: string, playerName: string) => {
    setDownloadingPlayer(playerId);
    try {
      // Get the player's imitation clip for this round
      const clip = await videoStorage.getClipByPlayerAndRound(playerId, lobbyId, roundNumber);
      
      if (!clip) {
        toast({
          title: "Vidéo introuvable",
          description: `Aucune imitation trouvée pour ${playerName}`,
          variant: "destructive"
        });
        return;
      }

      // Get the video URL
      const videoUrl = await videoStorage.getVideoUrl(clip.id);
      
      if (!videoUrl) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer la vidéo",
          variant: "destructive"
        });
        return;
      }

      // Download the video
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imitation_${playerName}_round${roundNumber}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Téléchargement réussi",
        description: `L'imitation de ${playerName} a été téléchargée`
      });
      playSound('click');
    } catch (error) {
      console.error('Error downloading imitation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la vidéo",
        variant: "destructive"
      });
    } finally {
      setDownloadingPlayer(null);
    }
  };

  // Publish own imitation to the public Social feed. Only allowed for the
  // currentPlayer's own clip; others can only download.
  const handleShareImitation = async (playerId: string, playerName: string) => {
    if (playerId !== currentPlayer.id) return;
    setSharingPlayer(playerId);
    try {
      const clip = await videoStorage.getClipByPlayerAndRound(playerId, lobbyId, roundNumber);
      if (!clip) {
        toast({
          title: "Aucune imitation",
          description: "Pas de clip à partager pour cette manche.",
          variant: "destructive",
        });
        return;
      }
      const post = await publishSocial(
        clip.id,
        `Imitation par ${playerName}`,
        challengeVideoClipId,
      );

      if (post) {
        setSharedClipIds((prev) => new Set(prev).add(clip.id));
        toast({
          title: "🎉 Partagé sur Social !",
          description: "Ton imitation est en ligne pour toute la communauté.",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de partager (connecte-toi avec un compte).",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('[ResultsPhase] share error', err);
      toast({
        title: "Erreur",
        description: "Échec du partage.",
        variant: "destructive",
      });
    } finally {
      setSharingPlayer(null);
    }
  };

  // Agrège depuis SQL immédiatement ; Realtime ne sert qu'à déclencher des
  // relectures plus rapides après un vote.
  useEffect(() => {
    let isMounted = true;
    let subscribed = false;
    let channelEpoch = 0;
    let latestRequest = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let channelRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const loadResults = async () => {
      // SQL reste la source d'autorité même si le transport Realtime est
      // bloqué par le réseau. Le canal ne sert qu'à accélérer les relectures.
      if (!isMounted) return;
      const requestId = ++latestRequest;
      const requestEpoch = channelEpoch;

      try {
        const { data: allVotes, error } = await supabase
          .from('imitation_votes')
          .select('imitation_player_id, vote_type')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);
        if (error) throw error;
        if (!isMounted || requestId !== latestRequest || requestEpoch !== channelEpoch) return;

        const tally = new Map<string, { likes: number; dislikes: number }>();
        for (const vote of allVotes ?? []) {
          const entry = tally.get(vote.imitation_player_id) ?? { likes: 0, dislikes: 0 };
          if (vote.vote_type === 'like') entry.likes++;
          else if (vote.vote_type === 'dislike') entry.dislikes++;
          tally.set(vote.imitation_player_id, entry);
        }

        const playerResults: PlayerResult[] = players.map((player) => {
          const entry = tally.get(player.id) ?? { likes: 0, dislikes: 0 };
          return {
            playerId: player.id,
            playerName: player.name,
            likes: entry.likes,
            dislikes: entry.dislikes,
            score: entry.likes - entry.dislikes,
          };
        });
        // Deterministic tie-break so every client renders the same ranking.
        playerResults.sort((a, b) =>
          b.score - a.score ||
          b.likes - a.likes ||
          a.playerId.localeCompare(b.playerId));

        setResults((previous) =>
          JSON.stringify(previous) === JSON.stringify(playerResults) ? previous : playerResults);

        if (gameMode === '2v2' && teams.length > 0) {
          const teamResultsData: TeamResult[] = teams.map((team) => {
            let totalLikes = 0;
            let totalDislikes = 0;
            for (const player of team.players) {
              const entry = tally.get(player.id);
              if (entry) {
                totalLikes += entry.likes;
                totalDislikes += entry.dislikes;
              }
            }
            return {
              teamNumber: team.teamNumber,
              playerNames: team.players.map((player) => player.name),
              likes: totalLikes,
              dislikes: totalDislikes,
              score: totalLikes - totalDislikes,
            };
          });
          teamResultsData.sort((a, b) =>
            b.score - a.score || b.likes - a.likes || a.teamNumber - b.teamNumber);
          setTeamResults((previous) =>
            JSON.stringify(previous) === JSON.stringify(teamResultsData) ? previous : teamResultsData);
        } else {
          setTeamResults([]);
        }

        hasCertifiedResultsRef.current = true;
        setIsResultsSynchronized(true);
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        resultsRetryAttemptRef.current = 0;
      } catch (error) {
        if (!isMounted || requestId !== latestRequest || requestEpoch !== channelEpoch) return;
        // Keep the previous snapshot: an error is not a round with zero votes.
        console.error('Error aggregating round results:', error);
        // Une panne transitoire ne remplace jamais un classement déjà certifié
        // par un titre vide. Le snapshot reste visible pendant la reconnexion.
        if (!hasCertifiedResultsRef.current) setIsResultsSynchronized(false);
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            resultsRetryAttemptRef.current = Math.min(resultsRetryAttemptRef.current + 1, 8);
            void loadResults();
          }, equalJitterBackoff(resultsRetryAttemptRef.current, 1_000, 10_000));
        }
      }
    };

    const requestDebouncedLoad = (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const row = Object.keys(payload.new).length > 0 ? payload.new : payload.old;
      if (typeof row.round_number === 'number' && row.round_number !== roundNumber) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void loadResults();
      }, 300);
    };

    const channel = supabase
      .channel(`results:${lobbyId}:${roundNumber}:${resultsRetryKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'imitation_votes',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        requestDebouncedLoad,
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          if (channelRetryTimer) {
            clearTimeout(channelRetryTimer);
            channelRetryTimer = null;
          }
          channelEpoch += 1;
          void loadResults();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribed = false;
          channelEpoch += 1;
          latestRequest += 1;
          // Une panne WebSocket n'invalide pas le dernier agrégat SQL. On le
          // relit immédiatement et on reconnecte le canal séparément.
          void loadResults();
          if (!channelRetryTimer) {
            channelRetryTimer = setTimeout(() => {
              channelRetryTimer = null;
              setResultsRetryKey((value) => value + 1);
            }, equalJitterBackoff(resultsRetryAttemptRef.current, 1_000, 10_000));
          }
        }
      });

    // Première lecture immédiate, puis secours périodique tant que le canal ne
    // peut pas nous notifier. Les résultats restent donc disponibles en HTTP.
    void loadResults();
    const fallbackTimer = setInterval(() => {
      if (!isMounted || subscribed) return;
      void loadResults();
    }, 4_000);

    const resync = () => {
      if (navigator.onLine) void loadResults();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resync();
    };
    window.addEventListener('online', resync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      subscribed = false;
      channelEpoch += 1;
      latestRequest += 1;
      if (retryTimer) clearTimeout(retryTimer);
      if (channelRetryTimer) clearTimeout(channelRetryTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(fallbackTimer);
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [gameMode, lobbyId, players, resultsRetryKey, roundNumber, teams]);

  const winnerTeam = teamResults[0];
  const winner = results[0];
  const winnerLabel = gameMode === '2v2'
    ? winnerTeam?.playerNames.join(' & ')
    : winner?.playerName;

  // Son, confettis et overlay ne partent qu'une fois l'agrégat SQL certifié.
  // Le garde par numéro de manche évite une seconde explosion à chaque update
  // Realtime contenant exactement le même classement.
  useEffect(() => {
    if (
      !isResultsSynchronized ||
      !winnerLabel ||
      celebratedRoundRef.current === roundNumber
    ) return;

    celebratedRoundRef.current = roundNumber;
    playSound('success');

    /*
     * Sous la beta, le classement s'affiche net : pas d'overlay de victoire, pas
     * de confettis, pas de secousse d'écran. Le son de réussite reste, lui ne
     * cache rien.
     */
    if (isInkBeta) return;

    setShowVictoryAnimation(true);
    juice.confetti({ count: 140 });
    juice.flash('primary', 320);
    juice.shake(260, 0.8);
    if (victoryTimersRef.current) {
      clearTimeout(victoryTimersRef.current.wave);
    }
    const wave = setTimeout(() => {
      juice.confetti({ count: 80 });
      victoryTimersRef.current = null;
    }, 700);
    victoryTimersRef.current = { wave };
  }, [isInkBeta, isResultsSynchronized, playSound, roundNumber, winnerLabel]);

  // La fermeture dépend uniquement de l'overlay lui-même : un nouveau gagnant
  // ou une resynchronisation ne peut donc pas annuler ce délai.
  useEffect(() => {
    if (!showVictoryAnimation) return;
    const hide = setTimeout(() => setShowVictoryAnimation(false), 4000);
    return () => clearTimeout(hide);
  }, [roundNumber, showVictoryAnimation]);

  useEffect(() => () => {
    if (!victoryTimersRef.current) return;
    clearTimeout(victoryTimersRef.current.wave);
    victoryTimersRef.current = null;
  }, []);

  const requestPlayerClip = useCallback(async (playerId: string) => {
    // A certified clip is immutable for this round. Keeping this guard outside
    // React state prevents score refreshes from replacing a ready player with
    // a loading placeholder, which used to restart the video.
    if (
      clipRequestsRef.current.has(playerId) ||
      resolvedClipPlayersRef.current.has(playerId)
    ) return;

    clipRequestsRef.current.add(playerId);
    setPlayerClips((previous) => ({
      ...previous,
      [playerId]: { status: "loading" },
    }));

    try {
      const clip = await videoStorage.getClipByPlayerAndRound(playerId, lobbyId, roundNumber);
      if (clip) resolvedClipPlayersRef.current.add(playerId);
      setPlayerClips((previous) => ({
        ...previous,
        [playerId]: clip
          ? { status: "ready", clip }
          : { status: "missing" },
      }));
    } catch (error) {
      console.error("Error loading result imitation:", error);
      setPlayerClips((previous) => ({
        ...previous,
        [playerId]: { status: "error" },
      }));
    } finally {
      clipRequestsRef.current.delete(playerId);
    }
  }, [lobbyId, roundNumber]);

  // Le gagnant est la pièce principale de l’écran : préparer son média une
  // seule fois évite un écran vide, sans charger tous les lecteurs du podium.
  useEffect(() => {
    if (!isResultsSynchronized || !results[0]) return;
    void requestPlayerClip(results[0].playerId);
  }, [isResultsSynchronized, requestPlayerClip, results]);

  const SHADOW = "2px 2px 0 var(--ink-line), -1.5px -1.5px 0 var(--ink-line), 1.5px -1.5px 0 var(--ink-line), -1.5px 1.5px 0 var(--ink-line)";
  const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";
  const FONT = "'Outfit', sans-serif";

  const podium = results.slice(0, 3);
  const rest = results.slice(3);
  const podiumColor = ["#fbbf24", "#d1d5db", "#f97316"];

  return (
    <div
      className={isInkBeta ? 'contents' : 'h-[100dvh] text-white relative overflow-hidden flex flex-col'}
      style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}>
      {/* Background — la beta a déjà ses couches de scène. */}
      {!isInkBeta && (
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity }}
          className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #fbbf2433, transparent 70%)", filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[8%] right-[6%] w-5 h-5 text-amber-400/30" />
      </div>
      )}

      {/* Victory overlay — only after a certified SQL aggregation.
          La beta s'en passe : l'écran de scores doit être lisible tout de
          suite, sans plein écran de célébration à attendre. */}
      {!isInkBeta && showVictoryAnimation && isResultsSynchronized && winnerLabel && (
        <VictoryAnimation winnerName={winnerLabel} isTeam={gameMode === '2v2'} />
      )}

      <div className={isInkBeta ? 'contents' : 'relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 py-4 pb-[140px]'}>
        <div className={isInkBeta ? 'ik-gpanel is-featured ik-results-shell' : 'max-w-6xl mx-auto space-y-5'}>

          {/* Header */}
          <div className={isInkBeta ? 'ik-results-hero' : 'text-center space-y-2'}>
            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -2 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              className={isInkBeta ? 'ik-results-badge' : 'inline-flex items-center gap-2 px-4 py-2 rounded-full'}
              style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
              <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span className="text-sm font-black uppercase tracking-wider text-white"
                style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                🏆 Résultats · Manche {roundNumber}
              </span>
            </motion.div>
            <h2 className={isInkBeta ? 'ik-results-winner' : 'text-5xl font-black text-white'} style={{ fontFamily: FONT, textShadow: SHADOW }}>
              {isResultsSynchronized ? (winnerLabel ?? '') : ''}
            </h2>
            <p className={isInkBeta ? 'ik-results-subtitle' : 'text-base text-white/60 font-bold'} style={{ fontFamily: FONT }}>
              {isResultsSynchronized ? 'remporte cette manche !' : 'Synchronisation des votes…'}
            </p>
          </div>

          {/* 2v2 — team scoreboard, previously computed but never displayed. */}
          {gameMode === '2v2' && teamResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-white/40 px-1" style={{ fontFamily: FONT }}>
                Classement des équipes
              </p>
              {teamResults.map((team, index) => (
                <motion.div key={team.teamNumber}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: '1px solid var(--ink-line)' }}>
                  <span className="text-base font-black text-white/50 w-6 text-center" style={{ fontFamily: FONT }}>
                    {index + 1}
                  </span>
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <Swords className="w-4 h-4 shrink-0 text-secondary" />
                    <span className="truncate text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                      Équipe {team.teamNumber} · {team.playerNames.join(' & ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-black text-emerald-400" style={{ fontFamily: FONT }}>{team.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3 text-red-400" />
                      <span className="text-xs font-black text-red-400" style={{ fontFamily: FONT }}>{team.dislikes}</span>
                    </div>
                    <span className="text-xs font-black w-12 text-right"
                      style={{ fontFamily: FONT, color: team.score > 0 ? "#34d399" : team.score < 0 ? "#ef4444" : "rgba(255,255,255,0.4)" }}>
                      {team.score > 0 ? "+" : ""}{team.score}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Podium stable : chaque carte garde la même identité React et le
              lecteur prêt ne disparaît plus lors d'une mise à jour Realtime. */}
          {podium.length > 0 && (
            <div className={`ik-results-grid${podium.length === 1 ? ' is-solo' : ''}`}>
              {podium.map((result, index) => {
                const clipState = playerClips[result.playerId] ?? IDLE_CLIP_STATE;
                return (
                  <ResultsPlayerCard
                    key={result.playerId}
                    result={result}
                    rank={index + 1}
                    color={podiumColor[index]}
                    isWinner={index === 0}
                    isSolo={podium.length === 1}
                    isCurrentPlayer={result.playerId === currentPlayer.id}
                    challengeVideoClipId={challengeVideoClipId}
                    clipState={clipState}
                    isDownloading={downloadingPlayer === result.playerId}
                    isSharing={sharingPlayer === result.playerId}
                    canShare={result.playerId === currentPlayer.id && Boolean(authUser)}
                    hasShared={clipState.status === 'ready' && sharedClipIds.has(clipState.clip.id)}
                    onRequestClip={requestPlayerClip}
                    onDownload={handleDownloadImitation}
                    onShare={handleShareImitation}
                  />
                );
              })}
            </div>
          )}

          {/* Rest of players (4th+) — compact list */}
          {rest.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-white/40 px-1" style={{ fontFamily: FONT }}>
                Autres joueurs
              </p>
              {rest.map((result, i) => (
                <motion.div key={result.playerId}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  <span className="text-base font-black text-white/40 w-6 text-center" style={{ fontFamily: FONT }}>
                    {i + 4}
                  </span>
                  <PlayerAvatar playerId={result.playerId} playerName={result.playerName} size="sm" />
                  <span className="flex-1 text-base font-black text-white truncate" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                    {result.playerId === currentPlayer.id ? "Toi" : result.playerName}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-black text-emerald-400" style={{ fontFamily: FONT }}>{result.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3 text-red-400" />
                      <span className="text-xs font-black text-red-400" style={{ fontFamily: FONT }}>{result.dislikes}</span>
                    </div>
                    <span className="text-xs font-black w-12 text-right"
                      style={{ fontFamily: FONT, color: result.score > 0 ? "#34d399" : result.score < 0 ? "#ef4444" : "rgba(255,255,255,0.4)" }}>
                      {result.score > 0 ? "+" : ""}{result.score}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Bannière entre manches : au-dessus des actions hôte/joueur,
              donc visible pendant la pause sans cacher le classement. */}
          <RoundBreakAd
            gameMode={gameMode}
            instanceKey={`${gameMode}:${roundNumber}`}
          />

          {isRoundReconnecting && (
            <div className="ik-results-reconnecting" role="status">
              <span aria-hidden="true" />
              Reconnexion à la manche… Le classement reste affiché.
            </div>
          )}

          {/* Host actions */}
          {currentPlayer.isHost && (
            <div className={isInkBeta ? 'ik-results-actions' : 'flex gap-3 pt-2'}>
              <motion.button type="button" onClick={onEndGame}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={isInkBeta ? 'ik-results-end menu-focus' : 'flex-1 py-3 rounded-2xl flex items-center justify-center'}
                style={isInkBeta ? undefined : { background: "rgba(255,255,255,0.05)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <span className="text-xl font-black text-white/70" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                  Terminer
                </span>
              </motion.button>
              <motion.button type="button" onClick={onNextRound}
                disabled={isRoundReconnecting}
                whileHover={!isRoundReconnecting ? { scale: 1.03, rotate: -1 } : undefined}
                whileTap={!isRoundReconnecting ? { scale: 0.97 } : undefined}
                className={isInkBeta ? 'ik-results-next menu-focus' : 'flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50'}
                style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #fbbf24, #d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <span className="text-xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                  {isRoundReconnecting ? 'Reconnexion…' : 'Manche suivante'}
                </span>
                {!isRoundReconnecting && <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />}
              </motion.button>
            </div>
          )}

          {!currentPlayer.isHost && (
            <div className={isInkBeta ? 'ik-results-waiting' : 'flex items-center justify-center gap-2 py-3 rounded-2xl'}
              style={isInkBeta ? undefined : { background: "rgba(255,255,255,0.03)", border: '1px solid var(--ink-line)' }}>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-sm font-black text-white/60" style={{ fontFamily: FONT }}>
                {isRoundReconnecting ? 'Reconnexion à la manche…' : "En attente de l'hôte pour la suite…"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
