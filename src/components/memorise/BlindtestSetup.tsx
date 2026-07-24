import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Disc3, Check, Loader2, Radio, Headphones, Users, Zap, Lightbulb, Clock } from 'lucide-react';
import { CATEGORY_META, BLINDTEST_ENTRIES_UNIQUE, BLINDTEST_ROUND_OPTIONS, BLINDTEST_LISTEN_OPTIONS, type BlindtestCategory } from '@/lib/blindtestTracks';
import { SetupSection } from '@/components/menu/MenuPrimitives';
import { BT, BT_SPECTRUM, glow } from './blindtestTheme';
import type { BlindtestConfig } from './MemoriseGameScreen';

interface BlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  onStart: (categories: BlindtestCategory[], config: BlindtestConfig) => void;
}

const CATS: BlindtestCategory[] = ['anime', 'cartoon', 'music', 'film', 'jeuxvideo', 'disney', 'kpop', 'retro', 'series', 'rapfr'];

const Vinyl = ({ size = 132, spin = true, accent = BT.magenta }: { size?: number; spin?: boolean; accent?: string }) => (
  <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full" style={{ boxShadow: `${glow(accent, 0.6)}, 0 0 60px ${accent}55` }} />
    <motion.div animate={spin ? { rotate: 360 } : undefined} transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full"
      style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #050509 0 2px, #17172a 2px 4px)', border: '2px solid rgba(255,255,255,0.14)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)' }}>
      <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.16), transparent 45%)' }} />
      <div className="absolute inset-0 m-auto rounded-full flex items-center justify-center" style={{ width: '38%', height: '38%', background: BT_SPECTRUM, boxShadow: glow(accent, 0.5) }}>
        <div className="h-2 w-2 rounded-full bg-[#050509]" />
      </div>
    </motion.div>
  </div>
);

