import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Shuffle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  teamNumber: number;
  players: { id: string; name: string }[];
}

interface TeamDisplayProps {
  teams: Team[];
  currentPlayerId: string;
  lobbyId: string;
  isHost: boolean;
  onShuffleTeams: () => void;
  isLoading?: boolean;
}

const teamStyles = [
  { 
    name: "Équipe Bleue",
    gradient: "from-blue-500 to-[var(--ink-surface-3)]",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400"
  },
  { 
    name: "Équipe Rouge",
    gradient: "from-red-500 to-orange-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400"
  },
  { 
    name: "Équipe Verte",
    gradient: "from-green-500 to-emerald-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-400"
  },
  { 
    name: "Équipe Jaune",
    gradient: "from-yellow-500 to-amber-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400"
  },
];

export const TeamDisplay = ({
  teams,
  currentPlayerId,
  lobbyId,
  isHost,
  onShuffleTeams,
  isLoading = false,
}: TeamDisplayProps) => {
  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted flex items-center gap-2">
          <Users className="h-4 w-4" />
          Équipes
        </h3>
        {isHost && teams.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShuffleTeams}
            disabled={isLoading}
            className="gap-2 text-xs h-8 rounded-lg"
          >
            <Shuffle className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Mélanger
          </Button>
        )}
      </div>

      {/* Teams */}
      {teams.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <Users className="h-10 w-10 mx-auto text-foreground-muted/30" />
          <p className="text-foreground-muted text-sm">Équipes non formées</p>
          {isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShuffleTeams}
              disabled={isLoading}
              className="gap-2 rounded-lg"
            >
              <Shuffle className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Former les équipes
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {teams.map((team, index) => {
            const style = teamStyles[index % teamStyles.length];
            const isCurrentPlayerTeam = team.players.some(p => p.id === currentPlayerId);

            return (
              <div
                key={team.teamNumber}
                className={cn(
                  "rounded-xl p-4 border transition-all duration-200",
                  style.bg,
                  style.border,
                  isCurrentPlayerTeam && "ring-2 ring-primary/50"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("text-sm font-semibold", style.text)}>
                    {style.name}
                    {isCurrentPlayerTeam && " (votre équipe)"}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    {team.players.length} joueurs
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                        "bg-background/50 border border-border/30",
                        player.id === currentPlayerId && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <PlayerAvatar
                        playerId={player.id}
                        playerName={player.name}
                        size="sm"
                      />
                      <span className="text-sm font-medium">
                        {player.name}
                        {player.id === currentPlayerId && (
                          <span className="text-[10px] text-primary/70 ml-1">(vous)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
