import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { chatMessageSchema, playerNameSchema, safeParse } from '@/lib/validation';
import { mutedPlayerIds, onMutedPlayersChanged } from '@/lib/playerModeration';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  lobbyId: string;
  playerId: string;
  playerName: string;
  content: string;
  messageType: 'text' | 'image' | 'gif' | 'voice' | 'soundboard';
  createdAt: string;
}

interface UseLobbyChat {
  messages: ChatMessage[];
  allMessages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string, messageType?: 'text' | 'image' | 'gif' | 'voice' | 'soundboard') => Promise<void>;
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

  /*
   * Sourdine locale. Le filtre vit ici, au point de passage unique du chat, pour
   * qu'il s'applique à tous les thèmes sans avoir à toucher cinq écrans. Il est
   * purement local et immédiat : mettre quelqu'un en sourdine ne demande la
   * permission de personne et prend effet au clic, ce qui est exactement ce dont
   * a besoin un joueur qui subit une conversation pénible en pleine partie.
   */
  const [muted, setMuted] = useState<ReadonlySet<string>>(() => mutedPlayerIds());

  useEffect(
    () => onMutedPlayersChanged(() => setMuted(mutedPlayerIds())),
    [],
  );

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
          messageType: msg.message_type as 'text' | 'image' | 'gif' | 'voice' | 'soundboard',
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
            messageType: newMsg.message_type as 'text' | 'image' | 'gif' | 'voice' | 'soundboard',
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
    async (content: string, messageType: 'text' | 'image' | 'gif' | 'voice' | 'soundboard' = 'text') => {
      if (!lobbyId) return;
      // For text messages we apply strict sanitization + length limits.
      // For gif/image/voice the content is a URL or storage path and is
      // produced internally → only length-cap it.
      let cleaned = content;
      if (messageType === 'text') {
        const parsed = safeParse(chatMessageSchema, content);
        if (!parsed) return;
        cleaned = parsed;
      } else {
        cleaned = content.trim().slice(0, 2000);
        if (!cleaned) return;
      }

      /*
       * Le pseudo vient de l'appelant et atterrit dans une colonne bornée à 24
       * caractères sans caractère de contrôle. On le nettoie ici plutôt que de
       * laisser la contrainte serveur rejeter tout le message : un pseudo un peu
       * long ne doit pas empêcher de parler.
       */
      const safeName = safeParse(playerNameSchema, playerName) ?? 'Joueur';

      setIsSending(true);
      try {
        const { error } = await supabase.from('chat_messages').insert({
          lobby_id: lobbyId,
          player_id: playerId,
          player_name: safeName,
          content: cleaned,
          message_type: messageType,
        });

        if (error) {
          console.error('Error sending message:', error);
          // 54000 est le code que renvoie la limite de débit du chat en base.
          if (error.code === '54000') {
            toast.info('Doucement, laisse respirer le salon quelques secondes.');
          }
        }
        
        // XP is now handled externally via useXpActions hook
      } catch (err) {
        console.error('Error in sendMessage:', err);
      } finally {
        setIsSending(false);
      }
    },
    [lobbyId, playerId, playerName]
  );

  const visibleMessages = useMemo(
    () => (muted.size === 0 ? messages : messages.filter((m) => !muted.has(m.playerId))),
    [messages, muted],
  );

  return {
    messages: visibleMessages,
    allMessages: messages,
    isLoading,
    sendMessage,
    isSending,
  };
};
