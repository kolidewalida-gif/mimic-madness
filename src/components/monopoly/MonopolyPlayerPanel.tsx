import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { DollarSign, MapPin, Building, Lock, Crown } from 'lucide-react';
import { TOKEN_COLORS, BOARD_SPACES, type TokenType } from '@/lib/monopolyBoard';
import { GRAFFITI_TEXT_SHADOW_SM } from '@/components/ink/InkPrimitives';
import { cn } from '@/lib/utils';

interface MonopolyPlayer {
  player_id: string;
  player_name: string;
  token_type: string;
  position: number;
  money: number;
  is_bankrupt: boolean;
  in_jail: boolean;
  has_get_out_of_jail_card: number;
}

interface Property {
  property_index: number;
  owner_id: string | null;
  houses: number;
}

interface Props {
  players: MonopolyPlayer[];
  currentTurnPlayerId: string;
  currentPlayerId: string;
  properties: Property[];
}

/* ============================================================
   AnimatedMoney — count-up/down tween from MONEY_DELTA
   The component reads `money` from props and tweens the displayed
   number toward the new target over `MONEY_TWEEN_MS` ms, briefly
   flashing green (gain) or red (loss) on every change. Read-only;
   the underlying `money` value is the source of truth.
============================================================ */
const MONEY_TWEEN_MS = 500;

