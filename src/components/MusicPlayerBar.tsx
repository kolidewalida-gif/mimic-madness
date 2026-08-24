import { useState, memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  useBackgroundMusic, type MusicTrack, type MusicMood, type MusicSituation,
} from "@/hooks/useBackgroundMusic";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Sparkles,
  Shuffle, Repeat1, ListMusic, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { coverFor, titleOf, MOOD_LABEL } from "@/lib/musicCovers";

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
const Cover = ({ track, size }: { track: MusicTrack | null; size: number }) => {
  const c = coverFor(track);
  return (
    <span
      className="relative grid flex-shrink-0 place-items-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: c.gradient,
        border: "1px solid rgba(255,255,255,0.18)",
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: size * 0.42 }}>{c.emoji}</span>
    </span>
  );
};

/* ============================================================
   Seek bar

   Scales a full-width fill instead of animating its `width`: width is a
   layout property, so the previous version reflowed the bar on every progress
   tick, which showed up as a faint flicker on a permanently visible element.
============================================================ */
const SeekBar = ({ progress, duration, onSeek }: {
  progress: number; duration: number; onSeek: (time: number) => void;
}) => {
  const ratio = duration > 0 ? Math.min(1, progress / duration) : 0;
  return (
    <div className="mp-seek group">
      <span className="mp-seek-track" aria-hidden="true">
        <span className="mp-seek-fill" style={{ transform: `scaleX(${ratio})` }} />
      </span>
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
    </div>
  );
};

