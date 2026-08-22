import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { VictoryAnimation } from "@/components/VictoryAnimation";
import { VideoWithAudioOverlay } from "@/components/VideoWithAudioOverlay";
import { AdSlot } from "@/components/AdSlot";
import {
  Trophy, ThumbsUp, ThumbsDown, ArrowRight, Medal, Sparkles,
  Swords, Download, Loader2, Share2, Check, Play, ChevronDown, ChevronUp,
} from "lucide-react";
import { juice } from "@/lib/juice";
import { supabase } from "@/integrations/supabase/client";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { DoodleBorder } from "@/components/doodle/Doodle";
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
  players: Player[];
  currentPlayer: Player;
  gameMode?: 'normal' | '2v2' | 'quiz';
  teams?: Team[];
  onNextRound: () => void;
  onEndGame: () => void;
}

interface TeamResult {
  teamNumber: number;
  playerNames: string[];
  likes: number;
  dislikes: number;
  score: number;
}

interface PlayerResult {
  playerId: string;
  playerName: string;
  likes: number;
  dislikes: number;
  score: number;
}

export const ResultsPhase = ({
  lobbyId,
  roundNumber,
  players,
  currentPlayer,
  gameMode = 'normal',
  teams = [],
  onNextRound,
  onEndGame
}: ResultsPhaseProps) => {
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [isResultsSynchronized, setIsResultsSynchronized] = useState(false);
  const [resultsRetryKey, setResultsRetryKey] = useState(0);
  const resultsRetryAttemptRef = useRef(0);
  const [showVictoryAnimation, setShowVictoryAnimation] = useState(true);
  const [downloadingPlayer, setDownloadingPlayer] = useState<string | null>(null);
  const [sharedClipIds, setSharedClipIds] = useState<Set<string>>(new Set());
  const [sharingPlayer, setSharingPlayer] = useState<string | null>(null);
  // Map playerId → their imitation clip (loaded lazily when card expands)
  const [playerClips, setPlayerClips] = useState<Record<string, VideoClip | null>>({});
  // Which player cards have their video expanded
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  // Challenge clip id for this round (needed for VideoWithAudioOverlay)
  const [challengeClipId, setChallengeClipId] = useState<string | null>(null);
  const { publish: publishSocial } = useSocialFeed('mine');
  const { user: authUser } = useAuth();
  const { playSound } = useSoundEffects();
  const { toast } = useToast();
  const { setSituation, clearSituationOverride, play, autoMode } = useBackgroundMusic();

  // Trigger victory music when results screen mounts (auto mode only)
  // NOTE: deps intentionally omit `play` (it changes whenever the current track
  // changes, which would create an infinite loop with the auto-switch effect).
  useEffect(() => {
    if (autoMode) {
      setSituation("victory", { priority: 3, holdMs: 4500, source: "results-phase" });
      play();
    }
    return () => {
      if (autoMode) clearSituationOverride("results-phase");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

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
      // Resolve the matching challenge clip so the social card can replay
      // the original video alongside the imitation audio.
      const { data: round } = await supabase
        .from('game_rounds')
        .select('current_challenge_id')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber)
        .maybeSingle();

      const post = await publishSocial(
        clip.id,
        `Imitation par ${playerName}`,
        round?.current_challenge_id ?? null,
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

  // Play success sound and hide animation after delay
  useEffect(() => {
    playSound('success');
    // 🎉 Dopamine burst on results reveal
    juice.confetti({ count: 140 });
    juice.flash('primary', 320);
    juice.shake(260, 0.8);
    // Second wave for sustained celebration
    const wave = setTimeout(() => juice.confetti({ count: 80 }), 700);
    const timer = setTimeout(() => setShowVictoryAnimation(false), 4000);
    return () => {
      clearTimeout(timer);
      clearTimeout(wave);
    };
  }, [playSound]);

  // Subscribe first, then aggregate from SQL. A vote committed just before
  // this screen mounted is therefore still counted.
  useEffect(() => {
    let isMounted = true;
    let subscribed = false;
    let channelEpoch = 0;
    let latestRequest = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const loadResults = async () => {
      if (!isMounted || !subscribed) return;
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
        setIsResultsSynchronized(false);
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
          channelEpoch += 1;
          void loadResults();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribed = false;
          channelEpoch += 1;
          latestRequest += 1;
          setIsResultsSynchronized(false);
          if (!retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              setResultsRetryKey((value) => value + 1);
            }, equalJitterBackoff(resultsRetryAttemptRef.current, 1_000, 10_000));
          }
        }
      });

    const resync = () => {
      if (navigator.onLine && subscribed) void loadResults();
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
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [gameMode, lobbyId, players, resultsRetryKey, roundNumber, teams]);

  const displayResults = gameMode === '2v2' ? teamResults : results;
  const winnerTeam = teamResults[0];
  const winner = results[0];
  const winnerLabel = gameMode === '2v2'
    ? winnerTeam?.playerNames.join(' & ')
    : winner?.playerName;

  // Fetch the challenge clip id for this round once
  useEffect(() => {
    supabase
      .from('game_rounds')
      .select('current_challenge_id')
      .eq('lobby_id', lobbyId)
      .eq('round_number', roundNumber)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.current_challenge_id) setChallengeClipId(data.current_challenge_id);
      });
  }, [lobbyId, roundNumber]);

  // Toggle a player's video panel. Loads the clip on first expand.
  const toggleExpand = useCallback(async (playerId: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
    // Load clip if not yet fetched
    if (!(playerId in playerClips)) {
      setPlayerClips((prev) => ({ ...prev, [playerId]: null })); // mark as loading
      const clip = await videoStorage.getClipByPlayerAndRound(playerId, lobbyId, roundNumber);
      setPlayerClips((prev) => ({ ...prev, [playerId]: clip ?? null }));
    }
  }, [playerClips, lobbyId, roundNumber]);

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-400" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-300" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-6 text-center font-display font-bold text-foreground-muted">{index + 1}</span>;
    }
  };

  const SHADOW = "2px 2px 0 var(--ink-line), -1.5px -1.5px 0 var(--ink-line), 1.5px -1.5px 0 var(--ink-line), -1.5px 1.5px 0 var(--ink-line)";
  const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";
  const FONT = "'Outfit', sans-serif";

  // Podium order: 2nd (left), 1st (center), 3rd (right)
  const podium = [results[1] ?? null, results[0] ?? null, results[2] ?? null];
  const rest = results.slice(3);

  // Podium card heights (center taller) — bigger for better visibility
  const podiumHeight = [280, 360, 260];
  const podiumLabel = ["🥈", "🥇", "🥉"];
  const podiumColor = ["#d1d5db", "#fbbf24", "#f97316"];

  // PodiumCard — video + avatar + score
  const PodiumCard = ({
    result, rank, color, height, isCenter,
  }: {
    result: PlayerResult | null;
    rank: number;
    color: string;
    height: number;
    isCenter: boolean;
  }) => {
    if (!result) return (
      <div className="flex-1 flex flex-col items-center justify-end" style={{ minHeight: height }}>
        <div className="w-full rounded-3xl opacity-20"
          style={{ height: height * 0.6, background: "rgba(255,255,255,0.05)", border: "3px dashed rgba(255,255,255,0.15)" }} />
      </div>
    );

    const isExpanded = expandedPlayers.has(result.playerId);
    const clip = playerClips[result.playerId];
    const clipLoading = result.playerId in playerClips && clip === null;
    const isMe = result.playerId === currentPlayer.id;

    return (
      <div className="flex-1 max-w-[280px] flex flex-col items-center gap-0" style={{ zIndex: isCenter ? 10 : 5 }}>
        {/* Avatar bubble above card */}
        <div className="relative mb-[-24px] z-10">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: isCenter ? 100 : 80,
              height: isCenter ? 100 : 80,
              background: `linear-gradient(135deg, ${color}, ${color}88)`,
              border: `4px solid var(--ink-line)`,
              boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 20px ${color}66`,
            }}
          >
            <PlayerAvatar playerId={result.playerId} playerName={result.playerName}
              size={isCenter ? "lg" : "lg"} />
          </div>
          {/* Rank badge */}
          <div
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, border: '1px solid var(--ink-line)', boxShadow: 'none' }}
          >
            <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
              {rank}
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: isCenter
              ? "linear-gradient(180deg, #2a1a0e, #1a0d2e)"
              : "linear-gradient(180deg, #1a0d2e, #0f0820)",
            border: `4px solid ${isCenter ? color : "var(--ink-line)"}`,
            boxShadow: isCenter
              ? `0 0 0 rgba(0,0,0,0), 0 0 30px ${color}55`
              : "0 0 0 rgba(0,0,0,0)",
            minHeight: height,
          }}
        >
          {/* Video area */}
          <div className="relative" style={{ paddingTop: "56.25%" /* 16:9 */ }}>
            <div className="absolute inset-0">
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer group"
                onClick={() => toggleExpand(result.playerId)}
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                {clipLoading ? (
                  <Loader2 className="w-8 h-8 text-[var(--ink-accent-text)] animate-spin" />
                ) : isExpanded && clip && challengeClipId ? (
                  <VideoWithAudioOverlay
                    videoClipId={challengeClipId}
                    audioClipId={clip.id}
                    className="w-full h-full"
                  />
                ) : (
                  <>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${color}, ${color}88)`,
                        border: '1px solid var(--ink-line)',
                        boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 16px ${color}66`,
                      }}
                    >
                      <Play className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-sm font-black text-white/80" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                      Voir l'imitation
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 space-y-2">
            {/* Name */}
            <div className="text-center">
              <h3
                className="font-black text-white truncate"
                style={{ fontFamily: FONT, textShadow: SHADOW_SM, fontSize: isCenter ? 22 : 18 }}
              >
                {isMe ? "Toi 🎤" : result.playerName}
              </h3>
            </div>

            {/* Likes / score */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm font-black text-emerald-400" style={{ fontFamily: FONT }}>{result.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                <span className="text-sm font-black text-red-400" style={{ fontFamily: FONT }}>{result.dislikes}</span>
              </div>
              <span
                className="text-sm font-black"
                style={{
                  fontFamily: FONT,
                  color: result.score > 0 ? "#34d399" : result.score < 0 ? "#ef4444" : "rgba(255,255,255,0.5)",
                  textShadow: SHADOW_SM,
                }}
              >
                {result.score > 0 ? "+" : ""}{result.score} pts
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5">
              {isExpanded ? (
                <motion.button type="button" onClick={() => toggleExpand(result.playerId)}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1"
                  style={{ background: "var(--ink-accent-soft)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  <ChevronUp className="w-3.5 h-3.5 text-[var(--ink-accent-text)]" strokeWidth={2.5} />
                  <span className="text-xs font-black text-[var(--ink-accent-text)]" style={{ fontFamily: FONT }}>Cacher</span>
                </motion.button>
              ) : (
                <motion.button type="button" onClick={() => toggleExpand(result.playerId)}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1"
                  style={{ background: `${color}22`, border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  <Play className="w-3 h-3" style={{ color }} strokeWidth={2.5} />
                  <span className="text-xs font-black" style={{ fontFamily: FONT, color }}>Rejouer</span>
                </motion.button>
              )}
              <motion.button type="button"
                onClick={() => handleDownloadImitation(result.playerId, result.playerName)}
                disabled={downloadingPlayer === result.playerId}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.06)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                {downloadingPlayer === result.playerId
                  ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  : <Download className="w-3.5 h-3.5 text-white/70" strokeWidth={2.5} />}
              </motion.button>
              {result.playerId === currentPlayer.id && authUser && (
                <motion.button type="button"
                  onClick={() => handleShareImitation(result.playerId, result.playerName)}
                  disabled={sharingPlayer === result.playerId}
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-50"
                  style={{ background: "rgba(251,191,36,0.15)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  {sharingPlayer === result.playerId
                    ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    : sharedClipIds.size > 0
                      ? <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.5} />
                      : <Share2 className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.5} />}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Podium base */}
        <div
          className="w-full rounded-b-2xl flex items-center justify-center"
          style={{
            height: isCenter ? 48 : rank === 2 ? 36 : 28,
            background: `linear-gradient(180deg, ${color}33, ${color}11)`,
            border: `3px solid var(--ink-line)`,
            borderTop: "none",
            boxShadow: 'none',
          }}
        >
          <span className="text-2xl font-black" style={{ fontFamily: FONT, color, textShadow: SHADOW_SM }}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] text-white relative overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity }}
          className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #fbbf2433, transparent 70%)", filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[8%] right-[6%] w-5 h-5 text-amber-400/30" />
      </div>

      {/* Victory overlay — only after a certified SQL aggregation. */}
      {showVictoryAnimation && isResultsSynchronized && winnerLabel && (
        <VictoryAnimation winnerName={winnerLabel} isTeam={gameMode === '2v2'} />
      )}

      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 py-4 pb-[140px]">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -2 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
              <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span className="text-sm font-black uppercase tracking-wider text-white"
                style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                🏆 Résultats · Manche {roundNumber}
              </span>
            </motion.div>
            <h2 className="text-5xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
              {isResultsSynchronized ? (winnerLabel ?? '') : ''}
            </h2>
            <p className="text-base text-white/60 font-bold" style={{ fontFamily: FONT }}>
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

          {/* PODIUM — 2nd left, 1st center, 3rd right */}
          {results.length > 0 && (
            <div className="flex items-end justify-center gap-4 px-2">
              {results.length >= 2 && (
                <PodiumCard result={podium[0]} rank={2} color={podiumColor[0]} height={podiumHeight[0]} isCenter={false} />
              )}
              <PodiumCard result={podium[1]} rank={1} color={podiumColor[1]} height={podiumHeight[1]} isCenter={true} />
              {results.length >= 3 && (
                <PodiumCard result={podium[2]} rank={3} color={podiumColor[2]} height={podiumHeight[2]} isCenter={false} />
              )}
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
          <AdSlot
            slot={import.meta.env.VITE_ADSENSE_SLOT_BANNER_RESULTS}
            format="horizontal"
            className="pointer-events-auto mx-auto h-[90px] w-full max-w-[728px] rounded-xl"
            label="Publicité"
          />

          {/* Host actions */}
          {currentPlayer.isHost && (
            <div className="flex gap-3 pt-2">
              <motion.button type="button" onClick={onEndGame}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <span className="text-xl font-black text-white/70" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                  Terminer
                </span>
              </motion.button>
              <motion.button type="button" onClick={onNextRound}
                whileHover={{ scale: 1.03, rotate: -1 }} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <span className="text-xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                  Manche suivante
                </span>
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>
          )}

          {!currentPlayer.isHost && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: '1px solid var(--ink-line)' }}>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-sm font-black text-white/60" style={{ fontFamily: FONT }}>
                En attente de l'hôte pour la suite…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
