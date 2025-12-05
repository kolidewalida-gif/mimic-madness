import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoWithAudioOverlay, VideoWithAudioOverlayRef } from "@/components/VideoWithAudioOverlay";
import { ThumbsUp, ThumbsDown, Trophy, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

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
  challengeVideoClipId: string;
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
  challengeVideoClipId,
  onVotingComplete
}: VotingPhaseProps) => {
  const [imitations, setImitations] = useState<ImitationWithClip[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasVotedAll, setHasVotedAll] = useState(false);
  const [votingSessionId, setVotingSessionId] = useState<string | null>(null);
  const [isPlayingSynced, setIsPlayingSynced] = useState(false);
  const [hasVotedCurrent, setHasVotedCurrent] = useState(false);
  const { toast } = useToast();
  const { pause, play } = useBackgroundMusic();
  const videoRef = useRef<VideoWithAudioOverlayRef>(null);

  // Pause music during voting phase
  useEffect(() => {
    pause();
    return () => {
      play();
    };
  }, [pause, play]);

  // Initialize or join voting session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const initVotingSession = async () => {
      const { data: existingSession } = await supabase
        .from('voting_session')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber)
        .maybeSingle();

      if (existingSession) {
        setVotingSessionId(existingSession.id);
        setCurrentIndex(existingSession.current_imitation_index);
        setIsPlayingSynced((existingSession as any).is_playing ?? false);
        if (interval) clearInterval(interval);
        return true;
      } else if (currentPlayer.isHost) {
        const { data: newSession, error } = await supabase
          .from('voting_session')
          .insert({
            lobby_id: lobbyId,
            round_number: roundNumber,
            current_imitation_index: 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating voting session:', error);
        } else {
          setVotingSessionId(newSession.id);
          if (interval) clearInterval(interval);
          return true;
        }
      }
      return false;
    };

    initVotingSession();
    
    if (!currentPlayer.isHost) {
      interval = setInterval(async () => {
        const found = await initVotingSession();
        if (found && interval) clearInterval(interval);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lobbyId, roundNumber, currentPlayer.isHost]);

  // Subscribe to voting session changes (index AND is_playing)
  useEffect(() => {
    if (!votingSessionId) return;

    const channel = supabase
      .channel(`voting_session:${votingSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voting_session',
          filter: `id=eq.${votingSessionId}`
        },
        (payload) => {
          const newData = payload.new as any;
          const newIndex = newData.current_imitation_index;
          const newIsPlaying = newData.is_playing ?? false;
          
          setCurrentIndex(newIndex);
          setIsPlayingSynced(newIsPlaying);
          
          if (newIndex >= imitations.length && imitations.length > 0) {
            setHasVotedAll(true);
            setTimeout(() => {
              onVotingComplete();
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [votingSessionId, imitations.length, onVotingComplete]);

  // Load imitations and their clips
  useEffect(() => {
    const loadImitations = async () => {
      const imitationsData: ImitationWithClip[] = [];
      
      for (const player of players) {
        const latestClip = await videoStorage.getLatestClipByPlayerInLobby(player.id, lobbyId);

        const { data: votes } = await supabase
          .from('imitation_votes')
          .select('vote_type')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber)
          .eq('imitation_player_id', player.id);

        const likes = votes?.filter(v => v.vote_type === 'like').length || 0;
        const dislikes = votes?.filter(v => v.vote_type === 'dislike').length || 0;

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

      console.log('Loaded imitations:', imitationsData);
      setImitations(imitationsData);
    };

    loadImitations();

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

  // Reset hasVotedCurrent when index changes
  useEffect(() => {
    setHasVotedCurrent(false);
  }, [currentIndex]);

  const handleVote = async (voteType: 'like' | 'dislike') => {
    const currentImitation = imitations[currentIndex];
    if (!currentImitation || currentImitation.playerId === currentPlayer.id) {
      setHasVotedCurrent(true);
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

      setHasVotedCurrent(true);
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le vote",
        variant: "destructive",
      });
    }
  };

  // Host controls play/pause for everyone
  const handleTogglePlay = async () => {
    if (!votingSessionId || !currentPlayer.isHost) return;

    const newIsPlaying = !isPlayingSynced;
    
    const { error } = await supabase
      .from('voting_session')
      .update({ 
        is_playing: newIsPlaying,
        updated_at: new Date().toISOString()
      })
      .eq('id', votingSessionId);

    if (error) {
      console.error('Error updating play state:', error);
    }
  };

  // Only host can advance to next imitation
  const handleNext = async () => {
    if (!votingSessionId || !currentPlayer.isHost) {
      return;
    }

    const nextIndex = currentIndex + 1;
    
    // Stop playing and advance
    const { error } = await supabase
      .from('voting_session')
      .update({ 
        current_imitation_index: nextIndex,
        is_playing: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', votingSessionId);

    if (error) {
      console.error('Error updating voting session:', error);
    }
  };

  const currentImitation = imitations[currentIndex];

  if (!currentImitation || imitations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-secondary">Chargement des imitations...</p>
      </div>
    );
  }

  if (hasVotedAll || currentIndex >= imitations.length) {
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gradient">
          🗳️ Phase de Vote
        </h2>
        <p className="text-foreground-secondary">
          Imitation {currentIndex + 1}/{imitations.length}
        </p>
        <p className="text-sm text-secondary">
          {currentPlayer.isHost ? "Contrôlez la lecture pour tous les joueurs" : "L'hôte contrôle la lecture"}
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
            <VideoWithAudioOverlay
              ref={videoRef}
              videoClipId={challengeVideoClipId}
              audioClipId={currentImitation.clipId}
              className="w-full mx-auto max-w-3xl"
              externalControl={true}
              isPlayingExternal={isPlayingSynced}
            />
          ) : (
            <div className="aspect-video bg-background-secondary/30 rounded-lg flex items-center justify-center">
              <p className="text-foreground-secondary">Aucun audio disponible</p>
            </div>
          )}

          {/* Host playback controls */}
          {currentPlayer.isHost && (
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleTogglePlay}
                variant="outline"
                size="lg"
                disabled={!votingSessionId}
              >
                {isPlayingSynced ? (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Lancer pour tous
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-4 items-center pt-4">
            {/* Voting buttons for non-own videos */}
            {!isOwnVideo && !hasVotedCurrent && (
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleVote('dislike')}
                  variant="outline"
                  size="lg"
                  className="flex-1 max-w-xs"
                  disabled={!votingSessionId}
                >
                  <ThumbsDown className="h-6 w-6 mr-2" />
                  Dislike
                </Button>
                <Button
                  onClick={() => handleVote('like')}
                  variant="hero"
                  size="lg"
                  className="flex-1 max-w-xs"
                  disabled={!votingSessionId}
                >
                  <ThumbsUp className="h-6 w-6 mr-2" />
                  Like
                </Button>
              </div>
            )}

            {/* Status after voting or for own video */}
            {(hasVotedCurrent || isOwnVideo) && !currentPlayer.isHost && (
              <p className="text-foreground-secondary text-center">
                ✅ {isOwnVideo ? "C'est votre imitation" : "Vote enregistré"} - En attente de l'hôte...
              </p>
            )}

            {/* Host controls */}
            {currentPlayer.isHost && (
              <Button
                onClick={handleNext}
                variant="hero"
                size="lg"
                disabled={!votingSessionId}
              >
                Imitation Suivante →
              </Button>
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
                ? "bg-primary animate-pulse"
                : "bg-background-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
};