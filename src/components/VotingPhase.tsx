import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { VideoWithAudioOverlay, VideoWithAudioOverlayRef } from "@/components/VideoWithAudioOverlay";
import { TeamVideoOverlay, TeamVideoOverlayRef } from "@/components/TeamVideoOverlay";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { ThumbsUp, ThumbsDown, Trophy, Play, Pause, Vote, ChevronRight, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { emitXpGain } from "@/components/XpGainPopup";
import { emitLevelUpNotification } from "@/components/RewardNotification";
import { usePlayerLevel, XP_REWARDS } from "@/hooks/usePlayerLevel";
interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Team {
  teamNumber: number;
  players: { id: string; name: string }[];
}

interface VotingPhaseProps {
  lobbyId: string;
  roundNumber: number;
  currentPlayer: Player;
  players: Player[];
  challengeVideoClipId: string;
  gameMode?: 'normal' | '2v2' | 'quiz';
  teams?: Team[];
  onVotingComplete: () => void;
}

interface ImitationWithClip {
  playerId: string;
  playerName: string;
  clipId: string | null;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  includeOriginalAudio: boolean;
  originalAudioVolume: number;
}

interface TeamImitation {
  teamNumber: number;
  players: { id: string; name: string }[];
  clipIds: (string | null)[];
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  includeOriginalAudio: boolean;
  originalAudioVolume: number;
}

export const VotingPhase = ({
  lobbyId,
  roundNumber,
  currentPlayer,
  players,
  challengeVideoClipId,
  gameMode = 'normal',
  teams = [],
  onVotingComplete
}: VotingPhaseProps) => {
  const [imitations, setImitations] = useState<ImitationWithClip[]>([]);
  const [teamImitations, setTeamImitations] = useState<TeamImitation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasVotedAll, setHasVotedAll] = useState(false);
  const [votingSessionId, setVotingSessionId] = useState<string | null>(null);
  const [isPlayingSynced, setIsPlayingSynced] = useState(false);
  const [hasVotedCurrent, setHasVotedCurrent] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const { toast } = useToast();
  const { pause, play, setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();
  const videoRef = useRef<VideoWithAudioOverlayRef>(null);
  const teamVideoRef = useRef<TeamVideoOverlayRef>(null);
  const { playSound } = useSoundEffects();
  const { addXp } = usePlayerLevel();

  // Determine what to show based on game mode
  const displayItems = gameMode === '2v2' ? teamImitations : imitations;
  const totalItems = displayItems.length;

  // Switch music to "voting" situation (tense theme) during voting phase.
  // When autoMode is OFF, fall back to pausing the music entirely.
  useEffect(() => {
    if (autoMode) {
      setSituation("voting", { priority: 2, source: "voting-phase" });
    } else {
      pause();
    }
    return () => {
      if (autoMode) {
        clearSituationOverride("voting-phase");
      } else {
        play();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [votingSessionId]);

  // Check for voting completion - separate effect to handle both modes
  useEffect(() => {
    const totalItems = gameMode === '2v2' ? teamImitations.length : imitations.length;
    if (currentIndex >= totalItems && totalItems > 0) {
      setHasVotedAll(true);
      setTimeout(() => {
        onVotingComplete();
      }, 2000);
    }
  }, [currentIndex, gameMode, teamImitations.length, imitations.length, onVotingComplete]);

  // Load imitations and their clips - using round_number for accurate tracking
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;
    
    const loadImitations = async (retryCount = 0) => {
      const imitationsData: ImitationWithClip[] = [];
      
      // Get the imitation records for this round to find the correct clips
      const { data: imitationRecords } = await supabase
        .from('player_imitations')
        .select('player_id, player_name, created_at, include_original_audio, original_audio_volume')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber)
        .eq('is_ready', true);

      console.log(`Loading imitations for round ${roundNumber}:`, imitationRecords);
      
      // Process all players in parallel for faster loading
      const playerPromises = players.map(async (player) => {
        // Find if player submitted an imitation for this round
        const imitationRecord = imitationRecords?.find(r => r.player_id === player.id);
        
        let clipId: string | null = null;
        const includeOriginalAudio = (imitationRecord as any)?.include_original_audio ?? false;
        const originalAudioVolume = (imitationRecord as any)?.original_audio_volume ?? 50;
        
        if (imitationRecord) {
          // First try to get clip by round_number (most accurate)
          const roundClip = await videoStorage.getClipByPlayerAndRound(player.id, lobbyId, roundNumber);
          
          if (roundClip) {
            clipId = roundClip.id;
            console.log(`Found clip for player ${player.name} by round: ${clipId}`);
          } else {
            // Fallback: Get clip created around the imitation time
            const imitationTime = new Date(imitationRecord.created_at);
            const searchTime = new Date(imitationTime.getTime() - 10 * 60 * 1000);
            const timeClip = await videoStorage.getClipByPlayerAfterTime(player.id, lobbyId, searchTime);
            
            if (timeClip) {
              clipId = timeClip.id;
              console.log(`Found clip for player ${player.name} by time: ${clipId}`);
            } else {
              // Last resort: get latest clip
              const latestClip = await videoStorage.getLatestClipByPlayerInLobby(player.id, lobbyId);
              clipId = latestClip?.id || null;
              console.log(`Fallback clip for player ${player.name}: ${clipId}`);
            }
          }
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

        return {
          playerId: player.id,
          playerName: player.name,
          clipId,
          likes,
          dislikes,
          userVote: userVote?.vote_type as 'like' | 'dislike' | null,
          includeOriginalAudio,
          originalAudioVolume
        };
      });

      const results = await Promise.all(playerPromises);
      imitationsData.push(...results);

      if (isMounted) {
        // Check if any imitations with records are missing clips - retry if so
        const hasMissingClips = imitationsData.some(im => {
          const hasRecord = imitationRecords?.some(r => r.player_id === im.playerId);
          return hasRecord && !im.clipId;
        });

        if (hasMissingClips && retryCount < 5) {
          console.log(`Retrying imitations load (attempt ${retryCount + 1}) - missing clips detected`);
          retryTimeout = setTimeout(() => loadImitations(retryCount + 1), 1500);
          return;
        }

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
      if (retryTimeout) clearTimeout(retryTimeout);
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber, players, currentPlayer.id]);

  // Group imitations by team for 2v2 mode
  useEffect(() => {
    if (gameMode !== '2v2' || teams.length === 0 || imitations.length === 0) {
      setTeamImitations([]);
      return;
    }

    const grouped: TeamImitation[] = teams.map(team => {
      const teamPlayers = team.players;
      const teamImitationsData = teamPlayers.map(p => 
        imitations.find(im => im.playerId === p.id)
      );
      
      // Calculate team votes (sum of both players)
      const totalLikes = teamImitationsData.reduce((sum, im) => sum + (im?.likes || 0), 0);
      const totalDislikes = teamImitationsData.reduce((sum, im) => sum + (im?.dislikes || 0), 0);
      
      // Check if current player voted for any team member
      const userVote = teamImitationsData.find(im => im?.userVote)?.userVote || null;
      
      // Use first player's audio settings
      const firstImitation = teamImitationsData[0];
      
      return {
        teamNumber: team.teamNumber,
        players: teamPlayers,
        clipIds: teamImitationsData.map(im => im?.clipId || null),
        likes: totalLikes,
        dislikes: totalDislikes,
        userVote,
        includeOriginalAudio: firstImitation?.includeOriginalAudio ?? false,
        originalAudioVolume: firstImitation?.originalAudioVolume ?? 50,
      };
    }).filter(team => team.clipIds.some(id => id !== null)); // Only show teams with at least one clip

    setTeamImitations(grouped);
  }, [gameMode, teams, imitations]);

  // Reset hasVotedCurrent when index changes
  useEffect(() => {
    setHasVotedCurrent(false);
  }, [currentIndex]);

  const handleVote = async (voteType: 'like' | 'dislike') => {
    // Award XP for voting
    const xpResult = await addXp('voteLike');
    emitXpGain(XP_REWARDS.voteLike, 'voteLike');
    if (xpResult?.leveledUp) {
      emitLevelUpNotification(xpResult.newLevel);
    }

    if (gameMode === '2v2') {
      // Vote for team
      const currentTeam = teamImitations[currentIndex];
      if (!currentTeam) return;
      
      // Check if current player is in this team
      const isOwnTeam = currentTeam.players.some(p => p.id === currentPlayer.id);
      if (isOwnTeam) {
        setHasVotedCurrent(true);
        return;
      }

      try {
        playSound('vote');
        
        // Vote for all team members
        for (const player of currentTeam.players) {
          await supabase
            .from('imitation_votes')
            .upsert({
              lobby_id: lobbyId,
              round_number: roundNumber,
              imitation_player_id: player.id,
              voter_player_id: currentPlayer.id,
              vote_type: voteType
            });
        }

        toast({
          title: voteType === 'like' ? "👍 Like !" : "👎 Dislike",
          description: `Vote pour l'équipe enregistré`,
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
      return;
    }

    // Normal mode voting
    const currentImitation = imitations[currentIndex];
    if (!currentImitation || currentImitation.playerId === currentPlayer.id) {
      setHasVotedCurrent(true);
      return;
    }

    try {
      playSound('vote');
      
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

  // Host controls play/pause for everyone - with countdown
  const handleTogglePlay = async () => {
    if (!votingSessionId || !currentPlayer.isHost) return;

    if (!isPlayingSynced) {
      // Starting playback - show countdown for all
      setPendingPlay(true);
      
      // Broadcast countdown start to all players
      await supabase.channel(`countdown:${lobbyId}:${roundNumber}`).send({
        type: 'broadcast',
        event: 'countdown_start',
        payload: { startTime: Date.now() }
      });
      
      setShowCountdown(true);
    } else {
      // Pausing - no countdown needed
      const { error } = await supabase
        .from('voting_session')
        .update({ 
          is_playing: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', votingSessionId);

      if (error) {
        console.error('Error updating play state:', error);
      }
    }
  };

  // Handle countdown completion
  const handleCountdownComplete = async () => {
    setShowCountdown(false);
    setPendingPlay(false);
    
    if (currentPlayer.isHost && votingSessionId) {
      const { error } = await supabase
        .from('voting_session')
        .update({ 
          is_playing: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', votingSessionId);

      if (error) {
        console.error('Error updating play state:', error);
      }
    }
  };

  // Listen for countdown broadcasts (for non-host players)
  useEffect(() => {
    if (!lobbyId || currentPlayer.isHost) return;

    const channel = supabase
      .channel(`countdown:${lobbyId}:${roundNumber}`)
      .on('broadcast', { event: 'countdown_start' }, () => {
        setShowCountdown(true);
        setPendingPlay(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber, currentPlayer.isHost]);

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
  const currentTeamImitation = gameMode === '2v2' ? teamImitations[currentIndex] : null;
  const displayLength = gameMode === '2v2' ? teamImitations.length : imitations.length;

  // Loading state
  if ((gameMode === 'normal' && (!currentImitation || imitations.length === 0)) ||
      (gameMode === '2v2' && teamImitations.length === 0)) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-foreground-secondary font-body">Chargement des imitations...</p>
      </div>
    );
  }

  // Completed state
  if (hasVotedAll || currentIndex >= displayLength) {
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

  // Determine if it's own video/team
  const isOwnVideo = gameMode === '2v2' 
    ? currentTeamImitation?.players.some(p => p.id === currentPlayer.id) ?? false
    : currentImitation?.playerId === currentPlayer.id;

  return (
    <>
      {/* Countdown overlay for synchronized video start */}
      <CountdownOverlay 
        isActive={showCountdown}
        onComplete={handleCountdownComplete}
        duration={3}
        title="La vidéo commence dans..."
      />

      <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30">
          <Vote className="h-4 w-4 text-accent" />
          <span className="text-sm font-display uppercase tracking-wider text-accent">
            Phase de vote {gameMode === '2v2' && '• 2v2'}
          </span>
        </div>
        
        <h2 className="text-3xl font-display font-black text-gradient-purple">
          Votez {gameMode === '2v2' && 'pour les équipes'} !
        </h2>
        
        <p className="text-foreground-secondary font-body">
          {gameMode === '2v2' ? 'Équipe' : 'Imitation'} <span className="font-display text-primary">{currentIndex + 1}</span>/{displayLength}
        </p>
        
        <p className="text-sm text-foreground-muted">
          {currentPlayer.isHost ? "Contrôlez la lecture pour tous" : "L'hôte contrôle la lecture"}
        </p>
      </div>

      {/* Video Card */}
      <GameCard variant="highlight">
        <div className="space-y-6">
          {/* Header - Different for team vs individual */}
          {gameMode === '2v2' && currentTeamImitation ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-4">
                {currentTeamImitation.players.map((player, idx) => (
                  <div key={player.id} className="flex flex-col items-center gap-1">
                    <PlayerAvatar
                      playerId={player.id}
                      playerName={player.name}
                      size="lg"
                    />
                    <span className="text-sm font-medium">{player.name}</span>
                    {idx === 0 && currentTeamImitation.players.length > 1 && (
                      <span className="text-secondary font-bold">+</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Swords className="h-5 w-5 text-secondary" />
                <h3 className="text-2xl font-display font-bold text-secondary">
                  {isOwnVideo ? "Votre équipe" : `Équipe ${currentTeamImitation.teamNumber}`}
                </h3>
              </div>
              {isOwnVideo && (
                <p className="text-sm text-foreground-muted font-body">
                  Vous ne pouvez pas voter pour votre équipe
                </p>
              )}
            </div>
          ) : currentImitation ? (
            <div className="text-center flex flex-col items-center gap-3">
              <PlayerAvatar
                playerId={currentImitation.playerId}
                playerName={currentImitation.playerName}
                size="lg"
              />
              <h3 className="text-2xl font-display font-bold">
                {isOwnVideo ? (
                  <span className="text-secondary">Votre imitation</span>
                ) : (
                  currentImitation.playerName
                )}
              </h3>
              {isOwnVideo && (
                <p className="text-sm text-foreground-muted font-body">
                  Vous ne pouvez pas voter pour vous-même
                </p>
              )}
            </div>
          ) : null}

          {/* Video player - Team or Individual */}
          {gameMode === '2v2' && currentTeamImitation ? (
            currentTeamImitation.clipIds[0] ? (
              <div className="rounded-xl overflow-hidden border border-glass-border">
                <TeamVideoOverlay
                  ref={teamVideoRef}
                  videoClipId={challengeVideoClipId}
                  audioClipId1={currentTeamImitation.clipIds[0]}
                  audioClipId2={currentTeamImitation.clipIds[1] || null}
                  className="w-full"
                  externalControl={true}
                  isPlayingExternal={isPlayingSynced}
                  includeOriginalAudio={currentTeamImitation.includeOriginalAudio}
                  originalAudioVolume={currentTeamImitation.originalAudioVolume}
                />
              </div>
            ) : (
              <div className="aspect-video bg-background-secondary/30 rounded-xl flex items-center justify-center border border-glass-border">
                <p className="text-foreground-muted font-body">Aucun audio d'équipe disponible</p>
              </div>
            )
          ) : currentImitation?.clipId ? (
            <div className="rounded-xl overflow-hidden border border-glass-border">
              <VideoWithAudioOverlay
                ref={videoRef}
                videoClipId={challengeVideoClipId}
                audioClipId={currentImitation.clipId}
                className="w-full"
                externalControl={true}
                isPlayingExternal={isPlayingSynced}
                includeOriginalAudio={currentImitation?.includeOriginalAudio ?? false}
                originalAudioVolume={currentImitation?.originalAudioVolume ?? 50}
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
    </>
  );
};
