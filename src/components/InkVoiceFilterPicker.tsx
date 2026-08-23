import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import {
  MAX_STACKED_FILTERS,
  VOICE_FILTERS,
  canStackVoiceFilter,
  combinedSemitones,
  normalizeVoiceFilterOrder,
  type VoiceFilterId,
} from '@/lib/voiceFilters';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";
const FONT = "'Outfit', sans-serif";

interface InkVoiceFilterPickerProps {
  /** Effets cumulés dans leur ordre DSP ; Autotune reste toujours en dernier. */
  value: VoiceFilterId[];
  onChange: (filters: VoiceFilterId[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

const InkVoiceFilterPickerComponent = ({
  value, onChange, disabled = false, compact = false,
}: InkVoiceFilterPickerProps) => {
  // Autotune termine toujours la chaîne : le rang affiché reste ainsi fidèle
  // au pipeline réel (effets directs, puis correction du blob).
  const selected = normalizeVoiceFilterOrder(value);
  const isFull = selected.length >= MAX_STACKED_FILTERS;

  const handlePick = (id: VoiceFilterId) => {
    if (disabled) return;

    // « Naturel » n'est pas un effet : c'est la remise à zéro.
    if (id === 'none') {
      playInkSound('cartoonSwoosh', 0.3);
      onChange([]);
      return;
    }

    if (selected.includes(id)) {
      playInkSound('cartoonSwoosh', 0.3);
      onChange(selected.filter((entry) => entry !== id));
      return;
    }

    // Autotune remplace une correction de hauteur fixe : les empiler rendrait
    // la cible incompréhensible. Les effets de timbre restent cumulables.
    if (!canStackVoiceFilter(selected, id)) {
      playInkSound('cartoonWobble', 0.3);
      return;
    }

    // Plein : on refuse plutôt que de retirer un choix du joueur dans son dos.
    if (isFull) {
      playInkSound('cartoonWobble', 0.3);
      return;
    }

    playInkSound('cartoonPop', 0.35);
    onChange(normalizeVoiceFilterOrder([...selected, id]));
  };

  const semitones = combinedSemitones(selected);

  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      {!compact && (
        <div className="flex items-baseline justify-between gap-2">
          <h4
            className="text-base font-black text-white flex items-center gap-1.5"
            style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
          >
            🎛️ Filtres voix
          </h4>
          <span className="text-[11px] font-bold text-white/50" style={{ fontFamily: FONT }}>
            {selected.length}/{MAX_STACKED_FILTERS} — effets max
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {VOICE_FILTERS.map((filter) => {
          const isNatural = filter.id === 'none';
          const active = isNatural
            ? selected.length === 0
            : selected.includes(filter.id as VoiceFilterId);
          const incompatible = !active && !isNatural &&
            !canStackVoiceFilter(selected, filter.id);
          // Grisé quand la pile est pleine ou quand Autotune remplace déjà une
          // transformation de hauteur fixe. Le clic reste capté pour son retour sonore.
          const blocked = !active && !isNatural && (isFull || incompatible);
          const blockedTitle = incompatible
            ? filter.id === 'autotune'
              ? 'Retire Hélium, Grave, Monstre ou Lutin pour utiliser Autotune'
              : `Retire Autotune pour ajouter ${filter.label}`
            : `Retire un effet pour ajouter ${filter.label}`;
          const rank = selected.indexOf(filter.id as VoiceFilterId);

          return (
            <motion.button
              key={filter.id}
              type="button"
              onClick={() => handlePick(filter.id)}
              disabled={disabled}
              whileHover={!disabled && !blocked ? { scale: 1.08, rotate: -3 } : undefined}
              whileTap={!disabled && !blocked ? { scale: 0.92 } : undefined}
              className={cn(
                'relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 px-1',
                disabled && 'opacity-50 cursor-not-allowed',
                blocked && 'opacity-35',
              )}
              style={{
                background: active
                  ? `linear-gradient(180deg, ${filter.color}, ${filter.color}cc)`
                  : 'rgba(255,255,255,0.04)',
                border: '1px solid var(--ink-line)',
                boxShadow: active ? `0 0 0 rgba(0,0,0,0), 0 0 16px ${filter.color}88` : '0 0 0 rgba(0,0,0,0)',
              }}
              title={blocked ? blockedTitle : filter.description}
              aria-pressed={active}
              aria-disabled={blocked}
            >
              <span className="text-xl leading-none">{filter.emoji}</span>
              <span
                className="text-[10px] font-black text-white truncate w-full text-center leading-tight"
                style={{ fontFamily: FONT, textShadow: active ? SHADOW_SM : 'none' }}
              >
                {filter.label}
              </span>

              {active && !isNatural && (
                /* Le rang, pas une simple coche : l'ordre change le résultat. */
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #34d399, #059669)',
                    border: '1px solid var(--ink-line)',
                  }}
                >
                  <span className="text-[10px] font-black text-white tabular-nums">
                    {rank + 1}
                  </span>
                </div>
              )}
              {active && isNatural && (
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
        })}
      </div>

      {selected.length > 0 && (
        <div
          className="px-3 py-2 rounded-xl space-y-1"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--ink-line)',
          }}
        >
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-white/60" />
            <div className="text-xs text-white/80 leading-tight" style={{ fontFamily: FONT }}>
              {/* La chaîne complète, dans l'ordre où elle sera appliquée. */}
              {selected.map((id, index) => {
                const def = VOICE_FILTERS.find((entry) => entry.id === id);
                if (!def) return null;
                return (
                  <span key={id}>
                    {index > 0 && <span className="text-white/40"> + </span>}
                    <span className="font-black" style={{ color: def.color }}>
                      {def.label}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {selected.includes('autotune') && (
            <p className="text-[10px] text-pink-300/80 pl-5" style={{ fontFamily: FONT }}>
              🎶 Autotune finalise la hauteur après les autres effets
            </p>
          )}

          {semitones !== 0 && (
            <p className="text-[10px] text-white/55 pl-5" style={{ fontFamily: FONT }}>
              ⚡ Hauteur {semitones > 0 ? `+${semitones}` : semitones} demi-tons, appliquée
              après l'enregistrement
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const InkVoiceFilterPicker = memo(InkVoiceFilterPickerComponent);