function Segmented<T extends string | number>({ value, options, onChange, format }: { value: T; options: readonly T[]; onChange: (v: T) => void; format?: (v: T) => string }) {
  return (
  <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BT.hairSoft}` }}>
    {options.map((option) => <button key={String(option)} type="button" onClick={() => onChange(option)} aria-pressed={option === value}
      className="menu-focus min-h-10 min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm font-black transition-colors"
      style={{ background: option === value ? BT_SPECTRUM : 'transparent', color: option === value ? '#fff' : BT.sub }}>
      {format ? format(option) : String(option)}
    </button>)}
  </div>
  );
}

const Toggle = ({ icon: Icon, label, on, color, onClick }: { icon: any; label: string; on: boolean; color: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-pressed={on} className="menu-focus flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 transition-colors"
    style={{ background: on ? `${color}26` : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? color : BT.hairSoft}`, boxShadow: on ? glow(color, 0.2) : 'none' }}>
    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: on ? color : BT.sub }} />
    <span className="flex-1 text-left text-sm font-bold" style={{ color: on ? '#fff' : BT.sub }}>{label}</span>
    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full" style={{ background: on ? color : 'transparent', border: on ? 'none' : `1.5px solid ${BT.hair}` }}>
      {on && <Check className="h-2.5 w-2.5 text-black/85" strokeWidth={4} />}
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

  const toggle = (category: BlindtestCategory) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(category)) { if (next.size > 1) next.delete(category); } else next.add(category);
      return next;
    });
  };

  const count = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => selected.has(entry.category)).length;
  const rounds = Math.min(roundsSel, count);
  const config: BlindtestConfig = { rounds: roundsSel, listenMs: listenSel, teams, hints, doublePoints };

  if (!isHost) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="ibs-panel flex max-w-md flex-col items-center gap-6 p-8 text-center">
        <Vinyl size={140} accent={BT.cyan} />
        <span className="ibs-status ibs-status--network"><Radio className="h-3.5 w-3.5 animate-pulse" /> SYNCHRONISATION LIVE</span>
        <div><h2 className="text-3xl font-black text-white">Le studio se prépare</h2><p className="mt-1 text-sm" style={{ color: BT.sub }}>L’hôte règle les catégories et le format du blindtest.</p></div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 180 }}
      className="menu-surface relative grid w-full max-w-5xl gap-4 overflow-hidden rounded-[2rem] p-3 sm:p-5 lg:grid-cols-[1.4fr_0.8fr]"
      style={{ background: BT.panelSolid, border: `1px solid ${BT.hair}`, boxShadow: '0 30px 90px rgba(0,0,0,0.55)' }}>
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: BT_SPECTRUM }} />

      <div className="flex min-w-0 flex-col gap-4">
        <header className="ibs-panel flex items-center gap-4 p-4" style={{ '--menu-accent': BT.magenta } as React.CSSProperties}>
          <Vinyl size={88} accent={BT.magenta} />
          <div className="min-w-0">
            <span className="ibs-eyebrow">NEON VINYL · MUSIC QUIZ</span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl" style={{ background: BT_SPECTRUM, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BLINDTEST</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: BT.sub }}><Headphones className="h-4 w-4" style={{ color: BT.cyan }} /> Reconnais le son avant les autres.</p>
          </div>
        </header>

        <SetupSection eyebrow="01" title="Catégories" className="ibs-panel p-4">
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {CATS.map((category) => {
              const meta = CATEGORY_META[category];
              const active = selected.has(category);
              const total = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => entry.category === category).length;
              return (
                <button key={category} type="button" onClick={() => toggle(category)} aria-pressed={active}
                  className="menu-focus relative flex min-h-[5.5rem] flex-col items-start justify-between overflow-hidden rounded-xl p-3 text-left"
                  style={{ border: `1px solid ${active ? meta.color : BT.hairSoft}`, background: active ? `linear-gradient(145deg, ${meta.color}2e, rgba(255,255,255,0.025))` : 'rgba(255,255,255,0.025)' }}>
                  <span className="flex w-full items-start justify-between gap-2"><span className="text-2xl" aria-hidden="true">{meta.emoji}</span>{active && <Check className="h-4 w-4" style={{ color: meta.color }} />}</span>
                  <span><strong className="block text-sm text-white">{meta.label}</strong><small style={{ color: active ? meta.color : BT.sub }}>{total} titres</small></span>
                </button>
              );
            })}
          </div>
        </SetupSection>
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <SetupSection eyebrow="02" title="Format" className="ibs-panel p-4">
          <div className="mt-3 space-y-4">
            <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: BT.sub }}><Disc3 className="h-3.5 w-3.5" /> Manches</span>
              <Segmented value={roundsSel} options={BLINDTEST_ROUND_OPTIONS as readonly number[]} onChange={setRoundsSel} />
            </label>
            <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: BT.sub }}><Clock className="h-3.5 w-3.5" /> Écoute</span>
              <Segmented value={listenSel} options={BLINDTEST_LISTEN_OPTIONS as readonly number[]} onChange={setListenSel} format={(value) => `${Math.round(value / 1000)}s`} />
            </label>
          </div>
        </SetupSection>

        <SetupSection eyebrow="03" title="Options" className="ibs-panel p-4">
          <div className="mt-3 grid gap-2">
            <Toggle icon={Users} label="Deux équipes" on={teams} color={BT.cyan} onClick={() => setTeams((value) => !value)} />
            <Toggle icon={Lightbulb} label="Indices progressifs" on={hints} color={BT.gold} onClick={() => setHints((value) => !value)} />
            <Toggle icon={Zap} label="Manches double points" on={doublePoints} color={BT.magenta} onClick={() => setDoublePoints((value) => !value)} />
          </div>
        </SetupSection>

        <SetupSection eyebrow="04" title="Résumé" className="ibs-panel mt-auto p-4">
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/[0.04] p-3"><dt style={{ color: BT.sub }}>Playlist</dt><dd className="mt-1 font-black text-white">{count} titres</dd></div>
            <div className="rounded-xl bg-white/[0.04] p-3"><dt style={{ color: BT.sub }}>Session</dt><dd className="mt-1 font-black text-white">{rounds} manches</dd></div>
            <div className="rounded-xl bg-white/[0.04] p-3"><dt style={{ color: BT.sub }}>Extrait</dt><dd className="mt-1 font-black text-white">{Math.round(listenSel / 1000)} secondes</dd></div>
            <div className="rounded-xl bg-white/[0.04] p-3"><dt style={{ color: BT.sub }}>Équipes</dt><dd className="mt-1 font-black text-white">{teams ? 'Activées' : 'Solo'}</dd></div>
          </dl>
        </SetupSection>

        <div className="sticky bottom-0 rounded-2xl bg-[#100b1d]/95 p-2">
          <motion.button type="button" onClick={() => onStart(Array.from(selected), config)} disabled={!canStart || starting}
            whileHover={canStart && !starting ? { scale: 1.02 } : undefined} whileTap={canStart && !starting ? { scale: 0.98 } : undefined} aria-busy={starting}
            className="menu-focus relative flex min-h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl px-6 py-3 text-xl font-black tracking-wide"
            style={{ color: canStart && !starting ? '#fff' : 'rgba(255,255,255,0.4)', background: canStart && !starting ? BT_SPECTRUM : 'rgba(255,255,255,0.06)', border: `1px solid ${canStart && !starting ? 'transparent' : BT.hairSoft}`, boxShadow: canStart && !starting ? `0 10px 32px ${BT.magenta}55` : 'none' }}>
            {starting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6 fill-white" />}
            {starting ? 'Préparation…' : 'LANCER LE BLINDTEST'}
          </motion.button>
          {!canStart && <p className="mt-2 flex items-center justify-center gap-1.5 text-xs" style={{ color: BT.sub }}><Radio className="h-3.5 w-3.5 animate-pulse" /> Connexion au salon…</p>}
        </div>
      </aside>
    </motion.div>
  );
};