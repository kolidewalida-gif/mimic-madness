import { useState } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { VideoSubmissionScreen } from "@/components/VideoSubmissionScreen";
import { useToast } from "@/hooks/use-toast";
import { VideoClip } from "@/lib/videoStorage";
import { useLobbySync } from "@/hooks/useLobbySync";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("home");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [submittedChallenges, setSubmittedChallenges] = useState<VideoClip[]>([]);
  const { toast } = useToast();
  const { lobby, players, createLobby, joinLobby, leaveLobby } = useLobbySync();

  const handleCreateGame = async (playerName: string) => {
    const playerId = crypto.randomUUID();
    const hostPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: true,
    };
    
    setCurrentPlayer(hostPlayer);
    const result = await createLobby(playerId, playerName);
    
    if (result) {
      setGameState("lobby");
    }
  };

  const handleJoinGame = async (playerName: string, code: string) => {
    const playerId = crypto.randomUUID();
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: false,
    };
    
    setCurrentPlayer(newPlayer);
    const result = await joinLobby(code, playerId, playerName);
    
    if (result) {
      setGameState("lobby");
    }
  };

  const handleStartGame = () => {
    setGameState("preparation");
    
    toast({
      title: "Phase de préparation !",
      description: "Préparez vos défis vidéo pour la partie.",
    });
  };

  const handleSubmitChallenges = (challenges: VideoClip[]) => {
    setSubmittedChallenges(challenges);
    
    toast({
      title: "Défis soumis !",
      description: `${challenges.length} défi(s) envoyé(s). En attente des autres joueurs...`,
    });
    
    // TODO: Implement game start logic when all players have submitted
  };

  const handleBackToLobby = () => {
    setGameState("lobby");
    setSubmittedChallenges([]);
  };

  const handleLeaveGame = async () => {
    if (currentPlayer) {
      await leaveLobby(currentPlayer.id);
    }
    setGameState("home");
    setCurrentPlayer(null);
    setSubmittedChallenges([]);
    
    toast({
      title: "Partie quittée",
      description: "Vous avez quitté la partie",
    });
  };

  if (gameState === "home") {
    return (
      <HomeScreen 
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
      />
    );
  }

  if (gameState === "lobby" && currentPlayer && lobby) {
    return (
      <LobbyScreen
        players={players}
        lobbyCode={lobby.code}
        isHost={currentPlayer.isHost}
        currentPlayer={currentPlayer}
        onStartGame={handleStartGame}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  if (gameState === "preparation" && currentPlayer) {
    return (
      <VideoSubmissionScreen
        currentPlayer={currentPlayer}
        onBackToLobby={handleBackToLobby}
        onSubmitChallenges={handleSubmitChallenges}
      />
    );
  }

  // Fallback to home screen
  return (
    <HomeScreen 
      onCreateGame={handleCreateGame}
      onJoinGame={handleJoinGame}
    />
  );
};

export default Index;