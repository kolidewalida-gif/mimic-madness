import { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Palette } from 'lucide-react';
import { useChatColor, ChatColorOption } from '@/hooks/useChatColor';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const SHADOW = "2px 2px 0 var(--ink-line), -1.5px -1.5px 0 var(--ink-line), 1.5px -1.5px 0 var(--ink-line), -1.5px 1.5px 0 var(--ink-line)";
const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";
const FONT = "'Outfit', sans-serif";

const Swatch = memo(({
  option, current, unlocked, onPick, level,
}: {
  option: ChatColorOption;
  current: boolean;
  unlocked: boolean;
  onPick: (id: string) => void;
  level: number;
}) => {
  const isRainbow = option.hex === 'rainbow';
  const isAuto = option.id === 'default';

  return (
    <motion.button
      type="button"
      onClick={() => unlocked && onPick(option.id)}
      whileHover={unlocked ? { scale: 1.08, rotate: -3 } : undefined}
      whileTap={unlocked ? { scale: 0.92 } : undefined}
      className={cn(
        'relative h-14 rounded-2xl flex items-center justify-center px-2',
        !unlocked && 'cursor-not-allowed',
      )}
      style={{
        background: isRainbow
          ? 'conic-gradient(#ef4444, #fbbf24, #34d399, var(--ink-text-dim), var(--ink-accent), #ef4444)'
          : isAuto
            ? 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))'
            : option.hex,
        border: '1px solid var(--ink-line)',
        boxShadow: current ? `0 0 0 rgba(0,0,0,0), 0 0 18px ${isRainbow ? '#fbbf24' : option.hex}aa` : '0 0 0 rgba(0,0,0,0)',
        opacity: unlocked ? 1 : 0.45,
      }}
      title={`${option.label} · niveau ${option.minLevel}`}
    >
      {isAuto && (
        <Palette className="w-5 h-5 text-white/80" strokeWidth={2.5} />
      )}
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-xl">
          <div className="flex flex-col items-center gap-0.5">
            <Lock className="w-3.5 h-3.5 text-white" />
            <span
              className="text-[10px] font-black text-white"
              style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
            >
              Lvl {option.minLevel}
            </span>
          </div>
        </div>
      )}
      {current && unlocked && (
        <div
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #34d399, #059669)',
            border: '1px solid var(--ink-line)',
          }}
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
    </motion.button>
  );
});
Swatch.displayName = 'Swatch';

const InkChatColorPickerComponent = () => {
  const { palette, colorId, setColor, isUnlocked, loading } = useChatColor();
  const { level } = usePlayerLevel();

  const handlePick = (id: string) => {
    playInkSound('cartoonPop', 0.4);
    setColor(id);
  };

  return (
    <div
      className="relative rounded-3xl p-4 space-y-3"
      style={{
        background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
        border: '1px solid var(--ink-line)',
        boxShadow: 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--ink-text-dim)]" />
          <h3
            className="text-2xl font-black text-white"
            style={{ fontFamily: FONT, textShadow: SHADOW }}
          >
            Couleur du chat
          </h3>
        </div>
        <span
          className="text-xs font-black text-white/55"
          style={{ fontFamily: FONT }}
        >
          Lvl {level}
        </span>
      </div>

      <p className="text-xs text-white/45" style={{ fontFamily: FONT }}>
        Débloque de nouvelles couleurs en montant de niveau.
      </p>

      {loading ? (
        <div className="h-16 flex items-center justify-center text-white/40 text-xs">
          Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {palette.map((option) => (
            <Swatch
              key={option.id}
              option={option}
              current={colorId === option.id}
              unlocked={isUnlocked(option.id)}
              onPick={handlePick}
              level={level}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const InkChatColorPicker = memo(InkChatColorPickerComponent);
