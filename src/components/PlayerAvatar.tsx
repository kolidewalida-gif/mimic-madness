import { useState, useEffect } from 'react';
import { getPlayerAvatarData, PlayerAvatarData } from '@/hooks/usePlayerAvatar';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
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
  size = 'md',
  isHost = false,
  className,
  animated = true,
}: PlayerAvatarProps) => {
  const [avatarData, setAvatarData] = useState<PlayerAvatarData>({ type: 'initials' });
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const data = getPlayerAvatarData(playerId);
    setAvatarData(data);
    setImageError(false);
  }, [playerId]);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const data = getPlayerAvatarData(playerId);
      setAvatarData(data);
      setImageError(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('avatar-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('avatar-updated', handleStorageChange);
    };
  }, [playerId]);

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
        isHost ? 'bg-gradient-neon text-primary-foreground shadow-neon' : 'bg-accent/20 text-accent'
      )}
      style={avatarData.backgroundColor ? { backgroundColor: avatarData.backgroundColor } : undefined}
    >
      {initials}
    </div>
  );
};
