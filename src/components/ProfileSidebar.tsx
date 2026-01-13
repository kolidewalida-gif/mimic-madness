import { memo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Trophy, Gamepad2, Target, Flame, Clock, Edit2, Check, X, LogIn } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ProfileSidebarComponent = () => {
  const { user, profile, stats, isLoading, signInWithGoogle, updateProfile } = useAuth();
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
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-card/80 backdrop-blur-xl border-r border-border/50 z-40 flex flex-col">
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Mon Profil</h2>
              <p className="text-xs text-foreground-muted">Non connecté</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <User className="h-10 w-10 text-foreground-muted" />
            </div>
            <p className="text-sm text-foreground-muted">
              Connectez-vous pour sauvegarder votre progression
            </p>
            <Button
              onClick={signInWithGoogle}
              className="w-full bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/30"
            >
              <LogIn className="h-4 w-4 mr-2" />
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
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-card/80 backdrop-blur-xl border-r border-border/50 z-40">
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 w-72 bg-card/80 backdrop-blur-xl border-r border-border/50 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground truncate">Mon Profil</h2>
            <p className="text-xs text-foreground-muted truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar et nom */}
        <div className="text-center space-y-3">
          <Avatar className="h-20 w-20 mx-auto ring-4 ring-primary/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9 text-center"
                placeholder="Votre pseudo"
              />
              <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-9 w-9">
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} className="h-9 w-9">
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className="font-semibold text-lg">{profile?.display_name || 'Joueur'}</span>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 w-7">
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 text-center">
          <div className="text-4xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {winRate}%
          </div>
          <div className="text-sm text-foreground-muted">Taux de victoire</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Gamepad2} label="Parties" value={stats?.games_played || 0} color="primary" />
          <StatCard icon={Trophy} label="Victoires" value={stats?.games_won || 0} color="accent" />
          <StatCard icon={Flame} label="Série" value={stats?.current_streak || 0} color="destructive" />
          <StatCard icon={Target} label="Meilleure" value={stats?.best_streak || 0} color="primary" />
        </div>

        {/* Stats détaillées */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Détails</h3>
          <div className="space-y-2">
            <DetailRow icon={Clock} label="Temps de jeu" value={`${stats?.total_play_time_minutes || 0} min`} />
            <DetailRow icon={Gamepad2} label="Parties hébergées" value={stats?.games_hosted || 0} />
            <DetailRow icon={User} label="Quiz joués" value={stats?.quiz_games || 0} />
            <DetailRow icon={Target} label="Audio Phone" value={stats?.audio_phone_games || 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
  <div className={cn(
    "bg-background/50 rounded-xl p-3 text-center border border-border/30",
    "hover:border-primary/30 transition-colors"
  )}>
    <Icon className={cn("h-5 w-5 mx-auto mb-1", `text-${color}`)} />
    <div className="text-xl font-bold">{value}</div>
    <div className="text-xs text-foreground-muted">{label}</div>
  </div>
);

const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <div className="flex items-center justify-between py-2 px-3 bg-background/30 rounded-lg">
    <div className="flex items-center gap-2 text-sm text-foreground-muted">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <span className="font-medium">{value}</span>
  </div>
);

export const ProfileSidebar = memo(ProfileSidebarComponent);
