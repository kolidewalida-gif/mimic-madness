import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GameLogo } from "@/components/GameLogo";
import { Button } from "@/components/ui/button";
import { ChallengePreviewPhase } from "@/components/ChallengePreviewPhase";
import { ImitationPhase } from "@/components/ImitationPhase";
import { VotingPhase } from "@/components/VotingPhase";
import { ResultsPhase } from "@/components/ResultsPhase";
import { LobbyChat } from "@/components/LobbyChat";
import { InkBetaGameBadge, InkBetaGameStage } from "@/components/game-beta/InkBetaGameLayout";
import { AlertTriangle, ArrowLeft, RefreshCcw, Swords, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useGameTeams } from "@/hooks/useGameTeams";
import {
  canCommitRoundSnapshot,
  getRenderableGamePhase,
  getRoundReconciliationMode,
  isAllowedGamePhaseTransition,
  parseDurableGameRound,
  shouldInvalidateRoundRetry,
  type DurableGameRound,
  type GamePhase,
} from "@/lib/gameRoundState";
import { equalJitterBackoff } from "@/lib/syncState";

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
  variant?: "default" | "inkBeta";
}

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
  onEndGame,
  variant = "default",
}: GamePlayScreenProps) => {
  const isInkBeta = variant === "inkBeta";
  const [durableRound, setDurableRound] = useState<DurableGameRound | null>(null);
  const [isRoundSynchronized, setIsRoundSynchronized] = useState(false);
  const [isInitializingRound, setIsInitializingRound] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { toast } = useToast();
  const { playSound } = useSoundEffects();
  const { teams, getTeammate } = useGameTeams(lobbyId);
  const durableRoundRef = useRef<DurableGameRound | null>(null);
  const roundSynchronizedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const channelRestartAttemptsRef = useRef(0);
  const reconcileLatestRoundRef = useRef<() => Promise<void>>(async () => undefined);

  const setRoundSynchronization = useCallback((isSynchronized: boolean) => {
    roundSynchronizedRef.current = isSynchronized;
    setIsRoundSynchronized(isSynchronized);
  }, []);

  const applyDurableRound = useCallback((round: DurableGameRound) => {
    const previousRound = durableRoundRef.current;
    if (previousRound && previousRound.phase !== round.phase) {
      playSound("transition");
    }

    durableRoundRef.current = round;
    setDurableRound(round);
    setRoundSynchronization(true);
  }, [playSound, setRoundSynchronization]);

  const buildChallenge = useCallback((round: DurableGameRound): CurrentChallenge => ({
    id: round.current_challenge_id,
    playerId: round.challenge_player_id,
    playerName: players.find((player) => player.id === round.challenge_player_id)?.name || "Joueur",
  }), [players]);

  const pickNextChallenge = useCallback(async (usedChallengeIds: Set<string>) => {
    const playableClips = await videoStorage.getPlayableChallengeClipsByLobby(lobbyId);
    const availableClips = playableClips.filter((clip) => !usedChallengeIds.has(clip.id));

    if (availableClips.length === 0) {
      return null;
    }

    // Prefer clips from players who haven't been challenged yet in this game.
    const usedPlayerIds = new Set<string>();
    for (const clip of playableClips) {
      if (usedChallengeIds.has(clip.id)) usedPlayerIds.add(clip.playerId);
    }
    const freshPlayerClips = availableClips.filter((clip) => !usedPlayerIds.has(clip.playerId));
    const pool = freshPlayerClips.length > 0 ? freshPlayerClips : availableClips;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [lobbyId]);

  const currentChallenge = useMemo(
    () => (durableRound ? buildChallenge(durableRound) : null),
    [buildChallenge, durableRound],
  );
  const roundNumber = durableRound?.round_number ?? 1;
  const renderablePhase = getRenderableGamePhase(durableRound, isRoundSynchronized);

  useEffect(() => {
    let isMounted = true;
    let latestRequest = 0;
    let creationPromise: Promise<DurableGameRound> | null = null;
    let reconciliationTimer: ReturnType<typeof setTimeout> | null = null;
    let reconciliationMustInvalidate = false;
    let channelRestartTimer: ReturnType<typeof setTimeout> | null = null;
    let roundSubscribed = false;
    let roundChannelEpoch = 0;

    if (durableRoundRef.current?.lobby_id !== lobbyId) {
      durableRoundRef.current = null;
      setDurableRound(null);
    }
    setRoundSynchronization(false);
    setIsInitializingRound(true);
    setInitializationError(null);

    const readUsedChallengeIds = async () => {
      const { data, error } = await supabase
        .from("game_rounds")
        .select("current_challenge_id")
        .eq("lobby_id", lobbyId);

      if (error) throw error;
      return new Set(data?.map((round) => round.current_challenge_id) || []);
    };

    const createInitialRound = async (): Promise<DurableGameRound> => {
      const usedChallengeIds = await readUsedChallengeIds();
      const nextClip = await pickNextChallenge(usedChallengeIds);

      if (!nextClip) {
        throw new Error("Aucun defi disponible. Verifiez que chaque joueur a bien au moins un clip valide pour ce lobby.");
      }

      const { data, error } = await supabase
        .from("game_rounds")
        .insert({
          lobby_id: lobbyId,
          round_number: 1,
          current_challenge_id: nextClip.id,
          challenge_player_id: nextClip.playerId,
          phase: "preview",
        })
        .select("*")
        .maybeSingle();

      let persisted = data;
      if (error?.code === '23505') {
        const existing = await supabase
          .from('game_rounds')
          .select('*')
          .eq('lobby_id', lobbyId)
          .eq('round_number', 1)
          .maybeSingle();
        if (existing.error) throw existing.error;
        persisted = existing.data;
      } else if (error) {
        throw error;
      }

      const createdRound = parseDurableGameRound(persisted);
      if (!createdRound || createdRound.lobby_id !== lobbyId) {
        throw new Error("La manche creee contient un etat invalide.");
      }
      return createdRound;
    };

    const getOrCreateInitialRound = async () => {
      if (creationPromise) return creationPromise;

      creationPromise = createInitialRound();
      try {
        return await creationPromise;
      } finally {
        // Deduplicate only concurrent creation attempts. A rejected or stale
        // result must never poison the next automatic retry.
        creationPromise = null;
      }
    };

    const ensurePlayableChallenge = async (
      round: DurableGameRound,
    ): Promise<DurableGameRound> => {
      const currentRound = durableRoundRef.current;
      if (
        currentRound?.id === round.id &&
        currentRound.current_challenge_id === round.current_challenge_id
      ) {
        return round;
      }

      const existingClip = await videoStorage.getVideoClip(round.current_challenge_id);
      if (existingClip || !currentPlayer.isHost) return round;

      const usedChallengeIds = await readUsedChallengeIds();
      const replacementClip = await pickNextChallenge(usedChallengeIds);
      if (!replacementClip) {
        throw new Error("Aucun clip de defi jouable n'a ete trouve pour cette partie.");
      }

      // Compare-and-set: the row must still be exactly the one just read.
      let repairQuery = supabase
        .from("game_rounds")
        .update({
          current_challenge_id: replacementClip.id,
          challenge_player_id: replacementClip.playerId,
        })
        .eq("id", round.id)
        .eq('lobby_id', lobbyId)
        .eq('round_number', round.round_number)
        .eq('phase', round.phase)
        .eq('current_challenge_id', round.current_challenge_id);
      if (round.version !== null) {
        repairQuery = repairQuery.eq('version', round.version);
      }

      const { data, error } = await repairQuery.select("*").maybeSingle();

      if (error) throw error;
      const repairedRound = parseDurableGameRound(data);
      if (!repairedRound || repairedRound.lobby_id !== lobbyId) {
        throw new Error("La manche reparee contient un etat invalide.");
      }
      return repairedRound;
    };

    const clearReconciliationTimer = () => {
      if (!reconciliationTimer) return;
      clearTimeout(reconciliationTimer);
      reconciliationTimer = null;
      reconciliationMustInvalidate = false;
    };

    const clearChannelRestartTimer = () => {
      if (!channelRestartTimer) return;
      clearTimeout(channelRestartTimer);
      channelRestartTimer = null;
    };

    const markRoundChannelHealthy = () => {
      if (!roundSubscribed) return;
      clearChannelRestartTimer();
      channelRestartAttemptsRef.current = 0;
    };

    const scheduleReconciliation = (requestedInvalidation: boolean) => {
      reconciliationMustInvalidate ||= requestedInvalidation;
      if (reconciliationTimer || !isMounted) return;
      reconciliationTimer = setTimeout(() => {
        reconciliationTimer = null;
        const invalidateBeforeRetry = shouldInvalidateRoundRetry(
          reconciliationMustInvalidate,
          roundSynchronizedRef.current,
          roundSubscribed,
        );
        reconciliationMustInvalidate = false;
        if (isMounted) void reconcileLatestRound(false, invalidateBeforeRetry);
      }, 1500);
    };

    const scheduleChannelRestart = () => {
      if (channelRestartTimer || !isMounted) return;
      const attempt = channelRestartAttemptsRef.current;
      const delay = equalJitterBackoff(attempt, 1_000, 10_000);
      channelRestartAttemptsRef.current = Math.min(attempt + 1, 4);
      channelRestartTimer = setTimeout(() => {
        channelRestartTimer = null;
        if (isMounted) setRetryKey((value) => value + 1);
      }, delay);
    };

    async function reconcileLatestRound(showLoader: boolean, invalidateBeforeRead: boolean) {
      const requestId = ++latestRequest;
      const token = { requestId, channelEpoch: roundChannelEpoch };
      const canCommitRequest = () =>
        isMounted && canCommitRoundSnapshot(
          token,
          latestRequest,
          roundChannelEpoch,
          roundSubscribed,
        );

      if (invalidateBeforeRead) setRoundSynchronization(false);
      if (showLoader) setIsInitializingRound(true);

      try {
        const { data: latestRounds, error } = await supabase
          .from("game_rounds")
          .select("*")
          .eq("lobby_id", lobbyId)
          .order("round_number", { ascending: false })
          .limit(1);

        if (error) throw error;
        if (!canCommitRequest()) return;

        let nextRound = parseDurableGameRound(latestRounds?.[0] ?? null);
        if (!nextRound) {
          setRoundSynchronization(false);
          if (latestRounds?.[0]) {
            throw new Error("La phase de la manche est invalide.");
          }

          if (!currentPlayer.isHost) {
            setInitializationError("En attente de l'initialisation de la manche par l'hote...");
            setIsInitializingRound(false);
            scheduleReconciliation(true);
            return;
          }

          nextRound = await getOrCreateInitialRound();
        }

        if (!canCommitRequest()) return;
        if (nextRound.lobby_id !== lobbyId) {
          throw new Error("La manche recue ne correspond pas a ce lobby.");
        }

        nextRound = await ensurePlayableChallenge(nextRound);
        if (!canCommitRequest()) return;

        clearReconciliationTimer();
        setInitializationError(null);
        applyDurableRound(nextRound);
        setIsInitializingRound(false);
      } catch (error) {
        if (!canCommitRequest()) return;
        console.error("Error reconciling game round:", error);

        const message = error instanceof Error
          ? error.message
          : "Impossible de synchroniser la manche";
        setInitializationError(message);
        setIsInitializingRound(false);
        scheduleReconciliation(invalidateBeforeRead);

        if (showLoader) {
          toast({
            title: "Erreur",
            description: message,
            variant: "destructive",
          });
        }
      }
    }

    const reconcileFromSignal = (mode: ReturnType<typeof getRoundReconciliationMode>) => {
      if (!isMounted || mode === 'ignore') return;
      void reconcileLatestRound(false, mode === 'invalidate');
    };

    reconcileLatestRoundRef.current = () =>
      reconcileLatestRound(false, !roundSynchronizedRef.current);

    // Database hints are filtered before invalidation. Delayed mutations from
    // an older round cannot destroy current recording or voting state.
    const roundChannel = supabase
      .channel(`game-round:${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rounds",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const changedRound = parseDurableGameRound(payload.new);
          const deletedRound = parseDurableGameRound(payload.old);

          if (payload.eventType === 'DELETE' && deletedRound) {
            const currentRound = durableRoundRef.current;
            if (currentRound?.id === deletedRound.id) {
              void reconcileLatestRound(false, true);
              return;
            }
            reconcileFromSignal(getRoundReconciliationMode(currentRound, {
              roundNumber: deletedRound.round_number,
              phase: deletedRound.phase,
              roundId: deletedRound.id,
              challengeId: deletedRound.current_challenge_id,
            }));
            return;
          }

          if (!changedRound) {
            // An unparseable database mutation could concern the active row;
            // fail closed until the latest SQL snapshot is known.
            void reconcileLatestRound(false, true);
            return;
          }

          reconcileFromSignal(getRoundReconciliationMode(durableRoundRef.current, {
            roundNumber: changedRound.round_number,
            phase: changedRound.phase,
            roundId: changedRound.id,
            challengeId: changedRound.current_challenge_id,
          }));
        },
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === "SUBSCRIBED") {
          roundSubscribed = true;
          roundChannelEpoch += 1;
          markRoundChannelHealthy();
          // Subscription closes the fetch/subscribe race. Only this fresh
          // epoch is allowed to commit a durable snapshot.
          void reconcileLatestRound(
            durableRoundRef.current === null,
            !roundSynchronizedRef.current,
          );
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          roundSubscribed = false;
          roundChannelEpoch += 1;
          latestRequest += 1;
          clearReconciliationTimer();
          setRoundSynchronization(false);
          scheduleChannelRestart();
        }
      });

    const resyncRound = () => {
      if (!isMounted || !navigator.onLine) return;
      if (roundSubscribed) {
        void reconcileLatestRound(false, !roundSynchronizedRef.current);
      } else {
        clearChannelRestartTimer();
        setRetryKey((value) => value + 1);
      }
    };
    const handleOnline = () => resyncRound();
    const handleOffline = () => {
      latestRequest += 1;
      setRoundSynchronization(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') resyncRound();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      latestRequest += 1;
      reconcileLatestRoundRef.current = async () => undefined;
      clearReconciliationTimer();
      clearChannelRestartTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabase.removeChannel(roundChannel);
    };
  }, [
    applyDurableRound,
    currentPlayer.isHost,
    lobbyId,
    pickNextChallenge,
    retryKey,
    setRoundSynchronization,
    toast,
  ]);

  const transitionPhase = useCallback(async (
    expectedPhase: GamePhase,
    nextPhase: GamePhase,
  ) => {
    if (!currentPlayer.isHost || isTransitioningRef.current) return false;

    const round = durableRoundRef.current;
    if (
      !round ||
      !roundSynchronizedRef.current ||
      round.phase !== expectedPhase ||
      !isAllowedGamePhaseTransition(expectedPhase, nextPhase)
    ) {
      return false;
    }

    isTransitioningRef.current = true;
    setRoundSynchronization(false);

    try {
      let transitionQuery = supabase
        .from("game_rounds")
        .update({ phase: nextPhase })
        .eq("id", round.id)
        .eq("lobby_id", lobbyId)
        .eq("round_number", round.round_number)
        .eq("phase", expectedPhase);
      if (round.version !== null) {
        transitionQuery = transitionQuery.eq('version', round.version);
      }

      const { data, error } = await transitionQuery.select("*").maybeSingle();

      if (error) throw error;
      const persistedRound = parseDurableGameRound(data);
      if (!persistedRound || persistedRound.phase !== nextPhase) {
        throw new Error("Cette transition de phase n'est plus valide.");
      }

      await reconcileLatestRoundRef.current();
      return true;
    } catch (error) {
      console.error("Error persisting phase transition:", error);
      toast({
        title: "Transition impossible",
        description: "La manche a ete resynchronisee sans changer de phase.",
        variant: "destructive",
      });
      await reconcileLatestRoundRef.current();
      return false;
    } finally {
      isTransitioningRef.current = false;
    }
  }, [
    currentPlayer.isHost,
    lobbyId,
    setRoundSynchronization,
    toast,
  ]);

  const handlePreviewReady = async () => {
    if (!currentPlayer.isHost || isTransitioningRef.current) return;

    /*
     * Il n'y a plus de remise à zéro ici, et c'était la cause des manches
     * cassées.
     *
     * L'aperçu écrivait `is_ready = true` pour dire « j'ai vu la vidéo », alors
     * que la phase suivante et `submit_player_imitation` lisent cette même
     * colonne comme « j'ai déposé mon imitation ». Pour compenser, on remettait
     * toutes les lignes à `is_ready = false` juste avant de basculer.
     *
     * Cet UPDATE n'était pas atomique avec la transition, et l'aperçu annonce
     * aussi les joueurs prêts par broadcast — plus rapide que l'écriture SQL.
     * L'hôte pouvait donc basculer, et donc remettre à zéro, avant que l'upsert
     * d'un joueur soit arrivé. Cet upsert atterrissait ensuite avec
     * `is_ready = true`, après la bascule : ce joueur entrait en imitation déjà
     * marqué prêt, la manche sautait l'imitation, et sa vraie soumission était
     * refusée par le RPC puisqu'une ligne prête existait déjà.
     *
     * Les deux sens vivent maintenant dans deux colonnes (`has_seen_preview` et
     * `is_ready`), donc rien n'est à effacer : la transition est un simple
     * changement de phase.
     */
    await transitionPhase("preview", "imitation");
  };

  const handleImitationReady = async () => {
    await transitionPhase("imitation", "voting");
  };

  const handleVotingComplete = async () => {
    await transitionPhase("voting", "results");
  };

  const handleNextRound = async () => {
    if (!currentPlayer.isHost || isTransitioningRef.current) return;

    const activeRound = durableRoundRef.current;
    if (
      !activeRound ||
      !roundSynchronizedRef.current ||
      activeRound.phase !== "results"
    ) {
      return;
    }

    isTransitioningRef.current = true;
    let writeStarted = false;

    try {
      const { data: previousRounds, error: previousRoundsError } = await supabase
        .from("game_rounds")
        .select("current_challenge_id")
        .eq("lobby_id", lobbyId);

      if (previousRoundsError) throw previousRoundsError;
      const usedChallengeIds = new Set(previousRounds?.map((round) => round.current_challenge_id) || []);
      const nextClip = await pickNextChallenge(usedChallengeIds);

      if (!nextClip) {
        toast({
          title: "Partie terminee",
          description: "Tous les defis jouables ont deja ete utilises.",
        });
        return;
      }

      const newRoundNumber = activeRound.round_number + 1;
      writeStarted = true;
      setRoundSynchronization(false);

      const { data, error } = await supabase
        .from("game_rounds")
        .insert({
          lobby_id: lobbyId,
          round_number: newRoundNumber,
          current_challenge_id: nextClip.id,
          challenge_player_id: nextClip.playerId,
          phase: "preview",
        })
        .select("*")
        .single();

      if (error) throw error;
      const persistedRound = parseDurableGameRound(data);
      if (
        !persistedRound ||
        persistedRound.round_number !== newRoundNumber ||
        persistedRound.phase !== "preview"
      ) {
        throw new Error("La nouvelle manche contient un etat invalide.");
      }

      await reconcileLatestRoundRef.current();

      toast({
        title: "Nouvelle manche !",
        description: "Preparez-vous !",
      });
    } catch (error) {
      console.error("Error creating next round:", error);
      if (writeStarted) await reconcileLatestRoundRef.current();
      toast({
        title: "Erreur",
        description: "Impossible de creer la nouvelle manche",
        variant: "destructive",
      });
    } finally {
      isTransitioningRef.current = false;
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
                  durableRoundRef.current = null;
                  setDurableRound(null);
                  setRoundSynchronization(false);
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
            {initializationError || "Synchronisation de la manche..."}
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

  // No phase subtree survives an uncertain authoritative connection or a
  // possible forward phase change. Stale/unchanged hints reconcile in the
  // background so local recording and voting state is preserved.
  if (isInitializingRound || !currentChallenge || !renderablePhase) {
    return renderInitializationState();
  }

  /*
   * Le sous-arbre de phase est identique dans les deux présentations : c'est la
   * coquille qui change. L'extraire évite de dupliquer les `key` par manche et
   * les gardes de rendu, qui sont ce qui protège l'enregistrement en cours.
   */
  const phaseContent = (
    <>
      {renderablePhase === "preview" && (
        <ChallengePreviewPhase
          key={`preview-${roundNumber}`}
          lobbyId={lobbyId}
          roundNumber={roundNumber}
          currentPlayer={currentPlayer}
          players={players}
          currentChallenge={currentChallenge}
          onAllReady={handlePreviewReady}
          variant={variant}
        />
      )}

      {renderablePhase === "imitation" && (
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
          variant={variant}
        />
      )}

      {renderablePhase === "voting" && (
        <VotingPhase
          key={`voting-${roundNumber}`}
          lobbyId={lobbyId}
          gameRoundId={durableRound?.id ?? ''}
          roundNumber={roundNumber}
          currentPlayer={currentPlayer}
          players={players}
          challengeVideoClipId={currentChallenge.id}
          gameMode={gameMode}
          teams={teams}
          onVotingComplete={handleVotingComplete}
          variant={variant}
        />
      )}

      {renderablePhase === "results" && (
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
          variant={variant}
        />
      )}
    </>
  );

  if (isInkBeta) {
    const phaseLabel = renderablePhase === "preview"
      ? "Aperçu"
      : renderablePhase === "imitation"
        ? "Imitation"
        : renderablePhase === "voting"
          ? "Vote"
          : "Résultats";

    return (
      <InkBetaGameStage
        titleId="ik-game-brand"
        canvasClassName={renderablePhase === "imitation" ? "ik-game-canvas--stage" : "ik-game-canvas--center"}
        badge={(
          <InkBetaGameBadge
            label={phaseLabel}
            step={`Manche ${roundNumber}`}
            icon={<Zap aria-hidden="true" />}
          />
        )}
        tools={(
          <>
            {gameMode === "2v2" && (
              <span className="ik-game-badge">
                <Swords aria-hidden="true" />
                <span>2v2</span>
              </span>
            )}
            <button
              type="button"
              onClick={onEndGame}
              data-back
              className="ik-tool ik-tool--leave menu-focus"
              aria-label="Quitter la partie"
            >
              <ArrowLeft aria-hidden="true" />
              <span>Quitter</span>
            </button>
          </>
        )}
      >
        {phaseContent}

        <LobbyChat
          variant="inkBeta"
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </InkBetaGameStage>
    );
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

      {/* Phase content — only the SQL-confirmed phase is allowed to mount. */}
      <div className="relative z-10 pt-16 animate-fadeIn">
        {phaseContent}
      </div>

      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
};
