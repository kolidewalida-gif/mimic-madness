import { useState, useRef, useEffect } from 'react';
import { useLobbyChat, ChatMessage } from '@/hooks/useLobbyChat';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { 
  MessageCircle, 
  Send, 
  Image as ImageIcon, 
  X, 
  ChevronDown,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface LobbyChatProps {
  lobbyId: string;
  playerId: string;
  playerName: string;
}

// Extended GIF collection - reactions, celebrations, emotions
const GIPHY_GIFS = [
  // Reactions
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
  'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif',
  'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
  'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif',
  'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif',
  'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
  'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif',
  // Celebrations
  'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif',
  'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
  'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
  'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
  // Laughter
  'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif',
  'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
  'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif',
  'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif',
  // Shock/Surprise
  'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
  'https://media.giphy.com/media/3o7TKWy9Lw8DoMzc5y/giphy.gif',
  'https://media.giphy.com/media/l0Iydl9zWjbLvLv6U/giphy.gif',
  'https://media.giphy.com/media/xUPGcyi4YBdUJFLjdK/giphy.gif',
  // Applause
  'https://media.giphy.com/media/YRuFixSNWFVcXaxpmX/giphy.gif',
  'https://media.giphy.com/media/l0MYJnJQ4EiYLxvQ4/giphy.gif',
  'https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif',
  'https://media.giphy.com/media/3o7qDSOvfaCO9b3MlO/giphy.gif',
  // Thumbs up/down
  'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/xT77XWum9yH7zNkFW0/giphy.gif',
  'https://media.giphy.com/media/l41lUJ1YoZB1lHVPG/giphy.gif',
  // Dancing
  'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif',
  'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif',
  'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
  'https://media.giphy.com/media/3o7aCTfyhYawMw5zzq/giphy.gif',
];

export const LobbyChat = ({ lobbyId, playerId, playerName }: LobbyChatProps) => {
  const { messages, isLoading, sendMessage, isSending } = useLobbyChat(
    lobbyId,
    playerId,
    playerName
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);
  const hasInitializedRef = useRef(false);

  // Play sound on new message from others
  useEffect(() => {
    if (!hasInitializedRef.current) {
      // Don't play sound on initial load
      hasInitializedRef.current = true;
      lastMessageCountRef.current = messages.length;
      return;
    }

    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const hasNewFromOthers = newMessages.some(msg => msg.playerId !== playerId);
      
      if (hasNewFromOthers) {
        playSoundEffect('message', 0.4);
        
        // Update unread count if chat is collapsed
        if (!isExpanded) {
          setUnreadCount(prev => prev + newMessages.filter(m => m.playerId !== playerId).length);
        }
      }
    }
    
    lastMessageCountRef.current = messages.length;
  }, [messages, playerId, isExpanded]);

  // Reset unread count when expanded
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;
    await sendMessage(inputValue, 'text');
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    await sendMessage(gifUrl, 'gif');
    setShowGifPicker(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Convert to base64 for simplicity
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await sendMessage(base64, 'image');
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.messageType === 'image' || msg.messageType === 'gif') {
      return (
        <img
          src={msg.content}
          alt="Shared media"
          className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(msg.content, '_blank')}
        />
      );
    }
    return <p className="text-sm break-words">{msg.content}</p>;
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Collapsed State */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          className="relative gap-3 px-5 py-3 shadow-xl bg-card border border-border hover:bg-card/90 hover:scale-105 transition-all duration-200 rounded-2xl"
          variant="outline"
        >
          <MessageCircle className="h-5 w-5 text-primary" />
          <span className="font-medium">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      )}

      {/* Expanded Chat Window */}
      {isExpanded && (
        <div className="w-[340px] sm:w-[400px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Chat</h3>
                <p className="text-xs text-muted-foreground">{messages.length} messages</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-muted"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="h-80 px-4 py-4" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">Aucun message</p>
                <p className="text-sm opacity-70">Soyez le premier à écrire !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwnMessage = msg.playerId === playerId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <PlayerAvatar
                        playerId={msg.playerId}
                        playerName={msg.playerName}
                        size="sm"
                        className="flex-shrink-0 mt-1"
                      />
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground rounded-tr-md'
                            : 'bg-muted text-foreground rounded-tl-md'
                        )}
                      >
                        {!isOwnMessage && (
                          <p className="text-xs font-semibold mb-1.5 opacity-80">
                            {msg.playerName}
                          </p>
                        )}
                        {renderMessageContent(msg)}
                        <p
                          className={cn(
                            'text-[10px] mt-2 opacity-60',
                            isOwnMessage ? 'text-right' : 'text-left'
                          )}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="px-4 py-4 border-t border-border bg-muted/20">
            <div className="flex items-center gap-3">
              {/* Image Upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 flex-shrink-0 rounded-xl hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              {/* GIF Picker */}
              <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0 rounded-xl hover:bg-muted"
                    disabled={isSending}
                  >
                    <span className="text-sm font-bold text-primary">GIF</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[320px] p-4 bg-card border border-border rounded-2xl shadow-xl" 
                  side="top" 
                  align="start"
                  sideOffset={12}
                >
                  <div className="mb-3">
                    <h4 className="font-semibold text-sm text-foreground">Choisir un GIF</h4>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <div className="grid grid-cols-2 gap-3 pr-2">
                      {GIPHY_GIFS.map((gif, index) => (
                        <button
                          key={index}
                          className="relative group overflow-hidden rounded-xl aspect-square bg-muted/50 hover:ring-2 hover:ring-primary transition-all duration-200"
                          onClick={() => handleSendGif(gif)}
                        >
                          <img
                            src={gif}
                            alt={`GIF ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Text Input */}
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre message..."
                className="flex-1 h-10 text-sm rounded-xl border-muted bg-background/50 focus:bg-background"
                disabled={isSending}
              />

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                size="icon"
                className="h-10 w-10 flex-shrink-0 rounded-xl"
                disabled={!inputValue.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
