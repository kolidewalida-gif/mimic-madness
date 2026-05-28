import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { VictoryAnimation } from "@/components/VictoryAnimation";
import { VideoWithAudioOverlay } from "@/components/VideoWithAudioOverlay";
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

  useEffect(() => {
    let isMounted = true;
    
    const loadResults = async () => {
      if (gameMode === '2v2' && teams.length > 0) {
        // Load team results
        const teamResultsData: TeamResult[] = [];
        
        for (const team of teams) {
          let totalLikes = 0;
          let totalDislikes = 0;
          
          for (const player of team.players) {
            const { data: votes } = await supabase
              .from('imitation_votes')
              .select('vote_type')
              .eq('lobby_id', lobbyId)
              .eq('round_number', roundNumber)
              .eq('imitation_player_id', player.id);

            totalLikes += votes?.filter(v => v.vote_type === 'like').length || 0;
            totalDislikes += votes?.filter(v => v.vote_type === 'dislike').length || 0;
          }
          
          teamResultsData.push({
            teamNumber: team.teamNumber,
            playerNames: team.players.map(p => p.name),
            likes: totalLikes,
            dislikes: totalDislikes,
            score: totalLikes - totalDislikes
          });
        }
        
        if (isMounted) {
          teamResultsData.sort((a, b) => b.score - a.score);
          setTeamResults(teamResultsData);
        }
      } else {
        // Load individual results
        const resultsData: PlayerResult[] = [];

        for (const player of players) {
          const { data: votes } = await supabase
            .from('imitation_votes')
            .select('vote_type')
            .eq('lobby_id', lobbyId)
            .eq('round_number', roundNumber)
            .eq('imitation_player_id', player.id);

          const likes = votes?.filter(v => v.vote_type === 'like').length || 0;
          const dislikes = votes?.filter(v => v.vote_type === 'dislike').length || 0;
          const score = likes - dislikes;

          resultsData.push({
            playerId: player.id,
            playerName: player.name,
            likes,
            dislikes,
            score
          });
        }

        if (isMounted) {
          resultsData.sort((a, b) => b.score - a.score);
          setResults(resultsData);
        }
      }
    };

    loadResults();
    
    return () => {
      isMounted = false;
    };
  }, [lobbyId, roundNumber, players, gameMode, teams]);

  const winner = results[0];
  const winnerTeam = teamResults[0];
  const displayResults = gameMode === '2v2' ? teamResults : results;

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

  const SHADOW = "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810";
  const SHADOW_SM = "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810";
  const FONT = "'Caveat', cursive";

  const medalColor = (i: number) =>
    i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#f97316" : "rgba(255,255,255,0.3)";

  return (
    <div className="h-[100dvh] text-white relative overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}>
      {/* Background halo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity }}
          className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #fbbf2433, transparent 70%)", filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[10%] right-[6%] w-5 h-5 text-amber-400/30" />
      </div>

      {/* Victory overlay */}
      {showVictoryAnimation && (gameMode === '2v2' ? winnerTeam : winner) && (
        <VictoryAnimation
          winnerName={gameMode === '2v2' ? winnerTeam?.playerNames.join(' & ') || '' : winner?.playerName || ''}
          isTeam={gameMode === '2v2'}
          teamPlayers={gameMode === '2v2' ? winnerTeam?.playerNames : undefined}
        />
      )}

      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 py-5 pb-[140px]">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -2 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
              <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span className="text-sm font-black uppercase tracking-wider text-white"
                style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                🏆 Résultats {gameMode === '2v2' && '· 2v2'} · Manche {roundNumber}
              </span>
            </motion.div>
            <h2 className="text-5xl font-black text-white"
              style={{ fontFamily: FONT, textShadow: SHADOW }}>
              {gameMode === '2v2' && winnerTeam
                ? winnerTeam.playerNames.join(' & ')
                : winner?.playerName || ''}
            </h2>
            <p className="text-base text-white/60 font-bold" style={{ fontFamily: FONT }}>
              remporte{gameMode === '2v2' ? 'nt' : ''} cette manche !
            </p>
          </div>

          {/* Player cards grid — each card has avatar + score + expandable video */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result, index) => {
              const isWinner = index === 0;
              const isExpanded = expandedPlayers.has(result.playerId);
              const clip = playerClips[result.playerId];
              const clipLoading = result.playerId in playerClips && clip === null;
              const isMe = result.playerId === currentPlayer.id;
              const mc = medalColor(index);

              return (
                <motion.div
                  key={result.playerId}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.07, type: "spring", damping: 20 }}
                  className="relative rounded-3xl overflow-hidden flex flex-col"
                  style={{
                    background: isWinner
                      ? "linear-gradient(180deg, #2a1a0e, #1a0d2e)"
                      : "linear-gradient(180deg, #1a0d2e, #0f0820)",
                    border: `4px solid ${isWinner ? "#fbbf24" : "#0a0810"}`,
                    boxShadow: isWinner
                      ? `0 8px 0 #0a0810, 0 0 30px rgba(251,191,36,0.4)`
                      : "0 6px 0 #0a0810",
                  }}
                >
                  {/* Rank badge */}
                  <div className="absolute -top-2 -left-2 z-10">
                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: index === 0 ? -8 : -4 }}
                      transition={{ type: "spring", damping: 10, delay: index * 0.07 + 0.2 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${mc}, ${mc}cc)`,
                        border: "3px solid #0a0810",
                        boxShadow: "0 3px 0 #0a0810",
                      }}
                    >
                      {index === 0 ? (
                        <Trophy className="w-5 h-5 text-white" strokeWidth={2.5} />
                      ) : index === 1 ? (
                        <Medal className="w-4 h-4 text-white" strokeWidth={2.5} />
                      ) : index === 2 ? (
                        <Medal className="w-4 h-4 text-white" strokeWidth={2.5} />
                      ) : (
                        <span className="text-base font-black text-white" style={{ fontFamily: FONT }}>{index + 1}</span>
                      )}
                    </motion.div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 pt-5 space-y-3">
                    {/* Player info row */}
                    <div className="flex items-center gap-3">
                      <PlayerAvatar playerId={result.playerId} playerName={result.playerName} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xl font-black text-white truncate"
                            style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                            {isMe ? "Toi" : result.playerName}
                          </h3>
                          {isMe && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(6,182,212,0.2)", color: "#06b6d4", border: "1.5px solid #06b6d4", fontFamily: FONT }}>
                              Toi
                            </span>
                          )}
                        </div>
                        {/* Score */}
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-sm font-black text-emerald-400" style={{ fontFamily: FONT }}>{result.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-sm font-black text-red-400" style={{ fontFamily: FONT }}>{result.dislikes}</span>
                          </div>
                          <span className="text-sm font-black ml-auto"
                            style={{
                              fontFamily: FONT,
                              color: result.score > 0 ? "#34d399" : result.score < 0 ? "#ef4444" : "rgba(255,255,255,0.5)",
                              textShadow: SHADOW_SM,
                            }}>
                            {result.score > 0 ? "+" : ""}{result.score} pts
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center gap-2">
                      {/* Expand/collapse video */}
                      <motion.button
                        type="button"
                        onClick={() => toggleExpand(result.playerId)}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl"
                        style={{
                          background: isExpanded
                            ? "linear-gradient(180deg, #a855f7, #7c3aed)"
                            : "rgba(168,85,247,0.15)",
                          border: "2.5px solid #0a0810",
                          boxShadow: "0 3px 0 #0a0810",
                        }}
                      >
                        {clipLoading ? (
                          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                        ) : isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-purple-300" strokeWidth={2.5} />
                        )}
                        <span className="text-sm font-black"
                          style={{ fontFamily: FONT, color: isExpanded ? "white" : "rgba(168,85,247,0.9)", textShadow: isExpanded ? SHADOW_SM : "none" }}>
                          {isExpanded ? "Cacher" : "Voir l'imitation"}
                        </span>
                      </motion.button>

                      {/* Download */}
                      <motion.button
                        type="button"
                        onClick={() => handleDownloadImitation(result.playerId, result.playerName)}
                        disabled={downloadingPlayer === result.playerId}
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.06)", border: "2px solid #0a0810", boxShadow: "0 2px 0 #0a0810" }}
                        title="Télécharger"
                      >
                        {downloadingPlayer === result.playerId
                          ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                          : <Download className="w-4 h-4 text-white/70" strokeWidth={2.5} />}
                      </motion.button>

                      {/* Share (own clip + logged in only) */}
                      {result.playerId === currentPlayer.id && authUser && (
                        <motion.button
                          type="button"
                          onClick={() => handleShareImitation(result.playerId, result.playerName)}
                          disabled={sharingPlayer === result.playerId}
                          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-50"
                          style={{
                            background: sharedClipIds.size > 0 ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.15)",
                            border: "2px solid #0a0810",
                            boxShadow: "0 2px 0 #0a0810",
                          }}
                          title="Partager sur Social"
                        >
                          {sharingPlayer === result.playerId
                            ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                            : sharedClipIds.size > 0
                              ? <Check className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
                              : <Share2 className="w-4 h-4 text-amber-400" strokeWidth={2.5} />}
                        </motion.button>
                      )}
                    </div>

                    {/* Expandable video panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: "spring", damping: 22 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl overflow-hidden"
                            style={{ border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
                            {clipLoading ? (
                              <div className="aspect-video bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                              </div>
                            ) : clip && challengeClipId ? (
                              <VideoWithAudioOverlay
                                videoClipId={challengeClipId}
                                audioClipId={clip.id}
                                className="w-full"
                              />
                            ) : clip ? (
                              /* No challenge clip — show audio-only player */
                              <div className="aspect-video bg-black/60 flex flex-col items-center justify-center gap-3">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                  style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", border: "3px solid #0a0810" }}>
                                  <Play className="w-7 h-7 text-white" strokeWidth={2.5} />
                                </div>
                                <audio src={undefined} controls className="w-full max-w-xs" />
                              </div>
                            ) : (
                              <div className="aspect-video bg-black/60 flex items-center justify-center">
                                <p className="text-white/50 text-sm font-bold" style={{ fontFamily: FONT }}>
                                  Aucune imitation enregistrée
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Host actions */}
          {currentPlayer.isHost && (
            <div className="flex gap-3 pt-2">
              <motion.button type="button" onClick={onEndGame}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
                <span className="text-xl font-black text-white/70" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                  Terminer
                </span>
              </motion.button>
              <motion.button type="button" onClick={onNextRound}
                whileHover={{ scale: 1.03, rotate: -1 }} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: "3px solid #0a0810", boxShadow: "0 5px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)" }}>
                <span className="text-xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                  Manche suivante
                </span>
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>
          )}

          {!currentPlayer.isHost && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "2.5px solid #0a0810" }}>
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
