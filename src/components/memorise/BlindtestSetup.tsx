import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Disc3, Check, Loader2, Radio, Headphones, Users, Zap, Lightbulb, Clock } from 'lucide-react';
import { CATEGORY_META, BLINDTEST_ENTRIES, BLINDTEST_ROUND_OPTIONS, BLINDTEST_LISTEN_OPTIONS, type BlindtestCategory } from '@/lib/blindtestTracks';
import { BT, BT_SPECTRUM, glow } from './blindtestTheme';
import type { BlindtestConfig } from './MemoriseGameScreen';

interface BlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  onStart: (categories: BlindtestCategory[], config: BlindtestConfig) => void;
}

const CATS: BlindtestCategory[] = ['anime', 'cartoon', 'music', 'film', 'jeuxvideo', 'disney', 'kpop', 'retro', 'series', 'rapfr'];

/* Glowing spinning vinyl with grooves + neon rim */
const Vinyl = ({ size = 132, spin = true, accent = BT.magenta }: { size?: number; spin?: boolean; accent?: string }) => (
  <div className="relative" style={{ width: size, height: size }}>
    {/* neon halo */}
    <div className="absolute inset-0 rounded-full" style={{ boxShadow: `${glow(accent, 0.6)}, 0 0 60px ${accent}55`, filter: 'blur(2px)' }} />
    <motion.div
      animate={spin ? { rotate: 360 } : undefined}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
      className="absolute inset-0 rounded-full"
      style={{
        background: 'repeating-radial-gradient(circle at 50% 50%, #050509 0 2px, #17172a 2px 4px)',
        border: '2px solid rgba(255,255,255,0.14)',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
      }}
    >
      {/* glossy sheen */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.16), transparent 45%)' }} />
      {/* label */}
      <div
        className="absolute inset-0 m-auto rounded-full flex items-center justify-center"
        style={{ width: '38%', height: '38%', background: BT_SPECTRUM, boxShadow: `${glow(accent, 0.5)}` }}
      >
        <div className="rounded-full bg-[#050509]" style={{ width: 8, height: 8 }} />
      </div>
    </motion.div>
  </div>
);

/* segmented pill selector */
const Segmented = <T extends string | number>({ value, options, onChange, format }: { value: T; options: readonly T[]; onChange: (v: T) => void; format?: (v: T) => string }) => (
  <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BT.hairSoft}` }}>
    {options.map((o) => {
      const active = o === value;
      return (
        <button
          key={String(o)}
          onClick={() => onChange(o)}
          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-sm font-black transition-colors"
          style={{ background: active ? BT_SPECTRUM : 'transparent', color: active ? '#fff' : BT.sub }}
        >
          {format ? format(o) : String(o)}
        </button>
      );
    })}
  </div>
);

/* toggle chip */
const Toggle = ({ icon: Icon, label, on, color, onClick }: { icon: any; label: string; on: boolean; color: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
    style={{
      background: on ? `${color}26` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${on ? color : BT.hairSoft}`,
      boxShadow: on ? glow(color, 0.3) : 'none',
    }}
  >
    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: on ? color : BT.sub }} />
    <span className="text-sm font-bold flex-1 text-left" style={{ color: on ? '#fff' : BT.sub }}>{label}</span>
    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: on ? color : 'transparent', border: on ? 'none' : `1.5px solid ${BT.hair}` }}>
      {on && <Check className="w-2.5 h-2.5 text-black/85" strokeWidth={4} />}
    </span>
  </button>
);

