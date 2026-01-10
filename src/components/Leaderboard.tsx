import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
  score: number;
  previousRank?: number;
  avatar?: string;
}

interface LeaderboardProps {
  players: Player[];
  currentPlayerId?: string;
  title?: string;
  showTrend?: boolean;
  maxDisplay?: number;
  animated?: boolean;
  compact?: boolean;
  className?: string;
}

export const Leaderboard = ({
  players,
  currentPlayerId,
  title = "Classement",
  showTrend = true,
  maxDisplay = 10,
  animated = true,
  compact = false,
  className = ''
}: LeaderboardProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, maxDisplay);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{rank + 1}</span>;
    }
  };

  const getTrendIcon = (currentRank: number, previousRank?: number) => {
    if (previousRank === undefined) return null;
    if (currentRank < previousRank) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (currentRank > previousRank) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 0:
        return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40';
      case 1:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/40';
      case 2:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/40';
      default:
        return 'bg-card/50 border-border/30';
    }
  };

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        {sortedPlayers.map((player, index) => (
          <motion.div
            key={player.id}
            initial={animated ? { opacity: 0, x: -20 } : undefined}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              player.id === currentPlayerId ? "bg-primary/20 border border-primary/40" : "bg-card/30"
            )}
          >
            <div className="w-6 flex justify-center">{getRankIcon(index)}</div>
            <span className="flex-1 text-sm font-medium truncate">{player.name}</span>
            <span className="text-sm font-bold">{player.score}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold text-lg">{title}</h3>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              layout
              initial={animated ? { opacity: 0, y: 20, scale: 0.9 } : undefined}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                delay: index * 0.05 
              }}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl border transition-all duration-300",
                getRankStyle(index),
                player.id === currentPlayerId && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              {/* Rank */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                index < 3 ? "bg-background/50" : ""
              )}>
                {getRankIcon(index)}
              </div>

              {/* Avatar & Name */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                {player.avatar ? (
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-8 h-8 rounded-full object-cover border border-border/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-bold">
                    {player.name[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-semibold truncate",
                    player.id === currentPlayerId && "text-primary"
                  )}>
                    {player.name}
                    {player.id === currentPlayerId && (
                      <span className="ml-2 text-xs text-muted-foreground">(Vous)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Trend */}
              {showTrend && (
                <div className="flex items-center">
                  {getTrendIcon(index, player.previousRank)}
                </div>
              )}

              {/* Score */}
              <div className={cn(
                "px-4 py-1.5 rounded-lg text-right",
                index < 3 ? "bg-background/50" : "bg-muted/30"
              )}>
                <span className="text-lg font-display font-bold">{player.score}</span>
                <span className="text-xs text-muted-foreground ml-1">pts</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Mini leaderboard for overlay display
interface MiniLeaderboardProps {
  players: Player[];
  currentPlayerId?: string;
  className?: string;
}

export const MiniLeaderboard = ({
  players,
  currentPlayerId,
  className = ''
}: MiniLeaderboardProps) => {
  const top3 = [...players].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className={cn(
      "flex items-end justify-center gap-2 py-4",
      className
    )}>
      {/* 2nd place */}
      {top3[1] && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold border-2 border-gray-300">
            {top3[1].name[0]}
          </div>
          <div className="mt-1 h-16 w-20 rounded-t-lg bg-gray-400/30 flex items-end justify-center pb-2">
            <span className="text-2xl font-bold text-gray-400">2</span>
          </div>
          <p className="text-xs font-medium mt-1 truncate max-w-20">{top3[1].name}</p>
          <p className="text-xs text-muted-foreground">{top3[1].score} pts</p>
        </motion.div>
      )}

      {/* 1st place */}
      {top3[0] && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center -mt-4"
        >
          <Crown className="h-6 w-6 text-yellow-400 mb-1" />
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg border-2 border-yellow-300 shadow-lg shadow-yellow-500/30">
            {top3[0].name[0]}
          </div>
          <div className="mt-1 h-24 w-24 rounded-t-lg bg-yellow-500/30 flex items-end justify-center pb-2">
            <span className="text-3xl font-bold text-yellow-400">1</span>
          </div>
          <p className="text-sm font-bold mt-1 truncate max-w-24">{top3[0].name}</p>
          <p className="text-sm font-medium text-yellow-400">{top3[0].score} pts</p>
        </motion.div>
      )}

      {/* 3rd place */}
      {top3[2] && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold border-2 border-amber-500">
            {top3[2].name[0]}
          </div>
          <div className="mt-1 h-12 w-20 rounded-t-lg bg-amber-600/30 flex items-end justify-center pb-2">
            <span className="text-2xl font-bold text-amber-600">3</span>
          </div>
          <p className="text-xs font-medium mt-1 truncate max-w-20">{top3[2].name}</p>
          <p className="text-xs text-muted-foreground">{top3[2].score} pts</p>
        </motion.div>
      )}
    </div>
  );
};
