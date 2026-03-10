import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { GameCard } from '@/lib/monopolyBoard';

interface Props {
  card: GameCard;
  onClose: () => void;
  isMyTurn: boolean;
}

export function MonopolyCardModal({ card, onClose, isMyTurn }: Props) {
  const isChance = card.action !== 'collect_each'; // rough heuristic
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="w-80 p-6 rounded-2xl border-2 border-primary/50 bg-card shadow-2xl space-y-4 text-center"
      >
        <div className="text-4xl">
          {card.action === 'jail' ? '👮' : card.action === 'get_out_of_jail' ? '🎫' : card.action === 'collect' ? '💰' : card.action === 'pay' ? '💸' : '🎴'}
        </div>
        
        <h3 className="font-bold text-lg text-primary">
          {card.action === 'collect' || card.action === 'collect_each' ? 'Bonne nouvelle !' : 
           card.action === 'pay' || card.action === 'pay_each' || card.action === 'repairs' ? 'Mauvaise nouvelle...' :
           'Carte !'}
        </h3>
        
        <p className="text-foreground/80">{card.textFr}</p>
        
        {isMyTurn && (
          <Button onClick={onClose} className="w-full">
            OK
          </Button>
        )}
      </motion.div>
    </div>
  );
}
