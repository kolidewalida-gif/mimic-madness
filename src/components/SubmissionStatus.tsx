import { useEffect, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Player {
  id: string;
  name: string;
}

interface Submission {
  player_id: string;
  player_name: string;
  challenges_count: number;
}

interface SubmissionStatusProps {
  lobbyId: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
}

export const SubmissionStatus = ({ 
  lobbyId, 
  players, 
  isHost,
  onStartGame 
}: SubmissionStatusProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadSubmissionsData = async () => {
      try {
        const { data, error } = await supabase
          .from('player_submissions')
          .select('*')
          .eq('lobby_id', lobbyId);

        if (error) throw error;

        if (isMounted) {
          setSubmissions(data || []);
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadSubmissionsData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`submissions:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_submissions',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload) => {
          console.log('Submission update:', payload);
          if (isMounted) loadSubmissionsData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const allPlayersSubmitted = players.length > 0 && 
    players.every(player => 
      submissions.some(sub => sub.player_id === player.id && sub.challenges_count > 0)
    );

  const hasSubmission = (playerId: string) => {
    return submissions.some(sub => sub.player_id === playerId && sub.challenges_count > 0);
  };

  const getSubmissionCount = (playerId: string) => {
    const submission = submissions.find(sub => sub.player_id === playerId);
    return submission?.challenges_count || 0;
  };

  if (isLoading) {
    return (
      <GameCard>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </GameCard>
    );
  }

  return (
    <GameCard>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-secondary" />
          <h3 className="text-xl font-semibold text-gradient">
            Statut des Soumissions
          </h3>
        </div>

        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                hasSubmission(player.id)
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-background-secondary/30 border border-glass-border"
              }`}
            >
              <div className="flex items-center gap-3">
                {hasSubmission(player.id) ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : (
                  <Clock className="h-5 w-5 text-foreground-secondary" />
                )}
                <div>
                  <p className="font-medium">{player.name}</p>
                  {hasSubmission(player.id) && (
                    <p className="text-sm text-foreground-secondary">
                      {getSubmissionCount(player.id)} défi(s) soumis
                    </p>
                  )}
                </div>
              </div>
              
              {hasSubmission(player.id) ? (
                <span className="text-sm text-primary font-medium">✓ Prêt</span>
              ) : (
                <span className="text-sm text-foreground-secondary">En attente...</span>
              )}
            </div>
          ))}
        </div>

        {allPlayersSubmitted && isHost && (
          <div className="pt-4 border-t border-glass-border animate-fadeIn">
            <Button
              variant="hero"
              size="lg"
              onClick={onStartGame}
              className="w-full"
            >
              <Rocket className="h-5 w-5" />
              Lancer la Partie !
            </Button>
          </div>
        )}

        {!allPlayersSubmitted && (
          <div className="text-center py-2">
            <p className="text-sm text-foreground-secondary">
              {submissions.length}/{players.length} joueur(s) prêt(s)
            </p>
          </div>
        )}
      </div>
    </GameCard>
  );
};
