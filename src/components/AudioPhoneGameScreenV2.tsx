import { useState, useEffect, memo, type ReactNode } from "react";
import { ArrowLeft, Headphones, Loader2 } from "lucide-react";
import { useAudioPhoneGameV2 } from "@/hooks/useAudioPhoneGameV2";
import { AudioPhoneInstructionsPhase } from "./AudioPhoneInstructionsPhase";
import { AudioPhoneRecordingAllPhase } from "./AudioPhoneRecordingAllPhase";
import { AudioPhoneImitationPhase } from "./AudioPhoneImitationPhase";
import { AudioPhoneWaitingRevealPhase } from "./AudioPhoneWaitingRevealPhase";
import { AudioPhoneRevealPhaseV2 } from "./AudioPhoneRevealPhaseV2";
import { AudioPhoneDebugPanel } from "./AudioPhoneDebugPanel";
import { InkBetaGameStage, InkBetaGameBadge, InkBetaPanel } from "./game-beta/InkBetaGameLayout";
import { LobbyChat } from "./LobbyChat";
import { Card } from "./ui/card";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneGameScreenV2Props {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
  variant?: 'default' | 'inkBeta';
}

export const AudioPhoneGameScreenV2 = memo(({
  currentPlayer,
  players,
  lobbyId,
  onEndGame,
  variant = 'default',
}: AudioPhoneGameScreenV2Props) => {
  const isInkBeta = variant === 'inkBeta';
  const game = useAudioPhoneGameV2({ lobbyId, currentPlayer, players });

  const [revealData, setRevealData] = useState<any[]>([]);
  /*
   * L'agrégation des URL de révélation est asynchrone. Sans ce drapeau, l'écran
   * affichait un panneau vide entre l'entrée en révélation et l'arrivée des
   * données, sans rien dire.
   */
  const [isRevealLoading, setIsRevealLoading] = useState(false);

  // Fetch reveal data when entering reveal phase
  useEffect(() => {
    if (game.currentRound?.phase === 'reveal' || game.currentRound?.phase === 'waiting_reveal') {
      let cancelled = false;
      const fetchAllRevealData = async () => {
        setIsRevealLoading(true);
        const data = [];
        for (let i = 0; i < game.originalRecordings.length; i++) {
          const phraseData = await game.getRevealDataForPhrase(i);
          if (phraseData) data.push(phraseData);
        }
        if (cancelled) return;
        setRevealData(data);
        setIsRevealLoading(false);
      };
      fetchAllRevealData();
      return () => { cancelled = true; };
    }
  }, [game.currentRound?.phase, game.originalRecordings.length, game.getRevealDataForPhrase]);

  /* Effectif réel de la manche : sans les partis, sans les arrivés en retard. */
  const roster = game.roster;
  const rosterCount = roster.length;
  const totalPhrases = game.originalRecordings.length;

  /*
   * Coquille beta commune aux phases, sur le modèle du Quiz.
   *
   * Le mode portait sa propre direction artistique complète (`PulpStage`, grain,
   * trame) et un plein écran par phase. En beta la scène est celle du menu et du
   * lobby — barre de marque, cadre, pastille de phase — et seul le contenu
   * change. Le chemin `default` rend exactement ce qu'il rendait avant.
   */
  const withStage = (
    label: string,
    /* `ik-ap-canvas` donne la hauteur de la fenêtre à la scène du mode. */
    canvasClassName: string,
    content: ReactNode,
    step?: string,
  ) => {
    const chat = (
      <LobbyChat
        variant={isInkBeta ? 'inkBeta' : 'default'}
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    );

    const debugPanel = currentPlayer.isHost && (
      <AudioPhoneDebugPanel
        currentRound={game.currentRound as any}
        recordings={game.originalRecordings as any}
        players={players}
        uploadErrors={game.uploadErrors}
        isMyTurn={true}
      />
    );

    if (!isInkBeta) {
      return (
        <div className="relative">
          {content}
          {chat}
          {debugPanel}
        </div>
      );
    }

    return (
      <InkBetaGameStage
        titleId="ik-audiophone-brand"
        canvasClassName={canvasClassName}
        badge={<InkBetaGameBadge label={label} step={step} icon={<Headphones aria-hidden="true" />} />}
        tools={(
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
        )}
      >
        {content}
        {chat}
        {debugPanel}
      </InkBetaGameStage>
    );
  };

  // Loading state
  if (game.isLoading) {
    if (isInkBeta) {
      return withStage(
        'Audio Phone',
        'ik-game-canvas--center ik-ap-canvas',
        <InkBetaPanel step="Chargement" title="On branche les micros">
          <p className="ik-game-note">
            <Loader2 className="animate-spin" aria-hidden="true" /> Un instant…
          </p>
        </InkBetaPanel>,
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 bg-card/60 backdrop-blur-sm border-border/30">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Chargement du jeu...</p>
          </div>
        </Card>
      </div>
    );
  }

  // No round yet or instructions phase
  if (!game.currentRound || game.currentRound.phase === 'instructions') {
    // Single-launch fix: startGame() now creates the round directly in 'recording_all' phase.
    // If a round somehow already exists in 'instructions', call startRecordingPhase to advance it.
    const handleStart = async () => {
      if (game.currentRound) {
        await game.startRecordingPhase();
      } else {
        await game.startGame();
      }
    };
    return withStage(
      'Règles',
      'ik-game-canvas--center ik-ap-canvas',
      <AudioPhoneInstructionsPhase
        variant={variant}
        isHost={currentPlayer.isHost}
        playerCount={players.length}
        onStart={handleStart}
      />,
      `${players.length} joueurs`,
    );
  }

  // Recording all phase - all players record their phrases
  if (game.currentRound.phase === 'recording_all') {
    return withStage(
      'Micro',
      'ik-game-canvas--stage ik-ap-canvas',
      <AudioPhoneRecordingAllPhase
        variant={variant}
        maxSeconds={game.currentRound.max_recording_seconds}
        playerName={currentPlayer.name}
        hasSubmitted={game.hasSubmittedOriginalPhrase()}
        allSubmitted={game.allPhrasesSubmitted()}
        canStartImitation={game.canStartImitation()}
        isSpectator={game.isSpectator}
        playersCount={rosterCount}
        submittedCount={game.originalRecordings.length}
        submittedPlayerIds={game.getSubmittedOriginalPlayerIds()}
        pendingPlayerNames={game.getPendingOriginalPlayers().map((player) => player.name)}
        playerNames={roster.map((player) => player.name)}
        playerIds={roster.map((player) => player.id)}
        isHost={currentPlayer.isHost}
        isSubmitting={game.isSubmitting}
        onSubmit={game.submitOriginalPhrase}
        onStartImitation={game.startImitationPhase}
      />,
      `${game.originalRecordings.length}/${rosterCount} phrases`,
    );
  }

  // Imitation phase
  if (game.currentRound.phase === 'imitation') {
    const currentPhrase = game.getCurrentPhraseToImitate();
    const shouldImitate = game.shouldImitateCurrentPhrase();
    const allDone = game.allImitationsForCurrentPhraseDone();
    const phraseProgress = game.getCurrentPhraseProgress();
    const reversedAudioUrl = currentPhrase ? game.getReversedAudioUrl(currentPhrase) : null;
    const authorPlayer = currentPhrase ? game.getPlayerById(currentPhrase.player_id) : null;
    const phraseIndex = game.currentRound.current_phrase_index ?? 0;

    // Check if player has already imitated this phrase
    const hasAlreadyImitated = currentPhrase
      ? game.imitations.some(im =>
          im.original_recording_id === currentPhrase.id &&
          im.imitator_player_id === currentPlayer.id
        )
      : false;

    // Player is the author of current phrase
    const isAuthor = currentPhrase?.player_id === currentPlayer.id;

    return withStage(
      'Imitation',
      'ik-game-canvas--stage ik-ap-canvas',
      <AudioPhoneImitationPhase
        variant={variant}
        currentPhraseIndex={phraseIndex}
        totalPhrases={totalPhrases}
        authorName={authorPlayer?.name || 'Joueur'}
        reversedAudioUrl={reversedAudioUrl}
        shouldImitate={shouldImitate}
        hasImitated={hasAlreadyImitated}
        isAuthor={isAuthor}
        isSpectator={game.isSpectator}
        allImitationsDone={allDone}
        completedImitations={phraseProgress.completedCount}
        totalImitations={phraseProgress.requiredCount}
        pendingPlayerNames={phraseProgress.pendingPlayers.map((player) => player.name)}
        isHost={currentPlayer.isHost}
        isSubmitting={game.isSubmitting}
        maxSeconds={game.currentRound.max_recording_seconds}
        onSubmitImitation={async (blob, onStage) => {
          if (currentPhrase) {
            return await game.submitImitation(blob, currentPhrase.id, onStage);
          }
          return false;
        }}
        onNextPhrase={game.moveToNextPhrase}
      />,
      `Phrase ${Math.min(phraseIndex + 1, Math.max(totalPhrases, 1))}/${totalPhrases}`,
    );
  }

  // Waiting for reveal
  if (game.currentRound.phase === 'waiting_reveal') {
    return withStage(
      'Prêt',
      'ik-game-canvas--center ik-ap-canvas',
      <AudioPhoneWaitingRevealPhase
        variant={variant}
        isHost={currentPlayer.isHost}
        phraseCount={totalPhrases}
        isPreparing={isRevealLoading}
        onStartReveal={game.startReveal}
      />,
      `${totalPhrases} phrases`,
    );
  }

  // Reveal phase
  if (game.currentRound.phase === 'reveal') {
    const syncState = {
      isPlaying: game.currentRound.reveal_is_playing ?? false,
      phraseIndex: game.currentRound.reveal_phrase_index ?? 0,
      step: game.currentRound.reveal_step ?? 'idle',
    };

    /*
     * Les données arrivent après la phase : on le dit, au lieu de laisser un
     * cadre vide dont personne ne sait s'il est cassé ou en train de charger.
     */
    if (revealData.length === 0) {
      return withStage(
        'Révélation',
        'ik-game-canvas--center ik-ap-canvas',
        isInkBeta ? (
          <InkBetaPanel step="Révélation" title="On prépare la bande">
            <p className="ik-game-note">
              <Loader2 className="animate-spin" aria-hidden="true" /> Récupération des enregistrements…
            </p>
          </InkBetaPanel>
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ),
        `${totalPhrases} phrases`,
      );
    }

    return withStage(
      'Révélation',
      'ik-game-canvas--center ik-ap-canvas',
      <AudioPhoneRevealPhaseV2
        variant={variant}
        revealData={revealData}
        players={players}
        isHost={currentPlayer.isHost}
        instanceKey={game.currentRound.id}
        syncState={syncState}
        onSyncStateChange={(isPlaying, phraseIndex, step) => {
          game.setRevealPlaybackState(isPlaying, phraseIndex, step);
        }}
        onPlayAgain={async () => {
          await game.endRound();
          await game.startGame();
        }}
        onEndGame={onEndGame}
      />,
      `Phrase ${Math.min((syncState.phraseIndex ?? 0) + 1, Math.max(revealData.length, 1))}/${revealData.length}`,
    );
  }

  // Scores or finished - go back to instructions
  return withStage(
    'Règles',
    'ik-game-canvas--center ik-ap-canvas',
    <AudioPhoneInstructionsPhase
      variant={variant}
      isHost={currentPlayer.isHost}
      playerCount={players.length}
      onStart={game.startGame}
    />,
    `${players.length} joueurs`,
  );
});

AudioPhoneGameScreenV2.displayName = "AudioPhoneGameScreenV2";

export default AudioPhoneGameScreenV2;
