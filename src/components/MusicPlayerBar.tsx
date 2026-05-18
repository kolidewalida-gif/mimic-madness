import { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  Disc3,
  Sparkles,
  X,
  ListMusic,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const GRAFFITI_TEXT_SHADOW =
  "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810";

const TrackItem = memo(
  ({
    track,
    isCurrentTrack,
    isPlaying,
    onSelect,
  }: {
    track: { id: number; name: string };
    isCurrentTrack: boolean;
    isPlaying: boolean;
    onSelect: () => void;
  }) => (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-2xl text-left w-full transition-all",
      )}
      style={{
        background: isCurrentTrack
          ? "linear-gradient(180deg, rgba(251,191,36,0.25), rgba(217,119,6,0.18))"
          : "rgba(168,85,247,0.06)",
        border: isCurrentTrack ? "2.5px solid #fbbf24" : "2px solid #0a0810",
        boxShadow: isCurrentTrack ? "0 3px 0 #0a0810" : "0 2px 0 #0a0810",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isCurrentTrack
            ? "linear-gradient(135deg, #fbbf24, #d97706)"
            : "linear-gradient(135deg, #a855f7, #6b21a8)",
          border: "2px solid #0a0810",
        }}
      >
        {isCurrentTrack && isPlaying ? (
          <Disc3
            className="h-4 w-4 text-white animate-spin"
            style={{ animationDuration: "3s" }}
          />
        ) : (
          <Music className="h-4 w-4 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-black text-base leading-none truncate",
            isCurrentTrack ? "text-amber-200" : "text-white",
          )}
          style={{ fontFamily: "'Caveat', cursive", textShadow: GRAFFITI_TEXT_SHADOW }}
        >
          {track.name}
        </p>
        <p className="text-[10px] text-white/40 font-mono mt-0.5">
          Piste {track.id}
        </p>
      </div>
      {isCurrentTrack && (
        <div className="flex gap-0.5">
          <span
            className="w-1 h-3 bg-amber-300 rounded-full animate-pulse"
            style={{ boxShadow: "0 0 4px #fbbf24" }}
          />
          <span
            className="w-1 h-3 bg-amber-300 rounded-full animate-pulse"
            style={{ animationDelay: "0.15s", boxShadow: "0 0 4px #fbbf24" }}
          />
          <span
            className="w-1 h-3 bg-amber-300 rounded-full animate-pulse"
            style={{ animationDelay: "0.3s", boxShadow: "0 0 4px #fbbf24" }}
          />
        </div>
      )}
    </motion.button>
  ),
);

TrackItem.displayName = "TrackItem";

