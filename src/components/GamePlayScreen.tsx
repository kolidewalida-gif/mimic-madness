<<<<<<< HEAD
import { useState, useEffect, useCallback } from "react";
=======
import { useState, useEffect } from "react";
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
import { GameLogo } from "@/components/GameLogo";
import { Button } from "@/components/ui/button";
import { ChallengePreviewPhase } from "@/components/ChallengePreviewPhase";
import { ImitationPhase } from "@/components/ImitationPhase";
import { VotingPhase } from "@/components/VotingPhase";
import { ResultsPhase } from "@/components/ResultsPhase";
import { LobbyChat } from "@/components/LobbyChat";
<<<<<<< HEAD
import { AlertTriangle, ArrowLeft, RefreshCcw, Swords, Zap } from "lucide-react";
=======
import { ArrowLeft, Zap, Swords } from "lucide-react";
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useGameTeams } from "@/hooks/useGameTeams";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface GamePlayScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
<<<<<<< HEAD
  gameMode?: "normal" | "2v2" | "quiz";
=======
  gameMode?: 'normal' | '2v2' | 'quiz';
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
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
<<<<<<< HEAD
  gameMode = "normal",
=======
  gameMode = 'normal',
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
  onEndGame
}: GamePlayScreenProps) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>("preview");
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentChallenge, setCurrentChallenge] = useState<CurrentChallenge | null>(null);
<<<<<<< HEAD
  const [isInitializingRound, setIsInitializingRound] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { toast } = useToast();
  const { playSound } = useSoundEffects();
  const { teams, getTeammate } = useGameTeams(lobbyId);

  const buildChallenge = useCallback((challengeId: string, challengePlayerId: string) => ({
    id: challengeId,
    playerId: challengePlayerId,
    playerName: players.find((player) => player.id === challengePlayerId)?.name || "Joueur",
  }), [players]);

  const pickNextChallenge = useCallback(async (usedChallengeIds: Set<string>) => {
    const playableClips = await videoStorage.getPlayableChallengeClipsByLobby(lobbyId);
    const availableClips = playableClips.filter((clip) => !usedChallengeIds.has(clip.id));

    if (availableClips.length === 0) {
      return null;
    }

    const randomClip = availableClips[Math.floor(Math.random() * availableClips.length)];
    return {
      clip: randomClip,
      challenge: buildChallenge(randomClip.id, randomClip.playerId),
    };
  }, [buildChallenge, lobbyId]);

  useEffect(() => {
    let isMounted = true;

    const initializeRound = async () => {
      setIsInitializingRound(true);
      setInitializationError(null);

      try {
        const { data: existingRound, error: roundLookupError } = await supabase
          .from("game_rounds")
          .select("*")
          .eq("lobby_id", lobbyId)
          .eq("round_number", roundNumber)
          .maybeSingle();

        if (roundLookupError) {
          throw roundLookupError;
        }

        if (!isMounted) return;

        if (existingRound) {
          const existingClip = await videoStorage.getVideoClip(existingRound.current_challenge_id);

          if (!existingClip && currentPlayer.isHost) {
            const { data: previousRounds } = await supabase
              .from("game_rounds")
              .select("current_challenge_id")
              .eq("lobby_id", lobbyId);

            const usedChallengeIds = new Set(previousRounds?.map((round) => round.current_challenge_id) || []);
            const replacement = await pickNextChallenge(usedChallengeIds);

            if (!replacement) {
              throw new Error("Aucun clip de defi jouable n'a ete trouve pour cette partie.");
            }

            const { error: repairError } = await supabase
              .from("game_rounds")
              .update({
                current_challenge_id: replacement.clip.id,
                challenge_player_id: replacement.clip.playerId,
              })
              .eq("lobby_id", lobbyId)
              .eq("round_number", existingRound.round_number);

            if (repairError) throw repairError;

            if (!isMounted) return;
            setCurrentChallenge(replacement.challenge);
          } else {
            setCurrentChallenge(buildChallenge(
              existingRound.current_challenge_id,
              existingRound.challenge_player_id
            ));
          }

=======
  const { toast } = useToast();
  const { playSound } = useSoundEffects();
  const { teams, getTeammate, getPlayerTeam } = useGameTeams(lobbyId);

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
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
          setGamePhase(existingRound.phase as GamePhase);
          return;
        }

<<<<<<< HEAD
        if (!currentPlayer.isHost) {
          setInitializationError("En attente de l'initialisation de la manche par l'hote...");
          return;
        }

        const { data: previousRounds } = await supabase
          .from("game_rounds")
          .select("current_challenge_id")
          .eq("lobby_id", lobbyId);

        const usedChallengeIds = new Set(previousRounds?.map((round) => round.current_challenge_id) || []);
        const nextChallenge = await pickNextChallenge(usedChallengeIds);

        if (!nextChallenge) {
          throw new Error("Aucun defi disponible. Verifiez que chaque joueur a bien au moins un clip valide pour ce lobby.");
        }

        const { error: insertError } = await supabase
          .from("game_rounds")
          .upsert({
            lobby_id: lobbyId,
            round_number: roundNumber,
            current_challenge_id: nextChallenge.clip.id,
            challenge_player_id: nextChallenge.clip.playerId,
            phase: "preview"
          }, {
            onConflict: "lobby_id,round_number"
          });

        if (insertError) throw insertError;

        if (!isMounted) return;
        setCurrentChallenge(nextChallenge.challenge);
        setGamePhase("preview");
      } catch (error) {
        console.error("Error initializing round:", error);
        if (!isMounted) return;

        const message = error instanceof Error
          ? error.message
          : "Impossible d'initialiser la manche";

        setInitializationError(message);
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setIsInitializingRound(false);
=======
        if (currentPlayer.isHost) {
          // Get all original challenge clips from all players
          const allClips = await videoStorage.getChallengeClipsByLobby(lobbyId);
          if (!isMounted) return;
          
          // Get already used challenge IDs from previous rounds
          const { data: previousRounds } = await supabase
            .from('game_rounds')
            .select('current_challenge_id')
            .eq('lobby_id', lobbyId);
          
          const usedChallengeIds = new Set(previousRounds?.map(r => r.current_challenge_id) || []);
          
          // Filter out already used challenges
          const availableClips = allClips.filter(clip => !usedChallengeIds.has(clip.id));
          
          if (availableClips.length === 0) {
            toast({
              title: "Partie terminée !",
              description: "Tous les défis ont été joués !",
            });
            return;
          }

          // Pick a random clip from available ones
          const randomClip = availableClips[Math.floor(Math.random() * availableClips.length)];
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
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        }
      }
    };

    initializeRound();

    const channel = supabase
<<<<<<< HEAD
      .channel(`game-round:${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rounds",
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload: any) => {
          if (!isMounted || !payload.new) return;

          const newRound = payload.new.round_number;
          const newPhase = payload.new.phase as GamePhase;

          if (newPhase !== gamePhase) {
            playSound("transition");
          }

          setRoundNumber(newRound);
          setGamePhase(newPhase);
          setInitializationError(null);
          setIsInitializingRound(false);
          setCurrentChallenge(buildChallenge(
            payload.new.current_challenge_id,
            payload.new.challenge_player_id
          ));
=======
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
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
<<<<<<< HEAD
  }, [
    buildChallenge,
    currentPlayer.isHost,
    gamePhase,
    lobbyId,
    pickNextChallenge,
    playSound,
    retryKey,
    roundNumber,
    toast,
  ]);
=======
  }, [lobbyId, roundNumber, currentPlayer.isHost, players, toast]);
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974

  const handlePreviewReady = async () => {
    if (currentPlayer.isHost) {
      try {
        await supabase
<<<<<<< HEAD
          .from("player_imitations")
          .update({ is_ready: false })
          .eq("lobby_id", lobbyId)
          .eq("round_number", roundNumber);

        await supabase
          .from("game_rounds")
          .update({ phase: "imitation" })
          .eq("lobby_id", lobbyId)
          .eq("round_number", roundNumber);

        setGamePhase("imitation");
      } catch (error) {
        console.error("Error updating phase:", error);
=======
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
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      }
    }
  };

  const handleImitationReady = async () => {
    if (currentPlayer.isHost) {
      try {
        await supabase
<<<<<<< HEAD
          .from("game_rounds")
          .update({ phase: "voting" })
          .eq("lobby_id", lobbyId)
          .eq("round_number", roundNumber);

        setGamePhase("voting");
      } catch (error) {
        console.error("Error updating phase:", error);
=======
          .from('game_rounds')
          .update({ phase: 'voting' })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);

        setGamePhase('voting');
      } catch (error) {
        console.error('Error updating phase:', error);
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      }
    }
  };

  const handleVotingComplete = async () => {
    if (currentPlayer.isHost) {
      try {
        await supabase
<<<<<<< HEAD
          .from("game_rounds")
          .update({ phase: "results" })
          .eq("lobby_id", lobbyId)
          .eq("round_number", roundNumber);
      } catch (error) {
        console.error("Error updating phase:", error);
=======
          .from('game_rounds')
          .update({ phase: 'results' })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);
      } catch (error) {
        console.error('Error updating phase:', error);
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      }
    }
  };

  const handleNextRound = async () => {
    if (!currentPlayer.isHost) return;
<<<<<<< HEAD

    const newRoundNumber = roundNumber + 1;

    try {
      const { data: previousRounds } = await supabase
        .from("game_rounds")
        .select("current_challenge_id")
        .eq("lobby_id", lobbyId);

      const usedChallengeIds = new Set(previousRounds?.map((round) => round.current_challenge_id) || []);
      const nextChallenge = await pickNextChallenge(usedChallengeIds);

      if (!nextChallenge) {
        toast({
          title: "Partie terminee",
          description: "Tous les defis jouables ont deja ete utilises.",
=======
    
    const newRoundNumber = roundNumber + 1;
    
    try {
      // Get all original challenge clips from all players
      const allClips = await videoStorage.getChallengeClipsByLobby(lobbyId);
      
      // Get already used challenge IDs from all previous rounds (including current)
      const { data: previousRounds } = await supabase
        .from('game_rounds')
        .select('current_challenge_id')
        .eq('lobby_id', lobbyId);
      
      const usedChallengeIds = new Set(previousRounds?.map(r => r.current_challenge_id) || []);
      
      // Filter out already used challenges
      const availableClips = allClips.filter(clip => !usedChallengeIds.has(clip.id));
      
      if (availableClips.length === 0) {
        toast({
          title: "Partie terminée !",
          description: "Tous les défis ont été joués ! Bravo à tous !",
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        });
        return;
      }

<<<<<<< HEAD
      const { error } = await supabase
        .from("game_rounds")
        .upsert({
          lobby_id: lobbyId,
          round_number: newRoundNumber,
          current_challenge_id: nextChallenge.clip.id,
          challenge_player_id: nextChallenge.clip.playerId,
          phase: "preview"
        }, {
          onConflict: "lobby_id,round_number"
=======
      // Pick a random clip from available ones
      const randomClip = availableClips[Math.floor(Math.random() * availableClips.length)];

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
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        });

      if (error) throw error;

      setRoundNumber(newRoundNumber);
<<<<<<< HEAD
      setGamePhase("preview");
      setCurrentChallenge(nextChallenge.challenge);

      toast({
        title: "Nouvelle manche !",
        description: "Preparez-vous !",
      });
    } catch (error) {
      console.error("Error creating next round:", error);
      toast({
        title: "Erreur",
        description: "Impossible de creer la nouvelle manche",
=======
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
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        variant: "destructive",
      });
    }
  };

<<<<<<< HEAD
  const renderInitializationState = () => {
    if (initializationError && !currentChallenge) {
      return (
        <div className="min-h-screen animated-bg flex items-center justify-center p-6">
          <div className="max-w-xl text-center space-y-5 rounded-3xl border border-amber-500/30 bg-card/70 p-8 backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <GameLogo size="md" />
              <h2 className="text-2xl font-display font-bold">Manche indisponible</h2>
              <p className="text-foreground-secondary">{initializationError}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="hero"
                onClick={() => {
                  setCurrentChallenge(null);
                  setInitializationError(null);
                  setIsInitializingRound(true);
                  setRetryKey((value) => value + 1);
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                Reessayer
              </Button>
              <Button variant="glass" onClick={onEndGame}>
                <ArrowLeft className="h-4 w-4" />
                Quitter
              </Button>
            </div>
          </div>
        </div>
      );
    }

=======
  if (!currentChallenge) {
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <GameLogo size="lg" />
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
<<<<<<< HEAD
          <p className="text-foreground-secondary font-body">
            {initializationError || "Chargement de la manche..."}
          </p>
          {!currentPlayer.isHost && (
            <p className="text-sm text-foreground-muted max-w-md">
              L'hote prepare peut-etre encore le defi. L'ecran se debloquera automatiquement des que la manche sera creee.
            </p>
          )}
        </div>
      </div>
    );
  };

  if (isInitializingRound || !currentChallenge) {
    return renderInitializationState();
=======
          <p className="text-foreground-secondary font-body">Chargement...</p>
        </div>
      </div>
    );
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
  }

  return (
    <div className="min-h-screen animated-bg p-6 relative">
<<<<<<< HEAD
      <div className="absolute top-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: "1.5s" }} />

      <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn relative z-10">
=======
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn relative z-10">
        {/* Header */}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onEndGame}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
<<<<<<< HEAD

          <GameLogo size="sm" />

          <div className="flex items-center gap-3">
            {gameMode === "2v2" && (
=======
          
          <GameLogo size="sm" />
          
          <div className="flex items-center gap-3">
            {gameMode === '2v2' && (
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/30">
                <Swords className="h-4 w-4 text-secondary" />
                <span className="font-display font-bold text-secondary text-sm">2v2</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-display font-bold text-primary">
                MANCHE {roundNumber}
              </span>
            </div>
          </div>
        </header>

<<<<<<< HEAD
=======
        {/* Game Phases */}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
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
            gameMode={gameMode}
            getTeammate={getTeammate}
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
            gameMode={gameMode}
            teams={teams}
            onVotingComplete={handleVotingComplete}
          />
        )}

        {gamePhase === "results" && (
          <ResultsPhase
            lobbyId={lobbyId}
            roundNumber={roundNumber}
            players={players}
            currentPlayer={currentPlayer}
            gameMode={gameMode}
            teams={teams}
            onNextRound={handleNextRound}
            onEndGame={onEndGame}
          />
        )}
      </div>

<<<<<<< HEAD
=======
      {/* Global Chat */}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
};
