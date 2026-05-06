import { useEffect, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Rocket, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { videoStorage } from "@/lib/videoStorageSupabase";

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
  const [playersWithClips, setPlayersWithClips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSubmissionsData = async () => {
      try {
        const [{ data, error }, playableClips] = await Promise.all([
          supabase
            .from("player_submissions")
            .select("*")
            .eq("lobby_id", lobbyId),
          videoStorage.getPlayableChallengeClipsByLobby(lobbyId),
        ]);

        if (error) throw error;

        if (isMounted) {
          setSubmissions(data || []);
          setPlayersWithClips([...new Set(playableClips.map((clip) => clip.playerId))]);
        }
      } catch (error) {
        console.error("Error loading submissions:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSubmissionsData();

    const channel = supabase
      .channel(`submissions:${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_submissions",
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          if (isMounted) {
            loadSubmissionsData();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const hasSubmission = (playerId: string) =>
    submissions.some((sub) => sub.player_id === playerId && sub.challenges_count > 0);

  const getSubmissionCount = (playerId: string) => {
    const submission = submissions.find((sub) => sub.player_id === playerId);
    return submission?.challenges_count || 0;
  };

  const hasPlayableClip = (playerId: string) => playersWithClips.includes(playerId);

  const allPlayersSubmitted = players.length > 0 &&
    players.every((player) => hasSubmission(player.id));

  const everyPlayerHasClip = players.length > 0 &&
    players.every((player) => hasPlayableClip(player.id));

  // Le clip est juste un avertissement : on ne bloque plus le lancement
  // si la soumission est validée (évite le faux blocage "Clip manquant").
  const canStartGame = allPlayersSubmitted;

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
          {players.map((player) => {
            const ready = hasSubmission(player.id);
            const playable = hasPlayableClip(player.id);

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  ready && playable
                    ? "bg-primary/10 border border-primary/30"
                    : ready
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-background-secondary/30 border border-glass-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {ready && playable ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : ready ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-foreground-secondary" />
                  )}

                  <div>
                    <p className="font-medium">{player.name}</p>
                    {ready && (
                      <p className="text-sm text-foreground-secondary">
                        {getSubmissionCount(player.id)} defi(s) soumis
                      </p>
                    )}
                    {!playable && (
                      <p className="text-xs text-amber-300 flex items-center gap-1 mt-1">
                        <Video className="h-3 w-3" />
                        Aucun clip jouable detecte
                      </p>
                    )}
                  </div>
                </div>

                {ready && playable ? (
                  <span className="text-sm text-primary font-medium">Pret</span>
                ) : ready ? (
                  <span className="text-sm text-amber-300 font-medium">Clip manquant</span>
                ) : (
                  <span className="text-sm text-foreground-secondary">En attente</span>
                )}
              </div>
            );
          })}
        </div>

        {!everyPlayerHasClip && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Avertissement clips
            </div>
            <p className="mt-1 text-amber-200/80">
              Certains clips n'ont pas pu etre detectes pour le moment, mais le lancement reste possible. Si le chargement bloque en partie, demandez aux joueurs concernes de re-soumettre leur defi.
            </p>
          </div>
        )}

        {canStartGame && isHost && (
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
              {submissions.length}/{players.length} joueur(s) pret(s)
            </p>
          </div>
        )}
      </div>
    </GameCard>
  );
};
