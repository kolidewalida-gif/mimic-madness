import { motion } from 'framer-motion';
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
          background: 'linear-gradient(180deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))',
          border: '3px solid #0a0810',
          boxShadow: '0 4px 0 #0a0810',
        }}
      >
        <h3
          className="text-lg font-black uppercase tracking-wider text-white text-center"
          style={{
            fontFamily: "'Caveat', cursive",
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
        const ownedProps = properties.filter((p) => p.owner_id === player.player_id);
        const totalHouses = ownedProps.reduce((sum, p) => sum + (p.houses || 0), 0);
        const space = BOARD_SPACES[player.position];

        return (
          <motion.div
            key={player.player_id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={!player.is_bankrupt ? { y: -2 } : undefined}
            className={cn(
              'relative rounded-2xl overflow-hidden',
              player.is_bankrupt && 'opacity-50 grayscale',
            )}
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
              border: isCurrentTurn ? `3.5px solid ${color}` : '3px solid #0a0810',
              boxShadow: isCurrentTurn
                ? `0 5px 0 #0a0810, 0 0 22px ${color}aa`
                : '0 4px 0 #0a0810',
            }}
          >
            {/* TOP — name + token */}
            <div
              className="flex items-center gap-2 px-3 py-2"
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
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: color,
                  border: '2.5px solid #0a0810',
                  boxShadow: '0 3px 0 #0a0810',
                }}
              >
                <span
                  className="text-base font-black text-white leading-none uppercase"
                  style={{
                    fontFamily: "'Caveat', cursive",
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
                      fontFamily: "'Caveat', cursive",
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
                        color: '#0a0810',
                        border: '1.5px solid #0a0810',
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
                  animate={{ rotate: -10, scale: 1 }}
                  className="px-2 py-1 rounded-lg flex items-center gap-1"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                    border: '2px solid #0a0810',
                    boxShadow: '0 2px 0 #0a0810',
                  }}
                >
                  <Crown className="w-3 h-3 text-white" fill="currentColor" />
                  <span
                    className="text-[10px] font-black text-white uppercase leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
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
                <DollarSign className="w-3 h-3 text-green-400" strokeWidth={3} />
                <span
                  className={cn(
                    'text-sm font-black leading-none',
                    player.money < 0 ? 'text-red-400' : 'text-green-300',
                  )}
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  {player.money}$
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Building className="w-3 h-3 text-purple-400" strokeWidth={3} />
                <span
                  className="text-sm font-black text-white/80 leading-none"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  {ownedProps.length}p
                  {totalHouses > 0 && ` · ${totalHouses}🏠`}
                </span>
              </div>
              <div className="flex items-center gap-1 col-span-2">
                <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" strokeWidth={3} />
                <span
                  className="text-xs font-bold text-white/60 leading-none truncate"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  {space?.nameFr || '?'}
                </span>
              </div>
              {player.in_jail && (
                <div className="col-span-2 flex items-center gap-1 px-2 py-1 rounded-md"
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1.5px solid rgba(239,68,68,0.5)',
                  }}
                >
                  <Lock className="w-3 h-3 text-red-400" strokeWidth={3} />
                  <span
                    className="text-[11px] font-black text-red-300 uppercase tracking-wider leading-none"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    EN PRISON
                  </span>
                </div>
              )}
              {player.is_bankrupt && (
                <div className="col-span-2 text-center">
                  <span
                    className="text-[11px] font-black text-red-400 uppercase tracking-wider"
                    style={{ fontFamily: "'Caveat', cursive" }}
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
