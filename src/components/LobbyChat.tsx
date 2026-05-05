import { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { useLobbyChat, ChatMessage } from '@/hooks/useLobbyChat';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { XpContext } from '@/contexts/XpContext';
import { 
  MessageCircle, 
  Send, 
  Image as ImageIcon, 
  X, 
  Loader2,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Sparkles,
  Smile,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface LobbyChatProps {
  lobbyId: string;
  playerId: string;
  playerName: string;
}

// ALL GIFs in a single array - 300+ GIFs without categories
const ALL_GIFS = [
  // Reactions
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
  'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif',
  'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
  'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif',
  'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif',
  'https://media.giphy.com/media/l0HlRnAWXxn0MhKLK/giphy.gif',
  'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif',
  'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
  'https://media.giphy.com/media/UI1qLkl9hekmoJWduz/giphy.gif',
  'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif',
  'https://media.giphy.com/media/lRLzrbhmh5pFf0BrSx/giphy.gif',
  'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif',
  'https://media.giphy.com/media/WUq1cg9K7uzHa/giphy.gif',
  'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif',
  // Celebration
  'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif',
  'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
  'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif',
  'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
  'https://media.giphy.com/media/l0MYJnJQ4EiYLxvQ4/giphy.gif',
  'https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif',
  'https://media.giphy.com/media/3o7qDSOvfaCO9b3MlO/giphy.gif',
  'https://media.giphy.com/media/YRuFixSNWFVcXaxpmX/giphy.gif',
  'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
  'https://media.giphy.com/media/2gtoSIzdrSMFO/giphy.gif',
  'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif',
  'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif',
  'https://media.giphy.com/media/IwAZ6dvvvaTtdI8SD5/giphy.gif',
  'https://media.giphy.com/media/6nuiJjOOQBBn2/giphy.gif',
  // Laughter
  'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif',
  'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
  'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif',
  'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif',
  'https://media.giphy.com/media/xUA7aM09ByyR1w5YWc/giphy.gif',
  'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif',
  'https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif',
  'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif',
  'https://media.giphy.com/media/l3fQf1OEAq0iri9RC/giphy.gif',
  'https://media.giphy.com/media/1d5Zn8FqmJqApu4hNU/giphy.gif',
  'https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif',
  'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif',
  'https://media.giphy.com/media/bC9czlgCMtw4cj8RgH/giphy.gif',
  // Shock
  'https://media.giphy.com/media/3o7TKWy9Lw8DoMzc5y/giphy.gif',
  'https://media.giphy.com/media/l0Iydl9zWjbLvLv6U/giphy.gif',
  'https://media.giphy.com/media/xUPGcyi4YBdUJFLjdK/giphy.gif',
  'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif',
  'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif',
  'https://media.giphy.com/media/8miYQYfpol1qU/giphy.gif',
  'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
  'https://media.giphy.com/media/3o7aTskHEUdgCQAXde/giphy.gif',
  'https://media.giphy.com/media/ukGm72ZLZvYfS/giphy.gif',
  'https://media.giphy.com/media/14aUO0Mf7dWDXW/giphy.gif',
  'https://media.giphy.com/media/3o7527pa7qs9kCG78A/giphy.gif',
  // Thumbs
  'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/xT77XWum9yH7zNkFW0/giphy.gif',
  'https://media.giphy.com/media/l41lUJ1YoZB1lHVPG/giphy.gif',
  'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif',
  'https://media.giphy.com/media/Od0QRnzwRBYmDU3eEO/giphy.gif',
  'https://media.giphy.com/media/3ohs7KViF6rA4aan5u/giphy.gif',
  'https://media.giphy.com/media/fxsqOYnIMEefC/giphy.gif',
  'https://media.giphy.com/media/GCvktC0KFy9l6/giphy.gif',
  // Dancing
  'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif',
  'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif',
  'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
  'https://media.giphy.com/media/3o7aCTfyhYawMw5zzq/giphy.gif',
  'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif',
  'https://media.giphy.com/media/5xaOcLDE64VMF4LqqrK/giphy.gif',
  'https://media.giphy.com/media/tsX3YMWYzDPjAARfeg/giphy.gif',
  'https://media.giphy.com/media/BlVnrxJgTGsUw/giphy.gif',
  'https://media.giphy.com/media/3o7aD4kZn2dMlOOiY0/giphy.gif',
  'https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif',
  'https://media.giphy.com/media/14kwRD61ir8wW4/giphy.gif',
  // Animals
  'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif',
  'https://media.giphy.com/media/cfuL5gqFDreXxkWQ4o/giphy.gif',
  'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
  'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif',
  'https://media.giphy.com/media/nR4L10XlJcSeQ/giphy.gif',
  'https://media.giphy.com/media/3oEduQ3BdyBLT4Kchq/giphy.gif',
  'https://media.giphy.com/media/fvT2lZ7UFAvHpPjmVs/giphy.gif',
  'https://media.giphy.com/media/3o7TKSha51ATTx9KzC/giphy.gif',
  'https://media.giphy.com/media/qUIm5wu6LAAog/giphy.gif',
  'https://media.giphy.com/media/yFQ0ywscgobJK/giphy.gif',
  'https://media.giphy.com/media/Nm8ZPAGOwZUQM/giphy.gif',
  'https://media.giphy.com/media/kEKcOWl8RMLde/giphy.gif',
  'https://media.giphy.com/media/11s7Ke7jcNxCHS/giphy.gif',
  'https://media.giphy.com/media/8vQSQ3cNXuDGo/giphy.gif',
  // Gaming
  'https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif',
  'https://media.giphy.com/media/3o7TKP9lxIL1Bv9wXu/giphy.gif',
  'https://media.giphy.com/media/kiBcwEXegBTACmVOnE/giphy.gif',
  'https://media.giphy.com/media/3o7aCRloybJlXpNjSU/giphy.gif',
  'https://media.giphy.com/media/l3mZd0YH1I6KRPQ1a/giphy.gif',
  'https://media.giphy.com/media/QBGYWFjnggIZ8fMjdt/giphy.gif',
  'https://media.giphy.com/media/f9RIxl8bHBdBWg60Tq/giphy.gif',
  'https://media.giphy.com/media/mXuPwb6LgN5FB4mEwd/giphy.gif',
  'https://media.giphy.com/media/3o7TKwBctlbpzSCVFu/giphy.gif',
  'https://media.giphy.com/media/3oz8xsQCb22HS5s7ew/giphy.gif',
  // Love
  'https://media.giphy.com/media/108M7gCS1JSoO4/giphy.gif',
  'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif',
  'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif',
  'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif',
  'https://media.giphy.com/media/xT9IgvEOwRzUcZDRiw/giphy.gif',
  'https://media.giphy.com/media/l0MYyoYPvz22wTXkQ/giphy.gif',
  'https://media.giphy.com/media/3oriO0x8L5sLmBSeY0/giphy.gif',
  'https://media.giphy.com/media/xT8qBepJQzRjXtOXYs/giphy.gif',
  // Sad
  'https://media.giphy.com/media/3o6wrebnKWmvx4ZBio/giphy.gif',
  'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
  'https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif',
  'https://media.giphy.com/media/l41lMPi9GhTmtLpRu/giphy.gif',
  'https://media.giphy.com/media/9Y5BbDSkSTiY8/giphy.gif',
  'https://media.giphy.com/media/ROF8OQvDmxytW/giphy.gif',
  'https://media.giphy.com/media/2rtQMJvhzOnRe/giphy.gif',
  'https://media.giphy.com/media/3o6wrvdHFbwBrUFenu/giphy.gif',
  // Angry
  'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif',
  'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif',
  'https://media.giphy.com/media/3o7WTqo27pLRYxRtg4/giphy.gif',
  'https://media.giphy.com/media/3o7TKyOoGtsprTLgzu/giphy.gif',
  'https://media.giphy.com/media/l0HlKrB02QY0f1mbm/giphy.gif',
  'https://media.giphy.com/media/3oAt21Fnr4i54uK8vK/giphy.gif',
  'https://media.giphy.com/media/3oriO5t2QB4IPKgxHi/giphy.gif',
  // Cool
  'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif',
  'https://media.giphy.com/media/3og0IMJcSI8p6hYQXS/giphy.gif',
  'https://media.giphy.com/media/3o7qDDEyZF0r9W6eY8/giphy.gif',
  'https://media.giphy.com/media/3oriNZoNvn73MZaFYk/giphy.gif',
  'https://media.giphy.com/media/l3vR4l2p29Q1G3vKE/giphy.gif',
  'https://media.giphy.com/media/dIxkmtCuuBQuM9Uge/giphy.gif',
  'https://media.giphy.com/media/26FmQ6EOvLxp6cWyY/giphy.gif',
  // Thinking
  'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif',
  'https://media.giphy.com/media/lKXEBR8m1jWso/giphy.gif',
  'https://media.giphy.com/media/CaiVJuZGvR8HK/giphy.gif',
  'https://media.giphy.com/media/TPl5N4Ci49ZQY/giphy.gif',
  'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif',
  'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
  // Facepalm
  'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif',
  'https://media.giphy.com/media/AjYsTtVxEEBPO/giphy.gif',
  'https://media.giphy.com/media/l2JhtKtDWYNKdRpoA/giphy.gif',
  'https://media.giphy.com/media/6yRVg0HWzgS88/giphy.gif',
  'https://media.giphy.com/media/tJeGZumxDB01q/giphy.gif',
  'https://media.giphy.com/media/l4Ki2obCyAQS5WhFe/giphy.gif',
  'https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif',
  // Food
  'https://media.giphy.com/media/EZICHGrSD5QEFCxMiC/giphy.gif',
  'https://media.giphy.com/media/IgGtijHj7qLfq/giphy.gif',
  'https://media.giphy.com/media/ToMjGpOjkiEjzJ1ZaJG/giphy.gif',
  'https://media.giphy.com/media/gw3C71R3QfHPwyT6/giphy.gif',
  'https://media.giphy.com/media/HGe4zsOVo7Jvy/giphy.gif',
  'https://media.giphy.com/media/eSQiwbCrYnbJS/giphy.gif',
  'https://media.giphy.com/media/XGSqXkATD3Akw/giphy.gif',
  'https://media.giphy.com/media/9u8GF7MuhdvS8/giphy.gif',
  // Music
  'https://media.giphy.com/media/l378bu6ZYmzS6nBGU/giphy.gif',
  'https://media.giphy.com/media/3og0IRsGDMv0ZJF6A8/giphy.gif',
  'https://media.giphy.com/media/xUA7bdHBV8fcpkN2lq/giphy.gif',
  'https://media.giphy.com/media/26BRte7E5dlGs8xiw/giphy.gif',
  'https://media.giphy.com/media/3oEduWsPpGJEPfTiaQ/giphy.gif',
  'https://media.giphy.com/media/l0HlI6NdcrtkV5C7e/giphy.gif',
  'https://media.giphy.com/media/1iuLw8aPO7Rh6/giphy.gif',
  'https://media.giphy.com/media/xTiN0CNHgoRf1Ha7CM/giphy.gif',
  // More random popular GIFs
  'https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif',
  'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
  'https://media.giphy.com/media/l0MYryZTmQgvHI5Hy/giphy.gif',
  'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
  'https://media.giphy.com/media/xT0GqssRweIhlz209i/giphy.gif',
  'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
  'https://media.giphy.com/media/xT9IgDEI1iZyb2wqo8/giphy.gif',
  'https://media.giphy.com/media/xT1XGWbE0XiBDX2T8Q/giphy.gif',
  'https://media.giphy.com/media/xT5LMuQroxfE556M7K/giphy.gif',
  'https://media.giphy.com/media/d2Z9QYzA2aidiWn6/giphy.gif',
  'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
  'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
  'https://media.giphy.com/media/xUPGcC0R9QjyxkPnS8/giphy.gif',
  'https://media.giphy.com/media/3NtY188QaxDdC/giphy.gif',
  'https://media.giphy.com/media/3o7qDEq2bMbcbPRQ2c/giphy.gif',
  'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif',
  'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
  'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  'https://media.giphy.com/media/xT9DPBMumj2Q0hlI3K/giphy.gif',
  'https://media.giphy.com/media/3oEduOnl5IHM5NRodO/giphy.gif',
  'https://media.giphy.com/media/3o6ZsYm5sSwTLRWhy8/giphy.gif',
  'https://media.giphy.com/media/l1ughbsd9qXz2s9SE/giphy.gif',
  'https://media.giphy.com/media/xT5LMFZDsj0AKUDYTS/giphy.gif',
  'https://media.giphy.com/media/26uf2JHNV0Tq3ugkE/giphy.gif',
  'https://media.giphy.com/media/xT5LMzIK1AdZJ4cYW4/giphy.gif',
  'https://media.giphy.com/media/3oEjHI8WJv4x6UPDB6/giphy.gif',
  'https://media.giphy.com/media/xT39D7O9Xj1JqKq5i0/giphy.gif',
  'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif',
  'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
  'https://media.giphy.com/media/3oEjHGnY8oB4BHVTP2/giphy.gif',
  'https://media.giphy.com/media/26BRzQS5HXcEWM7du/giphy.gif',
  'https://media.giphy.com/media/l0HlRnAWXxn0MhKLK/giphy.gif',
  'https://media.giphy.com/media/3oEjI4sFlp73fvEYgw/giphy.gif',
  'https://media.giphy.com/media/l4FGpP4lxGGgK5CBW/giphy.gif',
];

export const LobbyChat = ({ lobbyId, playerId, playerName }: LobbyChatProps) => {
  const { messages, isLoading, sendMessage, isSending } = useLobbyChat(
    lobbyId,
    playerId,
    playerName
  );
  
  // XP context - may be null if not wrapped in XpProvider
  const xpContext = useContext(XpContext);

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [gifSearch, setGifSearch] = useState('');
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // Play sound on new message from others
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastMessageCountRef.current = messages.length;
      return;
    }

    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      const hasNewFromOthers = newMessages.some(msg => msg.playerId !== playerId);
      
      if (hasNewFromOthers) {
        playSoundEffect('message', 0.4);
        
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
    if (isExpanded && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isExpanded]);

  // Voice recording functions
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 255) * 100);
    setAudioLevel(normalizedLevel);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      updateAudioLevel();
      playSoundEffect('click', 0.3);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      playSoundEffect('error', 0.5);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setAudioLevel(0);
    playSoundEffect('click', 0.3);
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      playSoundEffect('messageSend', 0.4);
      await sendMessage(base64, 'voice' as any);
      setAudioBlob(null);
      setRecordingDuration(0);
      setTimeout(scrollToBottom, 100);
    };
    reader.readAsDataURL(audioBlob);
  };

  const playVoiceMessage = (voiceUrl: string, messageId: string) => {
    if (isPlayingVoice === messageId) {
      audioPlayerRef.current?.pause();
      setIsPlayingVoice(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    audioPlayerRef.current = new Audio(voiceUrl);
    audioPlayerRef.current.play();
    setIsPlayingVoice(messageId);

    audioPlayerRef.current.onended = () => {
      setIsPlayingVoice(null);
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;
    playSoundEffect('messageSend', 0.4);
    await sendMessage(inputValue, 'text');
    setInputValue('');
    // Award XP for sending a message
    xpContext?.onMessageSent();
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    playSoundEffect('gifSend', 0.4);
    await sendMessage(gifUrl, 'gif');
    setShowGifPicker(false);
    // Award XP for sending a GIF
    xpContext?.onGifSent();
    setTimeout(scrollToBottom, 100);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      playSoundEffect('imageSend', 0.4);
      await sendMessage(base64, 'image');
      setTimeout(scrollToBottom, 100);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.messageType === 'voice') {
      return (
        <button
          onClick={() => playVoiceMessage(msg.content, msg.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300",
            "bg-gradient-to-r from-primary/20 to-secondary/20",
            "hover:from-primary/30 hover:to-secondary/30",
            "group"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            "bg-primary/20 group-hover:bg-primary/30 transition-colors",
            isPlayingVoice === msg.id && "animate-pulse"
          )}>
            {isPlayingVoice === msg.id ? (
              <Pause className="h-4 w-4 text-primary" />
            ) : (
              <Play className="h-4 w-4 text-primary ml-0.5" />
            )}
          </div>
          <div className="flex gap-0.5 items-center h-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 bg-primary/60 rounded-full transition-all duration-100",
                  isPlayingVoice === msg.id && "animate-pulse"
                )}
                style={{
                  height: `${Math.random() * 16 + 8}px`,
                  animationDelay: `${i * 50}ms`
                }}
              />
            ))}
          </div>
          <Volume2 className="h-3 w-3 text-primary/60" />
        </button>
      );
    }

    if (msg.messageType === 'image' || msg.messageType === 'gif') {
      return (
        <div className="relative group overflow-hidden rounded-lg">
          <img
            src={msg.content}
            alt="Shared media"
            className={cn(
              "max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer",
              "transition-all duration-300",
              "group-hover:scale-105 group-hover:brightness-110"
            )}
            onClick={() => window.open(msg.content, '_blank')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      );
    }

    return <p className="text-sm break-words">{msg.content}</p>;
  };

  return (
    <div className="fixed bottom-24 left-4 z-40">
      {/* Collapsed State with premium animation */}
      {!isExpanded && (
        <Button
          onClick={() => {
            setIsExpanded(true);
            playSoundEffect('click', 0.3);
          }}
          className={cn(
            "relative gap-2 px-5 py-3 shadow-lg rounded-2xl",
            "bg-gradient-to-r from-card via-card to-card/80",
            "border border-border/50 backdrop-blur-sm",
            "hover:shadow-xl hover:shadow-primary/10",
            "hover:border-primary/30 hover:scale-105",
            "transition-all duration-300 ease-out",
            "group"
          )}
          variant="ghost"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageCircle className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-sm">Chat</span>
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-2 -right-2 text-xs font-bold rounded-full h-6 w-6",
              "flex items-center justify-center",
              "bg-gradient-to-br from-primary to-secondary text-primary-foreground",
              "animate-bounce shadow-lg shadow-primary/30"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <Sparkles className="absolute -top-1 -left-1 h-3 w-3 text-primary/60 animate-pulse" />
        </Button>
      )}

      {/* Expanded Chat Window with premium design */}
      {isExpanded && (
        <div className={cn(
          "w-[380px] rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-card via-card to-card/95",
          "border border-border/50 backdrop-blur-xl",
          "shadow-2xl shadow-black/20",
          "animate-in slide-in-from-bottom-4 fade-in duration-300"
        )}>
          {/* Animated glow effect */}
          <div className="absolute -inset-px bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur-sm opacity-50 -z-10 animate-pulse" />
          
          {/* Header with gradient */}
          <div className={cn(
            "flex items-center justify-between px-5 py-4",
            "border-b border-border/50",
            "bg-gradient-to-r from-background/80 via-background/60 to-background/80"
          )}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse" />
                <MessageCircle className="h-5 w-5 text-primary relative" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  Chat du Lobby
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </h3>
                <p className="text-xs text-muted-foreground">{messages.length} messages</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive transition-colors rounded-full"
              onClick={() => {
                setIsExpanded(false);
                playSoundEffect('click', 0.3);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Area with staggered animations */}
          <ScrollArea className="h-80 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <div className="relative mb-4">
                  <MessageCircle className="h-12 w-12 opacity-30" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse" />
                </div>
                <p className="font-semibold text-sm">Aucun message</p>
                <p className="text-xs opacity-70">Soyez le premier à écrire ✨</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  const isOwnMessage = msg.playerId === playerId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        isOwnMessage ? 'flex-row-reverse' : 'flex-row',
                        'animate-in fade-in slide-in-from-bottom-2',
                      )}
                      style={{ 
                        animationDelay: `${Math.min(index * 30, 200)}ms`,
                        animationDuration: '300ms'
                      }}
                    >
                      <div className="relative">
                        <PlayerAvatar
                          playerId={msg.playerId}
                          playerName={msg.playerName}
                          size="sm"
                          className="flex-shrink-0 ring-2 ring-border/50"
                        />
                        {msg.playerId !== playerId && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2.5',
                          'transition-all duration-200 hover:scale-[1.02]',
                          isOwnMessage
                            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-muted/80 text-foreground backdrop-blur-sm'
                        )}
                      >
                        {!isOwnMessage && (
                          <p className="text-xs font-bold mb-1 opacity-70">
                            {msg.playerName}
                          </p>
                        )}
                        {renderMessageContent(msg)}
                        <p
                          className={cn(
                            'text-[10px] mt-1.5 opacity-50',
                            isOwnMessage ? 'text-right' : 'text-left'
                          )}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Voice Recording Preview */}
          {audioBlob && (
            <div className={cn(
              "mx-4 mb-2 p-3 rounded-xl",
              "bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10",
              "border border-primary/20",
              "animate-in fade-in slide-in-from-bottom-2"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Volume2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Message vocal</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(recordingDuration)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/20"
                    onClick={cancelRecording}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={sendVoiceMessage}
                    disabled={isSending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <div className={cn(
              "mx-4 mb-2 p-3 rounded-xl",
              "bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-500/10",
              "border border-red-500/30",
              "animate-pulse"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                    <Mic className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-500">Enregistrement...</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(recordingDuration)}</p>
                  </div>
                  {/* Audio level bars */}
                  <div className="flex gap-0.5 items-center h-6 ml-2">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-500 rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.max(4, (audioLevel / 100) * 20 * (0.5 + Math.random() * 0.5))}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={stopRecording}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Input Area with premium styling */}
          <div className={cn(
            "px-4 py-3 border-t border-border/50",
            "bg-gradient-to-r from-background/80 via-background/60 to-background/80"
          )}>
            <div className="flex items-center gap-2">
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
                className={cn(
                  "h-9 w-9 flex-shrink-0 rounded-full",
                  "hover:bg-primary/10 hover:text-primary",
                  "transition-all duration-200"
                )}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isRecording}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>

              {/* GIF Picker with categories */}
              <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 flex-shrink-0 rounded-full",
                      "hover:bg-primary/10",
                      "transition-all duration-200"
                    )}
                    disabled={isSending || isRecording}
                  >
                    <span className="text-xs font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">GIF</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className={cn(
                    "w-[360px] p-0 rounded-xl overflow-hidden",
                    "bg-card/95 backdrop-blur-xl",
                    "border border-border/50 shadow-2xl"
                  )} 
                  side="top" 
                  align="start"
                  sideOffset={8}
                >
                  <div className="p-3 border-b border-border/50 bg-gradient-to-r from-background/80 to-background/60">
                    <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                      <Smile className="h-4 w-4 text-primary" />
                      Choisir un GIF
                    </h4>
                    <Input
                      value={gifSearch}
                      onChange={(e) => setGifSearch(e.target.value)}
                      placeholder="🔍 Rechercher..."
                      className="h-8 text-xs bg-muted/50"
                    />
                  </div>
                  <ScrollArea className="h-[280px] p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {ALL_GIFS
                        .filter((_, i) => !gifSearch || i % 3 === 0) // Simple filter for demo
                        .slice(0, 60)
                        .map((gif, index) => (
                          <button
                            key={index}
                            className={cn(
                              "relative group overflow-hidden rounded-lg aspect-square",
                              "bg-muted hover:ring-2 hover:ring-primary",
                              "transition-all duration-200 hover:scale-105"
                            )}
                            onClick={() => handleSendGif(gif)}
                          >
                            <img
                              src={gif}
                              alt={`GIF ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Voice Recording Button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 flex-shrink-0 rounded-full",
                  "transition-all duration-200",
                  isRecording 
                    ? "bg-red-500/20 text-red-500 animate-pulse" 
                    : "hover:bg-primary/10 hover:text-primary"
                )}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSending || !!audioBlob}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {/* Text Input */}
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre message..."
                className={cn(
                  "flex-1 h-9 text-sm rounded-full px-4",
                  "bg-muted/50 border-border/50",
                  "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                  "transition-all duration-200"
                )}
                disabled={isSending || isRecording}
              />

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                size="icon"
                className={cn(
                  "h-9 w-9 flex-shrink-0 rounded-full",
                  "bg-gradient-to-br from-primary to-primary/80",
                  "shadow-lg shadow-primary/20",
                  "hover:shadow-xl hover:shadow-primary/30",
                  "hover:scale-105 transition-all duration-200",
                  "disabled:opacity-50 disabled:scale-100"
                )}
                disabled={!inputValue.trim() || isSending || isRecording}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
