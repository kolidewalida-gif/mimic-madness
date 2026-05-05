import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { reverseAudioBufferWithInfo } from '@/lib/audioReverser';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneRound {
  id: string;
  lobby_id: string;
  round_number: number;
  phase: 'instructions' | 'recording' | 'listening' | 'reveal' | 'finished';
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
  transcribed_text: string | null;
  duration_seconds: number;
}

interface UseAudioPhoneGameProps {
  lobbyId: string;
  currentPlayer: Player;
  players: Player[];
}

// All backend reads/writes go through the Supabase client (avoids manual REST headers/env issues).

interface UploadError {
  timestamp: Date;
  message: string;
  details?: string;
}

export const useAudioPhoneGame = ({ lobbyId, currentPlayer, players }: UseAudioPhoneGameProps) => {
  const [currentRound, setCurrentRound] = useState<AudioPhoneRound | null>(null);
  const [recordings, setRecordings] = useState<AudioPhoneRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentReversedAudioUrl, setCurrentReversedAudioUrl] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentRoundIdRef = useRef<string | null>(null);

  // Fetch current round and recordings
  const fetchGameState = useCallback(async () => {
    try {
      const { data: round, error: roundError } = await supabase
        .from('audio_phone_rounds')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roundError) throw roundError;

      if (round) {
        setCurrentRound(round as unknown as AudioPhoneRound);

        const { data: recordingsData, error: recordingsError } = await supabase
          .from('audio_phone_recordings')
          .select('*')
          .eq('round_id', round.id)
          .order('player_order_index', { ascending: true });

        if (recordingsError) throw recordingsError;

        if (recordingsData && Array.isArray(recordingsData)) {
          setRecordings(recordingsData as unknown as AudioPhoneRecording[]);
        } else {
          setRecordings([]);
        }
      } else {
        setCurrentRound(null);
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lobbyId]);

  // Initialize game and refresh when component mounts
  useEffect(() => {
    fetchGameState();
    
    // Also set up an interval to periodically refresh state as backup
    const interval = setInterval(() => {
      fetchGameState();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchGameState]);

  // Keep the latest round id in a ref for realtime callbacks
  useEffect(() => {
    currentRoundIdRef.current = currentRound?.id ?? null;
  }, [currentRound?.id]);

  // Subscribe to realtime updates - using a stable channel name
  useEffect(() => {
    if (!lobbyId) return;

    console.log('[AudioPhone] Setting up realtime subscription for lobby:', lobbyId);

    const channel = supabase
      .channel(`audio-phone-sync:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audio_phone_rounds',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload) => {
          console.log('[AudioPhone] Round update received:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRound = payload.new as unknown as AudioPhoneRound;
            
            setCurrentRound(prev => {
              // Only update if we have new data
              if (!prev || prev.id !== newRound.id || 
                  prev.phase !== newRound.phase || 
                  prev.current_player_index !== newRound.current_player_index) {
                
                // Notify player when it's their turn
                if (newRound.phase === 'recording' || newRound.phase === 'listening') {
                  const currentTurnPlayerId = newRound.player_order[newRound.current_player_index];
                  if (currentTurnPlayerId === currentPlayer.id) {
                    playSoundEffect('notifyInfo', 0.6);
                    toast({
                      title: "C'est votre tour !",
                      description: newRound.phase === 'recording' 
                        ? "Enregistrez votre phrase" 
                        : "Écoutez et reproduisez !",
                    });
                  }
                }

                // Play sound on phase changes
                if (prev && prev.phase !== newRound.phase) {
                  if (newRound.phase === 'reveal') {
                    playSoundEffect('quizReveal', 0.5);
                  } else if (newRound.phase === 'recording') {
                    playSoundEffect('start', 0.4);
                  }
                }
                
                return newRound;
              }
              return prev;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audio_phone_recordings'
        },
        (payload) => {
          console.log('[AudioPhone] Recording update received:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            const newRecording = payload.new as unknown as AudioPhoneRecording;

            const activeRoundId = currentRoundIdRef.current;
            if (activeRoundId && newRecording.round_id !== activeRoundId) return;

            setRecordings(prev => {
              // Avoid duplicates
              if (prev.some(r => r.id === newRecording.id)) {
                return prev;
              }
              return [...prev, newRecording].sort((a, b) => a.player_order_index - b.player_order_index);
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[AudioPhone] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[AudioPhone] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [lobbyId, currentPlayer.id, toast]);

  // Start a new game
  const startGame = useCallback(async () => {
    try {
      setIsLoading(true);

      // Shuffle players randomly
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const playerOrder = shuffledPlayers.map(p => p.id);

      const { data, error } = await supabase
        .from('audio_phone_rounds')
        .insert({
          lobby_id: lobbyId,
          round_number: (currentRound?.round_number || 0) + 1,
          phase: 'instructions',
          current_player_index: 0,
          player_order: playerOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentRound(data as unknown as AudioPhoneRound);
      setRecordings([]);
      playSoundEffect('start', 0.5);
      
      toast({
        title: "Nouvelle partie !",
        description: "Audio Phone commence. Préparez-vous !",
      });

    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la partie",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [lobbyId, players, currentRound?.round_number, toast]);

  // Start recording phase (host only)
  const startRecordingPhase = useCallback(async () => {
    if (!currentRound) return;

    try {
      const { error } = await supabase
        .from('audio_phone_rounds')
        .update({ phase: 'recording' })
        .eq('id', currentRound.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error starting recording phase:', error);
    }
  }, [currentRound]);

  // Submit recording
  const submitRecording = useCallback(async (
    audioBlob: Blob,
    originalPhrase?: string
  ): Promise<boolean> => {
    if (!currentRound) return false;

    const extFromMime = (mime: string | undefined) => {
      const m = (mime || '').toLowerCase();
      if (m.includes('webm')) return 'webm';
      if (m.includes('ogg')) return 'ogg';
      if (m.includes('mp4')) return 'm4a';
      if (m.includes('wav')) return 'wav';
      // default to webm (most compatible with our pipeline) instead of a generic extension
      return 'webm';
    };

    try {
      setIsSubmitting(true);

      // Reverse the audio (also provides a reliable duration)
      let reversedBlob: Blob;
      let duration = 0;

      try {
        const result = await reverseAudioBufferWithInfo(audioBlob);
        reversedBlob = result.reversedBlob;
        duration = result.durationSeconds;
      } catch (e) {
        console.error('Error reversing audio:', e);
        toast({
          title: "Audio non supporté",
          description: "Votre navigateur ne supporte pas l'inversion audio. Essayez Chrome/Edge.",
          variant: "destructive",
        });
        return false;
      }

      // Generate unique file paths
      const timestamp = Date.now();
      const originalExt = extFromMime(audioBlob.type);
      const originalPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_original.${originalExt}`;
      const reversedPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_reversed.wav`;

      // Upload original audio
      const { error: originalUploadError } = await supabase.storage
        .from('audio-phone')
        .upload(originalPath, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          upsert: true,
        });

      if (originalUploadError) throw originalUploadError;

      // Upload reversed audio
      const { error: reversedUploadError } = await supabase.storage
        .from('audio-phone')
        .upload(reversedPath, reversedBlob, {
          contentType: 'audio/wav',
          upsert: true,
        });

      if (reversedUploadError) {
        // Clean up original if reversed upload fails
        await supabase.storage.from('audio-phone').remove([originalPath]);
        throw reversedUploadError;
      }

      // Save recording to database
      const { error: insertError } = await supabase
        .from('audio_phone_recordings')
        .insert({
          round_id: currentRound.id,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          player_order_index: currentRound.current_player_index,
          storage_path: originalPath,
          reversed_storage_path: reversedPath,
          duration_seconds: duration,
        });

      if (insertError) {
        // Clean up uploaded files if DB insert fails
        await supabase.storage.from('audio-phone').remove([originalPath, reversedPath]);
        throw insertError;
      }

      // If this is the first player, save the original phrase
      if (currentRound.current_player_index === 0 && originalPhrase) {
        const { error: phraseError } = await supabase
          .from('audio_phone_rounds')
          .update({ original_phrase: originalPhrase })
          .eq('id', currentRound.id);

        if (phraseError) throw phraseError;
      }

      // Advance to next player or reveal phase
      const isLastPlayer =
        currentRound.current_player_index >= currentRound.player_order.length - 1;

      if (isLastPlayer) {
        const { error } = await supabase
          .from('audio_phone_rounds')
          .update({ phase: 'reveal' })
          .eq('id', currentRound.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('audio_phone_rounds')
          .update({
            current_player_index: currentRound.current_player_index + 1,
            phase: 'listening',
          })
          .eq('id', currentRound.id);

        if (error) throw error;
      }

      playSoundEffect('success', 0.5);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Erreur inconnue';
      const errorDetails = JSON.stringify({
        type: audioBlob.type,
        size: audioBlob.size,
        roundId: currentRound?.id?.slice(0, 8),
      });

      console.error('[AudioPhone] submitRecording failed', {
        error,
        audioType: audioBlob.type,
        audioSize: audioBlob.size,
        roundId: currentRound?.id,
        playerId: currentPlayer.id,
      });

      // Track the error for debug panel
      setUploadErrors(prev => [
        ...prev.slice(-9), // Keep last 10 errors
        {
          timestamp: new Date(),
          message: errorMessage,
          details: errorDetails,
        },
      ]);

      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'enregistrement. Réessayez.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [currentRound, currentPlayer, lobbyId, toast]);

  // Confirm listened and start recording
  const confirmListenedAndRecord = useCallback(async () => {
    if (!currentRound) return;

    try {
      const { error } = await supabase
        .from('audio_phone_rounds')
        .update({ phase: 'recording' })
        .eq('id', currentRound.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error confirming listened:', error);
    }
  }, [currentRound]);

  // Get current player's turn status
  const isMyTurn = useCallback(() => {
    if (!currentRound) return false;
    const currentTurnPlayerId = currentRound.player_order[currentRound.current_player_index];
    return currentTurnPlayerId === currentPlayer.id;
  }, [currentRound, currentPlayer.id]);

  // Get player info by ID
  const getPlayerById = useCallback((playerId: string): Player | undefined => {
    return players.find(p => p.id === playerId);
  }, [players]);

  // Get reversed audio URL for current player to listen
  // IMPORTANT: We fetch directly from DB instead of relying on local state
  // because the realtime update might not have arrived yet when switching phases
  const fetchReversedAudioForListening = useCallback(async () => {
    if (!currentRound || currentRound.current_player_index === 0) return null;

    const previousIndex = currentRound.current_player_index - 1;

    try {
      // Query DB directly for the previous player's recording
      const { data: previousRecording, error } = await supabase
        .from('audio_phone_recordings')
        .select('reversed_storage_path')
        .eq('round_id', currentRound.id)
        .eq('player_order_index', previousIndex)
        .maybeSingle();

      if (error) {
        console.error('[AudioPhone] Error fetching previous recording:', error);
        return null;
      }

      if (!previousRecording?.reversed_storage_path) {
        console.warn('[AudioPhone] No reversed audio found for player index:', previousIndex);
        return null;
      }

      const { data } = supabase.storage
        .from('audio-phone')
        .getPublicUrl(previousRecording.reversed_storage_path);

      console.log('[AudioPhone] Fetched reversed audio URL:', data.publicUrl);
      setCurrentReversedAudioUrl(data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('[AudioPhone] Error fetching reversed audio:', error);
      return null;
    }
  }, [currentRound]);

  // Get all recordings with audio URLs for reveal
  const getRecordingsWithUrls = useCallback(async () => {
    const recordingsWithUrls = await Promise.all(
      recordings.map(async (recording) => {
        const { data: originalData } = supabase.storage
          .from('audio-phone')
          .getPublicUrl(recording.storage_path);

        const reversedUrl = recording.reversed_storage_path 
          ? supabase.storage.from('audio-phone').getPublicUrl(recording.reversed_storage_path).data.publicUrl
          : null;

        return {
          ...recording,
          originalUrl: originalData.publicUrl,
          reversedUrl,
        };
      })
    );

    return recordingsWithUrls;
  }, [recordings]);

  // End current round and start a new one
  const endRound = useCallback(async () => {
    if (!currentRound) return;

    try {
      const { error } = await supabase
        .from('audio_phone_rounds')
        .update({ phase: 'finished' })
        .eq('id', currentRound.id);

      if (error) throw error;

      setRecordings([]);
      setCurrentRound(null);
    } catch (error) {
      console.error('Error ending round:', error);
    }
  }, [currentRound]);

  return {
    currentRound,
    recordings,
    isLoading,
    isSubmitting,
    currentReversedAudioUrl,
    uploadErrors,
    isMyTurn: isMyTurn(),
    startGame,
    startRecordingPhase,
    submitRecording,
    confirmListenedAndRecord,
    getPlayerById,
    fetchReversedAudioForListening,
    getRecordingsWithUrls,
    endRound,
  };
};
