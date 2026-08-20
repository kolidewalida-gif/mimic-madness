import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PlayerStats {
  id: string;
  user_id: string;
  games_played: number;
  games_won: number;
  audio_phone_games: number;
  quiz_games: number;
  standard_games: number;
  messages_sent: number;
  recordings_made: number;
  games_hosted: number;
  current_streak: number;
  best_streak: number;
  total_play_time_minutes: number;
}

interface FriendCode {
  user_id: string;
  code: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  stats: PlayerStats | null;
  friendCode: string | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateStats: (updates: Partial<PlayerStats>) => Promise<void>;
  incrementStat: (statName: keyof Omit<PlayerStats, 'id' | 'user_id' | 'created_at' | 'updated_at'>, amount?: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch stats
      const { data: statsData } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (statsData) {
        setStats(statsData);
      }

      // Fetch friend code
      const { data: codeData } = await supabase
        .from('friend_codes')
        .select('code')
        .eq('user_id', userId)
        .single();
      
      if (codeData) {
        setFriendCode(codeData.code);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setStats(null);
          setFriendCode(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    //
    // Le `.catch` n'est pas décoratif : `getSession()` prend un verrou Navigator
    // LockManager et **rejette** quand ce verrou est déjà détenu (deuxième
    // onglet, rafraîchissement de jeton en cours). En production cela produisait
    // un « Uncaught (in promise) Acquiring an exclusive Navigator LockManager
    // lock … immediately failed », et surtout `isLoading` restait vrai pour
    // toujours puisque seul le chemin de succès le remettait à faux.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user.id);
        }
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        // `onAuthStateChange` reste branché et fournira la session dès qu'elle
        // sera lisible : on débloque l'interface au lieu de la figer.
        console.warn('[auth] session initiale illisible :', error);
        setIsLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Realtime subscriptions for stats and profile
  useEffect(() => {
    if (!user) return;

    const statsChannel = supabase
      .channel(`player-stats-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'player_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Auth] Stats updated:', payload.new);
          setStats(payload.new as PlayerStats);
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Auth] Profile updated:', payload.new);
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setStats(null);
    setFriendCode(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Update profile error:', error);
      throw error;
    }

    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, [user]);

  const updateStats = useCallback(async (updates: Partial<PlayerStats>) => {
    if (!user) return;

    const { error } = await supabase
      .from('player_stats')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Update stats error:', error);
      throw error;
    }

    setStats(prev => prev ? { ...prev, ...updates } : null);
  }, [user]);

  const incrementStat = useCallback(async (
    statName: keyof Omit<PlayerStats, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    amount: number = 1
  ) => {
    if (!user || !stats) return;

    const currentValue = stats[statName] as number || 0;
    const newValue = currentValue + amount;

    await updateStats({ [statName]: newValue } as Partial<PlayerStats>);
  }, [user, stats, updateStats]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      stats,
      friendCode,
      isLoading,
      signInWithGoogle,
      signOut,
      updateProfile,
      updateStats,
      incrementStat,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
