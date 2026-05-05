import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const VolumeSlider = ({
  value,
  onChange,
  disabled = false,
  className,
  label = "Volume",
}: VolumeSliderProps) => {
  const VolumeIcon = value === 0 ? VolumeX : value < 50 ? Volume1 : Volume2;

  const handleChange = (values: number[]) => {
    onChange(values[0]);
  };

  const toggleMute = () => {
    onChange(value === 0 ? 50 : 0);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-xs text-foreground-muted font-display uppercase tracking-wider">
          {label}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMute}
          disabled={disabled}
          className={cn(
            'p-2 rounded-lg transition-all',
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-primary/10 cursor-pointer',
            value === 0 ? 'text-foreground-muted' : 'text-primary'
          )}
        >
          <VolumeIcon className="h-4 w-4" />
        </button>
        
        <Slider
          value={[value]}
          onValueChange={handleChange}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          className="flex-1"
        />
        
        <span className={cn(
          'text-xs font-display w-10 text-right tabular-nums',
          disabled ? 'text-foreground-muted' : 'text-foreground-secondary'
        )}>
          {value}%
        </span>
      </div>
    </div>
  );
};