/* ============================================================
   Main — one self-contained bar

   Everything lives here: transport, volume, shuffle/repeat, adaptive mode and
   the track list. There is deliberately no second screen to open: the list
   expands in place, above the controls, inside the same card.
============================================================ */
const MusicPlayerBarComponent = () => {
  const {
    isPlaying, play, pause, currentTrack, tracks, nextTrack, previousTrack, selectTrack,
    volume: musicVolume, setVolume: setMusicVolume, progress, duration, seek,
    autoMode, setAutoMode, situation,
  } = useBackgroundMusic();

  const [showList, setShowList] = useState(false);
  const [query, setQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<MusicMood | "all">("all");
  const [shuffle, setShuffle] = useState(() => readFlag("musicShuffle"));
  const [repeatOne, setRepeatOne] = useState(() => readFlag("musicRepeatOne"));
  const [lastVolume, setLastVolume] = useState(() => (musicVolume > 0 ? musicVolume : 0.3));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { writeFlag("musicShuffle", shuffle); }, [shuffle]);
  useEffect(() => { writeFlag("musicRepeatOne", repeatOne); }, [repeatOne]);
  useEffect(() => { if (musicVolume > 0) setLastVolume(musicVolume); }, [musicVolume]);

  // Close the list on outside click or Escape, like any inline popover.
  useEffect(() => {
    if (!showList) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setShowList(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowList(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [showList]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

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

  return (
    <div
      ref={rootRef}
      className="menu-surface ink-z-bar fixed left-1/2 -translate-x-1/2"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        width: "min(680px, calc(100vw - max(1rem, env(safe-area-inset-left, 0px)) - max(1rem, env(safe-area-inset-right, 0px))))",
      }}
    >
      <div className="mp-bar relative overflow-hidden" role="region" aria-label="Lecteur de musique">
        {/* ---- Track list, expanded in place ---- */}
        {showList && (
          <div className="mp-list if-fade">
            <div className="mp-list-head">
              <span className="mp-search">
                <Search className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Chercher parmi ${tracks.length} pistes…`}
                  aria-label="Chercher une piste"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-text-mute)]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Effacer la recherche"
                    className="mp-ghost grid h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            </div>

            {moods.length > 0 && (
              <div className="mp-moods custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setMoodFilter("all")}
                  className={cn("mp-mood", moodFilter === "all" && "is-on")}
                >
                  Tout
                </button>
                {moods.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setMoodFilter(mood)}
                    className={cn("mp-mood", moodFilter === mood && "is-on")}
                  >
                    {MOOD_LABEL[mood]}
                  </button>
                ))}
              </div>
            )}

            <ul className="mp-tracks custom-scrollbar" style={{ maxHeight: "min(38dvh, 250px)" }}>
              {visibleTracks.map((track) => {
                const active = track.id === currentTrack?.id;
                return (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => { selectTrack(track.id); if (!isPlaying) play(); }}
                      className={cn("mp-track", active && "is-on")}
                      aria-current={active || undefined}
                    >
                      <Cover track={track} size={30} />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="mp-track-name">{titleOf(track.name)}</span>
                        {track.genre && <span className="mp-track-meta">{track.genre}</span>}
                      </span>
                      {active && isPlaying && (
                        <span className="mp-eq mp-eq--inline" aria-label="En lecture">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="mp-eq-bar" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {visibleTracks.length === 0 && (
                <li className="if-mute px-2 py-6 text-center text-xs">Aucune piste trouvée</li>
              )}
            </ul>
          </div>
        )}

        {/* ---- Controls ---- */}
        <div className="mp-row">
          <span className="relative flex-shrink-0">
            <Cover track={currentTrack} size={42} />
            {isPlaying && (
              <span className="mp-eq" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="mp-eq-bar" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="mp-title">{trackLabel}</span>
            <span className="mp-sub">
              <span className="truncate">{cover.artist}</span>
              <span className="mp-time">{formatTime(progress)} / {formatTime(duration)}</span>
            </span>
          </span>

          {/* Transport */}
          <span className="flex flex-shrink-0 items-center gap-0.5">
            <button type="button" onClick={handlePrev} aria-label="Piste précédente" className="mp-ghost hidden sm:grid">
              <SkipBack className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? `Mettre en pause ${trackLabel}` : `Lire ${trackLabel}`}
              className="mp-play"
            >
              {isPlaying
                ? <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                : <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />}
            </button>
            <button type="button" onClick={handleNext} aria-label="Piste suivante" className="mp-ghost grid">
              <SkipForward className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            </button>
          </span>

          {/* Playback modes */}
          <span className="mp-aside is-hidden">
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              aria-pressed={shuffle}
              aria-label="Lecture aléatoire"
              title="Lecture aléatoire"
              className={cn("mp-ghost grid", shuffle && "is-on")}
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setRepeatOne(!repeatOne)}
              aria-pressed={repeatOne}
              aria-label="Répéter la piste"
              title="Répéter la piste"
              className={cn("mp-ghost grid", repeatOne && "is-on")}
            >
              <Repeat1 className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>

          {/* Volume, adaptive mode, list */}
          <span className="mp-aside">
            <span className="mp-vol">
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? "Réactiver la musique" : "Couper la musique"}
                className={cn("mp-ghost grid", muted && "is-off")}
              >
                {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(musicVolume * 100)}
                onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                aria-label="Volume de la musique"
                className="mp-vol-range menu-focus"
              />
            </span>

            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? "Réactiver la musique" : "Couper la musique"}
              className={cn("mp-ghost grid lg:hidden", muted && "is-off")}
            >
              {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            </button>

            <button
              type="button"
              onClick={() => setAutoMode(!autoMode)}
              aria-pressed={autoMode}
              aria-label={autoMode ? `Musique adaptative activée, ambiance ${SITUATION_LABEL[situation] ?? situation}` : "Musique adaptative désactivée"}
              title={autoMode ? `Auto · ${SITUATION_LABEL[situation] ?? situation}` : "Musique adaptative désactivée"}
              className={cn("mp-ghost grid", autoMode && "is-on")}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setShowList(!showList)}
              aria-expanded={showList}
              aria-label={showList ? "Fermer la liste des pistes" : "Ouvrir la liste des pistes"}
              title="Liste des pistes"
              className={cn("mp-ghost grid", showList && "is-on")}
            >
              <ListMusic className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        </div>

        {/* Progress, flush on the bottom edge */}
        <SeekBar progress={progress} duration={duration} onSeek={seek} />
      </div>
    </div>
  );
};

export const MusicPlayerBar = memo(MusicPlayerBarComponent);
