import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Disc3, Check, Loader2, Headphones } from 'lucide-react';
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
  const rounds = Math.min(8, count);

  /* ---------- non-host waiting ---------- */
  if (!isHost) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 50% 50%, #2a1740, #0a0510)', border: '3px solid rgba(217,70,239,0.4)', boxShadow: '0 12px 40px rgba(217,70,239,0.35)' }}
        >
          <Disc3 className="w-11 h-11 text-fuchsia-300/80" />
        </motion.div>
        <div className="flex items-end gap-1 h-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} className="w-1.5 rounded-full bg-fuchsia-400" animate={{ height: ['30%', '100%', '40%'] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }} style={{ height: '40%' }} />
          ))}
        </div>
        <p className="text-lg font-bold text-white/70">L’hôte prépare le blindtest…</p>
      </motion.div>
    );
  }

  /* ---------- host menu ---------- */
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg flex flex-col items-center gap-6">
      {/* hero */}
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 50% 50%, #3a1d5e, #120a20)', border: '3px solid rgba(217,70,239,0.5)', boxShadow: '0 0 40px rgba(217,70,239,0.5)' }}
        >
          <Disc3 className="w-10 h-10 text-fuchsia-200" />
        </motion.div>
        <h1
          className="text-4xl md:text-5xl font-black leading-none"
          style={{ background: 'linear-gradient(180deg,#fff,#e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 3px 12px rgba(217,70,239,0.5))' }}
        >
          BLINDTEST MUSICAL
        </h1>
        <p className="text-sm text-white/55 flex items-center gap-1.5">
          <Headphones className="w-4 h-4" /> Devine l’anime, le dessin animé, la musique ou le film
        </p>
      </div>

      {/* category cards */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {CATS.map((c) => {
          const meta = CATEGORY_META[c];
          const active = selected.has(c);
          const n = BLINDTEST_ENTRIES.filter((e) => e.category === c).length;
          return (
            <motion.button
              key={c}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(c)}
              className="relative overflow-hidden py-5 px-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all"
              style={{
                borderColor: active ? meta.color : 'rgba(255,255,255,0.12)',
                background: active
                  ? `radial-gradient(circle at 50% 0%, ${meta.color}33, rgba(255,255,255,0.03))`
                  : 'rgba(255,255,255,0.03)',
                boxShadow: active ? `0 8px 26px ${meta.color}33` : 'none',
              }}
            >
              {active && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: meta.color }}>
                  <Check className="w-3 h-3 text-black/80" strokeWidth={3.5} />
                </span>
              )}
              <span className="text-4xl leading-none">{meta.emoji}</span>
              <span className="text-lg font-black" style={{ color: active ? meta.color : 'rgba(255,255,255,0.7)' }}>{meta.label}</span>
              <span className="text-[11px] text-white/40">{n} titres</span>
            </motion.button>
          );
        })}
      </div>

      {/* rounds pill */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
        <Disc3 className="w-4 h-4 text-fuchsia-300" />
        <span className="font-bold text-white/80">{rounds} manche{rounds > 1 ? 's' : ''}</span>
        <span className="text-white/40">· {count} titres possibles</span>
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => onStart(Array.from(selected))}
        disabled={!canStart || starting}
        whileHover={canStart && !starting ? { scale: 1.03 } : undefined}
        whileTap={canStart && !starting ? { scale: 0.97 } : undefined}
        animate={canStart && !starting ? { boxShadow: ['0 8px 24px rgba(217,70,239,0.4)', '0 8px 34px rgba(217,70,239,0.7)', '0 8px 24px rgba(217,70,239,0.4)'] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity }}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-2xl transition-colors',
          canStart && !starting ? 'bg-gradient-to-r from-fuchsia-500 to-purple-700 text-white' : 'bg-white/10 text-white/40 cursor-not-allowed',
        )}
      >
        {starting ? <Loader2 className="w-7 h-7 animate-spin" /> : <Play className="w-7 h-7 fill-white" />}
        {starting ? 'Préparation…' : 'LANCER'}
      </motion.button>
      {!canStart && <p className="text-xs text-white/40">Connexion au salon…</p>}
    </motion.div>
  );
};
