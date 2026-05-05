import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { VictoryAnimation } from "@/components/VictoryAnimation";
import { Trophy, ThumbsUp, ThumbsDown, ArrowRight, Medal, Sparkles, Swords, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

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
  const { playSound } = useSoundEffects();
  const { toast } = useToast();
<<<<<<< HEAD
  const { setSituation, clearSituationOverride, play, autoMode } = useBackgroundMusic();
=======
  const { setSituation, play, autoMode } = useBackgroundMusic();
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974

  // Trigger victory music when results screen mounts (auto mode only)
  // NOTE: deps intentionally omit `play` (it changes whenever the current track
  // changes, which would create an infinite loop with the auto-switch effect).
  useEffect(() => {
    if (autoMode) {
<<<<<<< HEAD
      setSituation("victory", { priority: 3, holdMs: 4500, source: "results-phase" });
      play();
    }
    return () => {
      if (autoMode) clearSituationOverride("results-phase");
=======
      setSituation("victory");
      play();
    }
    return () => {
      if (autoMode) setSituation("lobby");
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
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

  // Play success sound and hide animation after delay
  useEffect(() => {
    playSound('success');
    const timer = setTimeout(() => setShowVictoryAnimation(false), 4000);
    return () => clearTimeout(timer);
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Victory Animation Overlay */}
      {showVictoryAnimation && (gameMode === '2v2' ? winnerTeam : winner) && (
        <VictoryAnimation
          winnerName={gameMode === '2v2' ? winnerTeam?.playerNames.join(' & ') || '' : winner?.playerName || ''}
          isTeam={gameMode === '2v2'}
          teamPlayers={gameMode === '2v2' ? winnerTeam?.playerNames : undefined}
        />
      )}

      {/* Winner Announcement */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-secondary/40 blur-3xl rounded-full animate-pulse scale-150" />
          <div className="relative animate-float">
            <Trophy className="h-24 w-24 text-secondary mx-auto" />
            <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-primary animate-pulse" />
            <Sparkles className="absolute -bottom-2 -left-2 h-6 w-6 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
        
        <h2 className="text-5xl font-display font-black text-gradient">
          RÉSULTATS {gameMode === '2v2' && '• 2v2'}
        </h2>
        
        {gameMode === '2v2' && winnerTeam ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Swords className="h-6 w-6 text-secondary" />
              <p className="text-3xl font-display font-bold text-secondary neon-text-pink">
                {winnerTeam.playerNames.join(' & ')}
              </p>
            </div>
            <p className="text-foreground-secondary font-body text-lg">
              remportent cette manche !
            </p>
          </div>
        ) : winner && (
          <div className="space-y-2">
            <p className="text-3xl font-display font-bold text-secondary neon-text-pink">
              {winner.playerName}
            </p>
            <p className="text-foreground-secondary font-body text-lg">
              remporte cette manche !
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <GameCard variant="accent">
        <div className="space-y-6">
          <h3 className="text-xl font-display font-bold text-center uppercase tracking-wider">
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
      </GameCard>

      {/* Actions */}
      {currentPlayer.isHost && (
        <div className="flex gap-4">
          <Button
            onClick={onEndGame}
            variant="ghost"
            size="lg"
            className="flex-1"
          >
            Terminer
          </Button>
          <Button
            onClick={onNextRound}
            variant="hero"
            size="lg"
            className="flex-1 gap-2"
          >
            Manche Suivante
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {!currentPlayer.isHost && (
        <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-primary font-body flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            En attente de l'hôte pour la suite...
          </p>
        </div>
      )}
    </div>
  );
<<<<<<< HEAD
};
=======
};
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
