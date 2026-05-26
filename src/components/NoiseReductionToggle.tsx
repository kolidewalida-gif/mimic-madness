import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useNoiseReduction } from '@/hooks/useNoiseReduction';
import { cn } from '@/lib/utils';

interface NoiseReductionToggleProps {
  className?: string;
  /** Show the label next to the icon */
  showLabel?: boolean;
  /** Compact mode (icon only, smaller) */
  compact?: boolean;
}

/**
 * Toggle button for real-time noise reduction (RNNoise).
 *
 * Removes background noise (keyboard, fans, traffic, AC hum, etc.) from
 * the user's microphone in real time. Free, runs locally in the browser.
 *
 * State persists in localStorage.
 */
export const NoiseReductionToggle = ({
  className,
  showLabel = true,
  compact = false,
}: NoiseReductionToggleProps) => {
  const { isEnabled, isReady, error, toggle } = useNoiseReduction();

  const Icon = isEnabled ? Volume2 : VolumeX;
  const color = error ? '#ef4444' : isEnabled ? '#34d399' : '#6b7280';
  const title = error
    ? 'Réduction de bruit indisponible'
    : isEnabled
      ? 'Réduction de bruit active — clic pour désactiver'
      : 'Réduction de bruit désactivée — clic pour activer';

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={!isReady && !error}
      whileHover={isReady ? { scale: 1.05 } : undefined}
      whileTap={isReady ? { scale: 0.95 } : undefined}
      title={title}
      aria-label={title}
      aria-pressed={isEnabled}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl font-semibold transition-colors',
        compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
        !isReady && !error && 'opacity-50 cursor-wait',
        error && 'opacity-70 cursor-not-allowed',
        className,
      )}
      style={{
        background: `${color}15`,
        border: `1.5px solid ${color}44`,
        color,
      }}
    >
      <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {showLabel && (
        <span>
          {error
            ? 'Indisponible'
            : !isReady
              ? 'Chargement…'
              : isEnabled
                ? 'Anti-bruit ON'
                : 'Anti-bruit OFF'}
        </span>
      )}
      {/* Active indicator dot */}
      {isReady && isEnabled && !error && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
};
