import { HolographicCard } from '@/components/premium';
import { cn } from '@/lib/utils';
import { CheckCircle2, Timer } from 'lucide-react';

export type BlurRushLiveStats = Record<
  string,
  {
    playerName: string;
    attempts: number;
    lastGuessAt: string | null;
    solved: boolean;
  }
>;

export function BlurRushLiveScoreboard({
  stats,
  currentPlayerId,
  className,
}: {
  stats: BlurRushLiveStats;
  currentPlayerId: string;
  className?: string;
}) {
  const rows = Object.entries(stats)
    .map(([playerId, s]) => ({ playerId, ...s }))
    .sort((a, b) => {
      // solved first, then most attempts
      if (a.solved !== b.solved) return a.solved ? -1 : 1;
      return b.attempts - a.attempts;
    });

  return (
    <HolographicCard className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-foreground">Live</div>
        <div className="text-xs text-foreground-muted">Tentatives</div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.playerId}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg border',
              r.playerId === currentPlayerId
                ? 'bg-primary/10 border-primary/20'
                : 'bg-card/40 border-border/30'
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm font-medium text-foreground">{r.playerName}</span>
                {r.solved && <CheckCircle2 className="h-4 w-4 text-success" />}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-foreground-muted">
                <Timer className="h-3 w-3" />
                <span>
                  {r.lastGuessAt ? new Date(r.lastGuessAt).toLocaleTimeString() : '—'}
                </span>
              </div>
            </div>
            <div className="text-sm font-bold text-foreground">{r.attempts}</div>
          </div>
        ))}
      </div>
    </HolographicCard>
  );
}
