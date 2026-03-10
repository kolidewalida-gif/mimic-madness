import { cn } from '@/lib/utils';
import { DollarSign, MapPin, Building, Lock } from 'lucide-react';
import { TOKEN_COLORS, BOARD_SPACES, type TokenType } from '@/lib/monopolyBoard';
import { motion } from 'framer-motion';

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

export function MonopolyPlayerPanel({ players, currentTurnPlayerId, currentPlayerId, properties }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Joueurs</h3>
      {players.map((player, i) => {
        const isCurrentTurn = player.player_id === currentTurnPlayerId;
        const isMe = player.player_id === currentPlayerId;
        const color = TOKEN_COLORS[player.token_type as TokenType] || '#FF4444';
        const ownedProps = properties.filter(p => p.owner_id === player.player_id);
        const space = BOARD_SPACES[player.position];

        return (
          <motion.div
            key={player.player_id}
            layout
            className={cn(
              "p-3 rounded-xl border-2 transition-all",
              player.is_bankrupt && "opacity-40",
              isCurrentTurn
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-border/30 bg-card/60",
              isMe && !isCurrentTurn && "border-accent/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {/* Token color dot */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20"
                style={{ backgroundColor: color }}
              />
              <span className={cn("font-semibold text-sm flex-1 truncate", player.is_bankrupt && "line-through")}>
                {player.player_name}
                {isMe && <span className="text-xs text-muted-foreground ml-1">(vous)</span>}
              </span>
              {isCurrentTurn && (
                <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">TOUR</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span className={cn("font-bold", player.money < 0 ? "text-destructive" : "text-foreground")}>
                  {player.money}$
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span>{ownedProps.length} prop.</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{space?.nameFr?.substring(0, 12) || '?'}</span>
              </div>
              {player.in_jail && (
                <div className="flex items-center gap-1 text-destructive">
                  <Lock className="h-3 w-3" />
                  <span>Prison</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
