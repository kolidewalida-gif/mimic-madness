import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Crown, Wifi, WifiOff, MoreVertical, UserMinus, ArrowRightLeft, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useToast } from '@/hooks/use-toast';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

interface InkPlayersListProps {
  players: Player[];
  lobbyCode: string;
  isHost: boolean;
  currentPlayerId: string;
  onKickPlayer?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
}

export const InkPlayersList = ({
  players,
  lobbyCode,
  isHost,
  currentPlayerId,
  onKickPlayer,
  onTransferHost,
}: InkPlayersListProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const { getAvatar } = useMultiplePlayerAvatars(players.map(p => p.id));

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode);
      playInkSound('inkSuccess', 0.4);
      setCopied(true);
      toast({
        title: "Code copié!",
        description: `Le code ${lobbyCode} a été copié`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Lobby Code Header */}
      <div className="flex items-center justify-between">
        <h3 
          className="text-lg font-bold text-primary"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          Joueurs ({players.length})
        </h3>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
        >
          <span className="font-mono font-bold tracking-wider">{lobbyCode}</span>
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Players List */}
      <div className="space-y-2">
        {players.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const canManage = isHost && !isCurrentPlayer && !player.isHost;
          const avatar = getAvatar(player.id);

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-all',
                'border border-border/50',
                isCurrentPlayer && 'bg-primary/10 border-primary/30',
                player.isDisconnected && 'opacity-50'
              )}
            >
              {/* Avatar with profile photo */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center overflow-hidden',
                'border-2',
                player.isHost ? 'border-primary' : 'border-border'
              )}>
                {avatar.type === 'image' && avatar.imageUrl ? (
                  <img 
                    src={avatar.imageUrl} 
                    alt={player.name} 
                    className="w-full h-full object-cover"
                  />
                ) : player.isHost ? (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center bg-muted"
                    style={avatar.backgroundColor ? { backgroundColor: avatar.backgroundColor } : undefined}
                  >
                    <span className="text-sm font-bold text-foreground">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-medium truncate',
                    isCurrentPlayer && 'text-primary'
                  )}>
                    {player.name}
                  </span>
                  {isCurrentPlayer && (
                    <span className="text-xs text-primary">(vous)</span>
                  )}
                </div>
                {player.isHost && (
                  <span className="text-xs text-primary">Hôte</span>
                )}
              </div>

              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {player.isDisconnected ? (
                  <div className="flex items-center gap-1 text-warning">
                    <WifiOff className="w-4 h-4" />
                    {player.disconnectedTimeLeft && (
                      <span className="text-xs">{player.disconnectedTimeLeft}s</span>
                    )}
                  </div>
                ) : (
                  <Wifi className="w-4 h-4 text-success" />
                )}

                {/* Host Actions */}
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="bg-card border-border/50"
                    >
                      {onTransferHost && (
                        <DropdownMenuItem
                          onClick={() => {
                            playInkSound('brushTap', 0.4);
                            onTransferHost(player.id);
                          }}
                          className="gap-2 text-foreground hover:text-primary focus:text-primary"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          Transférer hôte
                        </DropdownMenuItem>
                      )}
                      {onKickPlayer && (
                        <DropdownMenuItem
                          onClick={() => {
                            playInkSound('inkError', 0.4);
                            onKickPlayer(player.id);
                          }}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <UserMinus className="w-4 h-4" />
                          Expulser
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};