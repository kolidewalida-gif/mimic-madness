import { useState, useEffect, useCallback, memo } from "react";
import { useAudioPhoneGame } from "@/hooks/useAudioPhoneGame";
import { AudioPhoneInstructionsPhase } from "./AudioPhoneInstructionsPhase";
import { AudioPhoneRecordingPhase } from "./AudioPhoneRecordingPhase";
import { AudioPhoneListeningPhase } from "./AudioPhoneListeningPhase";
import { AudioPhoneWaitingPhase } from "./AudioPhoneWaitingPhase";
import { AudioPhoneResultsPhase } from "./AudioPhoneResultsPhase";
import { LobbyChat } from "./LobbyChat";
import { Card } from "./ui/card";
import { Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneGameScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

export const AudioPhoneGameScreen = memo(({
  currentPlayer,
  players,
  lobbyId,
  onEndGame,
}: AudioPhoneGameScreenProps) => {
  const {
    currentRound,
    recordings,
    isLoading,
    isSubmitting,
    isMyTurn,
    startGame,
    startRecordingPhase,
    submitRecording,
    confirmListenedAndRecord,
    getPlayerById,
    fetchReversedAudioForListening,
    getRecordingsWithUrls,
    endRound,
  } = useAudioPhoneGame({ lobbyId, currentPlayer, players });

  const [reversedAudioUrl, setReversedAudioUrl] = useState<string | null>(null);
  const [recordingsWithUrls, setRecordingsWithUrls] = useState<any[]>([]);

  // Fetch reversed audio when it's listening phase and my turn
  useEffect(() => {
    if (currentRound?.phase === 'listening' && isMyTurn) {
      fetchReversedAudioForListening().then(url => {
        setReversedAudioUrl(url);
      });
    }
  }, [currentRound?.phase, isMyTurn, fetchReversedAudioForListening]);

  // Fetch recordings with URLs for reveal phase
  useEffect(() => {
    if (currentRound?.phase === 'reveal') {
      getRecordingsWithUrls().then(data => {
        setRecordingsWithUrls(data);
      });
    }
  }, [currentRound?.phase, getRecordingsWithUrls]);

  // Handle start game (host starts instructions -> recording)
  const handleStartRecording = useCallback(() => {
    startRecordingPhase();
  }, [startRecordingPhase]);

  // Handle play again
  const handlePlayAgain = useCallback(async () => {
    await endRound();
    await startGame();
  }, [endRound, startGame]);

  // Get previous player name for listening phase
  const getPreviousPlayerName = useCallback(() => {
    if (!currentRound) return '';
    const prevIndex = currentRound.current_player_index - 1;
    if (prevIndex < 0) return '';
    const prevPlayerId = currentRound.player_order[prevIndex];
    const prevPlayer = getPlayerById(prevPlayerId);
    return prevPlayer?.name || 'Joueur précédent';
  }, [currentRound, getPlayerById]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 bg-card/60 backdrop-blur-sm border-border/30">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-foreground-secondary">Chargement du jeu...</p>
          </div>
        </Card>
      </div>
    );
  }

  // No round yet - show instructions or start
  if (!currentRound) {
    return (
      <div className="relative">
        <AudioPhoneInstructionsPhase
          isHost={currentPlayer.isHost}
          playerCount={players.length}
          onStart={startGame}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </div>
    );
  }

  // Instructions phase
  if (currentRound.phase === 'instructions') {
    return (
      <div className="relative">
        <AudioPhoneInstructionsPhase
          isHost={currentPlayer.isHost}
          playerCount={players.length}
          onStart={handleStartRecording}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </div>
    );
  }

  // Recording phase - my turn
  if (currentRound.phase === 'recording' && isMyTurn) {
    const isFirstPlayer = currentRound.current_player_index === 0;
    
    return (
      <div className="relative">
        <AudioPhoneRecordingPhase
          isFirstPlayer={isFirstPlayer}
          maxSeconds={currentRound.max_recording_seconds}
          playerName={currentPlayer.name}
          onSubmit={submitRecording}
          isSubmitting={isSubmitting}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </div>
    );
  }

  // Listening phase - my turn
  if (currentRound.phase === 'listening' && isMyTurn) {
    return (
      <div className="relative">
        <AudioPhoneListeningPhase
          audioUrl={reversedAudioUrl}
          playerName={currentPlayer.name}
          previousPlayerName={getPreviousPlayerName()}
          playCount={0}
          maxPlays={3}
          onConfirmListened={confirmListenedAndRecord}
          isLoading={!reversedAudioUrl}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </div>
    );
  }

  // Reveal phase
  if (currentRound.phase === 'reveal') {
    return (
      <div className="relative">
        <AudioPhoneResultsPhase
          recordings={recordingsWithUrls}
          originalPhrase={currentRound.original_phrase}
          players={players}
          isHost={currentPlayer.isHost}
          onPlayAgain={handlePlayAgain}
          onEndGame={onEndGame}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </div>
    );
  }

  // Waiting phase - not my turn
  return (
    <div className="relative">
      <AudioPhoneWaitingPhase
        currentPlayerIndex={currentRound.current_player_index}
        playerOrder={currentRound.player_order}
        players={players}
        currentPhase={currentRound.phase as 'recording' | 'listening'}
        completedCount={recordings.length}
      />
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
});

AudioPhoneGameScreen.displayName = "AudioPhoneGameScreen";

export default AudioPhoneGameScreen;
