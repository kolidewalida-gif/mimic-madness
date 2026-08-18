import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  useBackgroundMusic, type MusicTrack, type MusicMood, type MusicSituation,
} from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Sparkles, X,
  ChevronUp, ChevronDown, Shuffle, Repeat1, ListMusic, Search, Disc3, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { coverFor, titleOf, MOOD_LABEL } from "@/lib/musicCovers";
import { useDialogBehaviour } from "@/components/menu/InkOverlay";

/* ============================================================
   Helpers
============================================================ */
const formatTime = (t: number) => {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/** Spoken duration, so screen readers don't read "3:07" as a ratio. */
const spokenTime = (t: number) => {
  if (!Number.isFinite(t)) return "0 seconde";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const mm = m > 0 ? `${m} minute${m > 1 ? "s" : ""} ` : "";
  return `${mm}${s} seconde${s > 1 ? "s" : ""}`;
};

/** Human label for the adaptive situation, instead of the raw internal key. */
const SITUATION_LABEL: Record<MusicSituation, string> = {
  home: "Accueil", lobby: "Lobby", preparation: "Préparation", preview: "Aperçu",
  round: "Manche", playing: "En jeu", voting: "Vote", victory: "Victoire",
  defeat: "Défaite", undercover: "Undercover", audiophone: "Audio Phone",
  "audiophone-rewind": "Audio Phone inversé", quiz: "Quiz", monopoly: "Monopoly",
  pixoguess: "BlurRush", "team-showdown": "Duel 2v2", blindtest: "Blindtest",
  "mimic-waiting": "Mimic", "mimic-results": "Résultats Mimic", connection: "Reconnexion",
};

const readFlag = (key: string) => {
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
};
const writeFlag = (key: string, value: boolean) => {
  try { localStorage.setItem(key, String(value)); } catch { /* storage can be disabled */ }
};

/* ============================================================
   Cover art
============================================================ */
const Cover = ({ track, size, spinning }: { track: MusicTrack | null; size: number; spinning?: boolean }) => {
  const c = coverFor(track);
  return (
    <span
      className="relative grid flex-shrink-0 place-items-center overflow-hidden"
      style={{
        width: size, height: size,
        borderRadius: size > 80 ? 24 : 12,
        background: c.gradient,
        border: size > 80 ? "4px solid var(--ink-outline)" : "2.5px solid var(--ink-outline)",
        boxShadow: size > 80 ? "0 8px 0 var(--ink-outline)" : "0 3px 0 var(--ink-outline)",
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: size * 0.4, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }}>{c.emoji}</span>
      {size > 80 && (
        <span
          className={cn("absolute grid place-items-center rounded-full", spinning && "mp-spin")}
          style={{
            inset: "22%",
            background: "radial-gradient(circle, rgba(10,8,16,.92) 30%, rgba(10,8,16,.25) 31%, transparent 62%)",
          }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/70" />
        </span>
      )}
    </span>
  );
};

/* ============================================================
   Seek bar — keyboard accessible
============================================================ */
const SeekBar = ({ progress, duration, onSeek, tall }: {
  progress: number; duration: number; onSeek: (time: number) => void; tall?: boolean;
}) => {
  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <div className={cn("group relative w-full", tall ? "h-2.5" : "h-1.5")}>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: tall ? 999 : 0,
          border: tall ? "2px solid var(--ink-outline)" : "none",
        }}
      >
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#a855f7,#22d3ee)", borderRadius: "inherit" }}
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
          className="pointer-events-none absolute -top-1.5 h-5 w-5 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          style={{ left: `${pct}%`, transform: "translateX(-50%)", border: "2.5px solid var(--ink-outline)" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

/* ============================================================
   Volume row
============================================================ */
const VolumeRow = ({ label, icon, value, onChange, accent }: {
  label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void; accent: string;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-base font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <span style={{ color: accent }} aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span className="font-mono text-xs font-bold tabular-nums text-white/55">{Math.round(value * 100)}%</span>
    </div>
    <div className="relative h-2.5">
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{ background: "rgba(0,0,0,0.45)", border: "2px solid var(--ink-outline)" }}
      >
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: accent }} />
      </div>
      <input
        type="range" min={0} max={100} step={1} value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="menu-focus absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={label}
      />
    </div>
  </div>
);

