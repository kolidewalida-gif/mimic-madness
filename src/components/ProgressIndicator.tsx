import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'linear' | 'circular' | 'steps';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'accent' | 'success' | 'warning';
  animated?: boolean;
  className?: string;
}

export const ProgressIndicator = ({
  current,
  total,
  label,
  showPercentage = true,
  variant = 'linear',
  size = 'md',
  color = 'primary',
  animated = true,
  className = ''
}: ProgressIndicatorProps) => {
  const percentage = Math.round((current / total) * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: 'text-primary',
    accent: 'text-accent',
    success: 'text-green-500',
    warning: 'text-yellow-500',
  };

  const bgColorClasses = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const circleSizes = {
    sm: 80,
    md: 100,
    lg: 120,
  };

  if (variant === 'circular') {
    const circleSize = circleSizes[size];
    return (
      <div className={cn("relative inline-flex items-center justify-center", className)}>
        <svg
          width={circleSize}
          height={circleSize}
          viewBox="0 0 100 100"
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={colorClasses[color]}
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <span className={cn(
              "font-display font-bold",
              size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'
            )}>
              {percentage}%
            </span>
          )}
          {label && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'steps') {
    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{current}/{total}</span>
          </div>
        )}
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, index) => (
            <motion.div
              key={index}
              initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex-1 rounded-full transition-all duration-300",
                sizeClasses[size],
                index < current ? bgColorClasses[color] : "bg-muted/30"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // Linear variant (default)
  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && <span className="font-medium">{percentage}%</span>}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-muted/30 overflow-hidden", sizeClasses[size])}>
        <motion.div
          className={cn("h-full rounded-full", bgColorClasses[color])}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// Countdown progress
interface CountdownProgressProps {
  remaining: number;
  total: number;
  urgent?: boolean;
  className?: string;
}

export const CountdownProgress = ({
  remaining,
  total,
  urgent = false,
  className = ''
}: CountdownProgressProps) => {
  const percentage = (remaining / total) * 100;

  return (
    <div className={cn("relative h-2 w-full rounded-full bg-muted/30 overflow-hidden", className)}>
      <motion.div
        className={cn(
          "h-full rounded-full transition-colors duration-300",
          urgent ? "bg-destructive" : percentage < 30 ? "bg-warning" : "bg-primary"
        )}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3 }}
      />
      {urgent && (
        <motion.div
          className="absolute inset-0 bg-destructive/30"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </div>
  );
};

// Phase indicator
interface PhaseIndicatorProps {
  phases: string[];
  currentPhase: number;
  className?: string;
}

export const PhaseIndicator = ({
  phases,
  currentPhase,
  className = ''
}: PhaseIndicatorProps) => {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {phases.map((phase, index) => (
        <div key={phase} className="flex items-center">
          <motion.div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
              index === currentPhase 
                ? "bg-primary text-primary-foreground"
                : index < currentPhase 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted/30 text-muted-foreground"
            )}
            animate={index === currentPhase ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: index === currentPhase ? Infinity : 0, repeatDelay: 1 }}
          >
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs",
              index === currentPhase 
                ? "bg-white text-primary" 
                : index < currentPhase 
                  ? "bg-primary text-white" 
                  : "bg-muted text-muted-foreground"
            )}>
              {index < currentPhase ? '✓' : index + 1}
            </span>
            <span className="hidden sm:inline">{phase}</span>
          </motion.div>
          {index < phases.length - 1 && (
            <div className={cn(
              "w-8 h-0.5 mx-1",
              index < currentPhase ? "bg-primary" : "bg-muted/30"
            )} />
          )}
        </div>
      ))}
    </div>
  );
};
