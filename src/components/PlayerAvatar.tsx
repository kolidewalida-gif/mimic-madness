import { useState, useEffect } from 'react';
import { PlayerAvatarData } from '@/hooks/usePlayerAvatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
  lobbyId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isHost?: boolean;
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export const PlayerAvatar = ({
  playerId,
  playerName,
  lobbyId,
  size = 'md',
  isHost = false,
  className,
  animated = true,
}: PlayerAvatarProps) => {
  const [avatarData, setAvatarData] = useState<PlayerAvatarData>({ type: 'initials' });
  const [imageError, setImageError] = useState(false);

  // Load avatar from database
  useEffect(() => {
    if (!lobbyId) return;

    const loadAvatar = async () => {
      const { data } = await supabase
        .from('player_avatars')
        .select('*')
        .eq('player_id', playerId)
        .eq('lobby_id', lobbyId)
        .maybeSingle();

      if (data) {
        setAvatarData({
          type: data.avatar_type as 'initials' | 'image',
          imageUrl: data.image_url || undefined,
          backgroundColor: data.background_color || undefined,
        });
        setImageError(false);
      }
    };

    loadAvatar();

    // Subscribe to realtime updates for this player's avatar
    const channel = supabase
      .channel(`avatar-display:${playerId}:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_avatars',
          filter: `player_id=eq.${playerId}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).lobby_id === lobbyId) {
            const newData = payload.new as any;
            setAvatarData({
              type: newData.avatar_type as 'initials' | 'image',
              imageUrl: newData.image_url || undefined,
              backgroundColor: newData.background_color || undefined,
            });
            setImageError(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, lobbyId]);

  const initials = playerName.charAt(0).toUpperCase();

  const baseClasses = cn(
    'rounded-xl flex items-center justify-center font-display font-bold overflow-hidden',
    sizeClasses[size],
    animated && 'transition-all duration-300',
    isHost && 'ring-2 ring-secondary ring-offset-2 ring-offset-background',
    className
  );

  // Show image if available and no error
  if (avatarData.type === 'image' && avatarData.imageUrl && !imageError) {
    return (
      <div className={cn(baseClasses, animated && 'hover:scale-110')}>
        <img
          src={avatarData.imageUrl}
          alt={playerName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Show initials with color
  return (
    <div
      className={cn(
        baseClasses,
        animated && 'hover:scale-110',
        !avatarData.backgroundColor && (isHost ? 'bg-gradient-neon text-primary-foreground shadow-neon' : 'bg-accent/20 text-accent')
      )}
      style={avatarData.backgroundColor ? { backgroundColor: avatarData.backgroundColor, color: 'white' } : undefined}
    >
      {initials}
    </div>
  );
};
