import { Award, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalPlayerAvatar } from "@/hooks/useGlobalPlayerAvatar";
import { usePlayerLoadoutById } from "@/hooks/usePlayerLoadoutById";

interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
  size?: "sm" | "md" | "lg" | "xl";
  isHost?: boolean;
  animated?: boolean;
  showTitle?: boolean;
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

const orbitRadius = { sm: 16, md: 22, lg: 32, xl: 44 };
const titleChipVisibility = { sm: false, md: true, lg: true, xl: true };

const frameRing = {
  none: "border-2 border-primary/40 shadow-lg shadow-primary/20",
  bronze: "",
  silver: "",
  gold: "",
};

const titleRarityClasses = {
  common: "bg-black/70 text-white border-white/10",
  rare: "bg-blue-500/90 text-white border-blue-300/40",
  epic: "bg-fuchsia-500/90 text-white border-fuchsia-300/40",
  legendary: "bg-black/85 border-yellow-300/50",
};

export const PlayerAvatar = ({
  playerId,
  playerName,
  size = "md",
  isHost = false,
  animated = false,
  showTitle = true,
  className = "",
}: PlayerAvatarProps) => {
  const { avatarData } = useGlobalPlayerAvatar(playerId);
  const { equippedTitle, effectTier, featuredBadge, frameTier } = usePlayerLoadoutById(playerId);

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
  const getDefaultColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash % 360)}, 70%, 50%)`;
  };

  const backgroundColor = avatarData.backgroundColor || getDefaultColor(playerName);
  const hasAnimatedFrame = frameTier !== "none";
  const showTitleChip = showTitle && !!equippedTitle && titleChipVisibility[size];
  const orbit = orbitRadius[size];

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      {/* Outer glow halo */}
      {effectTier !== "none" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full blur-2xl avatar-glow",
            effectTier === "glow" ? "bg-yellow-300/55" : "bg-cyan-400/40",
          )}
        />
      )}

      {/* Sparkle orbit (rare+) */}
      {effectTier === "sparkle" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {[0, 120, 240].map((angle, i) => (
            <span
              key={angle}
              className="absolute avatar-sparkle-orbit"
              style={
                {
                  "--orbit": `${orbit}px`,
                  transform: `rotate(${angle}deg) translateX(${orbit}px)`,
                  animationDelay: `${i * 0.3}s`,
                } as React.CSSProperties
              }
            >
              <Sparkles className="h-3 w-3 text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.9)]" />
            </span>
          ))}
        </div>
      )}
      {effectTier === "glow" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {[0, 90, 180, 270].map((angle, i) => (
            <span
              key={angle}
              className="absolute avatar-sparkle-orbit"
              style={
                {
                  "--orbit": `${orbit + 4}px`,
                  transform: `rotate(${angle}deg) translateX(${orbit + 4}px)`,
                  animationDelay: `${i * 0.25}s`,
                } as React.CSSProperties
              }
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-200 drop-shadow-[0_0_6px_rgba(252,211,77,0.95)]" />
            </span>
          ))}
        </div>
      )}

      {/* Animated metallic frame (rotating conic gradient) */}
      {hasAnimatedFrame && (
        <div
          className={cn(
            "pointer-events-none absolute rounded-full -inset-[3px]",
            frameTier === "gold" && "avatar-frame-gold",
            frameTier === "silver" && "avatar-frame-silver",
            frameTier === "bronze" && "avatar-frame-bronze",
          )}
        />
      )}

      <div
        className={cn(
          "relative rounded-full overflow-hidden flex items-center justify-center font-display font-bold text-white ring-2 ring-background/60",
          sizeClasses[size],
          frameRing[frameTier],
          animated && "transition-all hover:scale-110 hover:ring-4 hover:ring-primary/50",
        )}
        style={{
          backgroundColor: avatarData.type === "initials" ? backgroundColor : undefined,
        }}
      >
        {avatarData.type === "image" && avatarData.imageUrl ? (
          <img src={avatarData.imageUrl} alt={playerName} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(playerName)}</span>
        )}

        {featuredBadge && (
          <div className="absolute -left-1 -bottom-1 rounded-full bg-card/90 border border-primary/30 p-1 shadow">
            <Award className="h-3 w-3 text-primary" />
          </div>
        )}
      </div>

      {isHost && (
        <div className={cn("absolute bg-yellow-500 rounded-full flex items-center justify-center shadow-lg", crownSizes[size])}>
          <Crown className="w-2/3 h-2/3 text-yellow-900" />
        </div>
      )}

      {showTitleChip && equippedTitle && (
        <div
          className={cn(
            "pointer-events-none absolute -bottom-3 max-w-[130px] truncate rounded-full border px-2 py-0.5 text-[10px] font-extrabold shadow-lg title-bob",
            titleRarityClasses[equippedTitle.rarity],
          )}
        >
          <span className={equippedTitle.rarity === "legendary" ? "title-shimmer-legendary" : ""}>
            {equippedTitle.name}
          </span>
        </div>
      )}
    </div>
  );
};
