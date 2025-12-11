import { useState, useEffect } from "react";
import { GameCard } from "@/components/GameCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Send, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TeammateStatusPanelProps {
  currentPlayerId: string;
  currentPlayerName: string;
  teammate: { id: string; name: string } | null;
  lobbyId: string;
  roundNumber: number;
  isReady: boolean;
  teammateReady: boolean;
}

interface TeamMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  createdAt: Date;
}

export const TeammateStatusPanel = ({
  currentPlayerId,
  currentPlayerName,
  teammate,
  lobbyId,
  roundNumber,
  isReady,
  teammateReady,
}: TeammateStatusPanelProps) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // For team chat, we use a simple channel approach
  useEffect(() => {
    if (!teammate) return;

    const channelName = `team-chat:${lobbyId}:${roundNumber}:${[currentPlayerId, teammate.id].sort().join('-')}`;
    
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'team_message' }, (payload) => {
        const msg = payload.payload as TeamMessage;
        setMessages(prev => [...prev, { ...msg, createdAt: new Date(msg.createdAt) }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber, currentPlayerId, teammate?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !teammate) return;

    const channelName = `team-chat:${lobbyId}:${roundNumber}:${[currentPlayerId, teammate.id].sort().join('-')}`;
    
    const message: TeamMessage = {
      id: crypto.randomUUID(),
      playerId: currentPlayerId,
      playerName: currentPlayerName,
      content: newMessage.trim(),
      createdAt: new Date(),
    };

    // Add locally immediately
    setMessages(prev => [...prev, message]);

    // Broadcast to teammate
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'team_message',
      payload: message,
    });

    setNewMessage("");
  };

  if (!teammate) {
    return null;
  }

  return (
    <GameCard className="animate-fadeIn">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-secondary" />
          <h3 className="font-display font-bold uppercase tracking-wider text-sm text-secondary">
            Votre Coéquipier
          </h3>
        </div>

        {/* Teammate Status */}
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all",
          teammateReady 
            ? "bg-success/10 border-success/30" 
            : "bg-background-secondary/30 border-glass-border"
        )}>
          <div className="flex items-center gap-4">
            <PlayerAvatar
              playerId={teammate.id}
              playerName={teammate.name}
              size="lg"
            />
            <div className="flex-1">
              <p className="font-display font-bold text-lg">{teammate.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {teammateReady ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-sm text-success font-medium">Prêt !</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-foreground-muted animate-pulse" />
                    <span className="text-sm text-foreground-muted">En cours d'enregistrement...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Your Status */}
        <div className={cn(
          "p-3 rounded-xl border text-center",
          isReady 
            ? "bg-success/10 border-success/30" 
            : "bg-primary/10 border-primary/30"
        )}>
          <p className="text-sm font-medium">
            {isReady ? (
              <span className="text-success">✓ Vous êtes prêt</span>
            ) : (
              <span className="text-primary">Enregistrez votre imitation</span>
            )}
          </p>
        </div>

        {/* Team Chat */}
        <div className="space-y-2">
          <p className="text-xs text-foreground-muted font-display uppercase tracking-wider">
            Chat d'équipe
          </p>
          
          <ScrollArea className="h-32 rounded-lg bg-background-secondary/30 p-2">
            {messages.length === 0 ? (
              <p className="text-xs text-foreground-muted text-center py-4">
                Communiquez avec votre coéquipier
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "p-2 rounded-lg text-sm",
                      msg.playerId === currentPlayerId
                        ? "bg-primary/20 ml-4"
                        : "bg-secondary/20 mr-4"
                    )}
                  >
                    <p className="text-xs font-medium text-foreground-muted mb-1">
                      {msg.playerId === currentPlayerId ? "Vous" : msg.playerName}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 h-9 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button
              onClick={sendMessage}
              size="sm"
              disabled={!newMessage.trim()}
              className="h-9 w-9 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Team Status Summary */}
        {isReady && teammateReady && (
          <div className="p-3 rounded-xl bg-success/20 border border-success/30 text-center animate-pulse">
            <p className="text-success font-display font-bold text-sm">
              🎉 Équipe prête !
            </p>
            <p className="text-xs text-success/80 mt-1">
              Vos imitations seront combinées pour le vote
            </p>
          </div>
        )}
      </div>
    </GameCard>
  );
};
