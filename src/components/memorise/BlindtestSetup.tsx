import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Play, ListMusic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_META, BLINDTEST_ENTRIES, type BlindtestCategory } from '@/lib/blindtestTracks';

interface BlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  onStart: (categories: BlindtestCategory[]) => void;
}

const CATS: BlindtestCategory[] = ['anime', 'cartoon', 'music', 'film'];

export const BlindtestSetup = ({ isHost, canStart, starting, onStart }: BlindtestSetupProps) => {
  const [selected, setSelected] = useState<Set<BlindtestCategory>>(new Set(CATS));

  const toggle = (c: BlindtestCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) { if (next.size > 1) next.delete(c); } else next.add(c);
      return next;
    });
  };

  const count = BLINDTEST_ENTRIES.filter((e) => selected.has(e.category)).length;

  if (!isHost) {
    return (
      <div className="text-center">
        <Music className="w-10 h-10 text-fuchsia-300 mx-auto mb-3 animate-pulse" />
        <p className="text-lg font-bold text-white/70">L’hôte choisit les catégories…</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-3xl font-black flex items-center justify-center gap-2">
          <ListMusic className="w-7 h-7 text-fuchsia-300" /> Blindtest Musical
        </h2>
        <p className="text-sm text-white/55 mt-1">Choisis les catégories, puis lance la partie. Les extraits sont joués automatiquement.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        {CATS.map((c) => {
          const meta = CATEGORY_META[c];
          const active = selected.has(c);
          return (
            <motion.button
              key={c}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(c)}
              className="relative py-5 rounded-2xl border-2 font-black text-lg flex flex-col items-center gap-1 transition-all"
              style={{
                borderColor: active ? meta.color : 'rgba(255,255,255,0.12)',
                background: active ? `${meta.color}22` : 'rgba(255,255,255,0.03)',
                color: active ? meta.color : 'rgba(255,255,255,0.55)',
              }}
            >
              <span className="text-3xl">{meta.emoji}</span>
              {meta.label}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={() => onStart(Array.from(selected))}
        disabled={!canStart || starting}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xl transition-all',
          canStart && !starting ? 'bg-gradient-to-r from-fuchsia-500 to-purple-700 hover:brightness-110' : 'bg-white/10 text-white/40 cursor-not-allowed',
        )}
        style={canStart && !starting ? { boxShadow: '0 8px 24px rgba(217,70,239,0.5)' } : undefined}
      >
        {starting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
        {starting ? 'Préparation…' : 'Lancer le blindtest'}
      </button>
      <p className="text-[11px] text-white/35">{count} morceaux possibles · {Math.min(8, count)} manches</p>
    </motion.div>
  );
};