/* ============================================================
   Transport button
============================================================ */
const TransportButton = ({ children, label, onClick, active, primary, pressed }: {
  children: React.ReactNode; label: string; onClick: () => void;
  active?: boolean; primary?: boolean; pressed?: boolean;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ scale: 0.92 }}
    whileHover={{ y: -2 }}
    aria-label={label}
    aria-pressed={pressed}
    className={cn(
      "menu-icon-control menu-focus grid place-items-center rounded-2xl text-white",
      primary ? "h-16 w-16" : "h-12 w-12",
      !primary && !active && "text-white/60 hover:text-white",
    )}
    style={{
      background: primary
        ? "linear-gradient(180deg,#a855f7,#6b21a8)"
        : active
          ? "linear-gradient(180deg,#22d3ee,#0e7490)"
          : "rgba(255,255,255,0.05)",
      border: primary ? "4px solid var(--ink-outline)" : "2.5px solid var(--ink-outline)",
      boxShadow: primary ? "0 5px 0 var(--ink-outline)" : "0 3px 0 var(--ink-outline)",
    }}
  >
    {children}
  </motion.button>
);

/* ============================================================
   Main
============================================================ */
const MusicPlayerBarComponent = () => {
  const {
    isPlaying, play, pause, currentTrack, tracks, nextTrack, previousTrack, selectTrack,
    volume: musicVolume, setVolume: setMusicVolume, progress, duration, seek,
    autoMode, setAutoMode, situation,
  } = useBackgroundMusic();
  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<MusicMood | "all">("all");
  const [shuffle, setShuffle] = useState(() => readFlag("musicShuffle"));
  const [repeatOne, setRepeatOne] = useState(() => readFlag("musicRepeatOne"));
  const [lastVolume, setLastVolume] = useState(() => (musicVolume > 0 ? musicVolume : 0.3));

  useEffect(() => { writeFlag("musicShuffle", shuffle); }, [shuffle]);
  useEffect(() => { writeFlag("musicRepeatOne", repeatOne); }, [repeatOne]);
  useEffect(() => { if (musicVolume > 0) setLastVolume(musicVolume); }, [musicVolume]);

  const close = useCallback(() => setExpanded(false), []);
  const panelRef = useDialogBehaviour(expanded, close);

  const togglePlay = useCallback(() => { isPlaying ? pause() : play(); }, [isPlaying, pause, play]);

  const toggleMute = useCallback(() => {
    setMusicVolume(musicVolume > 0 ? 0 : lastVolume || 0.3);
  }, [musicVolume, lastVolume, setMusicVolume]);

  const handleNext = useCallback(() => {
    if (repeatOne) { seek(0); play(); return; }
    if (shuffle && tracks.length > 1) {
      let id = currentTrack?.id;
      while (id === currentTrack?.id) id = tracks[Math.floor(Math.random() * tracks.length)].id;
      selectTrack(id!);
      if (!isPlaying) play();
      return;
    }
    nextTrack();
  }, [repeatOne, shuffle, tracks, currentTrack, selectTrack, isPlaying, play, nextTrack, seek]);

  const handlePrev = useCallback(() => {
    if (progress > 3) { seek(0); return; }
    previousTrack();
  }, [progress, seek, previousTrack]);

  const moods = useMemo(() => {
    const set = new Set<MusicMood>();
    tracks.forEach((track) => track.moods?.forEach((mood) => set.add(mood)));
    return Array.from(set);
  }, [tracks]);

  const visibleTracks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tracks.filter((track) => {
      if (moodFilter !== "all" && !track.moods?.includes(moodFilter)) return false;
      if (!needle) return true;
      return `${track.name} ${track.genre ?? ""}`.toLowerCase().includes(needle);
    });
  }, [tracks, query, moodFilter]);

  const cover = coverFor(currentTrack);
  const trackLabel = titleOf(currentTrack?.name || "Aucune piste");
  const muted = musicVolume === 0;

  /* ---------------- STUDIO (expanded) ---------------- */
  const studio = (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="menu-dialog menu-screen-safe fixed inset-0 z-[9998] flex flex-col"
          style={{
            background: `radial-gradient(120% 80% at 50% 0%, ${cover.gradient.match(/#[0-9a-f]{6}/gi)?.[0]}33, transparent 62%), var(--ink-panel-gradient)`,
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="music-studio-title"
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* HEADER */}
            <div className="ink-panel-header flex flex-shrink-0 items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl text-white"
                  style={{
                    background: "linear-gradient(135deg,#a855f7,#7e22ce)",
                    border: "var(--ink-border)",
                    boxShadow: "var(--ink-shadow)",
                  }}
                  aria-hidden="true"
                >
                  <Disc3 className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Bande-son originale
                  </p>
                  <h2 id="music-studio-title" className="ink-title truncate text-3xl">Studio audio</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="ink-close-button menu-icon-control menu-focus"
                aria-label="Fermer le lecteur"
                data-autofocus
              >
                <ChevronDown className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
              </button>
            </div>

            {/* BODY */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto grid w-full max-w-5xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:p-5">

                {/* ── NOW PLAYING ── */}
                <section
                  className="flex flex-col items-center gap-4 rounded-3xl p-5"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                    border: "var(--ink-border)",
                    boxShadow: "var(--ink-shadow)",
                  }}
                  aria-label="Lecture en cours"
                >
                  <Cover track={currentTrack} size={200} spinning={isPlaying} />

                  <div className="text-center">
                    <h3 className="ink-title text-4xl">{trackLabel}</h3>
                    <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                      {cover.artist}{currentTrack?.bpm ? ` · ${currentTrack.bpm} BPM` : ""}
                    </p>
                    {currentTrack?.moods && currentTrack.moods.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {currentTrack.moods.map((mood) => (
                          <span
                            key={mood}
                            className="rounded-full px-2 py-0.5 text-[11px] font-black text-white/80"
                            style={{ background: "rgba(168,85,247,0.22)", border: "2px solid var(--ink-outline)" }}
                          >
                            {MOOD_LABEL[mood]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-full">
                    <SeekBar progress={progress} duration={duration} onSeek={seek} tall />
                    <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-white/45">
                      <span>{formatTime(progress)}</span><span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <TransportButton label="Lecture aléatoire" pressed={shuffle} active={shuffle} onClick={() => setShuffle((s) => !s)}>
                      <Shuffle className="h-5 w-5" aria-hidden="true" />
                    </TransportButton>
                    <TransportButton label="Piste précédente" onClick={handlePrev}>
                      <SkipBack className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                    </TransportButton>
                    <TransportButton label={isPlaying ? `Mettre en pause ${trackLabel}` : `Lire ${trackLabel}`} onClick={togglePlay} primary>
                      {isPlaying
                        ? <Pause className="h-7 w-7" fill="white" aria-hidden="true" />
                        : <Play className="ml-1 h-7 w-7" fill="white" aria-hidden="true" />}
                    </TransportButton>
                    <TransportButton label="Piste suivante" onClick={handleNext}>
                      <SkipForward className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                    </TransportButton>
                    <TransportButton label="Répéter la piste en cours" pressed={repeatOne} active={repeatOne} onClick={() => setRepeatOne((r) => !r)}>
                      <Repeat1 className="h-5 w-5" aria-hidden="true" />
                    </TransportButton>
                  </div>
                </section>

                {/* ── MIX + ADAPTIVE + PLAYLIST ── */}
                <div className="flex min-w-0 flex-col gap-4">
                  <section
                    className="space-y-3 rounded-3xl p-4"
                    style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                      border: "var(--ink-border)",
                      boxShadow: "var(--ink-shadow)",
                    }}
                    aria-label="Mixage"
                  >
                    <h3 className="ink-title text-2xl">Mixage</h3>
                    <VolumeRow label="Musique" icon={<Disc3 className="h-4 w-4" />} value={musicVolume} onChange={setMusicVolume} accent="#a855f7" />
                    <VolumeRow label="Effets sonores" icon={<Volume2 className="h-4 w-4" />} value={sfxVolume} onChange={setSfxVolume} accent="#22d3ee" />
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-pressed={muted}
                      className="menu-action menu-focus flex w-full items-center justify-center gap-2 rounded-2xl text-lg font-black text-white"
                      style={{
                        background: muted ? "linear-gradient(180deg,#ef4444,#b91c1c)" : "rgba(255,255,255,0.05)",
                        border: "var(--ink-border-thin)",
                        boxShadow: "0 3px 0 var(--ink-outline)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
                      {muted ? "Réactiver la musique" : "Couper la musique"}
                    </button>
                  </section>

                  <section
                    className="space-y-2 rounded-3xl p-4"
                    style={{
                      background: autoMode
                        ? "linear-gradient(180deg, rgba(34,211,238,0.16), rgba(168,85,247,0.06))"
                        : "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                      border: "var(--ink-border)",
                      boxShadow: "var(--ink-shadow)",
                    }}
                    aria-label="Musique adaptative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="ink-title text-2xl">Mode adaptatif</h3>
                        <p className="text-sm font-bold text-white/60" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          La musique suit automatiquement la phase de jeu
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoMode(!autoMode)}
                        aria-pressed={autoMode}
                        aria-label="Musique adaptative automatique"
                        className="menu-focus flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black text-white"
                        style={{
                          background: autoMode ? "linear-gradient(90deg,#a855f7,#22d3ee)" : "rgba(255,255,255,0.06)",
                          border: "var(--ink-border-thin)",
                          boxShadow: "0 3px 0 var(--ink-outline)",
                        }}
                      >
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        {autoMode ? "AUTO" : "MANUEL"}
                      </button>
                    </div>
                    <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300">
                      <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                      {autoMode ? `Ambiance : ${SITUATION_LABEL[situation] ?? situation}` : "Sélection manuelle"}
                    </p>
                  </section>

                  <section
                    className="flex min-h-0 flex-col gap-3 rounded-3xl p-4"
                    style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                      border: "var(--ink-border)",
                      boxShadow: "var(--ink-shadow)",
                    }}
                    aria-label="Playlist"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="ink-title flex items-center gap-2 text-2xl">
                        <ListMusic className="h-5 w-5" aria-hidden="true" /> Playlist
                      </h3>
                      <span className="font-mono text-[11px] font-bold text-white/45">
                        {visibleTracks.length}/{tracks.length}
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Chercher un titre ou un style…"
                        aria-label="Chercher une piste"
                        className="menu-focus h-11 w-full rounded-xl bg-black/40 pl-9 pr-3 text-sm font-bold text-white placeholder:text-white/30"
                        style={{ border: "var(--ink-border-thin)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)" }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par ambiance">
                      {(["all", ...moods] as const).map((mood) => {
                        const selected = moodFilter === mood;
                        return (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => setMoodFilter(mood as MusicMood | "all")}
                            aria-pressed={selected}
                            className={cn("menu-focus rounded-full px-3 py-1.5 text-sm font-black", selected ? "text-white" : "text-white/55")}
                            style={{
                              background: selected ? "linear-gradient(180deg,#fbbf24,#d97706)" : "rgba(255,255,255,0.05)",
                              border: "var(--ink-border-thin)",
                              boxShadow: selected ? "0 3px 0 var(--ink-outline)" : "none",
                              fontFamily: "'Outfit', sans-serif",
                            }}
                          >
                            {mood === "all" ? "Tout" : MOOD_LABEL[mood as MusicMood]}
                          </button>
                        );
                      })}
                    </div>

                    {visibleTracks.length === 0 ? (
                      <div className="ink-empty">
                        <ListMusic aria-hidden="true" />
                        <strong>Aucune piste trouvée</strong>
                        <p>Change le filtre d'ambiance ou vide la recherche.</p>
                      </div>
                    ) : (
                      <ul className="custom-scrollbar max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
                        {visibleTracks.map((track) => {
                          const active = currentTrack?.id === track.id;
                          const tc = coverFor(track);
                          return (
                            <li key={track.id}>
                              <button
                                type="button"
                                onClick={() => { selectTrack(track.id); if (!isPlaying) play(); }}
                                aria-current={active ? "true" : undefined}
                                className={cn(
                                  "menu-focus flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors",
                                  active ? "bg-white/10" : "hover:bg-white/5",
                                )}
                              >
                                <Cover track={track} size={42} />
                                <span className="min-w-0 flex-1">
                                  <span className={cn("block truncate text-base font-black", active ? "text-purple-300" : "text-white")}
                                    style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {titleOf(track.name)}
                                  </span>
                                  <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-white/40">
                                    {tc.artist}{track.bpm ? ` · ${track.bpm} BPM` : ""}
                                  </span>
                                </span>
                                {active && isPlaying && (
                                  <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
                                    {[0, 1, 2].map((i) => (
                                      <span key={i} className="mp-eq-bar w-[3px] rounded-full bg-purple-400" style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ---------------- DOCK (mini) ---------------- */
  return (
    <>
      {typeof document !== "undefined" && createPortal(studio, document.body)}

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 220, delay: 0.3 }}
        className="menu-surface ink-z-bar pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2"
        style={{ width: "min(94vw, 620px)" }}
      >
        <div
          className="pointer-events-auto relative overflow-hidden rounded-[26px]"
          role="region"
          aria-label="Lecteur de musique"
          style={{
            background:
              `radial-gradient(120% 160% at 8% 0%, ${cover.gradient.match(/#[0-9a-f]{6}/gi)?.[0] ?? "#a855f7"}26, transparent 55%), var(--ink-panel-gradient)`,
            border: "var(--ink-border)",
            boxShadow: "0 7px 0 var(--ink-outline), 0 20px 48px rgba(0,0,0,0.55)",
          }}
        >
          <SeekBar progress={progress} duration={duration} onSeek={seek} />

          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="menu-focus group flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-label={`Ouvrir le lecteur, ${trackLabel}`}
            >
              <span className="relative flex-shrink-0">
                <Cover track={currentTrack} size={46} />
                {isPlaying && (
                  <span
                    className="absolute -bottom-1 -right-1 flex h-4 items-end gap-[2px] rounded-md px-1 pb-[3px]"
                    style={{ background: "var(--ink-outline)" }}
                    aria-hidden="true"
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="mp-eq-bar w-[2px] rounded-full bg-cyan-300"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-xl font-black leading-tight text-white transition-colors group-hover:text-purple-200"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {trackLabel}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/45">
                  <span className="truncate">{cover.artist}</span>
                  <span
                    className="flex-shrink-0 rounded-md px-1.5 py-[1px] tabular-nums text-white/70"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    {formatTime(progress)} / {formatTime(duration)}
                  </span>
                </span>
              </span>
              <ChevronUp
                className="h-4 w-4 flex-shrink-0 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:text-white"
                aria-hidden="true"
              />
            </button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setAutoMode(!autoMode)}
              aria-pressed={autoMode}
              aria-label={autoMode ? `Musique adaptative activée, ambiance ${SITUATION_LABEL[situation] ?? situation}` : "Musique adaptative désactivée"}
              className={cn(
                "menu-focus flex h-9 flex-shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-black tracking-wider",
                autoMode ? "text-white" : "text-white/50 hover:text-white",
              )}
              style={{
                background: autoMode ? "linear-gradient(120deg,#a855f7,#22d3ee)" : "rgba(255,255,255,0.06)",
                border: "var(--ink-border-thin)",
                boxShadow: autoMode ? "0 3px 0 var(--ink-outline)" : "0 2px 0 var(--ink-outline)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              <span className="hidden sm:inline">AUTO</span>
            </motion.button>

            {/* Groupe transport : bloc encré unique */}
            <div
              className="flex flex-shrink-0 items-center gap-1 rounded-full p-1"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: "var(--ink-border-thin)",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.45)",
              }}
            >
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Piste précédente"
                className="menu-focus hidden h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:flex"
              >
                <SkipBack className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                whileHover={{ y: -1 }}
                onClick={togglePlay}
                aria-label={isPlaying ? `Mettre en pause ${trackLabel}` : `Lire ${trackLabel}`}
                className="menu-focus grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-white"
                style={{
                  background: "linear-gradient(180deg,#c084fc,#6b21a8)",
                  border: "var(--ink-border-thin)",
                  boxShadow: "0 3px 0 var(--ink-outline)",
                }}
              >
                {isPlaying
                  ? <Pause className="h-5 w-5" fill="white" aria-hidden="true" />
                  : <Play className="ml-0.5 h-5 w-5" fill="white" aria-hidden="true" />}
              </motion.button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Piste suivante"
                className="menu-focus flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <SkipForward className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? "Réactiver la musique" : "Couper la musique"}
                className={cn(
                  "menu-focus hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 sm:flex",
                  muted ? "text-rose-300" : "text-white/60 hover:text-white",
                )}
              >
                {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const MusicPlayerBar = memo(MusicPlayerBarComponent);
