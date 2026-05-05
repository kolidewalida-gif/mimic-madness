import { createContext, useContext, ReactNode } from 'react';
import { useAchievementsSync } from '@/hooks/useAchievementsSync';

type AchievementsContextType = ReturnType<typeof useAchievementsSync>;

const AchievementsContext = createContext<AchievementsContextType | null>(null);

export const AchievementsProvider = ({ children }: { children: ReactNode }) => {
  const achievements = useAchievementsSync();
  
  return (
    <AchievementsContext.Provider value={achievements}>
      {children}
    </AchievementsContext.Provider>
  );
};

export const useAchievementsContext = () => {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievementsContext must be used within AchievementsProvider');
  }
  return context;
};

// Optional hook that doesn't throw if context is missing
export const useOptionalAchievements = () => {
  return useContext(AchievementsContext);
};
