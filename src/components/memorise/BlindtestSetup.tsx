import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Disc3, Check, Loader2, Music2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_META, BLINDTEST_ENTRIES, type BlindtestCategory } from '@/lib/blindtestTracks';
import { HERO, GRAFFITI_TEXT_SHADOW, GRAFFITI_TEXT_SHADOW_SM } from '@/components/ink/InkPrimitives';

interface BlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  onStart: (categories: BlindtestCategory[]) => void;
}

const CATS: BlindtestCategory[] = ['anime', 'cartoon', 'music', 'film', 'jeuxvideo', 'disney'];

/* spinning gold vinyl on a comic turntable */
const Turntable = ({ size = 120, spin = true }: { size?: number; spin?: boolean }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <motion.div
      animate={spin ? { rotate: 360 } : undefined}
      transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      className="absolute inset-0 rounded-full"
      style={{
        background: 'repeating-radial-gradient(circle at 50% 50%, #071634 0 3px, #0f2c5e 3px 6px)',
        border: `4px solid ${HERO.ink}`,
        boxShadow: `0 14px 44px rgba(43,108,246,0.5), inset 0 0 30px rgba(0,0,0,0.6)`,
      }}
    >
      <div
        className="absolute inset-0 m-auto rounded-full"
        style={{ width: '34%', height: '34%', background: `radial-gradient(circle, ${HERO.gold}, #d99a12)`, border: `3px solid ${HERO.ink}` }}
      />
      <div className="absolute inset-0 m-auto rounded-full" style={{ width: 7, height: 7, background: HERO.ink }} />
    </motion.div>
    {/* tonearm */}
    <div className="absolute -right-1 -top-1" style={{ width: size * 0.5, height: size * 0.5 }}>
      <div className="absolute right-1 top-1 w-3.5 h-3.5 rounded-full" style={{ background: HERO.red, border: `2px solid ${HERO.ink}` }} />
      <div className="absolute right-2.5 top-2.5 origin-top-right h-[3px] rounded" style={{ width: size * 0.42, background: 'linear-gradient(90deg,#8aa0c9,#eef4ff)', transform: 'rotate(35deg)', border: `1px solid ${HERO.ink}` }} />
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
            <motion.span key={i} className="w-1.5 rounded-full" style={{ background: HERO.gold, height: '40%' }} animate={{ height: ['30%', '100%', '40%'] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }} />
          ))}
        </div>
        <p className="text-2xl font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: GRAFFITI_TEXT_SHADOW_SM }}>L'hôte prépare le blindtest…</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-md flex flex-col items-center gap-6 rounded-[2rem] px-6 py-8 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0f2c5e 0%, #0b2148 50%, #071634 100%)',
        border: `4px solid ${HERO.ink}`,
        boxShadow: `0 8px 0 ${HERO.ink}, 0 24px 60px rgba(43,108,246,0.35), inset 0 2px 0 rgba(255,255,255,0.1)`,
      }}
    >
      {/* halftone corner + inner accent */}
      <div className="absolute inset-2 rounded-[1.6rem] pointer-events-none" style={{ border: `2px solid ${HERO.blue}55` }} />
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-40 pointer-events-none opacity-50"
        style={{ background: `radial-gradient(ellipse, ${HERO.gold}66, transparent 70%)`, filter: 'blur(30px)' }}
      />

      {/* hero */}
      <div className="relative flex flex-col items-center gap-3 text-center">
        <Turntable size={120} />
        <h1
          className="text-5xl md:text-6xl font-black leading-none"
          style={{ fontFamily: "'Caveat', cursive", color: HERO.gold, textShadow: GRAFFITI_TEXT_SHADOW }}
        >
          BLINDTEST
        </h1>
        <p className="text-lg text-white/70 flex items-center gap-1.5 -mt-1 font-bold" style={{ fontFamily: "'Caveat', cursive" }}>
          <Music2 className="w-4 h-4" style={{ color: HERO.blueSoft }} /> Devine le son le plus vite possible
        </p>
      </div>

      {/* category cards */}
      <div className="relative grid grid-cols-2 gap-3 w-full">
        {CATS.map((c) => {
          const meta = CATEGORY_META[c];
          const active = selected.has(c);
          const n = BLINDTEST_ENTRIES.filter((e) => e.category === c).length;
          return (
            <motion.button
              key={c}
              whileHover={{ scale: 1.04, y: -2, rotate: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(c)}
              className="relative overflow-hidden py-4 px-3 rounded-2xl flex items-center gap-3"
              style={{
                border: `3px solid ${HERO.ink}`,
                background: active
                  ? `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)`
                  : 'linear-gradient(180deg, #123163, #0a1f45)',
                boxShadow: active ? `0 5px 0 ${HERO.ink}, 0 10px 26px ${meta.color}55` : `0 4px 0 ${HERO.ink}`,
                opacity: active ? 1 : 0.72,
              }}
            >
              <span className="text-3xl leading-none flex-shrink-0" style={{ filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.4))' }}>{meta.emoji}</span>
              <div className="text-left min-w-0">
                <div className="text-lg font-black leading-tight truncate text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: GRAFFITI_TEXT_SHADOW_SM }}>{meta.label}</div>
                <div className="text-[11px] font-bold text-white/70">{n} titres</div>
              </div>
              <span
                className="ml-auto w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: active ? '#fff' : 'transparent', border: `2.5px solid ${active ? HERO.ink : 'rgba(255,255,255,0.35)'}` }}
              >
                {active && <Check className="w-3.5 h-3.5" style={{ color: meta.color }} strokeWidth={4} />}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* rounds pill */}
      <div
        className="relative flex items-center gap-2 px-4 py-1.5 rounded-full"
        style={{ background: `linear-gradient(180deg, ${HERO.blue}33, ${HERO.blue}10)`, border: `2.5px solid ${HERO.ink}`, boxShadow: `0 3px 0 ${HERO.ink}` }}
      >
        <Disc3 className="w-4 h-4" style={{ color: HERO.gold }} />
        <span className="font-black text-white" style={{ fontFamily: "'Caveat', cursive" }}>{rounds} manche{rounds > 1 ? 's' : ''}</span>
        <span className="text-white/50 font-bold text-sm">· {count} titres</span>
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => onStart(Array.from(selected))}
        disabled={!canStart || starting}
        whileHover={canStart && !starting ? { scale: 1.04, rotate: -1.5 } : undefined}
        whileTap={canStart && !starting ? { scale: 0.96 } : undefined}
        animate={canStart && !starting ? { boxShadow: [`0 5px 0 ${HERO.ink}, 0 8px 24px ${HERO.red}66`, `0 5px 0 ${HERO.ink}, 0 12px 40px ${HERO.red}aa`, `0 5px 0 ${HERO.ink}, 0 8px 24px ${HERO.red}66`] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="relative w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-3xl text-white"
        style={{
          fontFamily: "'Caveat', cursive",
          textShadow: GRAFFITI_TEXT_SHADOW_SM,
          border: `3px solid ${HERO.ink}`,
          background: canStart && !starting ? `linear-gradient(180deg, ${HERO.red}, #b3241f)` : '#1a2b4d',
          boxShadow: `0 5px 0 ${HERO.ink}`,
          opacity: canStart && !starting ? 1 : 0.5,
          cursor: canStart && !starting ? 'pointer' : 'not-allowed',
        }}
      >
        {starting ? <Loader2 className="w-7 h-7 animate-spin" /> : <Play className="w-7 h-7 fill-white" />}
        {starting ? 'Préparation…' : 'LANCER'}
      </motion.button>
      {!canStart && (
        <p className="text-base text-white/60 -mt-2 font-bold flex items-center gap-1.5" style={{ fontFamily: "'Caveat', cursive" }}>
          <Radio className="w-4 h-4 animate-pulse" /> Connexion au salon…
        </p>
      )}
    </motion.div>
  );
};
