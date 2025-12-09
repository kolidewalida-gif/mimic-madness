import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isHost?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-3xl',
};

const crownSizes = {
  sm: 'w-4 h-4 -top-1 -right-1',
  md: 'w-5 h-5 -top-1 -right-1',
  lg: 'w-6 h-6 -top-2 -right-2',
  xl: 'w-8 h-8 -top-2 -right-2',
};

export const PlayerAvatar = ({
  playerId,
  playerName,
  size = 'md',
  isHost = false,
  animated = false,
  className = '',
}: PlayerAvatarProps) => {
  const { avatarData } = useGlobalPlayerAvatar(playerId);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const getDefaultColor = (name: string) => {
    // Generate consistent color based on name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  const backgroundColor = avatarData.backgroundColor || getDefaultColor(playerName);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          sizeClasses[size],
          "rounded-full overflow-hidden",
          "flex items-center justify-center",
          "font-display font-bold text-white",
          "border-3 border-primary/40 shadow-lg shadow-primary/20",
          "ring-2 ring-background/50",
          animated && "transition-all hover:scale-110 hover:ring-4 hover:ring-primary/50"
        )}
        style={{
          backgroundColor: avatarData.type === 'initials' ? backgroundColor : undefined,
        }}
      >
        {avatarData.type === 'image' && avatarData.imageUrl ? (
          <img
            src={avatarData.imageUrl}
            alt={playerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(playerName)}</span>
        )}
      </div>

      {isHost && (
        <div className={cn("absolute bg-yellow-500 rounded-full flex items-center justify-center", crownSizes[size])}>
          <Crown className="w-2/3 h-2/3 text-yellow-900" />
        </div>
      )}
    </div>
  );
};