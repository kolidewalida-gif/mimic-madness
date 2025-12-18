import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  lobbyId: string;
  playerId: string;
  playerName: string;
  content: string;
  messageType: 'text' | 'image' | 'gif' | 'voice';
  createdAt: string;
}

interface UseLobbyChat {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string, messageType?: 'text' | 'image' | 'gif' | 'voice') => Promise<void>;
  isSending: boolean;
}

export const useLobbyChat = (
  lobbyId: string | null,
  playerId: string,
  playerName: string
): UseLobbyChat => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!lobbyId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('lobby_id', lobbyId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error fetching chat messages:', error);
          return;
        }

        const formattedMessages: ChatMessage[] = (data || []).map((msg) => ({
          id: msg.id,
          lobbyId: msg.lobby_id,
          playerId: msg.player_id,
          playerName: msg.player_name,
          content: msg.content,
          messageType: msg.message_type as 'text' | 'image' | 'gif' | 'voice',
          createdAt: msg.created_at,
        }));

        setMessages(formattedMessages);
      } catch (err) {
        console.error('Error in fetchMessages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [lobbyId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!lobbyId) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat-${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          const formattedMsg: ChatMessage = {
            id: newMsg.id,
            lobbyId: newMsg.lobby_id,
            playerId: newMsg.player_id,
            playerName: newMsg.player_name,
            content: newMsg.content,
            messageType: newMsg.message_type as 'text' | 'image' | 'gif' | 'voice',
            createdAt: newMsg.created_at,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === formattedMsg.id)) {
              return prev;
            }
            return [...prev, formattedMsg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [lobbyId]);

  const sendMessage = useCallback(
    async (content: string, messageType: 'text' | 'image' | 'gif' | 'voice' = 'text') => {
      if (!lobbyId || !content.trim()) return;

      setIsSending(true);
      try {
        const { error } = await supabase.from('chat_messages').insert({
          lobby_id: lobbyId,
          player_id: playerId,
          player_name: playerName,
          content: content.trim(),
          message_type: messageType,
        });

        if (error) {
          console.error('Error sending message:', error);
        }
      } catch (err) {
        console.error('Error in sendMessage:', err);
      } finally {
        setIsSending(false);
      }
    },
    [lobbyId, playerId, playerName]
  );

  return {
    messages,
    isLoading,
    sendMessage,
    isSending,
  };
};
