import { memo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Trophy, Gamepad2, Target, Flame, Edit2, Check, X, LogIn, LogOut, Gift, Award } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { HolographicCard } from '@/components/premium/HolographicCard';
import { NeonText } from '@/components/premium/NeonText';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { InteractiveWrapper } from '@/components/premium/InteractiveWrapper';
import { LevelProgressBar } from '@/components/LevelProgressBar';
import { RewardsPanel } from '@/components/RewardsPanel';
import { AchievementsPanel } from '@/components/AchievementsPanel';
const ProfileSidebarComponent = () => {
  const { user, profile, stats, isLoading, signInWithGoogle, signOut, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    if (profile?.display_name) {
      setEditName(profile.display_name);
    }
  }, [profile?.display_name]);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({ display_name: editName.trim() });
      setIsEditing(false);
      toast.success('Pseudo mis à jour !');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const winRate = stats?.games_played && stats.games_played > 0
    ? Math.round((stats.games_won || 0) / stats.games_played * 100)
    : 0;

  // Non connecté
  if (!user && !isLoading) {
    return (
      <HolographicCard intensity="medium" className="w-[260px] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border/20">
          <NeonText size="sm" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mon Profil
          </NeonText>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-border/20">
              <User className="h-10 w-10 text-foreground-muted/50" />
            </div>
            <p className="text-xs text-foreground-muted px-4 leading-relaxed">
              Connectez-vous pour sauvegarder votre progression
            </p>
            <InteractiveWrapper magnetic glow>
              <PremiumButton variant="glow" size="md" onClick={signInWithGoogle} className="w-full">
                <LogIn className="h-3.5 w-3.5 mr-2" />
                Connexion Google
              </PremiumButton>
            </InteractiveWrapper>
          </div>
        </div>
      </HolographicCard>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="w-[260px] bg-card/40 backdrop-blur-xl border border-border/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-border/20 bg-background/20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-24 mx-auto bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <HolographicCard intensity="medium" className="w-[260px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
          <NeonText size="sm" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mon Profil
          </NeonText>
          <InteractiveWrapper glow>
            <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </InteractiveWrapper>
        </div>

        <div className="p-4 space-y-4">
          {/* Avatar and name */}
          <div className="text-center space-y-2">
            <Avatar className="h-20 w-20 mx-auto ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            {isEditing ? (
              <div className="flex items-center gap-1 px-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-center text-sm bg-background/50" placeholder="Votre pseudo" autoFocus />
                <button onClick={handleSave} disabled={isSaving} className="p-1.5 rounded hover:bg-green-500/20"><Check className="h-3.5 w-3.5 text-green-500" /></button>
                <button onClick={() => setIsEditing(false)} className="p-1.5 rounded hover:bg-red-500/20"><X className="h-3.5 w-3.5 text-red-500" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1">
                <span className="font-semibold text-base">{profile?.display_name || 'Joueur'}</span>
                <button onClick={() => setIsEditing(true)} className="p-1 rounded hover:bg-muted"><Edit2 className="h-3 w-3 text-muted-foreground" /></button>
              </div>
            )}
          </div>

          {/* Level Progress Bar */}
          <LevelProgressBar className="bg-background/30 rounded-xl p-3 border border-border/10" />

          {/* Win Rate */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-3 text-center border border-primary/10">
            <div className="text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{winRate}%</div>
            <div className="text-xs text-foreground-muted">Taux de victoire</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Gamepad2} label="Parties" value={stats?.games_played || 0} />
            <StatCard icon={Trophy} label="Victoires" value={stats?.games_won || 0} />
            <StatCard icon={Flame} label="Série" value={stats?.current_streak || 0} />
            <StatCard icon={Target} label="Meilleure" value={stats?.best_streak || 0} />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <InteractiveWrapper glow>
              <PremiumButton variant="neon" size="sm" onClick={() => setShowAchievements(true)} className="w-full text-xs">
                <Award className="h-3 w-3 mr-1" />
                Succès
              </PremiumButton>
            </InteractiveWrapper>
            <InteractiveWrapper glow>
              <PremiumButton variant="neon" size="sm" onClick={() => setShowRewards(true)} className="w-full text-xs">
                <Gift className="h-3 w-3 mr-1" />
                Récompenses
              </PremiumButton>
            </InteractiveWrapper>
          </div>
        </div>
      </HolographicCard>

      <RewardsPanel isOpen={showRewards} onClose={() => setShowRewards(false)} />
      <AchievementsPanel isOpen={showAchievements} onClose={() => setShowAchievements(false)} />
    </>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <div className="bg-background/30 rounded-xl p-2.5 text-center border border-border/10 hover:border-primary/20 transition-colors">
    <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
    <div className="text-lg font-bold">{value}</div>
    <div className="text-[10px] text-foreground-muted">{label}</div>
  </div>
);

export const ProfileSidebar = memo(ProfileSidebarComponent);