export const BlindtestSetup = ({ isHost, canStart, starting, onStart }: BlindtestSetupProps) => {
  const [selected, setSelected] = useState<Set<BlindtestCategory>>(new Set(CATS));
  const [roundsSel, setRoundsSel] = useState<number>(10);
  const [listenSel, setListenSel] = useState<number>(20000);
  const [teams, setTeams] = useState(false);
  const [hints, setHints] = useState(true);
  const [doublePoints, setDoublePoints] = useState(true);

  const toggle = (c: BlindtestCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) { if (next.size > 1) next.delete(c); } else next.add(c);
      return next;
    });
  };

  const count = BLINDTEST_ENTRIES.filter((e) => selected.has(e.category)).length;
  const rounds = Math.min(roundsSel, count);
  const config: BlindtestConfig = { rounds: roundsSel, listenMs: listenSel, teams, hints, doublePoints };

  if (!isHost) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-7 text-center">
        <Vinyl size={140} accent={BT.cyan} />
        <div className="flex items-end gap-1.5 h-7">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} className="w-2 rounded-full" style={{ background: BT_SPECTRUM, height: '40%', boxShadow: glow(BT.violet, 0.4) }} animate={{ height: ['30%', '100%', '40%'] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }} />
          ))}
        </div>
        <p className="text-xl font-bold" style={{ color: BT.sub }}>L'hôte prépare le blindtest…</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 180 }}
      className="relative w-full max-w-md flex flex-col items-center gap-7 rounded-[2.2rem] px-6 py-9 overflow-hidden"
      style={{
        background: BT.panelSolid,
        border: `1px solid ${BT.hair}`,
        boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.08)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* top neon edge */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: BT_SPECTRUM, opacity: 0.9 }} />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-52 pointer-events-none" style={{ background: `radial-gradient(ellipse, ${BT.magenta}44, transparent 70%)`, filter: 'blur(40px)' }} />

      {/* hero */}
      <div className="relative flex flex-col items-center gap-4 text-center">
        <Vinyl size={128} accent={BT.magenta} />
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-black tracking-[0.4em] uppercase" style={{ color: BT.sub }}>Music Quiz</span>
          <h1
            className="text-6xl md:text-7xl font-black leading-[0.85] tracking-tighter"
            style={{ background: BT_SPECTRUM, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 4px 24px ${BT.violet}66)` }}
          >
            BLINDTEST
          </h1>
        </div>
        <p className="text-sm flex items-center gap-1.5 font-medium" style={{ color: BT.sub }}>
          <Headphones className="w-4 h-4" style={{ color: BT.cyan }} /> Devine le son le plus vite possible
        </p>
      </div>

      {/* category tiles */}
      <div className="relative grid grid-cols-2 gap-3 w-full">
        {CATS.map((c) => {
          const meta = CATEGORY_META[c];
          const active = selected.has(c);
          const n = BLINDTEST_ENTRIES.filter((e) => e.category === c).length;
          return (
            <motion.button
              key={c}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(c)}
              className="relative overflow-hidden py-4 px-3.5 rounded-2xl flex items-center gap-3 text-left"
              style={{
                border: `1px solid ${active ? meta.color : BT.hairSoft}`,
                background: active
                  ? `linear-gradient(135deg, ${meta.color}2e, rgba(255,255,255,0.02))`
                  : 'rgba(255,255,255,0.03)',
                boxShadow: active ? `0 10px 30px ${meta.color}33, inset 0 0 0 1px ${meta.color}44` : 'none',
              }}
            >
              {/* active glow wash */}
              {active && <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full" style={{ background: `radial-gradient(circle, ${meta.color}55, transparent 70%)`, filter: 'blur(12px)' }} />}
              <span className="relative text-3xl leading-none flex-shrink-0" style={{ filter: active ? `drop-shadow(0 0 8px ${meta.color}aa)` : 'grayscale(0.3) opacity(0.8)' }}>{meta.emoji}</span>
              <div className="relative min-w-0">
                <div className="text-[15px] font-black leading-tight truncate" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}>{meta.label}</div>
                <div className="text-[11px] font-medium" style={{ color: active ? meta.color : 'rgba(255,255,255,0.35)' }}>{n} titres</div>
              </div>
              <span
                className="relative ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: active ? meta.color : 'transparent', border: active ? 'none' : '1.5px solid rgba(255,255,255,0.22)', boxShadow: active ? glow(meta.color, 0.5) : 'none' }}
              >
                {active && <Check className="w-3 h-3 text-black/85" strokeWidth={3.5} />}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* game options */}
      <div className="relative w-full flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Disc3 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BT.sub }} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BT.sub }}>Manches</span>
          <div className="flex-1" />
        </div>
        <Segmented value={roundsSel} options={BLINDTEST_ROUND_OPTIONS} onChange={setRoundsSel} />

        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BT.sub }} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: BT.sub }}>Durée d'écoute</span>
        </div>
        <Segmented value={listenSel} options={BLINDTEST_LISTEN_OPTIONS} onChange={setListenSel} format={(v) => `${Math.round(v / 1000)}s`} />

        <div className="grid grid-cols-1 gap-2 mt-1">
          <Toggle icon={Users} label="Mode équipes (2 équipes)" on={teams} color={BT.cyan} onClick={() => setTeams((v) => !v)} />
          <div className="grid grid-cols-2 gap-2">
            <Toggle icon={Lightbulb} label="Indices" on={hints} color={BT.gold} onClick={() => setHints((v) => !v)} />
            <Toggle icon={Zap} label="Manches ×2" on={doublePoints} color={BT.magenta} onClick={() => setDoublePoints((v) => !v)} />
          </div>
        </div>
      </div>

      {/* rounds summary pill */}
      <div className="relative flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BT.hair}` }}>
        <Disc3 className="w-4 h-4" style={{ color: BT.gold }} />
        <span className="font-bold text-white/85 text-sm">{rounds} manche{rounds > 1 ? 's' : ''}</span>
        <span className="text-white/35 text-sm">· {count} titres</span>
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => onStart(Array.from(selected), config)}
        disabled={!canStart || starting}
        whileHover={canStart && !starting ? { scale: 1.03 } : undefined}
        whileTap={canStart && !starting ? { scale: 0.97 } : undefined}
        className="relative w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-2xl tracking-wide overflow-hidden"
        style={{
          color: canStart && !starting ? '#fff' : 'rgba(255,255,255,0.4)',
          background: canStart && !starting ? BT_SPECTRUM : 'rgba(255,255,255,0.06)',
          border: `1px solid ${canStart && !starting ? 'transparent' : BT.hairSoft}`,
          boxShadow: canStart && !starting ? `0 12px 40px ${BT.magenta}55` : 'none',
          cursor: canStart && !starting ? 'pointer' : 'not-allowed',
        }}
      >
        {canStart && !starting && (
          <motion.div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)' }}
            animate={{ x: ['-120%', '120%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {starting ? <Loader2 className="relative w-7 h-7 animate-spin" /> : <Play className="relative w-7 h-7 fill-white" />}
        <span className="relative">{starting ? 'Préparation…' : 'LANCER'}</span>
      </motion.button>
      {!canStart && (
        <p className="text-sm -mt-3 font-medium flex items-center gap-1.5" style={{ color: BT.sub }}>
          <Radio className="w-4 h-4 animate-pulse" /> Connexion au salon…
        </p>
      )}
    </motion.div>
  );
};
