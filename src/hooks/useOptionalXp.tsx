import { useContext } from 'react';
import { XpContext } from '@/contexts/XpContext';

/**
 * Optional XP hook that returns null if XpProvider is not available
 * Safe to use in components that may or may not be wrapped in XpProvider
 */
export const useOptionalXp = () => {
  // This is safe because useContext always returns null if provider is missing
  const context = useContext(XpContext);
  return context;
};