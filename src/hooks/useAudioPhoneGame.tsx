import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { reverseAudioBuffer, getAudioDuration } from '@/lib/audioReverser';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

// Type assertion helper for new tables not yet in generated types
const fromTable = (table: string) => supabase.from(table as any);

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

export const useAudioPhoneGame = ({ lobbyId, currentPlayer, players }: UseAudioPhoneGameProps) => {
  const [currentRound, setCurrentRound] = useState<AudioPhoneRound | null>(null);
  const [recordings, setRecordings] = useState<AudioPhoneRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentReversedAudioUrl, setCurrentReversedAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch current round and recordings
  const fetchGameState = useCallback(async () => {
    try {
      // Fetch current round
      const { data: roundData, error: roundError } = await supabase
        .from('audio_phone_rounds')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roundError && roundError.code !== 'PGRST116') {
        console.error('Error fetching round:', roundError);
        return;
      }

      if (roundData) {
        setCurrentRound(roundData as AudioPhoneRound);

        // Fetch recordings for this round
        const { data: recordingsData, error: recordingsError } = await supabase
          .from('audio_phone_recordings')
          .select('*')
          .eq('round_id', roundData.id)
          .order('player_order_index', { ascending: true });

        if (!recordingsError && recordingsData) {
          setRecordings(recordingsData as AudioPhoneRecording[]);
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lobbyId]);

  // Initialize game
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!lobbyId) return;

    channelRef.current = supabase
      .channel(`audio-phone:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audio_phone_rounds',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRound = payload.new as AudioPhoneRound;
            setCurrentRound(newRound);

            // Notify player when it's their turn
            if (newRound.phase === 'recording' || newRound.phase === 'listening') {
              const currentPlayerId = newRound.player_order[newRound.current_player_index];
              if (currentPlayerId === currentPlayer.id) {
                playSoundEffect('notification', 0.6);
                toast({
                  title: "C'est votre tour !",
                  description: newRound.phase === 'recording' 
                    ? "Enregistrez votre phrase" 
                    : "Écoutez et reproduisez !",
                });
              }
            }

            // Play sound on phase changes
            if (payload.eventType === 'UPDATE' && payload.old) {
              const oldRound = payload.old as AudioPhoneRound;
              if (oldRound.phase !== newRound.phase) {
                if (newRound.phase === 'reveal') {
                  playSoundEffect('quizReveal', 0.5);
                } else if (newRound.phase === 'recording') {
                  playSoundEffect('start', 0.4);
                }
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audio_phone_recordings'
        },
        (payload) => {
          const newRecording = payload.new as AudioPhoneRecording;
          if (currentRound && newRecording.round_id === currentRound.id) {
            setRecordings(prev => [...prev, newRecording]);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [lobbyId, currentPlayer.id, currentRound?.id, toast]);

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

      setCurrentRound(data as AudioPhoneRound);
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

    try {
      setIsSubmitting(true);

      // Get audio duration
      const duration = await getAudioDuration(audioBlob);

      // Reverse the audio
      const reversedBlob = await reverseAudioBuffer(audioBlob);

      // Generate unique file paths
      const timestamp = Date.now();
      const originalPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_original.wav`;
      const reversedPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_reversed.wav`;

      // Upload original audio
      const { error: originalUploadError } = await supabase.storage
        .from('audio-phone')
        .upload(originalPath, audioBlob, {
          contentType: 'audio/wav',
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

      if (reversedUploadError) throw reversedUploadError;

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

      if (insertError) throw insertError;

      // If this is the first player, save the original phrase
      if (currentRound.current_player_index === 0 && originalPhrase) {
        await supabase
          .from('audio_phone_rounds')
          .update({ original_phrase: originalPhrase })
          .eq('id', currentRound.id);
      }

      // Advance to next player or reveal phase
      const isLastPlayer = currentRound.current_player_index >= currentRound.player_order.length - 1;
      
      if (isLastPlayer) {
        await supabase
          .from('audio_phone_rounds')
          .update({ phase: 'reveal' })
          .eq('id', currentRound.id);
      } else {
        await supabase
          .from('audio_phone_rounds')
          .update({ 
            current_player_index: currentRound.current_player_index + 1,
            phase: 'listening'
          })
          .eq('id', currentRound.id);
      }

      playSoundEffect('success', 0.5);
      return true;

    } catch (error) {
      console.error('Error submitting recording:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'enregistrement",
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
      await supabase
        .from('audio_phone_rounds')
        .update({ phase: 'recording' })
        .eq('id', currentRound.id);
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
  const fetchReversedAudioForListening = useCallback(async () => {
    if (!currentRound || currentRound.current_player_index === 0) return null;

    // Get the previous player's recording
    const previousIndex = currentRound.current_player_index - 1;
    const previousRecording = recordings.find(r => r.player_order_index === previousIndex);

    if (!previousRecording?.reversed_storage_path) return null;

    try {
      const { data } = supabase.storage
        .from('audio-phone')
        .getPublicUrl(previousRecording.reversed_storage_path);

      setCurrentReversedAudioUrl(data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error fetching reversed audio:', error);
      return null;
    }
  }, [currentRound, recordings]);

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
      await supabase
        .from('audio_phone_rounds')
        .update({ phase: 'finished' })
        .eq('id', currentRound.id);

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
