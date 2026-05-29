import { useState, useEffect, useCallback, useRef } from "react";
import { GameLogo } from "@/components/GameLogo";
import { Button } from "@/components/ui/button";
import { ChallengePreviewPhase } from "@/components/ChallengePreviewPhase";
import { ImitationPhase } from "@/components/ImitationPhase";
import { VotingPhase } from "@/components/VotingPhase";
import { ResultsPhase } from "@/components/ResultsPhase";
import { LobbyChat } from "@/components/LobbyChat";
import { AlertTriangle, ArrowLeft, RefreshCcw, Swords, Zap } from "lucide-react";
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
  gameMode?: "normal" | "2v2" | "quiz";
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
  gameMode = "normal",
  onEndGame
}: GamePlayScreenProps) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>("preview");
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentChallenge, setCurrentChallenge] = useState<CurrentChallenge | null>(null);
  const [isInitializingRound, setIsInitializingRound] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { toast } = useToast();
  const { playSound } = useSoundEffects();
  const { teams, getTeammate } = useGameTeams(lobbyId);
  const gamePhaseRef = useRef<GamePhase>("preview");
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);

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

    // Prefer clips from players who haven't been challenged yet in this game
    const usedPlayerIds = new Set<string>();
    for (const clip of playableClips) {
      if (usedChallengeIds.has(clip.id)) usedPlayerIds.add(clip.playerId);
    }
    const freshPlayerClips = availableClips.filter((c) => !usedPlayerIds.has(c.playerId));
    const pool = freshPlayerClips.length > 0 ? freshPlayerClips : availableClips;
    const randomClip = pool[Math.floor(Math.random() * pool.length)];
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

          setGamePhase(existingRound.phase as GamePhase);
          return;
        }

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
        }
      }
    };

    initializeRound();

    // Broadcast channel for instant phase transitions (< 50ms latency).
    // The postgres_changes channel below is kept as a fallback for late-joiners
    // and reconnections, but the broadcast fires first for connected clients.
    const broadcastChannel = supabase
      .channel(`game-sync:${lobbyId}`, { config: { broadcast: { self: true, ack: false } } })
      .on('broadcast', { event: 'phase_change' }, (msg) => {
        if (!isMounted) return;
        const { phase, round, challengeId, challengePlayerId } = msg.payload ?? {};
        if (phase && round) {
          if (phase !== gamePhaseRef.current) playSound("transition");
          setRoundNumber(round);
          setGamePhase(phase as GamePhase);
          setInitializationError(null);
          setIsInitializingRound(false);
          if (challengeId && challengePlayerId) {
            setCurrentChallenge(buildChallenge(challengeId, challengePlayerId));
          }
        }
      })
      .subscribe(() => {
        gameSyncChannelRef.current = broadcastChannel;
      });

    // Keep postgres realtime as fallback (handles reconnections, late-joiners)
    const channel = supabase
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

          if (newPhase !== gamePhaseRef.current) {
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
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      gameSyncChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [
    currentPlayer.isHost,
    lobbyId,
    retryKey,
    roundNumber,
  ]);

  // Ref to the broadcast channel for instant phase transitions.
  // Single channel used for both sending (host) and receiving (all clients).
  // Created in the initializeRound effect alongside the postgres listener.
  const gameSyncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handlePreviewReady = async () => {
    if (currentPlayer.isHost) {
      try {
        // IMPORTANT: Reset is_ready BEFORE broadcasting the phase change.
        // Otherwise ImitationPhase mounts, fetches readyPlayers, sees them
        // still at true (from the preview phase), and immediately fires
        // onAllReady → skips straight to voting.
        await supabase.from("player_imitations").update({ is_ready: false })
          .eq("lobby_id", lobbyId).eq("round_number", roundNumber);

        // Now broadcast + persist the phase change
        gameSyncChannelRef.current?.send({
          type: 'broadcast', event: 'phase_change',
          payload: { phase: 'imitation', round: roundNumber, challengeId: currentChallenge?.id, challengePlayerId: currentChallenge?.playerId },
        });
        setGamePhase("imitation");

        await supabase.from("game_rounds").update({ phase: "imitation" })
          .eq("lobby_id", lobbyId).eq("round_number", roundNumber);
      } catch (error) {
        console.error("Error updating phase:", error);
      }
    }
  };

  const handleImitationReady = async () => {
    if (currentPlayer.isHost) {
      try {
        gameSyncChannelRef.current?.send({
          type: 'broadcast', event: 'phase_change',
          payload: { phase: 'voting', round: roundNumber, challengeId: currentChallenge?.id, challengePlayerId: currentChallenge?.playerId },
        });
        setGamePhase("voting");

        await supabase.from("game_rounds").update({ phase: "voting" })
          .eq("lobby_id", lobbyId).eq("round_number", roundNumber);
      } catch (error) {
        console.error("Error updating phase:", error);
      }
    }
  };

  const handleVotingComplete = async () => {
    if (currentPlayer.isHost) {
      try {
        gameSyncChannelRef.current?.send({
          type: 'broadcast', event: 'phase_change',
          payload: { phase: 'results', round: roundNumber, challengeId: currentChallenge?.id, challengePlayerId: currentChallenge?.playerId },
        });

        await supabase.from("game_rounds").update({ phase: "results" })
          .eq("lobby_id", lobbyId).eq("round_number", roundNumber);
      } catch (error) {
        console.error("Error updating phase:", error);
      }
    }
  };

  const handleNextRound = async () => {
    if (!currentPlayer.isHost) return;

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
        });
        return;
      }

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
        });

      if (error) throw error;

      // Broadcast instant transition to all clients
      gameSyncChannelRef.current?.send({
        type: 'broadcast', event: 'phase_change',
        payload: { phase: 'preview', round: newRoundNumber, challengeId: nextChallenge.clip.id, challengePlayerId: nextChallenge.clip.playerId },
      });

      setRoundNumber(newRoundNumber);
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
        variant: "destructive",
      });
    }
  };

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

    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <GameLogo size="lg" />
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
  }

  return (
    <div className="min-h-screen animated-bg relative">
      <div className="absolute top-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: "1.5s" }} />

      {/* Floating header — overlays the phase content so phases can use full width */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 backdrop-blur-md bg-black/30 border-b border-white/5">
        <Button
          variant="ghost"
          onClick={onEndGame}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Quitter</span>
        </Button>

        <GameLogo size="sm" />

        <div className="flex items-center gap-3">
          {gameMode === "2v2" && (
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

      {/* Phase content — full width, each phase manages its own internal max-width */}
      <div className="relative z-10 pt-16 animate-fadeIn">
        {gamePhase === "preview" && (
          <ChallengePreviewPhase
            key={`preview-${roundNumber}`}
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
            key={`imitation-${roundNumber}`}
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
            key={`voting-${roundNumber}`}
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
            key={`results-${roundNumber}`}
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

      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
};
