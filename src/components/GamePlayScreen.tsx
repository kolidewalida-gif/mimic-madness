import { useState } from "react";
import { GameLogo } from "@/components/GameLogo";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoPreview } from "@/components/VideoPreview";
import { ArrowLeft, Play } from "lucide-react";
import { VideoClip } from "@/lib/videoStorage";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface GamePlayScreenProps {
  currentPlayer: Player;
  players: Player[];
  challenges: VideoClip[];
  onEndGame: () => void;
}

export const GamePlayScreen = ({
  currentPlayer,
  players,
  challenges,
  onEndGame
}: GamePlayScreenProps) => {
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  
  const currentChallenge = challenges[currentChallengeIndex];

  const handleNextChallenge = () => {
    if (currentChallengeIndex < challenges.length - 1) {
      setCurrentChallengeIndex(prev => prev + 1);
    }
  };

  const handlePrevChallenge = () => {
    if (currentChallengeIndex > 0) {
      setCurrentChallengeIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen animated-bg p-6">
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onEndGame}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quitter la Partie
          </Button>
          <GameLogo size="md" />
          <div className="w-32" /> {/* Spacer */}
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-gradient">
            🎮 Partie en Cours
          </h2>
          <p className="text-foreground-secondary text-lg">
            {players.length} joueur(s) • {challenges.length} défi(s)
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Players List */}
          <div>
            <GameCard>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gradient">
                  Joueurs
                </h3>
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg ${
                        player.id === currentPlayer.id
                          ? "bg-primary/20 border border-primary"
                          : "bg-background-secondary/30"
                      }`}
                    >
                      <p className="font-medium">{player.name}</p>
                      {player.isHost && (
                        <span className="text-xs text-secondary">👑 Hôte</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </GameCard>
          </div>

          {/* Current Challenge */}
          <div className="md:col-span-2">
            <GameCard>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gradient">
                    Défi {currentChallengeIndex + 1}/{challenges.length}
                  </h3>
                  <Play className="h-5 w-5 text-secondary" />
                </div>

                {currentChallenge ? (
                  <div className="space-y-4">
                    <div className="bg-background-secondary/30 p-4 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">{currentChallenge.name}</h4>
                      <p className="text-sm text-foreground-secondary mb-4">
                        Durée: {Math.round(currentChallenge.duration)}s
                      </p>
                      
                      <VideoPreview
                        clipId={currentChallenge.id}
                        startTime={currentChallenge.startTime}
                        endTime={currentChallenge.endTime}
                        className="w-full aspect-video"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handlePrevChallenge}
                        disabled={currentChallengeIndex === 0}
                        className="flex-1"
                      >
                        ← Précédent
                      </Button>
                      
                      <Button
                        variant="hero"
                        onClick={handleNextChallenge}
                        disabled={currentChallengeIndex === challenges.length - 1}
                        className="flex-1"
                      >
                        Suivant →
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-foreground-secondary">
                    <p>Aucun défi disponible</p>
                  </div>
                )}
              </div>
            </GameCard>

            {/* Game Instructions */}
            <GameCard className="mt-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">📋 Instructions</h4>
                <ul className="space-y-2 text-sm text-foreground-secondary">
                  <li>• Regardez la vidéo du défi actuel</li>
                  <li>• Imitez les mouvements ou actions de la vidéo</li>
                  <li>• Les autres joueurs évaluent votre performance</li>
                  <li>• Passez au défi suivant quand vous êtes prêt</li>
                </ul>
              </div>
            </GameCard>
          </div>
        </div>
      </div>
    </div>
  );
};
