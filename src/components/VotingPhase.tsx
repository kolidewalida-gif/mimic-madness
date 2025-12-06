import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoWithAudioOverlay, VideoWithAudioOverlayRef } from "@/components/VideoWithAudioOverlay";
import { ThumbsUp, ThumbsDown, Trophy, Play, Pause, Vote, ChevronRight } from "lucide-react";
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

  // Load imitations and their clips - only clips created during THIS round's imitation phase
  useEffect(() => {
    let isMounted = true;
    
    const loadImitations = async () => {
      const imitationsData: ImitationWithClip[] = [];
      
      // Get the imitation records for this round to find the correct clips
      const { data: imitationRecords } = await supabase
        .from('player_imitations')
        .select('player_id, player_name, created_at')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber)
        .eq('is_ready', true);
      
      for (const player of players) {
        // Find if player submitted an imitation for this round
        const imitationRecord = imitationRecords?.find(r => r.player_id === player.id);
        
        let clipId: string | null = null;
        
        if (imitationRecord) {
          // Get the clip created during this imitation phase (most recent clip by this player)
          const latestClip = await videoStorage.getLatestClipByPlayerInLobby(player.id, lobbyId);
          clipId = latestClip?.id || null;
        }

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
          clipId,
          likes,
          dislikes,
          userVote: userVote?.vote_type as 'like' | 'dislike' | null
        });
      }

      if (isMounted) {
        console.log('Loaded imitations:', imitationsData);
        setImitations(imitationsData);
      }
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
          if (isMounted) loadImitations();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
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
        description: `Vote enregistré`,
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
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-foreground-secondary font-body">Chargement des imitations...</p>
      </div>
    );
  }

  if (hasVotedAll || currentIndex >= imitations.length) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-secondary/30 blur-2xl rounded-full animate-pulse" />
          <Trophy className="h-20 w-20 text-secondary relative" />
        </div>
        <h2 className="text-4xl font-display font-black text-gradient">
          Votes Terminés !
        </h2>
        <p className="text-foreground-secondary font-body">Calcul des résultats...</p>
      </div>
    );
  }

  const isOwnVideo = currentImitation.playerId === currentPlayer.id;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30">
          <Vote className="h-4 w-4 text-accent" />
          <span className="text-sm font-display uppercase tracking-wider text-accent">
            Phase de vote
          </span>
        </div>
        
        <h2 className="text-3xl font-display font-black text-gradient-purple">
          Votez !
        </h2>
        
        <p className="text-foreground-secondary font-body">
          Imitation <span className="font-display text-primary">{currentIndex + 1}</span>/{imitations.length}
        </p>
        
        <p className="text-sm text-foreground-muted">
          {currentPlayer.isHost ? "Contrôlez la lecture pour tous" : "L'hôte contrôle la lecture"}
        </p>
      </div>

      {/* Video Card */}
      <GameCard variant="highlight">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-display font-bold">
              {isOwnVideo ? (
                <span className="text-secondary">Votre imitation</span>
              ) : (
                currentImitation.playerName
              )}
            </h3>
            {isOwnVideo && (
              <p className="text-sm text-foreground-muted font-body mt-1">
                Vous ne pouvez pas voter pour vous-même
              </p>
            )}
          </div>

          {currentImitation.clipId ? (
            <div className="rounded-xl overflow-hidden border border-glass-border">
              <VideoWithAudioOverlay
                ref={videoRef}
                videoClipId={challengeVideoClipId}
                audioClipId={currentImitation.clipId}
                className="w-full"
                externalControl={true}
                isPlayingExternal={isPlayingSynced}
              />
            </div>
          ) : (
            <div className="aspect-video bg-background-secondary/30 rounded-xl flex items-center justify-center border border-glass-border">
              <p className="text-foreground-muted font-body">Aucun audio disponible</p>
            </div>
          )}

          {/* Host playback controls */}
          {currentPlayer.isHost && (
            <div className="flex justify-center">
              <Button
                onClick={handleTogglePlay}
                variant="outline"
                size="lg"
                disabled={!votingSessionId}
                className="gap-2"
              >
                {isPlayingSynced ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Lancer pour tous
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Voting buttons */}
          <div className="flex flex-col gap-4 items-center">
            {!isOwnVideo && !hasVotedCurrent && (
              <div className="flex gap-4 justify-center w-full max-w-md">
                <Button
                  onClick={() => handleVote('dislike')}
                  variant="outline"
                  size="lg"
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
                  disabled={!votingSessionId}
                >
                  <ThumbsDown className="h-6 w-6" />
                  Dislike
                </Button>
                <Button
                  onClick={() => handleVote('like')}
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  disabled={!votingSessionId}
                >
                  <ThumbsUp className="h-6 w-6" />
                  Like
                </Button>
              </div>
            )}

            {(hasVotedCurrent || isOwnVideo) && !currentPlayer.isHost && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/30">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-success font-body text-sm">
                  {isOwnVideo ? "Votre imitation" : "Vote enregistré"} — En attente de l'hôte
                </span>
              </div>
            )}

            {currentPlayer.isHost && (
              <Button
                onClick={handleNext}
                variant="hero"
                size="lg"
                disabled={!votingSessionId}
                className="gap-2"
              >
                Suivant
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </GameCard>

      {/* Progress indicator */}
      <div className="flex gap-2 justify-center">
        {imitations.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index < currentIndex
                ? "w-8 bg-success"
                : index === currentIndex
                ? "w-12 bg-primary animate-pulse shadow-neon"
                : "w-8 bg-background-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
};