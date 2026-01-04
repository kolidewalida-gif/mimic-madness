import { useState, useEffect, memo } from "react";
import { useAudioPhoneGameV2 } from "@/hooks/useAudioPhoneGameV2";
import { AudioPhoneInstructionsPhase } from "./AudioPhoneInstructionsPhase";
import { AudioPhoneRecordingAllPhase } from "./AudioPhoneRecordingAllPhase";
import { AudioPhoneImitationPhase } from "./AudioPhoneImitationPhase";
import { AudioPhoneWaitingRevealPhase } from "./AudioPhoneWaitingRevealPhase";
import { AudioPhoneRevealPhaseV2 } from "./AudioPhoneRevealPhaseV2";
import { AudioPhoneDebugPanel } from "./AudioPhoneDebugPanel";
import { LobbyChat } from "./LobbyChat";
import { Card } from "./ui/card";
import { Loader2 } from "lucide-react";

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
}

export const AudioPhoneGameScreenV2 = memo(({
  currentPlayer,
  players,
  lobbyId,
  onEndGame,
}: AudioPhoneGameScreenV2Props) => {
  const game = useAudioPhoneGameV2({ lobbyId, currentPlayer, players });

  const [revealData, setRevealData] = useState<any[]>([]);

  // Fetch reveal data when entering reveal phase
  useEffect(() => {
    if (game.currentRound?.phase === 'reveal' || game.currentRound?.phase === 'waiting_reveal') {
      const fetchAllRevealData = async () => {
        const data = [];
        for (let i = 0; i < game.originalRecordings.length; i++) {
          const phraseData = await game.getRevealDataForPhrase(i);
          if (phraseData) data.push(phraseData);
        }
        setRevealData(data);
      };
      fetchAllRevealData();
    }
  }, [game.currentRound?.phase, game.originalRecordings.length, game.getRevealDataForPhrase]);

  // Loading state
  if (game.isLoading) {
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

  // Chat component (always visible)
  const chat = (
    <LobbyChat
      lobbyId={lobbyId}
      playerId={currentPlayer.id}
      playerName={currentPlayer.name}
    />
  );

  // Debug panel (host only)
  const debugPanel = currentPlayer.isHost && (
    <AudioPhoneDebugPanel
      currentRound={game.currentRound as any}
      recordings={game.originalRecordings as any}
      players={players}
      uploadErrors={game.uploadErrors}
      isMyTurn={true}
    />
  );

  // No round yet or instructions phase
  if (!game.currentRound || game.currentRound.phase === 'instructions') {
    return (
      <div className="relative">
        <AudioPhoneInstructionsPhase
          isHost={currentPlayer.isHost}
          playerCount={players.length}
          onStart={game.currentRound ? game.startRecordingPhase : game.startGame}
        />
        {chat}
        {debugPanel}
      </div>
    );
  }

  // Recording all phase - all players record their phrases
  if (game.currentRound.phase === 'recording_all') {
    return (
      <div className="relative">
        <AudioPhoneRecordingAllPhase
          maxSeconds={game.currentRound.max_recording_seconds}
          playerName={currentPlayer.name}
          hasSubmitted={game.hasSubmittedOriginalPhrase()}
          allSubmitted={game.allPhrasesSubmitted()}
          playersCount={players.length}
          submittedCount={game.originalRecordings.length}
          isHost={currentPlayer.isHost}
          isSubmitting={game.isSubmitting}
          onSubmit={game.submitOriginalPhrase}
          onStartImitation={game.startImitationPhase}
        />
        {chat}
        {debugPanel}
      </div>
    );
  }

  // Imitation phase
  if (game.currentRound.phase === 'imitation') {
    const currentPhrase = game.getCurrentPhraseToImitate();
    const shouldImitate = game.shouldImitateCurrentPhrase();
    const allDone = game.allImitationsForCurrentPhraseDone();
    const reversedAudioUrl = currentPhrase ? game.getReversedAudioUrl(currentPhrase) : null;
    const authorPlayer = currentPhrase ? game.getPlayerById(currentPhrase.player_id) : null;
    
    // Check if player has already imitated this phrase
    const hasAlreadyImitated = currentPhrase 
      ? game.imitations.some(im => 
          im.original_recording_id === currentPhrase.id && 
          im.imitator_player_id === currentPlayer.id
        )
      : false;
    
    // Player is the author of current phrase
    const isAuthor = currentPhrase?.player_id === currentPlayer.id;

    return (
      <div className="relative">
        <AudioPhoneImitationPhase
          currentPhraseIndex={game.currentRound.current_phrase_index ?? 0}
          totalPhrases={game.originalRecordings.length}
          authorName={authorPlayer?.name || 'Joueur'}
          reversedAudioUrl={reversedAudioUrl}
          shouldImitate={shouldImitate}
          hasImitated={hasAlreadyImitated}
          isAuthor={isAuthor}
          allImitationsDone={allDone}
          isHost={currentPlayer.isHost}
          isSubmitting={game.isSubmitting}
          maxSeconds={game.currentRound.max_recording_seconds}
          onSubmitImitation={async (blob) => {
            if (currentPhrase) {
              return await game.submitImitation(blob, currentPhrase.id);
            }
            return false;
          }}
          onNextPhrase={game.moveToNextPhrase}
        />
        {chat}
        {debugPanel}
      </div>
    );
  }

  // Waiting for reveal
  if (game.currentRound.phase === 'waiting_reveal') {
    return (
      <div className="relative">
        <AudioPhoneWaitingRevealPhase
          isHost={currentPlayer.isHost}
          onStartReveal={game.startReveal}
        />
        {chat}
        {debugPanel}
      </div>
    );
  }

  // Reveal phase
  if (game.currentRound.phase === 'reveal') {
    const syncState = {
      isPlaying: game.currentRound.reveal_is_playing ?? false,
      phraseIndex: game.currentRound.reveal_phrase_index ?? 0,
      step: game.currentRound.reveal_step ?? 'idle',
    };

    return (
      <div className="relative">
        <AudioPhoneRevealPhaseV2
          revealData={revealData}
          players={players}
          isHost={currentPlayer.isHost}
          syncState={syncState}
          onSyncStateChange={(isPlaying, phraseIndex, step) => {
            game.setRevealPlaybackState(isPlaying, phraseIndex, step);
          }}
          onPlayAgain={async () => {
            await game.endRound();
            await game.startGame();
          }}
          onEndGame={onEndGame}
        />
        {chat}
        {debugPanel}
      </div>
    );
  }

  // Scores or finished - go back to instructions
  return (
    <div className="relative">
      <AudioPhoneInstructionsPhase
        isHost={currentPlayer.isHost}
        playerCount={players.length}
        onStart={game.startGame}
      />
      {chat}
      {debugPanel}
    </div>
  );
});

AudioPhoneGameScreenV2.displayName = "AudioPhoneGameScreenV2";

export default AudioPhoneGameScreenV2;
