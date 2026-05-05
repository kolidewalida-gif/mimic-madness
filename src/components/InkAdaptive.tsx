import { ReactNode } from 'react';
import { useInkMode } from '@/hooks/useInkMode';
import { cn } from '@/lib/utils';

interface InkAdaptiveWrapperProps {
  children: ReactNode;
  className?: string;
  hideBackgroundEffects?: boolean;
}

/**
 * Wrapper component that adapts the UI based on Ink mode (black/red theme)
 */
export const InkAdaptiveWrapper = ({
  children,
  className,
  hideBackgroundEffects = true,
}: InkAdaptiveWrapperProps) => {
  const { isInkMode, inkClasses } = useInkMode();

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-300',
        isInkMode && inkClasses.background,
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Conditionally render premium effects based on Ink mode
 */
export const InkHideable = ({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode; 
  fallback?: ReactNode;
}) => {
  const { isInkMode } = useInkMode();
  
  if (isInkMode) {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
};

/**
 * Card component that adapts to Ink mode (black/red)
 */
export const InkCard = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { isInkMode, inkClasses } = useInkMode();

  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all',
        isInkMode ? inkClasses.card : 'glass-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Button that adapts to Ink mode (black/red)
 */
export const InkButton = ({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
}) => {
  const { isInkMode, inkClasses } = useInkMode();

  const baseClasses = 'px-6 py-3 rounded-xl font-semibold transition-all duration-300';

  const variantClasses = {
    primary: isInkMode
      ? `${inkClasses.button} shadow-lg hover:shadow-glow`
      : 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: isInkMode
      ? inkClasses.buttonOutline
      : 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
    ghost: isInkMode
      ? 'text-foreground hover:bg-muted'
      : 'text-foreground hover:bg-muted',
  };

  return (
    <button className={cn(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </button>
  );
};

/**
 * Text component with Ink mode styling (black/red)
 */
export const InkText = ({
  children,
  variant = 'default',
  className,
  as: Component = 'span',
  ...props
}: {
  children: ReactNode;
  variant?: 'default' | 'muted' | 'title';
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
} & React.HTMLAttributes<HTMLElement>) => {
  const { isInkMode, inkFont, inkClasses } = useInkMode();

  const variantClasses = {
    default: isInkMode ? inkClasses.text : 'text-foreground',
    muted: isInkMode ? inkClasses.textMuted : 'text-muted-foreground',
    title: isInkMode ? 'text-primary font-black' : 'text-foreground font-bold',
  };

  return (
    <Component
      className={cn(variantClasses[variant], className)}
      style={variant === 'title' && isInkMode ? inkFont : undefined}
      {...props}
    >
      {children}
    </Component>
  );
};
