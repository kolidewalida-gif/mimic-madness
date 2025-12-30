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

// Helper for REST API calls
const apiUrl = import.meta.env.VITE_SUPABASE_URL;
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const restHeaders = {
  'apikey': apiKey,
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

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
      const roundResult = await fetch(
        `${apiUrl}/rest/v1/audio_phone_rounds?lobby_id=eq.${lobbyId}&order=created_at.desc&limit=1`,
        { headers: restHeaders }
      );
      
      const rounds = await roundResult.json();
      const round = rounds?.[0];

      if (round) {
        setCurrentRound(round as AudioPhoneRound);

        const recordingsResult = await fetch(
          `${apiUrl}/rest/v1/audio_phone_recordings?round_id=eq.${round.id}&order=player_order_index.asc`,
          { headers: restHeaders }
        );
        
        const recordingsData = await recordingsResult.json();
        if (recordingsData && Array.isArray(recordingsData)) {
          setRecordings(recordingsData as AudioPhoneRecording[]);
        }
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
            setRecordings(prev => {
              // Avoid duplicates
              if (prev.some(r => r.id === newRecording.id)) {
                return prev;
              }
              return [...prev, newRecording];
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

      const response = await fetch(`${apiUrl}/rest/v1/audio_phone_rounds`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({
          lobby_id: lobbyId,
          round_number: (currentRound?.round_number || 0) + 1,
          phase: 'instructions',
          current_player_index: 0,
          player_order: playerOrder,
        }),
      });

      if (!response.ok) throw new Error('Failed to create round');

      const data = await response.json();
      setCurrentRound(data[0] as AudioPhoneRound);
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
      await fetch(`${apiUrl}/rest/v1/audio_phone_rounds?id=eq.${currentRound.id}`, {
        method: 'PATCH',
        headers: restHeaders,
        body: JSON.stringify({ phase: 'recording' }),
      });
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
      const insertResponse = await fetch(`${apiUrl}/rest/v1/audio_phone_recordings`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({
          round_id: currentRound.id,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          player_order_index: currentRound.current_player_index,
          storage_path: originalPath,
          reversed_storage_path: reversedPath,
          duration_seconds: duration,
        }),
      });

      if (!insertResponse.ok) throw new Error('Failed to save recording');

      // If this is the first player, save the original phrase
      if (currentRound.current_player_index === 0 && originalPhrase) {
        await fetch(`${apiUrl}/rest/v1/audio_phone_rounds?id=eq.${currentRound.id}`, {
          method: 'PATCH',
          headers: restHeaders,
          body: JSON.stringify({ original_phrase: originalPhrase }),
        });
      }

      // Advance to next player or reveal phase
      const isLastPlayer = currentRound.current_player_index >= currentRound.player_order.length - 1;
      
      if (isLastPlayer) {
        await fetch(`${apiUrl}/rest/v1/audio_phone_rounds?id=eq.${currentRound.id}`, {
          method: 'PATCH',
          headers: restHeaders,
          body: JSON.stringify({ phase: 'reveal' }),
        });
      } else {
        await fetch(`${apiUrl}/rest/v1/audio_phone_rounds?id=eq.${currentRound.id}`, {
          method: 'PATCH',
          headers: restHeaders,
          body: JSON.stringify({ 
            current_player_index: currentRound.current_player_index + 1,
            phase: 'listening'
          }),
        });
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
      await fetch(`${apiUrl}/rest/v1/audio_phone_rounds?id=eq.${currentRound.id}`, {
        method: 'PATCH',
        headers: restHeaders,
        body: JSON.stringify({ phase: 'recording' }),
      });
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
      await fetch(`${apiUrl}/rest/v1/audio_phone_rounds?id=eq.${currentRound.id}`, {
        method: 'PATCH',
        headers: restHeaders,
        body: JSON.stringify({ phase: 'finished' }),
      });

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
