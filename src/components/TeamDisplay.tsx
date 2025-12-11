import { GameCard } from "@/components/GameCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Swords, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Team {
  teamNumber: number;
  players: {
    id: string;
    name: string;
  }[];
}

interface TeamDisplayProps {
  teams: Team[];
  currentPlayerId: string;
  lobbyId: string;
  isHost: boolean;
  onShuffleTeams: () => void;
  isLoading?: boolean;
}

const teamColors = [
  { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", name: "Équipe Bleue" },
  { bg: "bg-secondary/10", border: "border-secondary/30", text: "text-secondary", name: "Équipe Rose" },
  { bg: "bg-success/10", border: "border-success/30", text: "text-success", name: "Équipe Verte" },
  { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", name: "Équipe Orange" },
];

export const TeamDisplay = ({
  teams,
  currentPlayerId,
  lobbyId,
  isHost,
  onShuffleTeams,
  isLoading = false,
}: TeamDisplayProps) => {
  if (teams.length === 0) {
    return (
      <GameCard className="animate-fadeIn">
        <div className="text-center space-y-4 py-6">
          <Swords className="h-12 w-12 mx-auto text-foreground-muted" />
          <p className="text-foreground-secondary font-body">
            Les équipes n'ont pas encore été formées
          </p>
          {isHost && (
            <Button onClick={onShuffleTeams} disabled={isLoading} variant="hero">
              <Shuffle className="h-4 w-4 mr-2" />
              Former les équipes
            </Button>
          )}
        </div>
      </GameCard>
    );
  }

  return (
    <GameCard className="animate-fadeIn">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold uppercase tracking-wider flex items-center gap-2">
            <Swords className="h-5 w-5 text-secondary" />
            Équipes
          </h3>
          {isHost && (
            <Button 
              onClick={onShuffleTeams} 
              disabled={isLoading}
              variant="ghost" 
              size="sm"
            >
              <Shuffle className="h-4 w-4 mr-1" />
              Remélanger
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {teams.map((team, index) => {
            const colors = teamColors[index % teamColors.length];
            const isMyTeam = team.players.some(p => p.id === currentPlayerId);
            
            return (
              <div
                key={team.teamNumber}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  colors.bg,
                  colors.border,
                  isMyTeam && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                )}
              >
                <h4 className={cn("font-display font-bold text-sm mb-3", colors.text)}>
                  {colors.name}
                  {isMyTeam && " (Votre équipe)"}
                </h4>
                <div className="flex items-center gap-3">
                  {team.players.map((player) => (
                    <div key={player.id} className="flex flex-col items-center gap-1">
                      <PlayerAvatar
                        playerId={player.id}
                        playerName={player.name}
                        size="md"
                      />
                      <span className={cn(
                        "text-xs font-medium truncate max-w-[60px]",
                        player.id === currentPlayerId ? "text-primary font-bold" : "text-foreground"
                      )}>
                        {player.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GameCard>
  );
};