const MusicPlayerBarComponent = () => {
  const {
    isPlaying,
    play,
    pause,
    currentTrack,
    tracks,
    nextTrack,
    previousTrack,
    selectTrack,
    volume: musicVolume,
    setVolume: setMusicVolume,
    progress,
    duration,
    seek,
    autoMode,
    setAutoMode,
    situation,
  } = useBackgroundMusic();

  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();
  const [showVolume, setShowVolume] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      seek(percentage * duration);
    },
    [seek, duration],
  );

  const handleTrackSelect = useCallback(
    (trackId: number) => {
      selectTrack(trackId);
      if (!isPlaying) play();
    },
    [selectTrack, isPlaying, play],
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      {/* ============== PLAYLIST POPOVER ============== */}
      <AnimatePresence>
        {showPlaylist && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
              onClick={() => setShowPlaylist(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] z-[56] rounded-3xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)",
                border: "4px solid #0a0810",
                boxShadow:
                  "0 12px 0 #0a0810, 0 18px 40px rgba(168,85,247,0.4), inset 0 2px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
                style={{ border: "2px solid rgba(168,85,247,0.4)" }}
              />
              <div
                className="relative flex items-center justify-between px-4 py-3"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))",
                  borderBottom: "3px solid #0a0810",
                }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
                      border: "2.5px solid #0a0810",
                      boxShadow: "0 3px 0 #0a0810",
                    }}
                  >
                    <ListMusic
                      className="h-4 w-4 text-white"
                      strokeWidth={2.5}
                    />
                  </motion.div>
                  <h3
                    className="text-2xl font-black text-white leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW,
                    }}
                  >
                    Playlist
                  </h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPlaylist(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{
                    background: "rgba(239,68,68,0.2)",
                    border: "2.5px solid #0a0810",
                    boxShadow: "0 3px 0 #0a0810",
                  }}
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </motion.button>
              </div>
              <div className="relative max-h-[50vh] overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                {tracks.map((track) => (
                  <TrackItem
                    key={track.id}
                    track={track}
                    isCurrentTrack={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    onSelect={() => handleTrackSelect(track.id)}
                  />
                ))}
              </div>
              <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.6); }
              `}</style>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============== VOLUME POPOVER ============== */}
      <AnimatePresence>
        {showVolume && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[56] w-[min(92vw,360px)] rounded-3xl overflow-hidden p-4 space-y-3"
            style={{
              background:
                "linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)",
              border: "4px solid #0a0810",
              boxShadow:
                "0 12px 0 #0a0810, 0 18px 40px rgba(168,85,247,0.4), inset 0 2px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-2xl font-black text-white leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW,
                }}
              >
                Volume
              </h3>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowVolume(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "2.5px solid #0a0810",
                  boxShadow: "0 3px 0 #0a0810",
                }}
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </motion.button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="flex items-center gap-2 text-base font-black text-white"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  <Music className="h-4 w-4 text-amber-300" />
                  Musique
                </label>
                <span className="text-xs text-white/60 font-mono">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[musicVolume * 100]}
                onValueChange={(value) => setMusicVolume(value[0] / 100)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="flex items-center gap-2 text-base font-black text-white"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  <Volume2 className="h-4 w-4 text-cyan-300" />
                  Effets sonores
                </label>
                <span className="text-xs text-white/60 font-mono">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[sfxVolume * 100]}
                onValueChange={(value) => setSfxVolume(value[0] / 100)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============== FLOATING CARTOON PILL ============== */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 220, delay: 0.3 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{
          width: "min(92vw, 560px)",
        }}
      >
        <div
          className="relative pointer-events-auto rounded-3xl overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)",
            border: "3.5px solid #0a0810",
            boxShadow:
              "0 8px 0 #0a0810, 0 14px 30px rgba(168,85,247,0.4), inset 0 2px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Inner accent line */}
          <div
            className="absolute inset-1 rounded-[1.15rem] pointer-events-none"
            style={{ border: "1.5px solid rgba(168,85,247,0.3)" }}
          />

          {/* Progress bar (graffiti rainbow) */}
          <div
            className="relative h-1.5 cursor-pointer group"
            onClick={handleProgressClick}
            style={{
              background: "rgba(255,255,255,0.06)",
              borderBottom: "2px solid #0a0810",
            }}
          >
            <div
              className="absolute inset-y-0 left-0 transition-all duration-150 group-hover:brightness-110"
              style={{
                width: `${progressPct}%`,
                background:
                  "linear-gradient(90deg, #f87171, #fbbf24, #34d399, #38bdf8, #c084fc)",
                boxShadow: "0 0 8px rgba(251, 191, 36, 0.55)",
              }}
            />
            {/* Hover thumb */}
            <div
              className="absolute -top-1 w-3 h-3 rounded-full bg-amber-300 border-2 border-[#0a0810] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${progressPct}%`,
                transform: "translateX(-50%)",
                boxShadow: "0 2px 0 #0a0810",
              }}
            />
          </div>

          {/* Main row */}
          <div className="relative flex items-center gap-2 px-3 py-2.5">
            {/* Track info button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-xl px-1 py-0.5 hover:bg-white/5 transition-colors"
            >
              {/* Spinning disc */}
              <motion.div
                animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isPlaying
                    ? { duration: 4, repeat: Infinity, ease: "linear" }
                    : { duration: 0 }
                }
                className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isPlaying
                    ? "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)"
                    : "linear-gradient(135deg, #6b7280, #374151)",
                  border: "2.5px solid #0a0810",
                  boxShadow: isPlaying
                    ? "0 3px 0 #0a0810, 0 0 14px rgba(251,191,36,0.5)"
                    : "0 3px 0 #0a0810",
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full bg-[#0a0810]"
                  style={{ boxShadow: "0 0 0 1.5px rgba(255,255,255,0.15)" }}
                />
                {/* Side dot like vinyl */}
                <div
                  className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-white/40"
                />
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p
                    className="font-black text-base leading-none truncate text-white"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW,
                    }}
                  >
                    {currentTrack?.name || "Aucune piste"}
                  </p>
                </div>
                <p className="text-[10px] text-white/50 font-mono mt-0.5">
                  {formatTime(progress)} / {formatTime(duration)}
                </p>
              </div>
            </motion.button>

            {/* AUTO mode pill */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAutoMode(!autoMode)}
              title={autoMode ? `Auto ON · ${situation}` : "Auto OFF"}
              className="hidden sm:flex flex-shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black"
              style={{
                background: autoMode
                  ? "linear-gradient(180deg, #fbbf24, #d97706)"
                  : "rgba(255,255,255,0.05)",
                border: "2.5px solid #0a0810",
                boxShadow: "0 3px 0 #0a0810",
                color: autoMode ? "#0a0810" : "rgba(255,255,255,0.7)",
                fontFamily: "'Caveat', cursive",
                textShadow: autoMode
                  ? "0.5px 0.5px 0 rgba(255,255,255,0.3)"
                  : "none",
              }}
            >
              <Sparkles className="h-3 w-3" strokeWidth={3} />
              AUTO
            </motion.button>

            {/* Prev */}
            <motion.button
              whileHover={{ scale: 1.08, x: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={previousTrack}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "2.5px solid #0a0810",
                boxShadow: "0 3px 0 #0a0810",
              }}
            >
              <SkipBack className="h-4 w-4" strokeWidth={2.5} />
            </motion.button>

            {/* Play / Pause — hero button */}
            <motion.button
              whileHover={{ scale: 1.08, rotate: -3 }}
              whileTap={{ scale: 0.92 }}
              onClick={togglePlay}
              className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
                border: "3px solid #0a0810",
                boxShadow:
                  "0 4px 0 #0a0810, 0 6px 16px rgba(239,68,68,0.5), inset 0 2px 0 rgba(255,255,255,0.25)",
              }}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" fill="white" strokeWidth={2.5} />
              ) : (
                <Play
                  className="h-5 w-5 text-white ml-0.5"
                  fill="white"
                  strokeWidth={2.5}
                />
              )}
            </motion.button>

            {/* Next */}
            <motion.button
              whileHover={{ scale: 1.08, x: 2 }}
              whileTap={{ scale: 0.92 }}
              onClick={nextTrack}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "2.5px solid #0a0810",
                boxShadow: "0 3px 0 #0a0810",
              }}
            >
              <SkipForward className="h-4 w-4" strokeWidth={2.5} />
            </motion.button>

            {/* Volume */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowVolume(!showVolume)}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-white flex-shrink-0"
              style={{
                background: showVolume
                  ? "rgba(168,85,247,0.25)"
                  : "rgba(255,255,255,0.06)",
                border: "2.5px solid #0a0810",
                boxShadow: "0 3px 0 #0a0810",
              }}
            >
              {musicVolume === 0 ? (
                <VolumeX className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <Volume2 className="h-4 w-4" strokeWidth={2.5} />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const MusicPlayerBar = memo(MusicPlayerBarComponent);
