import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Gift, Trophy, Zap, Star, ChevronUp, Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const AdminPanel = () => {
  const { isAdmin, isLoading, giveAllRewards, giveAllAchievements, setLevel, setStats } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [levelInput, setLevelInput] = useState('30');

  if (isLoading || !isAdmin) return null;

  const handleGiveAll = async () => {
    setIsBusy(true);
    const [r1, r2] = await Promise.all([
      giveAllRewards(),
      giveAllAchievements(),
    ]);
    if (r1 && r2) {
      toast.success('Toutes les récompenses et succès débloqués !');
    } else {
      toast.error('Erreur partielle');
    }
    setIsBusy(false);
  };

  const handleSetLevel = async () => {
    setIsBusy(true);
    const lvl = parseInt(levelInput);
    if (lvl >= 1 && lvl <= 30) {
      const ok = await setLevel(lvl);
      if (ok) toast.success(`Niveau défini à ${lvl}`);
      else toast.error('Erreur');
    }
    setIsBusy(false);
  };

  const handleMaxStats = async () => {
    setIsBusy(true);
    const ok = await setStats({
      games_played: 999,
      games_won: 888,
      current_streak: 50,
      best_streak: 50,
      games_hosted: 200,
      messages_sent: 5000,
      recordings_made: 500,
      quiz_games: 300,
      audio_phone_games: 200,
      standard_games: 200,
    });
    if (ok) toast.success('Stats maximisées !');
    else toast.error('Erreur');
    setIsBusy(false);
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-[200] w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Shield className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-16 left-4 z-[201] w-72 bg-card border border-destructive/50 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 bg-destructive text-destructive-foreground flex items-center justify-between">
                <span className="font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Admin Panel
                </span>
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 space-y-2">
                <AdminBtn
                  icon={Gift}
                  label="Débloquer tout (récomp + succès)"
                  onClick={handleGiveAll}
                  disabled={isBusy}
                />

                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={levelInput}
                    onChange={e => setLevelInput(e.target.value)}
                    className="w-16 h-8 text-center text-sm bg-background border border-border rounded-lg"
                  />
                  <AdminBtn
                    icon={ChevronUp}
                    label={`Set niveau ${levelInput}`}
                    onClick={handleSetLevel}
                    disabled={isBusy}
                    className="flex-1"
                  />
                </div>

                <AdminBtn
                  icon={Zap}
                  label="Max stats (999 parties, etc.)"
                  onClick={handleMaxStats}
                  disabled={isBusy}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const AdminBtn = ({ icon: Icon, label, onClick, disabled, className }: {
  icon: any; label: string; onClick: () => void; disabled: boolean; className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg",
      "bg-background hover:bg-muted border border-border transition-colors",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
  >
    {disabled ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 text-destructive" />}
    {label}
  </button>
);
