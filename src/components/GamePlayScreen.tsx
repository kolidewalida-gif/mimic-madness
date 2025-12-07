import { useState, useEffect } from "react";
import { GameLogo } from "@/components/GameLogo";
import { Button } from "@/components/ui/button";
import { ChallengePreviewPhase } from "@/components/ChallengePreviewPhase";
import { ImitationPhase } from "@/components/ImitationPhase";
import { VotingPhase } from "@/components/VotingPhase";
import { ResultsPhase } from "@/components/ResultsPhase";
import { ArrowLeft, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useSoundEffects } from "@/hooks/useSoundEffects";

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
  const { playSound } = useSoundEffects();

  // Initialize game round
  useEffect(() => {
    let isMounted = true;
    
    const initializeRound = async () => {
      try {
        const { data: existingRound } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber)
          .maybeSingle();

        if (!isMounted) return;

        if (existingRound) {
          setCurrentChallenge({
            id: existingRound.current_challenge_id,
            playerId: existingRound.challenge_player_id,
            playerName: players.find(p => p.id === existingRound.challenge_player_id)?.name || "Joueur"
          });
          setGamePhase(existingRound.phase as GamePhase);
          return;
        }

        if (currentPlayer.isHost) {
          // Use getChallengeClipsByLobby to only get original challenges, not imitations
          const allClips = await videoStorage.getChallengeClipsByLobby(lobbyId);
          if (!isMounted) return;
          
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
            .upsert({
              lobby_id: lobbyId,
              round_number: roundNumber,
              current_challenge_id: randomClip.id,
              challenge_player_id: randomClip.playerId,
              phase: 'preview'
            }, {
              onConflict: 'lobby_id,round_number'
            });

          if (error) throw error;

          if (isMounted) {
            setCurrentChallenge({
              id: randomClip.id,
              playerId: randomClip.playerId,
              playerName: challengePlayer?.name || "Joueur"
            });
          }
        }
      } catch (error) {
        console.error('Error initializing round:', error);
        if (isMounted) {
          toast({
            title: "Erreur",
            description: "Impossible d'initialiser la manche",
            variant: "destructive",
          });
        }
      }
    };

    initializeRound();

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
          if (!isMounted) return;
          if (payload.new) {
            const newRound = payload.new.round_number;
            const newPhase = payload.new.phase as GamePhase;
            
            // Play transition sound when phase changes
            if (newPhase !== gamePhase) {
              playSound('transition');
            }
            
            setRoundNumber(newRound);
            setGamePhase(newPhase);
            setCurrentChallenge({
              id: payload.new.current_challenge_id,
              playerId: payload.new.challenge_player_id,
              playerName: players.find((p: Player) => p.id === payload.new.challenge_player_id)?.name || "Joueur"
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber, currentPlayer.isHost, players, toast]);

  const handlePreviewReady = async () => {
    if (currentPlayer.isHost) {
      try {
        await supabase
          .from('player_imitations')
          .update({ is_ready: false })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);

        await supabase
          .from('game_rounds')
          .update({ phase: 'imitation' })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);

        setGamePhase('imitation');
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
    if (!currentPlayer.isHost) return;
    
    const newRoundNumber = roundNumber + 1;
    
    try {
      // Use getChallengeClipsByLobby to only get original challenges, not imitations
      const allClips = await videoStorage.getChallengeClipsByLobby(lobbyId);
      if (allClips.length === 0) {
        toast({
          title: "Erreur",
          description: "Aucun défi disponible",
          variant: "destructive",
        });
        return;
      }

      const randomClip = allClips[Math.floor(Math.random() * allClips.length)];

      const { error } = await supabase
        .from('game_rounds')
        .upsert({
          lobby_id: lobbyId,
          round_number: newRoundNumber,
          current_challenge_id: randomClip.id,
          challenge_player_id: randomClip.playerId,
          phase: 'preview'
        }, {
          onConflict: 'lobby_id,round_number'
        });

      if (error) throw error;

      setRoundNumber(newRoundNumber);
      setGamePhase('preview');
      setCurrentChallenge({
        id: randomClip.id,
        playerId: randomClip.playerId,
        playerName: players.find(p => p.id === randomClip.playerId)?.name || "Joueur"
      });

      toast({
        title: "Nouvelle manche !",
        description: "Préparez-vous !",
      });
    } catch (error) {
      console.error('Error creating next round:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la nouvelle manche",
        variant: "destructive",
      });
    }
  };

  if (!currentChallenge) {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <GameLogo size="lg" />
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-foreground-secondary font-body">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg p-6 relative">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onEndGame}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
          
          <GameLogo size="sm" />
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-primary">
              MANCHE {roundNumber}
            </span>
          </div>
        </header>

        {/* Game Phases */}
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
            challengeVideoClipId={currentChallenge.id}
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
