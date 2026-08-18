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
      // Single query for ALL votes of this round — no N+1
      const { data: allVotes } = await supabase
        .from('imitation_votes')
        .select('imitation_player_id, vote_type')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber);

      const tally = new Map<string, { likes: number; dislikes: number }>();
      for (const v of allVotes ?? []) {
        const entry = tally.get(v.imitation_player_id) ?? { likes: 0, dislikes: 0 };
        if (v.vote_type === 'like') entry.likes++;
        else if (v.vote_type === 'dislike') entry.dislikes++;
        tally.set(v.imitation_player_id, entry);
      }

      if (!isMounted) return;

      if (gameMode === '2v2' && teams.length > 0) {
        const teamResultsData: TeamResult[] = teams.map((team) => {
          let totalLikes = 0, totalDislikes = 0;
          for (const player of team.players) {
            const t = tally.get(player.id);
            if (t) { totalLikes += t.likes; totalDislikes += t.dislikes; }
          }
          return { teamNumber: team.teamNumber, playerNames: team.players.map(p => p.name), likes: totalLikes, dislikes: totalDislikes, score: totalLikes - totalDislikes };
        });
        teamResultsData.sort((a, b) => b.score - a.score);
        setTeamResults((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(teamResultsData)) return prev;
          return teamResultsData;
        });
      } else {
        const resultsData: PlayerResult[] = players.map((player) => {
          const t = tally.get(player.id) ?? { likes: 0, dislikes: 0 };
          return { playerId: player.id, playerName: player.name, likes: t.likes, dislikes: t.dislikes, score: t.likes - t.dislikes };
        });
        resultsData.sort((a, b) => b.score - a.score);
        setResults((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(resultsData)) return prev;
          return resultsData;
        });
      }
    };

    loadResults();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, roundNumber, gameMode]);

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

      {/* Victory overlay */}
      {showVictoryAnimation && winner && (
        <VictoryAnimation winnerName={winner.playerName} isTeam={false} />
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
              {winner?.playerName || ''}
            </h2>
            <p className="text-base text-white/60 font-bold" style={{ fontFamily: FONT }}>
              remporte cette manche !
            </p>
          </div>

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
