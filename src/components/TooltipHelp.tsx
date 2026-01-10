import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Lightbulb, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface TooltipHelpProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'always';
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
  delay?: number;
}

export const TooltipHelp = ({
  content,
  title,
  position = 'top',
  trigger = 'hover',
  children,
  className = '',
  showIcon = true,
  delay = 300
}: TooltipHelpProps) => {
  const [isVisible, setIsVisible] = useState(trigger === 'always');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (trigger === 'hover') {
      const id = setTimeout(() => {
        setIsVisible(true);
        playSoundEffect('hoverSoft', 0.2);
      }, delay);
      setTimeoutId(id);
    } else if (trigger === 'click') {
      setIsVisible(true);
      playSoundEffect('click', 0.3);
    }
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (trigger !== 'always') setIsVisible(false);
  };

  const toggleTooltip = () => {
    if (trigger === 'click') {
      setIsVisible(prev => !prev);
      if (!isVisible) playSoundEffect('click', 0.3);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div
      className={cn("relative inline-flex items-center gap-1", className)}
      onMouseEnter={trigger === 'hover' ? showTooltip : undefined}
      onMouseLeave={trigger === 'hover' ? hideTooltip : undefined}
      onClick={trigger === 'click' ? toggleTooltip : undefined}
    >
      {children}
      {showIcon && trigger === 'click' && (
        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-[200] min-w-[200px] max-w-[300px] p-3 rounded-xl",
              "bg-popover/95 backdrop-blur-xl border border-border/50 shadow-xl",
              positionClasses[position]
            )}
          >
            {title && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
                <Lightbulb className="h-4 w-4 text-yellow-400" />
                <span className="font-semibold text-sm">{title}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
            
            {/* Arrow */}
            <div
              className={cn(
                "absolute w-0 h-0 border-8 border-popover/95",
                arrowClasses[position]
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Contextual help banner
interface HelpBannerProps {
  message: string;
  type?: 'info' | 'tip' | 'warning';
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const HelpBanner = ({
  message,
  type = 'info',
  onDismiss,
  action,
  className = ''
}: HelpBannerProps) => {
  const typeStyles = {
    info: 'bg-accent/10 border-accent/30 text-accent',
    tip: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    warning: 'bg-destructive/10 border-destructive/30 text-destructive',
  };

  const icons = {
    info: <HelpCircle className="h-5 w-5" />,
    tip: <Lightbulb className="h-5 w-5" />,
    warning: <HelpCircle className="h-5 w-5" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border",
        typeStyles[type],
        className
      )}
    >
      {icons[type]}
      <p className="flex-1 text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1 text-sm font-medium hover:underline"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-full hover:bg-background/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
};

// First-time feature spotlight
interface SpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  targetRef?: React.RefObject<HTMLElement>;
}

export const FeatureSpotlight = ({
  isOpen,
  onClose,
  title,
  description,
}: SpotlightProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Overlay with spotlight cutout */}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />

        {/* Content card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative max-w-sm mx-4 p-6 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/20"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-background/50 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xs text-primary font-medium uppercase tracking-wider">Nouveau</span>
              <h3 className="font-display font-bold">{title}</h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {description}
          </p>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
          >
            Compris!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
