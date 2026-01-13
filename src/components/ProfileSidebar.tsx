import { memo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Trophy, Gamepad2, Target, Flame, Edit2, Check, X, LogIn, LogOut } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ProfileSidebarComponent = () => {
  const { user, profile, stats, isLoading, signInWithGoogle, signOut, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      <div className="w-64 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-border/30 bg-background/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Mon Profil</span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <User className="h-8 w-8 text-foreground-muted" />
            </div>
            <p className="text-xs text-foreground-muted px-2">
              Connectez-vous pour sauvegarder votre progression
            </p>
            <Button
              onClick={signInWithGoogle}
              size="sm"
              className="w-full bg-gradient-to-r from-primary to-primary-hover"
            >
              <LogIn className="h-3 w-3 mr-2" />
              Connexion Google
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Chargement
  if (isLoading) {
    return (
      <div className="w-64 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden h-[500px]">
        <div className="p-4 border-b border-border/30 bg-background/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-24 mx-auto bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-background/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">Mon Profil</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={signOut}
          className="h-7 w-7 text-foreground-muted hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar et nom */}
        <div className="text-center space-y-2">
          <Avatar className="h-16 w-16 mx-auto ring-2 ring-primary/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl font-bold">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-center text-sm"
                placeholder="Votre pseudo"
              />
              <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-8 w-8">
                <Check className="h-3 w-3 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 w-8">
                <X className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <span className="font-semibold">{profile?.display_name || 'Joueur'}</span>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-6 w-6">
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {winRate}%
          </div>
          <div className="text-xs text-foreground-muted">Taux de victoire</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={Gamepad2} label="Parties" value={stats?.games_played || 0} />
          <StatCard icon={Trophy} label="Victoires" value={stats?.games_won || 0} />
          <StatCard icon={Flame} label="Série" value={stats?.current_streak || 0} />
          <StatCard icon={Target} label="Meilleure" value={stats?.best_streak || 0} />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <div className="bg-background/40 rounded-lg p-2 text-center border border-border/20">
    <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
    <div className="text-lg font-bold">{value}</div>
    <div className="text-[10px] text-foreground-muted">{label}</div>
  </div>
);

export const ProfileSidebar = memo(ProfileSidebarComponent);
