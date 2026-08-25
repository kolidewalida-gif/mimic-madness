import { useState } from 'react';
import { useTheme, themeConfig, ThemeType, visibleThemes } from '@/hooks/useTheme';
import { useAdmin } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { Palette, Check, Sparkles, RefreshCw } from 'lucide-react';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface ThemeSelectorProps {
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
  showInkToggle?: boolean;
}

export const ThemeSelector = ({ variant = 'full', className, showInkToggle = true }: ThemeSelectorProps) => {
  const { theme, setTheme, inkModeEnabled, setInkModeEnabled } = useTheme();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState<ThemeType | null>(null);

  // Filter out ink theme from normal selection if showInkToggle is enabled (it's a special mode).
  // `visibleThemes` retire en plus les thèmes réservés aux administrateurs.
  const selectable = visibleThemes(isAdmin, isAdminLoading);
  const availableThemes = showInkToggle ? selectable.filter(t => t !== 'ink') : selectable;

  const handleSelectTheme = (newTheme: ThemeType) => {
    if (newTheme !== theme) {
      playSoundEffect('powerUp', 0.5);
      setTheme(newTheme);
      
      // If selecting ink, also enable ink mode
      if (newTheme === 'ink') {
        setInkModeEnabled(true);
      }
    }
    setIsOpen(false);
  };

  const handleToggleInkMode = () => {
    playSoundEffect('transitionMagic', 0.5);
    const newEnabled = !inkModeEnabled;
    setInkModeEnabled(newEnabled);
    setIsOpen(false);

    // Ensure the intro animation replays when Ink mode is enabled
    if (newEnabled) {
      sessionStorage.removeItem('ink-animation-seen');
    }
    
    const shouldReload = window.confirm(
      newEnabled
        ? "Mode Ink activé. Recharger maintenant pour lancer l'animation et activer l'interface noir & blanc ?"
        : "Mode Ink désactivé. Recharger maintenant pour revenir à l'interface premium ?"
    );

    if (shouldReload) {
      window.location.reload();
    }
  };

  const handleToggle = () => {
    playSoundEffect('click', 0.3);
    setIsOpen(!isOpen);
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label="Choisir un thème"
          className="menu-icon-control menu-focus p-3 rounded-xl glass-ultra hover:scale-110 transition-all duration-300 group"
          onMouseEnter={() => playSoundEffect('hoverSoft', 0.2)}
        >
          <Palette className="w-5 h-5 text-primary group-hover:animate-spin" aria-hidden="true" />
        </button>

        {isOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le choix de thème"
            />
            <div className="absolute right-0 top-full mt-2 z-50 flex gap-2 p-2 glass-ultra rounded-xl animate-scaleIn">
              {availableThemes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectTheme(t)}
                  aria-label={`Thème ${themeConfig[t].name}`}
                  aria-pressed={theme === t}
                  onMouseEnter={() => {
                    setHoveredTheme(t);
                    playSoundEffect('hoverSoft', 0.15);
                  }}
                  onMouseLeave={() => setHoveredTheme(null)}
                  className={cn(
                    "menu-icon-control menu-focus w-10 h-10 rounded-lg transition-all duration-300 flex items-center justify-center text-xl",
                    "hover:scale-110 hover:shadow-lg",
                    theme === t && "ring-2 ring-white scale-110"
                  )}
                  style={{
                    background: `linear-gradient(135deg, hsl(${themeConfig[t].colors.primary}), hsl(${themeConfig[t].colors.secondary}))`,
                    boxShadow: hoveredTheme === t || theme === t 
                      ? `0 0 20px hsl(${themeConfig[t].colors.primary})` 
                      : 'none',
                  }}
                >
                  {theme === t && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    const inkConfig = themeConfig.ink;
    return (
      <div className={cn("flex gap-2 items-center", className)}>
        {availableThemes.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleSelectTheme(t)}
            onMouseEnter={() => playSoundEffect('hoverSoft', 0.15)}
            aria-label={`Thème ${themeConfig[t].name}`}
            aria-pressed={theme === t}
            className={cn(
              "menu-icon-control menu-focus w-12 h-12 rounded-xl transition-all duration-300 flex items-center justify-center text-2xl",
              "hover:scale-110 hover:shadow-lg relative overflow-hidden",
              theme === t && "ring-2 ring-white scale-105"
            )}
            style={{
              background: `linear-gradient(135deg, hsl(${themeConfig[t].colors.primary}), hsl(${themeConfig[t].colors.secondary}))`,
              boxShadow: theme === t ? `0 0 30px hsl(${themeConfig[t].colors.primary})` : 'none',
            }}
          >
            <span className="relative z-10">{themeConfig[t].emoji}</span>
            {theme === t && (
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
          </button>
        ))}

        {showInkToggle && (
          <button
            type="button"
            onClick={handleToggleInkMode}
            onMouseEnter={() => playSoundEffect('hoverSoft', 0.15)}
            className={cn(
              "w-12 h-12 rounded-xl transition-all duration-300 flex items-center justify-center text-2xl",
              "hover:scale-110 hover:shadow-lg relative overflow-hidden",
              inkModeEnabled && "ring-2 ring-white scale-105"
            )}
            style={{
              background: `linear-gradient(135deg, hsl(${inkConfig.colors.primary}), hsl(${inkConfig.colors.background}))`,
              boxShadow: inkModeEnabled ? `0 0 30px hsl(${inkConfig.colors.primary})` : 'none',
            }}
            aria-label={inkModeEnabled ? "Désactiver le mode Ink" : "Activer le mode Ink"}
            title={inkModeEnabled ? "Mode Ink activé" : "Activer le mode Ink"}
          >
            <span className="relative z-10">🖤</span>
            {inkModeEnabled && (
              <div className="absolute inset-0 bg-white/10" />
            )}
          </button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-gradient">Thème Visuel</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {availableThemes.map((t, index) => {
          const config = themeConfig[t];
          const isSelected = theme === t;

          return (
            <button
              key={t}
              onClick={() => handleSelectTheme(t)}
              onMouseEnter={() => {
                setHoveredTheme(t);
                playSoundEffect('hoverSoft', 0.15);
              }}
              onMouseLeave={() => setHoveredTheme(null)}
              className={cn(
                "relative p-4 rounded-2xl transition-all duration-500 group overflow-hidden",
                "hover:scale-[1.02] hover:-translate-y-1",
                isSelected 
                  ? "ring-2 ring-white shadow-2xl" 
                  : "hover:ring-1 hover:ring-white/30"
              )}
              style={{
                background: `linear-gradient(135deg, hsl(${config.colors.card}), hsl(${config.colors.background}))`,
                boxShadow: isSelected || hoveredTheme === t
                  ? `0 0 40px hsl(${config.colors.primary} / 0.5), inset 0 0 0 rgba(255,255,255,0.1)`
                  : 'inset 0 0 0 rgba(255,255,255,0.1)',
                animationDelay: `${index * 0.1}s`,
              }}
            >
              {/* Background gradient orbs */}
              <div 
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
                style={{ background: `hsl(${config.colors.primary})` }}
              />
              <div 
                className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
                style={{ background: `hsl(${config.colors.secondary})` }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                {/* Theme preview circle */}
                <div 
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-3xl",
                    "transition-all duration-500 group-hover:scale-110",
                    isSelected && "animate-pulse"
                  )}
                  style={{
                    background: `linear-gradient(135deg, hsl(${config.colors.primary}), hsl(${config.colors.secondary}))`,
                    boxShadow: `0 0 ${isSelected ? 30 : 15}px hsl(${config.colors.primary} / 0.6)`,
                  }}
                >
                  {config.emoji}
                </div>

                {/* Theme name */}
                <span 
                  className="font-bold text-lg"
                  style={{ color: `hsl(${config.colors.foreground})` }}
                >
                  {config.name}
                </span>

                {/* Description */}
                <span 
                  className="text-xs opacity-70"
                  style={{ color: `hsl(${config.colors.mutedForeground})` }}
                >
                  {config.description}
                </span>

                {/* Color preview dots */}
                <div className="flex gap-1.5 mt-1">
                  {['primary', 'secondary', 'accent'].map((c) => (
                    <div
                      key={c}
                      className="w-3 h-3 rounded-full ring-1 ring-white/20"
                      style={{ 
                        background: `hsl(${config.colors[c as keyof typeof config.colors]})`,
                        boxShadow: `0 0 8px hsl(${config.colors[c as keyof typeof config.colors]} / 0.5)`,
                      }}
                    />
                  ))}
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-4 h-4 text-background" />
                  </div>
                )}
              </div>

              {/* Shimmer effect on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, hsl(${config.colors.primary} / 0.1), transparent)`,
                  animation: 'shimmerSlide 2s infinite',
                }}
              />
            </button>
          );
        })}
      </div>
      
      {/* Ink Mode Toggle */}
      {showInkToggle && (
        <div className="pt-4 border-t border-border/30">
          <button
            onClick={handleToggleInkMode}
            className={cn(
              "w-full p-4 rounded-2xl transition-all duration-500 group overflow-hidden relative",
              "hover:scale-[1.02] hover:-translate-y-1",
              inkModeEnabled 
                ? "bg-card text-foreground ring-2 ring-primary border border-primary" 
                : "bg-card text-foreground border-2 border-border hover:border-primary"
            )}
          >
            <div className="relative z-10 flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all",
                inkModeEnabled ? "bg-primary/20" : "bg-muted"
              )}>
                🖤
              </div>
              <div className="text-left flex-1">
                <span className="font-bold text-lg block">Mode Ink</span>
                <span className={cn(
                  "text-xs",
                  inkModeEnabled ? "text-primary" : "text-muted-foreground"
                )}>
                  Interface minimaliste noir & rouge
                </span>
              </div>
              {inkModeEnabled && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <RefreshCw className="w-4 h-4" />
                  Rechargez pour appliquer
                </div>
              )}
            </div>
            
            {inkModeEnabled && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
