import { useState } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { VideoSubmissionScreen } from "@/components/VideoSubmissionScreen";
import { useToast } from "@/hooks/use-toast";
import { VideoClip } from "@/lib/videoStorage";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("home");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [lobbyCode, setLobbyCode] = useState("");
  const [submittedChallenges, setSubmittedChallenges] = useState<VideoClip[]>([]);
  const { toast } = useToast();

  // Generate random 4-character lobby code
  const generateLobbyCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateGame = (playerName: string) => {
    const newLobbyCode = generateLobbyCode();
    const hostPlayer: Player = {
      id: "host-" + Date.now(),
      name: playerName,
      isHost: true,
    };
    
    setLobbyCode(newLobbyCode);
    setCurrentPlayer(hostPlayer);
    setPlayers([hostPlayer]);
    setGameState("lobby");
    
    toast({
      title: "Partie créée !",
      description: `Code du lobby: ${newLobbyCode}`,
    });
  };

  const handleJoinGame = (playerName: string, code: string) => {
    // In a real implementation, this would connect to the host via WebRTC
    // For now, we'll simulate joining a game
    const newPlayer: Player = {
      id: "player-" + Date.now(),
      name: playerName,
      isHost: false,
    };
    
    setCurrentPlayer(newPlayer);
    setLobbyCode(code);
    
    // Simulate some existing players
    setPlayers([
      { id: "host", name: "Hôte", isHost: true },
      newPlayer,
    ]);
    
    setGameState("lobby");
    
    toast({
      title: "Partie rejointe !",
      description: `Connexion au lobby ${code}`,
    });
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

  const handleLeaveGame = () => {
    setGameState("home");
    setPlayers([]);
    setCurrentPlayer(null);
    setLobbyCode("");
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

  if (gameState === "lobby" && currentPlayer) {
    return (
      <LobbyScreen
        players={players}
        lobbyCode={lobbyCode}
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