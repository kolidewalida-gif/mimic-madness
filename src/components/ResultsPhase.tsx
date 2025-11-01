import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { Trophy, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface ResultsPhaseProps {
  lobbyId: string;
  roundNumber: number;
  players: Player[];
  currentPlayer: Player;
  onNextRound: () => void;
  onEndGame: () => void;
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
  onNextRound,
  onEndGame
}: ResultsPhaseProps) => {
  const [results, setResults] = useState<PlayerResult[]>([]);

  useEffect(() => {
    const loadResults = async () => {
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

      // Sort by score (highest first)
      resultsData.sort((a, b) => b.score - a.score);
      setResults(resultsData);
    };

    loadResults();
  }, [lobbyId, roundNumber, players]);

  const winner = results[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <Trophy className="h-16 w-16 text-secondary mx-auto animate-bounce" />
        <h2 className="text-4xl font-bold text-gradient">
          🏆 Résultats
        </h2>
        {winner && (
          <div className="space-y-2">
            <p className="text-2xl font-semibold text-secondary">
              {winner.playerName}
            </p>
            <p className="text-foreground-secondary">remporte cette manche !</p>
          </div>
        )}
      </div>

      <GameCard>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center mb-6">Classement</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={result.playerId}
                className={`p-4 rounded-lg flex items-center justify-between ${
                  index === 0
                    ? "bg-secondary/20 border-2 border-secondary"
                    : "bg-background-secondary/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold w-8">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                  </span>
                  <div>
                    <p className="font-semibold text-lg">{result.playerName}</p>
                    <p className="text-sm text-foreground-secondary">
                      Score: {result.score > 0 ? "+" : ""}{result.score}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-secondary">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-semibold">{result.likes}</span>
                  </div>
                  <div className="flex items-center gap-1 text-foreground-secondary">
                    <ThumbsDown className="h-4 w-4" />
                    <span className="font-semibold">{result.dislikes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GameCard>

      {currentPlayer.isHost && (
        <div className="flex gap-4">
          <Button
            onClick={onEndGame}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Terminer la Partie
          </Button>
          <Button
            onClick={onNextRound}
            variant="hero"
            size="lg"
            className="flex-1"
          >
            Manche Suivante
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      )}

      {!currentPlayer.isHost && (
        <p className="text-center text-foreground-secondary">
          En attente de l'hôte pour la manche suivante...
        </p>
      )}
    </div>
  );
};
