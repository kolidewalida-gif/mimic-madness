import { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bug, 
  ChevronDown, 
  ChevronUp,
  Users,
  Mic,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPhoneRound {
  id: string;
  lobby_id: string;
  round_number: number;
  phase: string;
  current_player_index: number;
  player_order: string[];
  original_phrase: string | null;
  max_recording_seconds: number;
}

interface AudioPhoneRecording {
  id: string;
  round_id: string;
  player_id: string;
  player_name: string;
  player_order_index: number;
  storage_path: string;
  reversed_storage_path: string | null;
  duration_seconds: number;
}

interface UploadError {
  timestamp: Date;
  message: string;
  details?: string;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneDebugPanelProps {
  currentRound: AudioPhoneRound | null;
  recordings: AudioPhoneRecording[];
  players: Player[];
  uploadErrors: UploadError[];
  isMyTurn: boolean;
}

export const AudioPhoneDebugPanel = memo(({
  currentRound,
  recordings,
  players,
  uploadErrors,
  isMyTurn,
}: AudioPhoneDebugPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPlayerNameById = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || playerId.slice(0, 8);
  };

  const currentPlayerName = currentRound 
    ? getPlayerNameById(currentRound.player_order[currentRound.current_player_index])
    : '-';

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "gap-2 text-xs bg-background/80 backdrop-blur-sm border-warning/30",
          uploadErrors.length > 0 && "border-destructive/50 text-destructive"
        )}
      >
        <Bug className="h-3.5 w-3.5" />
        Debug
        {uploadErrors.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">
            {uploadErrors.length}
          </span>
        )}
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
      </Button>

      {/* Debug Panel */}
      {isExpanded && (
        <Card className="absolute bottom-10 right-0 w-80 max-h-96 overflow-auto p-4 bg-background/95 backdrop-blur-md border-border/50 shadow-xl animate-fadeIn">
          <div className="space-y-4">
            {/* Round State */}
            <div>
              <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                État du Round
              </h4>
              
              {currentRound ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Round ID</span>
                    <span className="font-mono text-foreground">{currentRound.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Phase</span>
                    <span className={cn(
                      "font-medium px-1.5 py-0.5 rounded",
                      currentRound.phase === 'recording' && "bg-success/20 text-success",
                      currentRound.phase === 'listening' && "bg-accent/20 text-accent",
                      currentRound.phase === 'reveal' && "bg-warning/20 text-warning",
                      currentRound.phase === 'instructions' && "bg-primary/20 text-primary",
                    )}>
                      {currentRound.phase}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Round #</span>
                    <span className="text-foreground">{currentRound.round_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Joueur actuel</span>
                    <span className="text-foreground">
                      {currentPlayerName} ({currentRound.current_player_index + 1}/{currentRound.player_order.length})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">C'est mon tour</span>
                    <span className={isMyTurn ? "text-success" : "text-foreground-muted"}>
                      {isMyTurn ? "Oui" : "Non"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Max secondes</span>
                    <span className="text-foreground">{currentRound.max_recording_seconds}s</span>
                  </div>
                  {currentRound.original_phrase && (
                    <div className="pt-1 border-t border-border/30">
                      <span className="text-foreground-muted">Phrase originale:</span>
                      <p className="text-foreground mt-0.5 italic">"{currentRound.original_phrase}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-foreground-muted italic">Aucun round actif</p>
              )}
            </div>

            {/* Recordings */}
            <div>
              <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mic className="h-3 w-3" />
                Enregistrements ({recordings.length})
              </h4>
              
              {recordings.length > 0 ? (
                <div className="space-y-1">
                  {recordings.map((rec, idx) => (
                    <div 
                      key={rec.id} 
                      className="flex items-center gap-2 text-xs p-1.5 rounded bg-background/50"
                    >
                      <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
                      <span className="flex-1 truncate">{rec.player_name}</span>
                      <span className="text-foreground-muted">{rec.duration_seconds.toFixed(1)}s</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground-muted italic">Aucun enregistrement</p>
              )}
            </div>

            {/* Player Order */}
            <div>
              <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                Ordre de passage
              </h4>
              
              {currentRound ? (
                <div className="flex flex-wrap gap-1">
                  {currentRound.player_order.map((playerId, idx) => {
                    const isCompleted = idx < currentRound.current_player_index;
                    const isCurrent = idx === currentRound.current_player_index;
                    
                    return (
                      <span
                        key={playerId}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          isCompleted && "bg-success/20 text-success",
                          isCurrent && "bg-primary/20 text-primary ring-1 ring-primary",
                          !isCompleted && !isCurrent && "bg-muted text-foreground-muted"
                        )}
                      >
                        {idx + 1}. {getPlayerNameById(playerId)}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-foreground-muted italic">-</p>
              )}
            </div>

            {/* Upload Errors */}
            <div>
              <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className={cn("h-3 w-3", uploadErrors.length > 0 && "text-destructive")} />
                Erreurs d'upload ({uploadErrors.length})
              </h4>
              
              {uploadErrors.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-auto">
                  {uploadErrors.slice(-5).reverse().map((err, idx) => (
                    <div 
                      key={idx} 
                      className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-destructive font-medium mb-0.5">
                        <Clock className="h-3 w-3" />
                        {err.timestamp.toLocaleTimeString()}
                      </div>
                      <p className="text-foreground">{err.message}</p>
                      {err.details && (
                        <p className="text-foreground-muted mt-0.5 font-mono text-[10px] break-all">
                          {err.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-success italic flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Aucune erreur
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
});

AudioPhoneDebugPanel.displayName = "AudioPhoneDebugPanel";
