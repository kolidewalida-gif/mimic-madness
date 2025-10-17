import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoPreview } from "@/components/VideoPreview";
import { ThumbsUp, ThumbsDown, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorage";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface VotingPhaseProps {
  lobbyId: string;
  roundNumber: number;
  currentPlayer: Player;
  players: Player[];
  onVotingComplete: () => void;
}

interface ImitationWithClip {
  playerId: string;
  playerName: string;
  clipId: string | null;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
}

export const VotingPhase = ({
  lobbyId,
  roundNumber,
  currentPlayer,
  players,
  onVotingComplete
}: VotingPhaseProps) => {
  const [imitations, setImitations] = useState<ImitationWithClip[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasVotedAll, setHasVotedAll] = useState(false);
  const { toast } = useToast();

  // Load imitations and their clips
  useEffect(() => {
    const loadImitations = async () => {
      const imitationsData: ImitationWithClip[] = [];
      
      for (const player of players) {
        // Get the most recent clip for this player
        const clips = await videoStorage.getVideoClipsByPlayer(player.id);
        const latestClip = clips.length > 0 ? clips[clips.length - 1] : null;

        // Get votes for this player
        const { data: votes } = await supabase
          .from('imitation_votes')
          .select('vote_type')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber)
          .eq('imitation_player_id', player.id);

        const likes = votes?.filter(v => v.vote_type === 'like').length || 0;
        const dislikes = votes?.filter(v => v.vote_type === 'dislike').length || 0;

        // Get user's vote
        const { data: userVote } = await supabase
          .from('imitation_votes')
          .select('vote_type')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber)
          .eq('imitation_player_id', player.id)
          .eq('voter_player_id', currentPlayer.id)
          .maybeSingle();

        imitationsData.push({
          playerId: player.id,
          playerName: player.name,
          clipId: latestClip?.id || null,
          likes,
          dislikes,
          userVote: userVote?.vote_type as 'like' | 'dislike' | null
        });
      }

      setImitations(imitationsData);
    };

    loadImitations();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`votes:${lobbyId}:${roundNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'imitation_votes',
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          loadImitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber, players, currentPlayer.id]);

  const handleVote = async (voteType: 'like' | 'dislike') => {
    const currentImitation = imitations[currentIndex];
    if (!currentImitation || currentImitation.playerId === currentPlayer.id) {
      // Can't vote for yourself
      handleNext();
      return;
    }

    try {
      const { error } = await supabase
        .from('imitation_votes')
        .upsert({
          lobby_id: lobbyId,
          round_number: roundNumber,
          imitation_player_id: currentImitation.playerId,
          voter_player_id: currentPlayer.id,
          vote_type: voteType
        });

      if (error) throw error;

      toast({
        title: voteType === 'like' ? "👍 Like !" : "👎 Dislike",
        description: `Vote enregistré pour ${currentImitation.playerName}`,
      });

      handleNext();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le vote",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < imitations.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setHasVotedAll(true);
      toast({
        title: "Votes terminés !",
        description: "En attente des résultats...",
      });
      // Auto navigate to results after 3 seconds
      setTimeout(() => {
        onVotingComplete();
      }, 3000);
    }
  };

  const currentImitation = imitations[currentIndex];

  if (!currentImitation) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-secondary">Chargement...</p>
      </div>
    );
  }

  if (hasVotedAll) {
    return (
      <div className="text-center py-12 space-y-4">
        <Trophy className="h-16 w-16 text-secondary mx-auto" />
        <h2 className="text-3xl font-bold text-gradient">Votes terminés !</h2>
        <p className="text-foreground-secondary">Préparation des résultats...</p>
      </div>
    );
  }

  const isOwnVideo = currentImitation.playerId === currentPlayer.id;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gradient">
          🗳️ Phase de Vote
        </h2>
        <p className="text-foreground-secondary">
          Imitation {currentIndex + 1}/{imitations.length}
        </p>
      </div>

      <GameCard>
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-2">
              {isOwnVideo ? "Votre imitation" : currentImitation.playerName}
            </h3>
            {isOwnVideo && (
              <p className="text-sm text-foreground-secondary">
                Vous ne pouvez pas voter pour votre propre imitation
              </p>
            )}
          </div>

          {currentImitation.clipId ? (
            <VideoPreview
              clipId={currentImitation.clipId}
              startTime={0}
              endTime={25}
              className="w-full aspect-video rounded-lg mx-auto max-w-3xl"
            />
          ) : (
            <div className="aspect-video bg-background-secondary/30 rounded-lg flex items-center justify-center">
              <p className="text-foreground-secondary">Aucune vidéo disponible</p>
            </div>
          )}

          <div className="flex gap-4 justify-center pt-4">
            {isOwnVideo ? (
              <Button
                onClick={handleNext}
                variant="hero"
                size="lg"
              >
                Passer
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleVote('dislike')}
                  variant="outline"
                  size="lg"
                  className="flex-1 max-w-xs"
                >
                  <ThumbsDown className="h-6 w-6 mr-2" />
                  Dislike
                </Button>
                <Button
                  onClick={() => handleVote('like')}
                  variant="hero"
                  size="lg"
                  className="flex-1 max-w-xs"
                >
                  <ThumbsUp className="h-6 w-6 mr-2" />
                  Like
                </Button>
              </>
            )}
          </div>
        </div>
      </GameCard>

      {/* Vote Progress */}
      <div className="flex gap-2 justify-center">
        {imitations.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-8 rounded-full transition-all ${
              index < currentIndex
                ? "bg-secondary"
                : index === currentIndex
                ? "bg-primary"
                : "bg-background-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
