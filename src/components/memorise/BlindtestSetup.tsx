import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Disc3, Check, Loader2, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_META, BLINDTEST_ENTRIES, type BlindtestCategory } from '@/lib/blindtestTracks';

interface BlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  onStart: (categories: BlindtestCategory[]) => void;
}

const CATS: BlindtestCategory[] = ['anime', 'cartoon', 'music', 'film'];

/* spinning vinyl + tonearm */
const Turntable = ({ size = 120, spin = true }: { size?: number; spin?: boolean }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <motion.div
      animate={spin ? { rotate: 360 } : undefined}
      transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      className="absolute inset-0 rounded-full"
      style={{
        background: 'repeating-radial-gradient(circle at 50% 50%, #1a1024 0 3px, #241433 3px 6px)',
        border: '3px solid #0a0510',
        boxShadow: '0 14px 44px rgba(217,70,239,0.45), inset 0 0 30px rgba(0,0,0,0.6)',
      }}
    >
      <div className="absolute inset-0 m-auto rounded-full" style={{ width: '34%', height: '34%', background: 'radial-gradient(circle, #e879f9, #a855f7)', border: '2px solid #0a0510' }} />
      <div className="absolute inset-0 m-auto rounded-full bg-[#0a0510]" style={{ width: 6, height: 6 }} />
    </motion.div>
    {/* tonearm */}
    <div className="absolute -right-1 -top-1" style={{ width: size * 0.5, height: size * 0.5 }}>
      <div className="absolute right-1 top-1 w-3 h-3 rounded-full bg-white/80 border border-black/40" />
      <div className="absolute right-2 top-2 origin-top-right h-[2px] rounded" style={{ width: size * 0.42, background: 'linear-gradient(90deg,#bbb,#fff)', transform: 'rotate(35deg)' }} />
    </div>
  </div>
);

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

  if (!isHost) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 text-center">
        <Turntable size={130} />
        <div className="flex items-end gap-1 h-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} className="w-1.5 rounded-full bg-fuchsia-400" animate={{ height: ['30%', '100%', '40%'] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }} style={{ height: '40%' }} />
          ))}
        </div>
        <p className="text-lg font-bold text-white/70">L’hôte prépare le blindtest…</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-md flex flex-col items-center gap-6 rounded-[2rem] px-6 py-8"
      style={{
        background: 'linear-gradient(180deg, rgba(40,20,60,0.55), rgba(12,6,24,0.55))',
        border: '1px solid rgba(217,70,239,0.25)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* hero */}
      <div className="flex flex-col items-center gap-3 text-center">
        <Turntable size={120} />
        <h1
          className="text-4xl md:text-5xl font-black leading-none tracking-tight"
          style={{ background: 'linear-gradient(180deg,#fff,#e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 3px 14px rgba(217,70,239,0.55))' }}
        >
          BLINDTEST
        </h1>
        <p className="text-sm text-white/55 flex items-center gap-1.5 -mt-1">
          <Music2 className="w-4 h-4 text-fuchsia-300" /> Devine le son le plus vite possible
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
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(c)}
              className="relative overflow-hidden py-4 px-3 rounded-2xl flex items-center gap-3 transition-all"
              style={{
                border: `2px solid ${active ? meta.color : 'rgba(255,255,255,0.1)'}`,
                background: active ? `linear-gradient(120deg, ${meta.color}26, rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.03)',
                boxShadow: active ? `0 8px 24px ${meta.color}33` : 'none',
              }}
            >
              <span className="text-3xl leading-none flex-shrink-0">{meta.emoji}</span>
              <div className="text-left min-w-0">
                <div className="text-base font-black leading-tight truncate" style={{ color: active ? meta.color : 'rgba(255,255,255,0.75)' }}>{meta.label}</div>
                <div className="text-[11px] text-white/40">{n} titres</div>
              </div>
              <span
                className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: active ? meta.color : 'transparent', border: active ? 'none' : '2px solid rgba(255,255,255,0.2)' }}
              >
                {active && <Check className="w-3 h-3 text-black/80" strokeWidth={3.5} />}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* rounds pill */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
        <Disc3 className="w-4 h-4 text-fuchsia-300" />
        <span className="font-bold text-white/80">{rounds} manche{rounds > 1 ? 's' : ''}</span>
        <span className="text-white/40">· {count} titres</span>
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => onStart(Array.from(selected))}
        disabled={!canStart || starting}
        whileHover={canStart && !starting ? { scale: 1.03 } : undefined}
        whileTap={canStart && !starting ? { scale: 0.97 } : undefined}
        animate={canStart && !starting ? { boxShadow: ['0 8px 24px rgba(217,70,239,0.4)', '0 10px 38px rgba(217,70,239,0.75)', '0 8px 24px rgba(217,70,239,0.4)'] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity }}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-2xl transition-colors',
          canStart && !starting ? 'bg-gradient-to-r from-fuchsia-500 to-purple-700 text-white' : 'bg-white/10 text-white/40 cursor-not-allowed',
        )}
      >
        {starting ? <Loader2 className="w-7 h-7 animate-spin" /> : <Play className="w-7 h-7 fill-white" />}
        {starting ? 'Préparation…' : 'LANCER'}
      </motion.button>
      {!canStart && <p className="text-xs text-white/40 -mt-2">Connexion au salon…</p>}
    </motion.div>
  );
};
