import { useState, memo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBackgroundMusic, type MusicTrack } from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Sparkles, X,
  ChevronUp, ChevronDown, Shuffle, Repeat1, ListMusic,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { coverFor, titleOf } from "@/lib/musicCovers";

const formatTime = (t: number) => {
  if (isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/** Spoken form of a duration, so screen readers don't read "3:07" as a ratio. */
const spokenTime = (t: number) => {
  if (isNaN(t)) return "0 seconde";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m > 0 ? `${m} minute${m > 1 ? 's' : ''} ${s} seconde${s > 1 ? 's' : ''}` : `${s} seconde${s > 1 ? 's' : ''}`;
};

const readFlag = (key: string) => {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
};
const writeFlag = (key: string, value: boolean) => {
  try { localStorage.setItem(key, String(value)); } catch { /* storage can be disabled */ }
};

/* small reusable album cover */
const Cover = ({ track, size, className }: { track: MusicTrack | null; size: number; className?: string }) => {
  const c = coverFor(track);
  return (
    <div
      className={cn("relative flex items-center justify-center flex-shrink-0 overflow-hidden", className)}
      style={{ width: size, height: size, borderRadius: size > 80 ? 20 : 10, background: c.gradient, boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}
      aria-hidden="true"
    >
      <span style={{ fontSize: size * 0.42, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>{c.emoji}</span>
      <div className="absolute inset-0 ring-1 ring-white/15 rounded-[inherit]" />
    </div>
  );
};

/**
 * Keyboard and screen-reader accessible seek bar. The previous implementation
 * was a `<div onClick>`, so the track position could only be changed by mouse.
 */
const SeekBar = ({ progress, duration, onSeek, tall }: {
  progress: number;
  duration: number;
  onSeek: (time: number) => void;
  tall?: boolean;
}) => {
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  return (
    <div className={cn('group relative w-full', tall ? 'h-2' : 'h-1')}>
      <div className="absolute inset-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: tall ? 999 : 0 }}>
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#a855f7,#22d3ee)', borderRadius: 'inherit' }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.floor(duration))}
        step={1}
        value={Math.min(progress, duration) || 0}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="menu-focus absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Position de lecture"
        aria-valuetext={`${spokenTime(progress)} sur ${spokenTime(duration)}`}
      />
      {tall && (
        <span
          className="pointer-events-none absolute -top-1 h-4 w-4 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

const MusicPlayerBarComponent = () => {
  const {
    isPlaying, play, pause, currentTrack, tracks, nextTrack, previousTrack, selectTrack,
    volume: musicVolume, setVolume: setMusicVolume, progress, duration, seek,
    autoMode, setAutoMode, situation,
  } = useBackgroundMusic();
  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();

  const [expanded, setExpanded] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  // Persisted like every other playback preference, instead of being reset on
  // each reload as before.
  const [shuffle, setShuffle] = useState(() => readFlag('musicShuffle'));
  const [repeatOne, setRepeatOne] = useState(() => readFlag('musicRepeatOne'));

  useEffect(() => { writeFlag('musicShuffle', shuffle); }, [shuffle]);
  useEffect(() => { writeFlag('musicRepeatOne', repeatOne); }, [repeatOne]);

  const togglePlay = useCallback(() => { isPlaying ? pause() : play(); }, [isPlaying, pause, play]);

  const handleNext = useCallback(() => {
    if (repeatOne) { seek(0); play(); return; }
    if (shuffle && tracks.length > 1) {
      let id = currentTrack?.id;
      while (id === currentTrack?.id) id = tracks[Math.floor(Math.random() * tracks.length)].id;
      selectTrack(id!); if (!isPlaying) play();
      return;
    }
    nextTrack();
  }, [repeatOne, shuffle, tracks, currentTrack, selectTrack, isPlaying, play, nextTrack, seek]);

  const handlePrev = useCallback(() => {
    if (progress > 3) { seek(0); return; }
    previousTrack();
  }, [progress, seek, previousTrack]);

  const cover = coverFor(currentTrack);
  const trackLabel = titleOf(currentTrack?.name || 'Aucune piste');

  return (
    <>
      {/* ============== NOW PLAYING (full) ============== */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="menu-dialog menu-screen-safe fixed inset-0 z-[9998] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Lecture en cours"
              style={{ background: `radial-gradient(120% 80% at 50% 0%, ${cover.gradient.match(/#[0-9a-f]{6}/gi)?.[0]}33, transparent 60%), linear-gradient(180deg,#160a26,#08040f)`, backdropFilter: 'blur(8px)' }}
            >
              {/* top bar */}
              <div className="flex flex-shrink-0 items-center justify-between px-5 py-4">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="menu-icon-control menu-focus flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 hover:text-white"
                  aria-label="Réduire le lecteur"
                >
                  <ChevronDown className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">Lecture en cours</p>
                  <p className="text-xs font-bold text-purple-300/70">{autoMode ? `Auto · ${situation}` : 'Manuel'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="menu-icon-control menu-focus flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 hover:text-white"
                  aria-label="Fermer le lecteur"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="custom-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pb-6">
                {/* big cover */}
                <div className={cn('mt-2', isPlaying && 'mp-float')}>
                  <Cover track={currentTrack} size={Math.min(280, typeof window !== 'undefined' ? window.innerWidth - 100 : 280)} />
                </div>

                {/* title */}
                <div className="mb-4 mt-6 text-center">
                  <h2 className="text-3xl font-black text-white">{trackLabel}</h2>
                  <p className="mt-1 text-base text-white/50">{cover.artist} · Mimic Master</p>
                </div>

                {/* scrubber */}
                <div className="w-full max-w-md">
                  <SeekBar progress={progress} duration={duration} onSeek={seek} tall />
                  <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-white/40">
                    <span>{formatTime(progress)}</span><span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* controls */}
                <div className="mt-5 flex items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={() => setShuffle((s) => !s)}
                    aria-pressed={shuffle}
                    aria-label="Lecture aléatoire"
                    className={cn("menu-icon-control menu-focus flex h-11 w-11 items-center justify-center rounded-full transition-colors", shuffle ? "text-purple-300" : "text-white/50 hover:text-white")}
                  >
                    <Shuffle className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Piste précédente"
                    className="menu-icon-control menu-focus flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                  >
                    <SkipBack className="h-6 w-6" fill="currentColor" aria-hidden="true" />
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={togglePlay}
                    aria-label={isPlaying ? `Mettre en pause ${trackLabel}` : `Lire ${trackLabel}`}
                    className="menu-focus flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', boxShadow: '0 0 30px rgba(168,85,247,0.7)' }}
                  >
                    {isPlaying ? <Pause className="h-7 w-7 text-white" fill="white" aria-hidden="true" /> : <Play className="ml-1 h-7 w-7 text-white" fill="white" aria-hidden="true" />}
                  </motion.button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Piste suivante"
                    className="menu-icon-control menu-focus flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                  >
                    <SkipForward className="h-6 w-6" fill="currentColor" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatOne((r) => !r)}
                    aria-pressed={repeatOne}
                    aria-label="Répéter la piste en cours"
                    className={cn("menu-icon-control menu-focus flex h-11 w-11 items-center justify-center rounded-full transition-colors", repeatOne ? "text-purple-300" : "text-white/50 hover:text-white")}
                  >
                    <Repeat1 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {/* volume + auto */}
                <div className="mt-6 flex w-full max-w-md items-center gap-3">
                  <Volume2 className="h-4 w-4 flex-shrink-0 text-white/50" aria-hidden="true" />
                  <Slider value={[musicVolume * 100]} onValueChange={(v) => setMusicVolume(v[0] / 100)} max={100} step={1} className="flex-1" aria-label="Volume de la musique" />
                  <button
                    type="button"
                    onClick={() => setAutoMode(!autoMode)}
                    aria-pressed={autoMode}
                    aria-label="Musique adaptative automatique"
                    className={cn("menu-focus flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black", autoMode ? "text-white" : "text-white/50")}
                    style={{ background: autoMode ? 'linear-gradient(90deg,#a855f7,#22d3ee)' : 'rgba(255,255,255,0.06)' }}
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />AUTO
                  </button>
                </div>

                {/* queue */}
                <div className="mt-8 w-full max-w-md">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/50">
                    <ListMusic className="h-4 w-4" aria-hidden="true" /> File d'attente
                  </h3>
                  {tracks.length === 0 ? (
                    <div className="ink-empty">
                      <ListMusic aria-hidden="true" />
                      <strong>Aucune piste chargée</strong>
                      <p>La bande-son n'a pas pu être chargée. Recharge la page pour réessayer.</p>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {tracks.map((t) => {
                        const active = currentTrack?.id === t.id;
                        const tc = coverFor(t);
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => { selectTrack(t.id); if (!isPlaying) play(); }}
                              aria-current={active ? 'true' : undefined}
                              className={cn("menu-focus flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors", active ? "bg-white/10" : "hover:bg-white/5")}
                            >
                              <Cover track={t} size={40} />
                              <span className="min-w-0 flex-1">
                                <span className={cn("block truncate text-sm font-bold", active ? "text-purple-300" : "text-white")}>{titleOf(t.name)}</span>
                                <span className="block truncate text-[11px] text-white/40">{tc.artist}</span>
                              </span>
                              {active && isPlaying && (
                                <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
                                  {[0, 1, 2].map((i) => <span key={i} className="mp-eq-bar w-[3px] rounded-full bg-purple-400" style={{ animationDelay: `${i * 0.15}s` }} />)}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ============== VOLUME POPOVER (mini) ============== */}
      <AnimatePresence>
        {showVolume && !expanded && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[55] cursor-default"
              onClick={() => setShowVolume(false)}
              aria-label="Fermer le réglage du volume"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.94 }}
              className="menu-dialog fixed bottom-24 left-1/2 z-[56] w-[min(92vw,340px)] -translate-x-1/2 space-y-4 overflow-hidden rounded-2xl p-4"
              role="group"
              aria-label="Réglage des volumes"
              style={{ background: 'linear-gradient(180deg,rgba(24,14,40,0.97),rgba(11,7,22,0.98))', border: '1px solid rgba(168,85,247,0.25)', backdropFilter: 'blur(16px)' }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-white"><span>🎵 Musique</span><span className="tabular-nums text-white/50">{Math.round(musicVolume * 100)}%</span></div>
                <Slider value={[musicVolume * 100]} onValueChange={(v) => setMusicVolume(v[0] / 100)} max={100} step={1} aria-label="Volume de la musique" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-white"><span>🔊 Effets</span><span className="tabular-nums text-white/50">{Math.round(sfxVolume * 100)}%</span></div>
                <Slider value={[sfxVolume * 100]} onValueChange={(v) => setSfxVolume(v[0] / 100)} max={100} step={1} aria-label="Volume des effets sonores" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============== MINI BAR ============== */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 220, delay: 0.3 }}
        className="menu-surface ink-z-bar pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2"
        style={{ width: "min(94vw, 580px)" }}
      >
        <div
          className="pointer-events-auto relative overflow-hidden rounded-2xl"
          role="region"
          aria-label="Lecteur de musique"
          style={{ background: 'linear-gradient(180deg,rgba(24,14,40,0.96),rgba(11,7,22,0.97))', border: '1px solid rgba(168,85,247,0.25)', backdropFilter: 'blur(16px)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
        >
          <SeekBar progress={progress} duration={duration} onSeek={seek} />

          <div className="flex items-center gap-2.5 px-2.5 py-2">
            {/* cover + info → expand */}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="menu-focus group flex min-w-0 flex-1 items-center gap-2.5 text-left"
              aria-label={`Ouvrir le lecteur, ${trackLabel}`}
            >
              <span className="relative">
                <Cover track={currentTrack} size={44} />
                {isPlaying && <span className="absolute -inset-0.5 -z-10 animate-pulse rounded-[12px] bg-purple-500/40 blur-md" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-white">{trackLabel}</span>
                <span className="block truncate text-[11px] text-white/45">{cover.artist} · {formatTime(progress)}/{formatTime(duration)}</span>
              </span>
              <ChevronUp className="h-4 w-4 flex-shrink-0 text-white/40 group-hover:text-white" aria-hidden="true" />
            </button>

            {/* controls */}
            <button
              type="button"
              onClick={() => setAutoMode(!autoMode)}
              aria-pressed={autoMode}
              aria-label={autoMode ? `Musique adaptative activée, ambiance ${situation}` : 'Musique adaptative désactivée'}
              className={cn('menu-focus flex h-8 flex-shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-black transition-all', autoMode ? 'text-white' : 'text-white/50 hover:text-white')}
              style={{ background: autoMode ? 'linear-gradient(90deg,#a855f7,#22d3ee)' : 'rgba(255,255,255,0.06)', boxShadow: autoMode ? '0 0 12px rgba(168,85,247,0.5)' : 'none' }}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              <span className="hidden sm:inline">AUTO</span>
            </button>
            <button
              type="button"
              onClick={() => setShuffle((s) => !s)}
              aria-pressed={shuffle}
              aria-label="Lecture aléatoire"
              className={cn("menu-focus hidden h-8 w-8 items-center justify-center rounded-lg transition-colors sm:flex", shuffle ? "text-purple-300" : "text-white/50 hover:text-white")}
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Piste précédente"
              className="menu-focus flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:text-white"
            >
              <SkipBack className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={togglePlay}
              aria-label={isPlaying ? `Mettre en pause ${trackLabel}` : `Lire ${trackLabel}`}
              className="menu-focus flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', boxShadow: '0 0 18px rgba(168,85,247,0.6)' }}
            >
              {isPlaying ? <Pause className="h-5 w-5 text-white" fill="white" aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5 text-white" fill="white" aria-hidden="true" />}
            </motion.button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Piste suivante"
              className="menu-focus flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:text-white"
            >
              <SkipForward className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShowVolume((v) => !v)}
              aria-expanded={showVolume}
              aria-label="Régler les volumes"
              className={cn("menu-focus hidden h-8 w-8 items-center justify-center rounded-lg transition-colors sm:flex", showVolume ? "text-white" : "text-white/50 hover:text-white")}
            >
              {musicVolume === 0 ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const MusicPlayerBar = memo(MusicPlayerBarComponent);
