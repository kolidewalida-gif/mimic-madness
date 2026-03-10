import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dice1, Home, DollarSign, Building, Landmark, Handshake, CreditCard, AlertTriangle } from 'lucide-react';
import { GameLogo } from '@/components/GameLogo';
import { MonopolyBoard3DCanvas } from './MonopolyBoard3D';
import { MonopolyPlayerPanel } from './MonopolyPlayerPanel';
import { MonopolyPropertyPanel } from './MonopolyPropertyPanel';
import { MonopolyCardModal } from './MonopolyCardModal';
import { useMonopolyGame } from '@/hooks/useMonopolyGame';
import { BOARD_SPACES } from '@/lib/monopolyBoard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface MonopolyGameScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

export const MonopolyGameScreen = ({ currentPlayer, players, lobbyId, onEndGame }: MonopolyGameScreenProps) => {
  const [showProperties, setShowProperties] = useState(false);
  const {
    game,
    mPlayers,
    properties,
    currentCard,
    message,
    animatingTo,
    isMyTurn,
    currentTurnPlayer,
    myPlayer,
    rollDice,
    buyProperty,
    skipBuy,
    executeCard,
    buyHouse,
    mortgageProperty,
    useJailCard,
    payJailFine,
    declareBankruptcy,
  } = useMonopolyGame(lobbyId, currentPlayer, players);

  if (!game || mPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <GameLogo size="lg" />
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Préparation du plateau...</p>
        </div>
      </div>
    );
  }

  if (game.is_finished) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <h1 className="text-4xl font-bold text-primary">🏆 Partie Terminée !</h1>
          <div className="p-6 rounded-2xl bg-card border border-border">
            <p className="text-xl mb-2">Le gagnant est</p>
            <p className="text-3xl font-bold text-primary">{game.winner_name}</p>
          </div>
          <div className="space-y-2">
            {mPlayers.sort((a, b) => b.money - a.money).map((p, i) => (
              <div key={p.player_id} className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/30">
                <span className="font-medium">#{i + 1} {p.player_name}</span>
                <span className="text-primary font-bold">{p.money}$</span>
              </div>
            ))}
          </div>
          <Button onClick={onEndGame} size="lg" className="w-full">
            Retour au lobby
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentSpace = myPlayer ? BOARD_SPACES[myPlayer.position] : null;
  const currentProp = myPlayer ? properties.find(p => p.property_index === myPlayer.position) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900/50 to-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/20">
        <Button variant="ghost" onClick={onEndGame} className="gap-2 text-foreground/70">
          <ArrowLeft className="h-4 w-4" />
          Quitter
        </Button>
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary text-lg">MONOPOLY</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowProperties(!showProperties)}>
          <Building className="h-4 w-4 mr-1" />
          Propriétés
        </Button>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1800px] mx-auto">
        {/* Left: Players */}
        <div className="lg:w-72 space-y-3">
          <MonopolyPlayerPanel
            players={mPlayers}
            currentTurnPlayerId={game.player_order[game.current_player_index]}
            currentPlayerId={currentPlayer.id}
            properties={properties}
          />
        </div>

        {/* Center: 3D Board */}
        <div className="flex-1 space-y-4">
          <MonopolyBoard3DCanvas
            players={mPlayers}
            properties={properties}
            lastDice1={game.last_dice_1}
            lastDice2={game.last_dice_2}
            animatingTo={animatingTo}
            currentPlayerId={game.player_order[game.current_player_index]}
          />

          {/* Message & Actions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={message + game.phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-card border border-border/50 space-y-3"
            >
              {/* Turn indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    isMyTurn ? "bg-green-500 animate-pulse" : "bg-muted"
                  )} />
                  <span className="font-medium text-sm">
                    {isMyTurn ? 'Votre tour !' : `Tour de ${currentTurnPlayer?.player_name}`}
                  </span>
                </div>
                {myPlayer && (
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <DollarSign className="h-4 w-4" />
                    {myPlayer.money}
                  </div>
                )}
              </div>

              {/* Message */}
              {message && (
                <p className="text-center text-foreground/80 text-sm">{message}</p>
              )}

              {/* Dice display */}
              {game.last_dice_1 && game.last_dice_2 && (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-border flex items-center justify-center text-2xl font-bold text-foreground">
                    {game.last_dice_1}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-border flex items-center justify-center text-2xl font-bold text-foreground">
                    {game.last_dice_2}
                  </div>
                  {game.last_dice_1 === game.last_dice_2 && (
                    <span className="text-xs text-primary font-bold px-2 py-1 bg-primary/10 rounded-full">DOUBLE!</span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {isMyTurn && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {/* Rolling phase */}
                  {game.phase === 'rolling' && !myPlayer?.in_jail && (
                    <Button onClick={rollDice} className="gap-2 bg-primary hover:bg-primary/90">
                      <Dice1 className="h-5 w-5" />
                      Lancer les dés
                    </Button>
                  )}

                  {/* Jail phase */}
                  {game.phase === 'rolling' && myPlayer?.in_jail && (
                    <>
                      <Button onClick={rollDice} variant="outline" className="gap-2">
                        <Dice1 className="h-4 w-4" />
                        Tenter un double
                      </Button>
                      <Button onClick={payJailFine} variant="outline" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Payer 50$
                      </Button>
                      {myPlayer.has_get_out_of_jail_card > 0 && (
                        <Button onClick={useJailCard} variant="outline" className="gap-2">
                          <CreditCard className="h-4 w-4" />
                          Carte Sortie
                        </Button>
                      )}
                    </>
                  )}

                  {/* Buying phase */}
                  {game.phase === 'buying' && currentSpace && (
                    <>
                      <Button onClick={buyProperty} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Home className="h-4 w-4" />
                        Acheter ({currentSpace.price}$)
                      </Button>
                      <Button onClick={skipBuy} variant="outline">
                        Passer
                      </Button>
                    </>
                  )}

                  {/* Card phase */}
                  {game.phase === 'card' && (
                    <Button onClick={executeCard} className="gap-2">
                      OK
                    </Button>
                  )}

                  {/* Bankrupt phase */}
                  {(game.phase === 'bankrupt' || (myPlayer && myPlayer.money < 0)) && (
                    <Button onClick={declareBankruptcy} variant="destructive" className="gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Déclarer faillite
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Properties panel */}
        <AnimatePresence>
          {showProperties && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:w-80"
            >
              <MonopolyPropertyPanel
                properties={properties}
                myPlayerId={currentPlayer.id}
                myMoney={myPlayer?.money || 0}
                onBuyHouse={buyHouse}
                onMortgage={mortgageProperty}
                isMyTurn={isMyTurn}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card Modal */}
      {currentCard && game?.phase === 'card' && (
        <MonopolyCardModal card={currentCard} onClose={executeCard} isMyTurn={isMyTurn} />
      )}
    </div>
  );
};
