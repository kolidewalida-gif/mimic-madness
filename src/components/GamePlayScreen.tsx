import { useState, useEffect } from "react";
import { GameLogo } from "@/components/GameLogo";
import { Button } from "@/components/ui/button";
import { ChallengePreviewPhase } from "@/components/ChallengePreviewPhase";
import { ImitationPhase } from "@/components/ImitationPhase";
import { VotingPhase } from "@/components/VotingPhase";
import { ResultsPhase } from "@/components/ResultsPhase";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface GamePlayScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

type GamePhase = "preview" | "imitation" | "voting" | "results";

interface CurrentChallenge {
  id: string;
  playerId: string;
  playerName: string;
}

export const GamePlayScreen = ({
  currentPlayer,
  players,
  lobbyId,
  onEndGame
}: GamePlayScreenProps) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>("preview");
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentChallenge, setCurrentChallenge] = useState<CurrentChallenge | null>(null);
  const { toast } = useToast();

  // Initialize game round
  useEffect(() => {
    const initializeRound = async () => {
      try {
        // Check if round already exists
        const { data: existingRound } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber)
          .maybeSingle();

        if (existingRound) {
          // Load existing round
          setCurrentChallenge({
            id: existingRound.current_challenge_id,
            playerId: existingRound.challenge_player_id,
            playerName: players.find(p => p.id === existingRound.challenge_player_id)?.name || "Joueur"
          });
          setGamePhase(existingRound.phase as GamePhase);
          return;
        }

        // Create new round (only host)
        if (currentPlayer.isHost) {
          // Pick a random challenge from all players' submissions
          const allClips = await videoStorage.getAllClipsByLobby(lobbyId);
          if (allClips.length === 0) {
            toast({
              title: "Erreur",
              description: "Aucun défi disponible",
              variant: "destructive",
            });
            return;
          }

          const randomClip = allClips[Math.floor(Math.random() * allClips.length)];
          const challengePlayer = players.find(p => p.id === randomClip.playerId);

          const { error } = await supabase
            .from('game_rounds')
            .insert({
              lobby_id: lobbyId,
              round_number: roundNumber,
              current_challenge_id: randomClip.id,
              challenge_player_id: randomClip.playerId,
              phase: 'preview'
            });

          if (error) throw error;

          setCurrentChallenge({
            id: randomClip.id,
            playerId: randomClip.playerId,
            playerName: challengePlayer?.name || "Joueur"
          });
        }
      } catch (error) {
        console.error('Error initializing round:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'initialiser la manche",
          variant: "destructive",
        });
      }
    };

    initializeRound();

    // Subscribe to game round updates
    const channel = supabase
      .channel(`game-round:${lobbyId}:${roundNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload: any) => {
          console.log('Game round update:', payload);
          if (payload.new && payload.new.round_number === roundNumber) {
            setGamePhase(payload.new.phase);
            if (!currentChallenge) {
              setCurrentChallenge({
                id: payload.new.current_challenge_id,
                playerId: payload.new.challenge_player_id,
                playerName: players.find((p: Player) => p.id === payload.new.challenge_player_id)?.name || "Joueur"
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber, currentPlayer.isHost, players, currentChallenge, toast]);

  const handlePreviewReady = async () => {
    if (currentPlayer.isHost) {
      try {
        // Clear ALL player_imitations entries for this round before starting imitation phase
        await supabase
          .from('player_imitations')
          .delete()
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);

        // Update to imitation phase
        await supabase
          .from('game_rounds')
          .update({ phase: 'imitation' })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);

        setGamePhase('imitation');

        toast({
          title: "Phase d'imitation !",
          description: "Tous les joueurs ont vu la vidéo. À vous d'imiter !",
        });
      } catch (error) {
        console.error('Error updating phase:', error);
      }
    }
  };

  const handleImitationReady = async () => {
    if (currentPlayer.isHost) {
      try {
        await supabase
          .from('game_rounds')
          .update({ phase: 'voting' })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);

        setGamePhase('voting');

        toast({
          title: "Phase de vote !",
          description: "Tous les joueurs ont soumis. Votez pour les meilleures imitations !",
        });
      } catch (error) {
        console.error('Error updating phase:', error);
      }
    }
  };

  const handleVotingComplete = async () => {
    if (currentPlayer.isHost) {
      try {
        await supabase
          .from('game_rounds')
          .update({ phase: 'results' })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);
      } catch (error) {
        console.error('Error updating phase:', error);
      }
    }
  };

  const handleNextRound = async () => {
    setRoundNumber(prev => prev + 1);
    setGamePhase("preview");
    setCurrentChallenge(null);
    
    toast({
      title: "Nouvelle manche !",
      description: "Préparez-vous pour le prochain défi !",
    });
  };

  if (!currentChallenge) {
    return (
      <div className="min-h-screen animated-bg p-6 flex items-center justify-center">
        <div className="text-center">
          <GameLogo size="lg" />
          <p className="mt-4 text-foreground-secondary">Chargement de la manche...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onEndGame}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quitter
          </Button>
          <GameLogo size="md" />
          <div className="text-right">
            <p className="text-sm text-foreground-secondary">Manche</p>
            <p className="text-2xl font-bold text-gradient">{roundNumber}</p>
          </div>
        </div>

        {gamePhase === "preview" && (
          <ChallengePreviewPhase
            lobbyId={lobbyId}
            roundNumber={roundNumber}
            currentPlayer={currentPlayer}
            players={players}
            currentChallenge={currentChallenge}
            onAllReady={handlePreviewReady}
          />
        )}

        {gamePhase === "imitation" && (
          <ImitationPhase
            lobbyId={lobbyId}
            roundNumber={roundNumber}
            currentPlayer={currentPlayer}
            players={players}
            currentChallenge={currentChallenge}
            onAllReady={handleImitationReady}
          />
        )}

        {gamePhase === "voting" && (
          <VotingPhase
            lobbyId={lobbyId}
            roundNumber={roundNumber}
            currentPlayer={currentPlayer}
            players={players}
            onVotingComplete={handleVotingComplete}
          />
        )}

        {gamePhase === "results" && (
          <ResultsPhase
            lobbyId={lobbyId}
            roundNumber={roundNumber}
            players={players}
            currentPlayer={currentPlayer}
            onNextRound={handleNextRound}
            onEndGame={onEndGame}
          />
        )}
      </div>
    </div>
  );
};
