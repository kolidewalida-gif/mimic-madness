import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { VictoryAnimation } from "@/components/VictoryAnimation";
import { Trophy, ThumbsUp, ThumbsDown, ArrowRight, Medal, Sparkles, Swords, Download, Loader2, Share2, Check } from "lucide-react";
import { juice } from "@/lib/juice";
import { supabase } from "@/integrations/supabase/client";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { DoodleBorder, DoodleStage } from "@/components/doodle/Doodle";

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
  const { publish: publishSocial } = useSocialFeed('mine');
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

  return (
    <DoodleStage accent="#fbbf24">
      <div className="max-w-4xl mx-auto space-y-6 px-5 py-5 pb-[120px]">
      {/* Victory Animation Overlay */}
      {showVictoryAnimation && (gameMode === '2v2' ? winnerTeam : winner) && (
        <VictoryAnimation
          winnerName={gameMode === '2v2' ? winnerTeam?.playerNames.join(' & ') || '' : winner?.playerName || ''}
          isTeam={gameMode === '2v2'}
          teamPlayers={gameMode === '2v2' ? winnerTeam?.playerNames : undefined}
        />
      )}

      {/* Winner Announcement */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 relative">
          <DoodleBorder color="#fbbf24" filled />
          <Trophy className="relative h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
          <span
            className="relative text-xs uppercase tracking-[0.25em] font-bold"
            style={{ color: '#fbbf24', fontFamily: "'Caveat', cursive" }}
          >
            Résultats {gameMode === '2v2' && '· 2v2'}
          </span>
        </div>

        <h2
          className="text-4xl md:text-6xl font-black leading-none text-white"
          style={{
            fontFamily: "'Caveat', cursive",
            textShadow: '0 0 20px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {gameMode === '2v2' && winnerTeam
            ? winnerTeam.playerNames.join(' & ')
            : winner?.playerName || ''}
        </h2>

        <p className="text-sm text-white/60">
          remporte{gameMode === '2v2' ? 'nt' : ''} cette manche !
        </p>
      </div>

      {/* Leaderboard */}
      <div className="relative px-4 py-4">
        <DoodleBorder color="#fbbf24" rotation={-1} />
        <div className="relative space-y-4">
          <h3
            className="text-xl font-black text-center"
            style={{ fontFamily: "'Caveat', cursive", color: '#fbbf24' }}
          >
            Classement {gameMode === '2v2' && 'des Équipes'}
          </h3>
          
          <div className="space-y-3">
            {gameMode === '2v2' ? (
              teamResults.map((team, index) => (
                <div
                  key={team.teamNumber}
                  className={`p-4 rounded-xl flex items-center justify-between transition-all animate-slideInLeft ${
                    index === 0
                      ? "bg-gradient-to-r from-secondary/20 to-primary/10 border-2 border-secondary/50 shadow-neon-pink"
                      : index === 1
                      ? "bg-background-secondary/60 border border-foreground-muted/20"
                      : "bg-background-secondary/20"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex justify-center">
                      {getMedalIcon(index)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Swords className="h-5 w-5 text-secondary" />
                      <div>
                        <p className={`font-semibold font-body ${
                          index === 0 ? "text-lg text-secondary" : "text-foreground"
                        }`}>
                          {team.playerNames.join(' & ')}
                        </p>
                        <p className="text-sm text-foreground-muted font-display">
                          Score: <span className={team.score > 0 ? "text-success" : team.score < 0 ? "text-destructive" : ""}>
                            {team.score > 0 ? "+" : ""}{team.score}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-success" />
                      <span className="font-display font-bold text-success">{team.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-destructive" />
                      <span className="font-display font-bold text-destructive">{team.dislikes}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              results.map((result, index) => (
                <div
                  key={result.playerId}
                  className={`p-4 rounded-xl flex items-center justify-between transition-all animate-slideInLeft ${
                    index === 0
                      ? "bg-gradient-to-r from-secondary/20 to-primary/10 border-2 border-secondary/50 shadow-neon-pink"
                      : index === 1
                      ? "bg-background-secondary/60 border border-foreground-muted/20"
                      : index === 2
                      ? "bg-background-secondary/40 border border-amber-600/20"
                      : "bg-background-secondary/20"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex justify-center">
                      {getMedalIcon(index)}
                    </div>
                    
                    <PlayerAvatar
                      playerId={result.playerId}
                      playerName={result.playerName}
                      size="md"
                    />
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold font-body ${
                          index === 0 ? "text-lg text-secondary" : "text-foreground"
                        }`}>
                          {result.playerName}
                        </p>
                        <button
                          onClick={() => handleDownloadImitation(result.playerId, result.playerName)}
                          disabled={downloadingPlayer === result.playerId}
                          className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/40 transition-all disabled:opacity-50 group"
                          title={`Télécharger l'imitation de ${result.playerName}`}
                        >
                          {downloadingPlayer === result.playerId ? (
                            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                        {result.playerId === currentPlayer.id && (
                          <button
                            onClick={() => handleShareImitation(result.playerId, result.playerName)}
                            disabled={sharingPlayer === result.playerId}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 transition-all disabled:opacity-50 group"
                            title="Partager sur Social"
                          >
                            {sharingPlayer === result.playerId ? (
                              <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                            ) : sharedClipIds.size > 0 ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-foreground-muted font-display">
                        Score: <span className={result.score > 0 ? "text-success" : result.score < 0 ? "text-destructive" : ""}>
                          {result.score > 0 ? "+" : ""}{result.score}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-success" />
                      <span className="font-display font-bold text-success">{result.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-destructive" />
                      <span className="font-display font-bold text-destructive">{result.dislikes}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {currentPlayer.isHost && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onEndGame}
            className="relative flex-1 py-3 group"
          >
            <DoodleBorder color="rgba(255,255,255,0.18)" />
            <span
              className="relative text-base font-black text-white/70 group-hover:text-white transition-colors"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Terminer
            </span>
          </button>
          <motion.button
            type="button"
            onClick={onNextRound}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="relative flex-1 py-3"
          >
            <DoodleBorder color="#fbbf24" filled rotation={-1} thick />
            <div className="relative flex items-center justify-center gap-2">
              <span
                className="text-base font-black"
                style={{ fontFamily: "'Caveat', cursive", color: '#fbbf24' }}
              >
                Manche suivante
              </span>
              <ArrowRight className="h-4 w-4" style={{ color: '#fbbf24' }} />
            </div>
          </motion.button>
        </div>
      )}

      {!currentPlayer.isHost && (
        <div className="relative px-4 py-3 text-center">
          <DoodleBorder color="rgba(255,255,255,0.15)" />
          <p
            className="relative flex items-center justify-center gap-2 text-white/60 text-sm font-bold"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            En attente de l'hôte pour la suite…
          </p>
        </div>
      )}
      </div>
    </DoodleStage>
  );
};
