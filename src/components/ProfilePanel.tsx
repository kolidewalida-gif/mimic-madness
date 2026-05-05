import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { 
  X, User, Trophy, Gamepad2, Mic, MessageSquare, 
  Target, Flame, Clock, Edit2, Save, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfilePanelComponent = ({ isOpen, onClose }: ProfilePanelProps) => {
  const { user, profile, stats, friendCode, updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    
    setIsSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim() });
      toast.success('Profil mis à jour !');
      setIsEditing(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const statItems = [
    { icon: Gamepad2, label: 'Parties jouées', value: stats?.games_played || 0, color: 'text-primary' },
    { icon: Trophy, label: 'Victoires', value: stats?.games_won || 0, color: 'text-yellow-500' },
    { icon: Target, label: 'Audio Phone', value: stats?.audio_phone_games || 0, color: 'text-purple-500' },
    { icon: Target, label: 'Quiz', value: stats?.quiz_games || 0, color: 'text-blue-500' },
    { icon: Target, label: 'Standard', value: stats?.standard_games || 0, color: 'text-green-500' },
    { icon: MessageSquare, label: 'Messages envoyés', value: stats?.messages_sent || 0, color: 'text-cyan-500' },
    { icon: Mic, label: 'Enregistrements', value: stats?.recordings_made || 0, color: 'text-orange-500' },
    { icon: Gamepad2, label: 'Parties hébergées', value: stats?.games_hosted || 0, color: 'text-pink-500' },
    { icon: Flame, label: 'Série actuelle', value: stats?.current_streak || 0, color: 'text-red-500' },
    { icon: Flame, label: 'Meilleure série', value: stats?.best_streak || 0, color: 'text-amber-500' },
    { icon: Clock, label: 'Temps de jeu (min)', value: stats?.total_play_time_minutes || 0, color: 'text-indigo-500' },
  ];

  const winRate = stats && stats.games_played > 0 
    ? Math.round((stats.games_won / stats.games_played) * 100) 
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border/50 shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-bold text-lg">Mon Profil</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-4 border-primary/30">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                        {profile?.display_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Votre pseudo"
                            className="h-9"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            onClick={handleSave}
                            disabled={isSaving || !displayName.trim()}
                            className="h-9 w-9"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">
                            {profile?.display_name || 'Joueur'}
                          </h3>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setDisplayName(profile?.display_name || '');
                              setIsEditing(true);
                            }}
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <p className="text-sm text-foreground-muted truncate mt-1">
                        {user?.email}
                      </p>
                      {friendCode && (
                        <p className="text-xs text-primary font-mono mt-2">
                          Code: {friendCode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground-muted">Taux de victoire</span>
                      <span className="font-bold text-primary">{winRate}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${winRate}%` }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Statistiques
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {statItems.map((item, index) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-background/50 rounded-xl p-3 border border-border/50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <item.icon className={cn("h-4 w-4", item.color)} />
                          <span className="text-xs text-foreground-muted truncate">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-xl font-bold">{item.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const ProfilePanel = memo(ProfilePanelComponent);
