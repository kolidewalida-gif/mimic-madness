import { motion } from 'framer-motion';
import { CheckCircle2, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InkCard,
  GRAFFITI_TEXT_SHADOW_SM,
} from '@/components/ink/InkPrimitives';

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
      if (a.solved !== b.solved) return a.solved ? -1 : 1;
      return b.attempts - a.attempts;
    });

  return (
    <InkCard accent="var(--ink-text-dim)" className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-base font-black text-white leading-none"
          style={{
            fontFamily: "'Outfit', sans-serif",
            textShadow: GRAFFITI_TEXT_SHADOW_SM,
          }}
        >
          Live
        </span>
        <span
          className="text-xs uppercase tracking-wider font-black text-[var(--ink-text-dim)]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Tentatives
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((r, idx) => {
          const isMe = r.playerId === currentPlayerId;
          return (
            <motion.div
              key={r.playerId}
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: 1,
                x: 0,
                rotate: idx % 2 === 0 ? -0.5 : 0.5,
              }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-center justify-between p-2.5 rounded-2xl"
              style={{
                background: r.solved
                  ? 'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(5,150,105,0.05))'
                  : isMe
                    ? 'linear-gradient(180deg, rgba(6,182,212,0.22), rgba(14,116,144,0.05))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-base font-black text-white truncate leading-none"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {r.playerName}
                  </span>
                  {r.solved && (
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-300 flex-shrink-0"
                      strokeWidth={2.5}
                    />
                  )}
                </div>
                <div
                  className="flex items-center gap-1 text-[10px] mt-0.5 font-bold text-white/50"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Timer className="w-3 h-3" />
                  <span>
                    {r.lastGuessAt
                      ? new Date(r.lastGuessAt).toLocaleTimeString()
                      : '—'}
                  </span>
                </div>
              </div>
              <span
                className="text-base font-black flex-shrink-0 leading-none"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  color: r.solved
                    ? '#34d399'
                    : isMe
                      ? 'var(--ink-text-dim)'
                      : 'white',
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                {r.attempts}
              </span>
            </motion.div>
          );
        })}
      </div>
    </InkCard>
  );
}
