import { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, Disc3,
  Sparkles, X, ListMusic,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/* Animated equalizer bars */
const Equalizer = ({ active }: { active: boolean }) => (
  <div className="flex items-end gap-[2px] h-3.5">
    {[0, 1, 2, 3].map((i) => (
      <span
        key={i}
        className="w-[3px] rounded-full bg-gradient-to-t from-cyan-400 to-purple-400"
        style={{
          height: active ? undefined : '20%',
          animation: active ? `eqBar 0.9s ease-in-out ${i * 0.12}s infinite` : 'none',
        }}
      />
    ))}
  </div>
);

const TrackItem = memo(
  ({ track, isCurrentTrack, isPlaying, onSelect }: {
    track: { id: number; name: string };
    isCurrentTrack: boolean;
    isPlaying: boolean;
    onSelect: () => void;
  }) => (
    <motion.button
      onClick={onSelect}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 p-2.5 rounded-xl text-left w-full transition-all border"
      style={{
        background: isCurrentTrack ? 'linear-gradient(90deg, rgba(168,85,247,0.25), rgba(34,211,238,0.12))' : 'rgba(255,255,255,0.03)',
        borderColor: isCurrentTrack ? 'rgba(192,132,252,0.5)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: isCurrentTrack ? 'linear-gradient(135deg,#a855f7,#22d3ee)' : 'rgba(255,255,255,0.06)' }}
      >
        {isCurrentTrack && isPlaying ? <Disc3 className="h-4 w-4 text-white animate-spin" style={{ animationDuration: "3s" }} /> : <Music className="h-4 w-4 text-white/80" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-bold text-sm leading-none truncate", isCurrentTrack ? "text-white" : "text-white/80")}>{track.name}</p>
        <p className="text-[10px] text-white/35 mt-1">Piste {track.id}</p>
      </div>
      {isCurrentTrack && isPlaying && <Equalizer active />}
    </motion.button>
  ),
);
TrackItem.displayName = "TrackItem";

const glassPanel: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(24,14,40,0.96), rgba(11,7,22,0.97))',
  backdropFilter: 'blur(18px)',
  border: '1px solid rgba(168,85,247,0.25)',
  boxShadow: '0 24px 60px rgba(124,58,237,0.35)',
};

const MusicPlayerBarComponent = () => {
  const {
    isPlaying, play, pause, currentTrack, tracks, nextTrack, previousTrack, selectTrack,
    volume: musicVolume, setVolume: setMusicVolume, progress, duration, seek,
    autoMode, setAutoMode, situation,
  } = useBackgroundMusic();

  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();
  const [showVolume, setShowVolume] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  }, [seek, duration]);

  const handleTrackSelect = useCallback((trackId: number) => {
    selectTrack(trackId);
    if (!isPlaying) play();
  }, [selectTrack, isPlaying, play]);

  const togglePlay = useCallback(() => { if (isPlaying) pause(); else play(); }, [isPlaying, pause, play]);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <style>{`
        @property --mp-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes mpBorderSpin { to { --mp-angle: 360deg; } }
        @keyframes eqBar { 0%,100% { height: 25%; } 50% { height: 100%; } }
        @keyframes mpShine { to { background-position: 200% center; } }
      `}</style>

      {/* ============== PLAYLIST POPOVER ============== */}
      <AnimatePresence>
        {showPlaylist && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setShowPlaylist(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.94 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[min(92vw,440px)] z-[56] rounded-3xl overflow-hidden"
              style={glassPanel}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-cyan-600/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-cyan-500"><ListMusic className="h-4 w-4 text-white" strokeWidth={2.5} /></div>
                  <h3 className="text-lg font-black text-white">Playlist</h3>
                  <span className="text-xs text-white/40">{tracks.length} pistes</span>
                </div>
                <button onClick={() => setShowPlaylist(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-rose-500/20"><X className="w-4 h-4" /></button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                {tracks.map((track) => (
                  <TrackItem key={track.id} track={track} isCurrentTrack={currentTrack?.id === track.id} isPlaying={isPlaying} onSelect={() => handleTrackSelect(track.id)} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============== VOLUME POPOVER ============== */}
      <AnimatePresence>
        {showVolume && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55]" onClick={() => setShowVolume(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.94 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[56] w-[min(92vw,360px)] rounded-3xl overflow-hidden p-4 space-y-4"
              style={glassPanel}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white">Volume</h3>
                <button onClick={() => setShowVolume(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-rose-500/20"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-bold text-white"><Music className="h-4 w-4 text-purple-300" />Musique</label>
                  <span className="text-xs text-white/50 tabular-nums">{Math.round(musicVolume * 100)}%</span>
                </div>
                <Slider value={[musicVolume * 100]} onValueChange={(v) => setMusicVolume(v[0] / 100)} max={100} step={1} className="w-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-bold text-white"><Volume2 className="h-4 w-4 text-cyan-300" />Effets sonores</label>
                  <span className="text-xs text-white/50 tabular-nums">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <Slider value={[sfxVolume * 100]} onValueChange={(v) => setSfxVolume(v[0] / 100)} max={100} step={1} className="w-full" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============== PLAYER BAR (AAA) ============== */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 220, delay: 0.3 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ width: "min(94vw, 600px)" }}
      >
        <div className="relative pointer-events-auto rounded-3xl p-[1.5px] overflow-hidden">
          {/* animated gradient border */}
          <div
            className="absolute inset-0 rounded-3xl opacity-80"
            style={{ background: 'conic-gradient(from var(--mp-angle,0deg), #a855f7, #22d3ee, #f472b6, #fbbf24, #a855f7)', animation: 'mpBorderSpin 10s linear infinite' }}
          />
          <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(22,12,38,0.96), rgba(10,6,20,0.97))', backdropFilter: 'blur(16px)' }}>
            {/* glow blobs */}
            <div className="absolute -top-10 left-10 w-32 h-32 rounded-full bg-purple-600/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 right-10 w-32 h-32 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

            {/* Progress bar */}
            <div className="relative h-1.5 cursor-pointer group" onClick={handleProgressClick} style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg,#a855f7,#22d3ee,#f472b6)",
                  backgroundSize: '200% auto',
                  animation: 'mpShine 3s linear infinite',
                  boxShadow: "0 0 10px rgba(168,85,247,0.6)",
                }}
              />
              <div className="absolute -top-1 w-3.5 h-3.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progressPct}%`, transform: "translateX(-50%)", boxShadow: '0 0 8px rgba(255,255,255,0.8)' }} />
            </div>

            {/* Main row */}
            <div className="relative flex items-center gap-2.5 px-3 py-2.5">
              {/* Album disc */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="relative flex-shrink-0"
                title="Playlist"
              >
                {/* glow ring */}
                {isPlaying && <div className="absolute -inset-1 rounded-full bg-purple-500/40 blur-md animate-pulse" />}
                <motion.div
                  animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                  transition={isPlaying ? { duration: 5, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                  className="relative w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'repeating-radial-gradient(circle at center, #1a1024 0 2px, #0d0716 2px 4px)',
                    border: '2px solid rgba(255,255,255,0.12)',
                    boxShadow: isPlaying ? '0 0 18px rgba(168,85,247,0.6)' : 'none',
                  }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a855f7,#22d3ee)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0a0810]" />
                  </div>
                </motion.div>
              </motion.button>

              {/* Track info */}
              <button onClick={() => setShowPlaylist(!showPlaylist)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <p
                    className="font-black text-base leading-none truncate bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(90deg,#fff,#c084fc,#22d3ee,#fff)', backgroundSize: '200% auto', animation: isPlaying ? 'mpShine 5s linear infinite' : 'none' }}
                  >
                    {currentTrack?.name || "Aucune piste"}
                  </p>
                  {isPlaying && <Equalizer active />}
                </div>
                <p className="text-[10px] text-white/45 font-mono mt-1 tabular-nums">{formatTime(progress)} / {formatTime(duration)}</p>
              </button>

              {/* AUTO */}
              <button
                onClick={() => setAutoMode(!autoMode)}
                title={autoMode ? `Auto ON · ${situation}` : "Auto OFF"}
                className={cn("hidden sm:flex flex-shrink-0 items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black transition-all", autoMode ? "text-white" : "text-white/50")}
                style={{ background: autoMode ? 'linear-gradient(90deg,#a855f7,#22d3ee)' : 'rgba(255,255,255,0.05)', boxShadow: autoMode ? '0 0 14px rgba(168,85,247,0.5)' : 'none' }}
              >
                <Sparkles className="h-3 w-3" strokeWidth={3} />AUTO
              </button>

              {/* Prev */}
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} onClick={previousTrack}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white flex-shrink-0 bg-white/5 hover:bg-white/10 transition-colors">
                <SkipBack className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />
              </motion.button>

              {/* Play / Pause hero */}
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={togglePlay}
                className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 22px rgba(168,85,247,0.65)" }}>
                {isPlaying ? <Pause className="h-5 w-5 text-white" fill="white" /> : <Play className="h-5 w-5 text-white ml-0.5" fill="white" />}
              </motion.button>

              {/* Next */}
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} onClick={nextTrack}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white flex-shrink-0 bg-white/5 hover:bg-white/10 transition-colors">
                <SkipForward className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />
              </motion.button>

              {/* Volume */}
              <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} onClick={() => setShowVolume(!showVolume)}
                className={cn("hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0 transition-colors", showVolume ? "text-white bg-purple-500/25" : "text-white/80 hover:text-white bg-white/5 hover:bg-white/10")}>
                {musicVolume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const MusicPlayerBar = memo(MusicPlayerBarComponent);
