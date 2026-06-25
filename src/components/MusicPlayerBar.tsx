import { useState, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useBackgroundMusic, type MusicTrack } from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Sparkles, X,
  ChevronUp, ChevronDown, Shuffle, Repeat, Repeat1, ListMusic,
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

/* small reusable album cover */
const Cover = ({ track, size, className }: { track: MusicTrack | null; size: number; className?: string }) => {
  const c = coverFor(track);
  return (
    <div
      className={cn("relative flex items-center justify-center flex-shrink-0 overflow-hidden", className)}
      style={{ width: size, height: size, borderRadius: size > 80 ? 20 : 10, background: c.gradient, boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}
    >
      <span style={{ fontSize: size * 0.42, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>{c.emoji}</span>
      <div className="absolute inset-0 ring-1 ring-white/15 rounded-[inherit]" />
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
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "one">("off");

  const togglePlay = useCallback(() => { isPlaying ? pause() : play(); }, [isPlaying, pause, play]);

  const handleNext = useCallback(() => {
    if (repeat === "one") { seek(0); play(); return; }
    if (shuffle && tracks.length > 1) {
      let id = currentTrack?.id;
      while (id === currentTrack?.id) id = tracks[Math.floor(Math.random() * tracks.length)].id;
      selectTrack(id!); if (!isPlaying) play();
      return;
    }
    nextTrack();
  }, [repeat, shuffle, tracks, currentTrack, selectTrack, isPlaying, play, nextTrack, seek]);

  const handlePrev = useCallback(() => {
    if (progress > 3) { seek(0); return; }
    previousTrack();
  }, [progress, seek, previousTrack]);

  const seekByClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration);
  }, [seek, duration]);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const cover = coverFor(currentTrack);

  return (
    <>
      <style>{`
        @keyframes mpFloat { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
        @keyframes mpShine { to { background-position: 200% center; } }
        @keyframes eqBar { 0%,100% { height: 25%; } 50% { height: 100%; } }
      `}</style>

      {/* ============== NOW PLAYING (full) ============== */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] flex flex-col"
              style={{ background: `radial-gradient(120% 80% at 50% 0%, ${cover.gradient.match(/#[0-9a-f]{6}/gi)?.[0]}33, transparent 60%), linear-gradient(180deg,#160a26,#08040f)`, backdropFilter: 'blur(8px)' }}
            >
              {/* top bar */}
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
                <button onClick={() => setExpanded(false)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white">
                  <ChevronDown className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 font-bold">Lecture en cours</p>
                  <p className="text-xs text-purple-300/70 font-bold">{autoMode ? `Auto · ${situation}` : 'Manuel'}</p>
                </div>
                <button onClick={() => setExpanded(false)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6 flex flex-col items-center">
                {/* big cover */}
                <div style={{ animation: isPlaying ? 'mpFloat 5s ease-in-out infinite' : 'none' }} className="mt-2">
                  <Cover track={currentTrack} size={Math.min(280, typeof window !== 'undefined' ? window.innerWidth - 100 : 280)} />
                </div>

                {/* title */}
                <div className="text-center mt-6 mb-4">
                  <h2 className="text-3xl font-black text-white">{titleOf(currentTrack?.name || 'Aucune piste')}</h2>
                  <p className="text-base text-white/50 mt-1">{cover.artist} · Mimic Master</p>
                </div>

                {/* scrubber */}
                <div className="w-full max-w-md">
                  <div className="relative h-2 rounded-full bg-white/10 cursor-pointer group" onClick={seekByClick}>
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#a855f7,#22d3ee)' }} />
                    <div className="absolute -top-1 w-4 h-4 rounded-full bg-white shadow opacity-0 group-hover:opacity-100" style={{ left: `${progressPct}%`, transform: 'translateX(-50%)' }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-white/40 font-mono mt-1.5 tabular-nums">
                    <span>{formatTime(progress)}</span><span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* controls */}
                <div className="flex items-center justify-center gap-5 mt-5">
                  <button onClick={() => setShuffle((s) => !s)} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", shuffle ? "text-purple-300" : "text-white/50 hover:text-white")}>
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <button onClick={handlePrev} className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                    <SkipBack className="w-6 h-6" fill="currentColor" />
                  </button>
                  <motion.button whileTap={{ scale: 0.92 }} onClick={togglePlay} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', boxShadow: '0 0 30px rgba(168,85,247,0.7)' }}>
                    {isPlaying ? <Pause className="w-7 h-7 text-white" fill="white" /> : <Play className="w-7 h-7 text-white ml-1" fill="white" />}
                  </motion.button>
                  <button onClick={handleNext} className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                    <SkipForward className="w-6 h-6" fill="currentColor" />
                  </button>
                  <button onClick={() => setRepeat((r) => (r === "off" ? "one" : "off"))} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", repeat !== "off" ? "text-purple-300" : "text-white/50 hover:text-white")}>
                    {repeat === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                  </button>
                </div>

                {/* volume + auto */}
                <div className="w-full max-w-md mt-6 flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-white/50 flex-shrink-0" />
                  <Slider value={[musicVolume * 100]} onValueChange={(v) => setMusicVolume(v[0] / 100)} max={100} step={1} className="flex-1" />
                  <button onClick={() => setAutoMode(!autoMode)} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black flex-shrink-0", autoMode ? "text-white" : "text-white/50")} style={{ background: autoMode ? 'linear-gradient(90deg,#a855f7,#22d3ee)' : 'rgba(255,255,255,0.06)' }}>
                    <Sparkles className="w-3 h-3" />AUTO
                  </button>
                </div>

                {/* queue */}
                <div className="w-full max-w-md mt-8">
                  <div className="flex items-center gap-2 mb-3 text-white/50 text-sm font-bold uppercase tracking-wide">
                    <ListMusic className="w-4 h-4" /> File d'attente
                  </div>
                  <div className="space-y-1.5">
                    {tracks.map((t) => {
                      const active = currentTrack?.id === t.id;
                      const tc = coverFor(t);
                      return (
                        <button
                          key={t.id}
                          onClick={() => { selectTrack(t.id); if (!isPlaying) play(); }}
                          className={cn("w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors", active ? "bg-white/10" : "hover:bg-white/5")}
                        >
                          <Cover track={t} size={40} />
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-bold truncate", active ? "text-purple-300" : "text-white")}>{titleOf(t.name)}</p>
                            <p className="text-[11px] text-white/40 truncate">{tc.artist}</p>
                          </div>
                          {active && isPlaying && (
                            <div className="flex items-end gap-[2px] h-3.5">
                              {[0, 1, 2].map((i) => <span key={i} className="w-[3px] rounded-full bg-purple-400" style={{ animation: `eqBar 0.9s ease-in-out ${i * 0.15}s infinite` }} />)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
            <div className="fixed inset-0 z-[55]" onClick={() => setShowVolume(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.94 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[56] w-[min(92vw,340px)] rounded-2xl overflow-hidden p-4 space-y-4"
              style={{ background: 'linear-gradient(180deg,rgba(24,14,40,0.97),rgba(11,7,22,0.98))', border: '1px solid rgba(168,85,247,0.25)', backdropFilter: 'blur(16px)' }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-white"><span>🎵 Musique</span><span className="text-white/50 tabular-nums">{Math.round(musicVolume * 100)}%</span></div>
                <Slider value={[musicVolume * 100]} onValueChange={(v) => setMusicVolume(v[0] / 100)} max={100} step={1} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-white"><span>🔊 Effets</span><span className="text-white/50 tabular-nums">{Math.round(sfxVolume * 100)}%</span></div>
                <Slider value={[sfxVolume * 100]} onValueChange={(v) => setSfxVolume(v[0] / 100)} max={100} step={1} />
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
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ width: "min(94vw, 580px)" }}
      >
        <div className="relative pointer-events-auto rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg,rgba(24,14,40,0.96),rgba(11,7,22,0.97))', border: '1px solid rgba(168,85,247,0.25)', backdropFilter: 'blur(16px)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
          {/* progress */}
          <div className="relative h-1 cursor-pointer group" onClick={seekByClick} style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="absolute inset-y-0 left-0" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#a855f7,#22d3ee)' }} />
          </div>

          <div className="flex items-center gap-2.5 px-2.5 py-2">
            {/* cover + info → expand */}
            <button onClick={() => setExpanded(true)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left group">
              <div className="relative">
                <Cover track={currentTrack} size={44} />
                {isPlaying && <div className="absolute -inset-0.5 rounded-[12px] bg-purple-500/40 blur-md -z-10 animate-pulse" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate">{titleOf(currentTrack?.name || 'Aucune piste')}</p>
                <p className="text-[11px] text-white/45 truncate">{cover.artist} · {formatTime(progress)}/{formatTime(duration)}</p>
              </div>
              <ChevronUp className="w-4 h-4 text-white/40 group-hover:text-white flex-shrink-0" />
            </button>

            {/* controls */}
            <button
              onClick={() => setAutoMode(!autoMode)}
              title={autoMode ? `Auto activé (${situation})` : 'Auto désactivé'}
              className={cn('flex-shrink-0 flex items-center gap-1 px-2 h-8 rounded-lg text-[11px] font-black transition-all', autoMode ? 'text-white' : 'text-white/50 hover:text-white')}
              style={{ background: autoMode ? 'linear-gradient(90deg,#a855f7,#22d3ee)' : 'rgba(255,255,255,0.06)', boxShadow: autoMode ? '0 0 12px rgba(168,85,247,0.5)' : 'none' }}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">AUTO</span>
            </button>
            <button onClick={() => setShuffle((s) => !s)} className={cn("hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-colors", shuffle ? "text-purple-300" : "text-white/50 hover:text-white")}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={handlePrev} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white">
              <SkipBack className="w-4 h-4" fill="currentColor" />
            </button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={togglePlay} className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', boxShadow: '0 0 18px rgba(168,85,247,0.6)' }}>
              {isPlaying ? <Pause className="w-5 h-5 text-white" fill="white" /> : <Play className="w-5 h-5 text-white ml-0.5" fill="white" />}
            </motion.button>
            <button onClick={handleNext} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white">
              <SkipForward className="w-4 h-4" fill="currentColor" />
            </button>
            <button onClick={() => setShowVolume((v) => !v)} className={cn("hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-colors", showVolume ? "text-white" : "text-white/50 hover:text-white")}>
              {musicVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const MusicPlayerBar = memo(MusicPlayerBarComponent);
