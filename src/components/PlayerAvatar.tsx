import { Award, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalPlayerAvatar } from "@/hooks/useGlobalPlayerAvatar";
import { usePlayerLoadout } from "@/hooks/usePlayerLoadout";

interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
  size?: "sm" | "md" | "lg" | "xl";
  isHost?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-base",
  lg: "w-20 h-20 text-xl",
  xl: "w-28 h-28 text-3xl",
};

const crownSizes = {
  sm: "w-4 h-4 -top-1 -right-1",
  md: "w-5 h-5 -top-1 -right-1",
  lg: "w-6 h-6 -top-2 -right-2",
  xl: "w-8 h-8 -top-2 -right-2",
};

const titleChipVisibility = {
  sm: false,
  md: true,
  lg: true,
  xl: true,
};

const frameClasses = {
  none: "border-primary/40 shadow-lg shadow-primary/20",
  bronze: "border-amber-500/80 shadow-[0_0_18px_rgba(245,158,11,0.35)]",
  silver: "border-slate-300/90 shadow-[0_0_20px_rgba(226,232,240,0.35)]",
  gold: "border-yellow-400/90 shadow-[0_0_24px_rgba(250,204,21,0.45)]",
};

const titleRarityClasses = {
  common: "bg-black/65 text-white border-white/10",
  rare: "bg-blue-500/85 text-white border-blue-300/30",
  epic: "bg-fuchsia-500/85 text-white border-fuchsia-300/30",
  legendary: "bg-amber-400/90 text-black border-yellow-100/30",
};

export const PlayerAvatar = ({
  playerId,
  playerName,
  size = "md",
  isHost = false,
  animated = false,
  className = "",
}: PlayerAvatarProps) => {
  const { avatarData } = useGlobalPlayerAvatar(playerId);
  const { equippedTitle, effectTier, featuredBadge, frameTier, isCurrentUser } = usePlayerLoadout(playerId);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const getDefaultColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  const backgroundColor = avatarData.backgroundColor || getDefaultColor(playerName);
  const showTitleChip = isCurrentUser && !!equippedTitle && titleChipVisibility[size];

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      {isCurrentUser && effectTier !== "none" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full blur-xl",
            effectTier === "glow" ? "bg-yellow-400/35 scale-[1.25]" : "bg-cyan-400/25 scale-[1.15]"
          )}
        />
      )}

      {isCurrentUser && effectTier === "sparkle" && (
        <>
          <Sparkles className="pointer-events-none absolute -left-1 -top-1 h-4 w-4 text-cyan-300 animate-pulse" />
          <Sparkles className="pointer-events-none absolute -right-1 top-1 h-3 w-3 text-fuchsia-300 animate-pulse" />
        </>
      )}

      <div
        className={cn(
          "relative rounded-full overflow-hidden flex items-center justify-center font-display font-bold text-white ring-2 ring-background/50 border-3",
          sizeClasses[size],
          frameClasses[frameTier],
          animated && "transition-all hover:scale-110 hover:ring-4 hover:ring-primary/50"
        )}
        style={{
          backgroundColor: avatarData.type === "initials" ? backgroundColor : undefined,
        }}
      >
        {avatarData.type === "image" && avatarData.imageUrl ? (
          <img
            src={avatarData.imageUrl}
            alt={playerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(playerName)}</span>
        )}

        {isCurrentUser && featuredBadge && (
          <div className="absolute -left-1 -bottom-1 rounded-full bg-card/90 border border-primary/30 p-1">
            <Award className="h-3 w-3 text-primary" />
          </div>
        )}
      </div>

      {isHost && (
        <div className={cn("absolute bg-yellow-500 rounded-full flex items-center justify-center", crownSizes[size])}>
          <Crown className="w-2/3 h-2/3 text-yellow-900" />
        </div>
      )}

      {showTitleChip && equippedTitle && (
        <div
          className={cn(
            "pointer-events-none absolute -bottom-3 max-w-[110px] truncate rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-lg",
            titleRarityClasses[equippedTitle.rarity]
          )}
        >
          {equippedTitle.name}
        </div>
      )}
    </div>
  );
};
