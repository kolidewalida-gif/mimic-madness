import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { VOICE_FILTERS, VoiceFilterId } from '@/lib/voiceFilters';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const SHADOW = "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810";
const SHADOW_SM = "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810";
const FONT = "'Caveat', cursive";

interface InkVoiceFilterPickerProps {
  value: VoiceFilterId;
  onChange: (filter: VoiceFilterId) => void;
  disabled?: boolean;
  compact?: boolean;
}

const InkVoiceFilterPickerComponent = ({
  value, onChange, disabled = false, compact = false,
}: InkVoiceFilterPickerProps) => {
  const handlePick = (id: VoiceFilterId) => {
    if (disabled) return;
    playInkSound('cartoonPop', 0.35);
    onChange(id);
  };

  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      {!compact && (
        <h4
          className="text-base font-black text-white flex items-center gap-1.5"
          style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
        >
          🎛️ Filtre voix
        </h4>
      )}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {VOICE_FILTERS.map((filter) => {
          const active = filter.id === value;
          return (
            <motion.button
              key={filter.id}
              type="button"
              onClick={() => handlePick(filter.id)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.08, rotate: -3 } : undefined}
              whileTap={!disabled ? { scale: 0.92 } : undefined}
              className={cn(
                'relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 px-1',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
              style={{
                background: active
                  ? `linear-gradient(180deg, ${filter.color}, ${filter.color}cc)`
                  : 'rgba(255,255,255,0.04)',
                border: '3px solid #0a0810',
                boxShadow: active ? `0 4px 0 #0a0810, 0 0 16px ${filter.color}88` : '0 3px 0 #0a0810',
              }}
              title={filter.description}
            >
              <span className="text-xl leading-none">{filter.emoji}</span>
              <span
                className="text-[10px] font-black text-white truncate w-full text-center leading-tight"
                style={{ fontFamily: FONT, textShadow: active ? SHADOW_SM : 'none' }}
              >
                {filter.label}
              </span>
              {active && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #34d399, #059669)',
                    border: '2px solid #0a0810',
                  }}
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export const InkVoiceFilterPicker = memo(InkVoiceFilterPickerComponent);
