import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, LogOut, User, Trophy, Users, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AuthButtonProps {
  onOpenProfile?: () => void;
  onOpenFriends?: () => void;
  className?: string;
}

const AuthButtonComponent = ({ onOpenProfile, onOpenFriends, className }: AuthButtonProps) => {
  const { user, profile, stats, friendCode, isLoading, signInWithGoogle, signOut } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Erreur de connexion');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Erreur de déconnexion');
    }
  };

  const copyFriendCode = () => {
    if (friendCode) {
      navigator.clipboard.writeText(friendCode);
      setCopied(true);
      toast.success('Code ami copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        aria-label="Chargement du compte"
        aria-busy={isLoading}
        className={cn("menu-icon-control menu-focus", className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        aria-busy={isSigningIn}
        variant="outline"
        className={cn(
          "menu-focus",
          "gap-2 rounded-xl border-border/50 bg-background/50",
          "hover:bg-background hover:border-primary/50",
          "transition-all duration-200",
          className
        )}
      >
        {isSigningIn ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Connexion Google</span>
        <span className="sm:hidden">Connexion</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          type="button"
          variant="ghost" 
          aria-label={`Ouvrir le menu du compte de ${profile?.display_name || 'Joueur'}`}
          className={cn(
            "menu-focus",
            "gap-2 rounded-xl px-2 sm:px-3",
            "hover:bg-background/80 transition-all duration-200",
            className
          )}
        >
          <Avatar className="h-7 w-7 border border-primary/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {profile?.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
            {profile?.display_name || 'Joueur'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{profile?.display_name || 'Joueur'}</p>
            <p className="text-xs text-foreground-muted truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        {friendCode && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <p className="text-xs text-foreground-muted mb-1">Code Ami</p>
              <button
                type="button"
                onClick={copyFriendCode}
                aria-label={`Copier le code ami ${friendCode}`}
                className="menu-focus flex items-center gap-2 w-full px-2 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <span className="font-mono font-bold text-primary tracking-wider">{friendCode}</span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500 ml-auto" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-foreground-muted ml-auto" aria-hidden="true" />
                )}
              </button>
            </div>
          </>
        )}
        
        {stats && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                <span>{stats.games_won} victoires</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>{stats.games_played} parties</span>
              </div>
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {onOpenProfile && (
          <DropdownMenuItem onClick={onOpenProfile} className="gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Mon Profil
          </DropdownMenuItem>
        )}
        
        {onOpenFriends && (
          <DropdownMenuItem onClick={onOpenFriends} className="gap-2 cursor-pointer">
            <Users className="h-4 w-4" />
            Mes Amis
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const AuthButton = memo(AuthButtonComponent);