function AnimatedMoney({ money }: { money: number }) {
  const value = useMotionValue(money);
  const display = useTransform(value, (v) => Math.round(v));
  const [flash, setFlash] = useState<'gain' | 'loss' | null>(null);
  const prevRef = useRef(money);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = money;
    if (prev === money) return;

    const controls = animate(value, money, {
      duration: MONEY_TWEEN_MS / 1000,
      ease: 'easeOut',
    });

    setFlash(money > prev ? 'gain' : 'loss');
    const t = setTimeout(() => setFlash(null), MONEY_TWEEN_MS + 100);

    return () => {
      controls.stop();
      clearTimeout(t);
    };
  }, [money, value]);

  const color =
    flash === 'gain'
      ? '#4ade80'
      : flash === 'loss'
        ? '#f87171'
        : money < 0
          ? '#f87171'
          : '#86efac';

  return (
    <motion.span
      animate={
        flash !== null ? { scale: [1, 1.18, 1] } : { scale: 1 }
      }
      transition={{ duration: 0.45 }}
      className="text-sm font-black leading-none"
      style={{
        fontFamily: "'Outfit', sans-serif",
        color,
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      <motion.span>{display}</motion.span>$
    </motion.span>
  );
}

export function MonopolyPlayerPanel({
  players,
  currentTurnPlayerId,
  currentPlayerId,
  properties,
}: Props) {
  return (
    <div className="space-y-2">
      {/* HEADER */}
      <div
        className="px-3 py-2 rounded-2xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))',
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}
      >
        <h3
          className="text-lg font-black uppercase tracking-wider text-white text-center"
          style={{
            fontFamily: "'Outfit', sans-serif",
            textShadow: GRAFFITI_TEXT_SHADOW_SM,
          }}
        >
          🎮 JOUEURS ({players.length})
        </h3>
      </div>

      {/* PLAYER CARDS */}
      {players.map((player, idx) => {
        const isCurrentTurn = player.player_id === currentTurnPlayerId;
        const isMe = player.player_id === currentPlayerId;
        const color = TOKEN_COLORS[player.token_type as TokenType] || '#FF4444';
        const ownedProps = properties.filter(
          (p) => p.owner_id === player.player_id,
        );
        const totalHouses = ownedProps.reduce(
          (sum, p) => sum + (p.houses || 0),
          0,
        );
        const space = BOARD_SPACES[player.position];

        return (
          <motion.div
            key={player.player_id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={
              player.is_bankrupt
                ? { opacity: 0.4, scale: 0.96, x: 0 }
                : { opacity: 1, x: 0, scale: 1 }
            }
            transition={{ delay: idx * 0.05, duration: 0.35 }}
            whileHover={!player.is_bankrupt ? { y: -2 } : undefined}
            className={cn(
              'relative rounded-2xl overflow-hidden',
              player.is_bankrupt && 'grayscale',
            )}
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
              border: isCurrentTurn
                ? `3.5px solid ${color}`
                : '3px solid var(--ink-line)',
              boxShadow: isCurrentTurn
                ? `0 0 0 rgba(0,0,0,0), 0 0 22px ${color}aa`
                : '0 0 0 rgba(0,0,0,0)',
            }}
          >
            {/* Active-turn spotlight overlay — soft animated glow ribbon. */}
            {isCurrentTurn && !player.is_bankrupt && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: [0.18, 0.42, 0.18] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  background: `linear-gradient(120deg, transparent 0%, ${color}33 35%, ${color}55 50%, ${color}33 65%, transparent 100%)`,
                  mixBlendMode: 'screen',
                }}
              />
            )}

            {/* TOP — name + token */}
            <div
              className="flex items-center gap-2 px-3 py-2 relative"
              style={{
                background: `linear-gradient(180deg, ${color}33, transparent)`,
              }}
            >
              {/* Token disc */}
              <motion.div
                animate={
                  isCurrentTurn
                    ? { rotate: [-8, 8, -8], scale: [1, 1.1, 1] }
                    : undefined
                }
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: color,
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                <span
                  className="text-base font-black text-white leading-none uppercase"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  {player.player_name[0] || '?'}
                </span>
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-base font-black truncate leading-none',
                      player.is_bankrupt && 'line-through',
                    )}
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      color: '#fff',
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {player.player_name}
                  </span>
                  {isMe && (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide leading-none"
                      style={{
                        background: '#fbbf24',
                        color: 'var(--ink-line)',
                        border: '1px solid var(--ink-line)',
                      }}
                    >
                      VOUS
                    </span>
                  )}
                </div>
              </div>

              {isCurrentTurn && !player.is_bankrupt && (
                <motion.div
                  initial={{ rotate: -15, scale: 0 }}
                  animate={{ rotate: [-3, 3, -3], scale: 1 }}
                  transition={{
                    rotate: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                    scale: { duration: 0.3 },
                  }}
                  className="px-2 py-1 rounded-lg flex items-center gap-1"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                    border: '1px solid var(--ink-line)',
                    boxShadow: 'none',
                  }}
                >
                  <Crown
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                  />
                  <span
                    className="text-[10px] font-black text-white uppercase leading-none"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    TOUR
                  </span>
                </motion.div>
              )}
            </div>

            {/* STATS GRID */}
            <div className="px-3 py-2 grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1">
                <DollarSign
                  className="w-3 h-3 text-green-400"
                  strokeWidth={3}
                />
                <AnimatedMoney money={player.money} />
              </div>
              <div className="flex items-center gap-1">
                <Building
                  className="w-3 h-3 text-purple-400"
                  strokeWidth={3}
                />
                <span
                  className="text-sm font-black text-white/80 leading-none"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {ownedProps.length}p
                  {totalHouses > 0 && ` · ${totalHouses}🏠`}
                </span>
              </div>
              <div className="flex items-center gap-1 col-span-2">
                <MapPin
                  className="w-3 h-3 text-cyan-400 flex-shrink-0"
                  strokeWidth={3}
                />
                <span
                  className="text-xs font-bold text-white/60 leading-none truncate"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {space?.nameFr || '?'}
                </span>
              </div>
              {player.in_jail && (
                <div
                  className="col-span-2 flex items-center gap-1 px-2 py-1 rounded-md"
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1.5px solid rgba(239,68,68,0.5)',
                  }}
                >
                  <Lock
                    className="w-3 h-3 text-red-400"
                    strokeWidth={3}
                  />
                  <span
                    className="text-[11px] font-black text-red-300 uppercase tracking-wider leading-none"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    EN PRISON
                  </span>
                </div>
              )}
              {player.is_bankrupt && (
                <div className="col-span-2 text-center">
                  <span
                    className="text-[11px] font-black text-red-400 uppercase tracking-wider"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    💀 FAILLITE
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
