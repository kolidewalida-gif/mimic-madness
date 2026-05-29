import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoWithAudioOverlay, VideoWithAudioOverlayRef } from "@/components/VideoWithAudioOverlay";
import { TeamVideoOverlay, TeamVideoOverlayRef } from "@/components/TeamVideoOverlay";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { ThumbsUp, ThumbsDown, Trophy, Play, Pause, ChevronRight, Swords, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { emitXpGain } from "@/components/XpGainPopup";
import { emitLevelUpNotification } from "@/components/RewardNotification";
import { usePlayerLevel, XP_REWARDS } from "@/hooks/usePlayerLevel";
import { useQuestTracker } from "@/hooks/useQuestTracker";
import { juice, centerOf } from "@/lib/juice";
import { playInkSound } from "@/hooks/useInkSoundEffects";
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
  const [countdownStartAt, setCountdownStartAt] = useState<number | null>(null);
  const countdownChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const countdownReadyRef = useRef(false);
  const { toast } = useToast();
  const { pause, play, setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();
  const videoRef = useRef<VideoWithAudioOverlayRef>(null);
  const teamVideoRef = useRef<TeamVideoOverlayRef>(null);
  const { playSound } = useSoundEffects();
  const { addXp } = usePlayerLevel();
  const questTracker = useQuestTracker();

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
      if (currentPlayer.isHost) {
        setTimeout(() => {
          onVotingComplete();
        }, 2000);
      }
    }
  }, [currentIndex, gameMode, teamImitations.length, imitations.length, onVotingComplete, currentPlayer.isHost]);

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

  // Reset hasVotedCurrent when index changes — derive from loaded data
  useEffect(() => {
    const current = gameMode === '2v2' ? teamImitations[currentIndex] : imitations[currentIndex];
    setHasVotedCurrent(!!current?.userVote);
  }, [currentIndex, imitations, teamImitations, gameMode]);

  const handleVote = async (voteType: 'like' | 'dislike', evt?: React.MouseEvent) => {
    // Guards FIRST — block self-vote before any side effects (XP, juice)
    if (gameMode === '2v2') {
      const currentTeam = teamImitations[currentIndex];
      if (!currentTeam) return;
      if (currentTeam.players.some(p => p.id === currentPlayer.id)) return;
    } else {
      const currentImitation = imitations[currentIndex];
      if (!currentImitation || currentImitation.playerId === currentPlayer.id) return;
    }
    if (hasVotedCurrent) return;

    // Juice — instant haptic-style feedback
    const origin = centerOf(evt?.currentTarget ?? null);
    if (origin) {
      juice.burst({
        x: origin.x,
        y: origin.y,
        color: voteType === 'like' ? 'hsl(140 70% 55%)' : 'hsl(0 84% 60%)',
        intensity: voteType === 'like' ? 1.2 : 0.9,
      });
      juice.pop(evt!.currentTarget as HTMLElement, voteType === 'like' ? 1.18 : 1.1);
    }
    if (voteType === 'like') {
      juice.flash('success', 180);
    } else {
      juice.shake(160, 0.7);
    }

    // Award XP only after guards pass
    const xpResult = await addXp('voteLike');
    emitXpGain(XP_REWARDS.voteLike, 'voteLike');
    if (xpResult?.leveledUp) {
      emitLevelUpNotification(xpResult.newLevel);
    }
    void questTracker.track('vote_imitation');

    if (gameMode === '2v2') {
      const currentTeam = teamImitations[currentIndex];
      try {
        playSound('vote');
        await Promise.all(currentTeam.players.map((player) =>
          supabase.from('imitation_votes').upsert({
            lobby_id: lobbyId,
            round_number: roundNumber,
            imitation_player_id: player.id,
            voter_player_id: currentPlayer.id,
            vote_type: voteType
          }, { onConflict: 'lobby_id,round_number,imitation_player_id,voter_player_id' })
        ));
        toast({ title: voteType === 'like' ? "👍 Like !" : "👎 Dislike", description: "Vote pour l'équipe enregistré" });
        setHasVotedCurrent(true);
      } catch (error) {
        console.error('Error voting:', error);
        toast({ title: "Erreur", description: "Impossible d'enregistrer le vote", variant: "destructive" });
      }
      return;
    }

    // Normal mode
    const currentImitation = imitations[currentIndex];
    try {
      playSound('vote');
      const { error } = await supabase.from('imitation_votes').upsert({
        lobby_id: lobbyId,
        round_number: roundNumber,
        imitation_player_id: currentImitation.playerId,
        voter_player_id: currentPlayer.id,
        vote_type: voteType
      }, { onConflict: 'lobby_id,round_number,imitation_player_id,voter_player_id' });
      if (error) throw error;
      toast({ title: voteType === 'like' ? "👍 Like !" : "👎 Dislike", description: "Vote enregistré" });
      setHasVotedCurrent(true);
    } catch (error) {
      console.error('Error voting:', error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer le vote", variant: "destructive" });
    }
  };

  // Host controls play/pause for everyone - with countdown
  const handleTogglePlay = async () => {
    if (!votingSessionId || !currentPlayer.isHost) return;
    if (pendingPlay || showCountdown) return;

    if (!isPlayingSynced) {
      // Starting playback - show countdown for all, synchronized via wall-clock startAt.
      // Generous 800ms buffer covers typical broadcast latency (50-300ms) + jitter so
      // every client receives the event before startAt and aligns its countdown.
      // The host listens to its OWN broadcast (self:true) instead of starting the
      // countdown locally, guaranteeing all clients start from the same wall-clock moment.
      const startAt = Date.now() + 800;

      const ch = countdownChannelRef.current;
      if (ch && countdownReadyRef.current) {
        ch.send({
          type: 'broadcast',
          event: 'countdown_start',
          payload: { startAt },
        });
      } else {
        // Fallback: channel not ready, just start locally
        setPendingPlay(true);
        setCountdownStartAt(startAt);
        setShowCountdown(true);
      }
    } else {
      // Pausing - broadcast immediately so all clients pause in sync, then persist.
      const ch = countdownChannelRef.current;
      if (ch && countdownReadyRef.current) {
        ch.send({
          type: 'broadcast',
          event: 'force_pause',
          payload: { at: Date.now() },
        });
      }
      setIsPlayingSynced(false);
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

  // Handle countdown completion - every client (host included) drives its own
  // playback start locally, instead of waiting for a postgres roundtrip. The host
  // also persists is_playing=true for late joiners and resync.
  const handleCountdownComplete = async () => {
    setShowCountdown(false);
    setPendingPlay(false);
    setCountdownStartAt(null);
    // Each client triggers play locally — no DB latency.
    setIsPlayingSynced(true);

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

  // Persistent countdown broadcast channel — created once per round and pre-subscribed
  // so that .send() / receive happens instantly (no per-click handshake latency).
  // self:true so the HOST also receives its own broadcast and starts the countdown
  // at the same wall-clock moment as guests (eliminates host-vs-guest desync).
  useEffect(() => {
    if (!lobbyId) return;

    countdownReadyRef.current = false;
    const channel = supabase
      .channel(`countdown:${lobbyId}:${roundNumber}`, {
        config: { broadcast: { self: true, ack: false } },
      })
      .on('broadcast', { event: 'countdown_start' }, (msg) => {
        const startAt: number | undefined = msg?.payload?.startAt;
        setCountdownStartAt(startAt ?? Date.now());
        setShowCountdown(true);
        setPendingPlay(true);
      })
      .on('broadcast', { event: 'force_pause' }, () => {
        // All clients pause locally on broadcast — no DB roundtrip latency.
        setIsPlayingSynced(false);
        setShowCountdown(false);
        setPendingPlay(false);
        setCountdownStartAt(null);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          countdownReadyRef.current = true;
        }
      });

    countdownChannelRef.current = channel;

    return () => {
      countdownReadyRef.current = false;
      countdownChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber]);

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
    <div className="h-[100dvh] text-white relative overflow-hidden flex flex-col" style={{ background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity }}
          className="absolute top-[-5%] left-[15%] w-[450px] h-[450px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #f8717155, transparent 70%)", filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[12%] right-[6%] w-5 h-5 text-amber-400/30" />
        <Zap className="absolute bottom-[25%] left-[4%] w-4 h-4 text-pink-400/25" />
      </div>

      {/* Countdown overlay */}
      <CountdownOverlay isActive={showCountdown} onComplete={handleCountdownComplete} duration={3}
        title="La vidéo commence dans..." startAt={countdownStartAt ?? undefined} />

      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full px-4 py-5 pb-[120px] space-y-5">
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -2 }}
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "linear-gradient(180deg, #f87171, #ef4444)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
            <span className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: "1.5px 1.5px 0 #0a0810" }}>
              ⚡ Phase de vote {gameMode === '2v2' && '· 2v2'}
            </span>
          </motion.div>
          <h2 className="text-5xl font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810" }}>
            Votez {gameMode === '2v2' && 'pour les équipes'} !
          </h2>
          <p className="text-sm text-white/60" style={{ fontFamily: "'Caveat', cursive" }}>
            {gameMode === '2v2' ? 'Équipe' : 'Imitation'}{' '}
            <span className="font-black text-red-400">{currentIndex + 1}</span>/{displayLength}
          </p>
        </div>

        {/* Video card */}
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 22 }}
          className="relative rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(180deg, #1a0d2e, #0f0820)", border: "4px solid #0a0810", boxShadow: "0 8px 0 #0a0810, 0 0 30px rgba(248,113,113,0.2)" }}>
          <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: "2px solid rgba(248,113,113,0.3)" }} />
          <Sparkles className="absolute top-3 left-4 w-4 h-4 text-amber-400 z-10" style={{ filter: "drop-shadow(1px 1px 0 #0a0810)" }} />

          <div className="relative p-5 space-y-4">
            {/* Player/team name */}
            <div className="text-center">
              {gameMode === '2v2' && currentTeamImitation ? (
                <div className="space-y-2">
                  <div className="flex justify-center items-center gap-3">
                    {currentTeamImitation.players.map((p) => (
                      <div key={p.id} className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", border: "3px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
                          <span className="text-xl font-black text-white" style={{ fontFamily: "'Caveat', cursive" }}>{p.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-black text-white" style={{ fontFamily: "'Caveat', cursive" }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Swords className="w-4 h-4 text-red-400" />
                    <h3 className="text-2xl font-black text-red-400" style={{ fontFamily: "'Caveat', cursive", textShadow: "1.5px 1.5px 0 #0a0810" }}>
                      {isOwnVideo ? "Votre équipe" : `Équipe ${currentTeamImitation.teamNumber}`}
                    </h3>
                  </div>
                </div>
              ) : currentImitation ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
                    <span className="text-2xl font-black text-white" style={{ fontFamily: "'Caveat', cursive" }}>{currentImitation.playerName[0]?.toUpperCase()}</span>
                  </div>
                  <h3 className="text-2xl font-black" style={{ fontFamily: "'Caveat', cursive", color: isOwnVideo ? "#34d399" : "white", textShadow: "1.5px 1.5px 0 #0a0810" }}>
                    {isOwnVideo ? "Votre imitation" : currentImitation.playerName}
                  </h3>
                  {isOwnVideo && <p className="text-sm text-white/50" style={{ fontFamily: "'Caveat', cursive" }}>Vous ne pouvez pas voter pour vous-même</p>}
                </div>
              ) : null}
            </div>

            {/* Video */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
              {gameMode === '2v2' && currentTeamImitation?.clipIds[0] ? (
                <TeamVideoOverlay ref={teamVideoRef} videoClipId={challengeVideoClipId}
                  audioClipId1={currentTeamImitation.clipIds[0]} audioClipId2={currentTeamImitation.clipIds[1] || null}
                  className="w-full" externalControl isPlayingExternal={isPlayingSynced}
                  includeOriginalAudio={currentTeamImitation.includeOriginalAudio} originalAudioVolume={currentTeamImitation.originalAudioVolume} />
              ) : currentImitation?.clipId ? (
                <VideoWithAudioOverlay ref={videoRef} videoClipId={challengeVideoClipId} audioClipId={currentImitation.clipId}
                  className="w-full" externalControl isPlayingExternal={isPlayingSynced}
                  includeOriginalAudio={currentImitation?.includeOriginalAudio ?? false} originalAudioVolume={currentImitation?.originalAudioVolume ?? 50} />
              ) : (
                <div className="aspect-video flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <p className="text-white/50 font-bold" style={{ fontFamily: "'Caveat', cursive" }}>Aucun audio disponible</p>
                </div>
              )}
            </div>

            {/* Host play control */}
            {currentPlayer.isHost && (
              <div className="flex justify-center">
                <motion.button onClick={handleTogglePlay} disabled={!votingSessionId || pendingPlay || showCountdown}
                  whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl disabled:opacity-50"
                  style={{ background: isPlayingSynced ? "linear-gradient(180deg, #6b7280, #4b5563)" : "linear-gradient(180deg, #a855f7, #7c3aed)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.2)" }}>
                  {isPlayingSynced ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                  <span className="text-lg font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: "1.5px 1.5px 0 #0a0810" }}>
                    {isPlayingSynced ? "Pause" : "Lancer pour tous 🎬"}
                  </span>
                </motion.button>
              </div>
            )}

            {/* Vote buttons */}
            <div className="flex flex-col gap-3 items-center">
              {!isOwnVideo && !hasVotedCurrent && (
                <div className="flex gap-4 w-full max-w-sm">
                  <motion.button onClick={(e) => handleVote('dislike', e)} disabled={!votingSessionId}
                    whileHover={{ scale: 1.05, rotate: 2 }} whileTap={{ scale: 0.95 }}
                    className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(180deg, #ef4444, #b91c1c)", border: "3px solid #0a0810", boxShadow: "0 5px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.2)" }}>
                    <ThumbsDown className="w-6 h-6 text-white" />
                    <span className="text-xl font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: "1.5px 1.5px 0 #0a0810" }}>Bof</span>
                  </motion.button>
                  <motion.button onClick={(e) => handleVote('like', e)} disabled={!votingSessionId}
                    whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.95 }}
                    className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(180deg, #34d399, #059669)", border: "3px solid #0a0810", boxShadow: "0 5px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.2)" }}>
                    <ThumbsUp className="w-6 h-6 text-white" />
                    <span className="text-xl font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: "1.5px 1.5px 0 #0a0810" }}>Top !</span>
                  </motion.button>
                </div>
              )}

              {(hasVotedCurrent || isOwnVideo) && !currentPlayer.isHost && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(52,211,153,0.12)", border: "2.5px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-black text-emerald-300" style={{ fontFamily: "'Caveat', cursive" }}>
                    {isOwnVideo ? "Votre imitation" : "Vote enregistré"} — En attente de l'hôte
                  </span>
                </div>
              )}

              {currentPlayer.isHost && (
                <motion.button onClick={handleNext} disabled={!votingSessionId}
                  whileHover={{ scale: 1.05, rotate: -1 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl disabled:opacity-50"
                  style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)" }}>
                  <span className="text-xl font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: "1.5px 1.5px 0 #0a0810" }}>Suivant</span>
                  <ChevronRight className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Progress dots */}
        <div className="flex gap-2 justify-center">
          {Array.from({ length: displayLength }).map((_, i) => (
            <motion.div key={i} animate={{ scale: i === currentIndex ? 1.3 : 1 }}
              className="h-2.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 32 : 20,
                background: i < currentIndex ? "#34d399" : i === currentIndex ? "#f87171" : "rgba(255,255,255,0.15)",
                border: "1.5px solid #0a0810",
                boxShadow: i === currentIndex ? "0 0 8px rgba(248,113,113,0.6)" : "none",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
};
