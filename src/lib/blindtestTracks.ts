/**
 * "Blindtest Musical" content + round logic.
 *
 * A round plays a short audio/video clip (mp3 or mp4) and the players must
 * guess which anime / cartoon / song / movie it comes from. Everything is
 * derived from a single broadcast playlist so every client stays in sync.
 *
 * 🎵 Adding tracks
 * ----------------
 * Two ways to give a track its sound:
 *  1. YouTube (easiest, no upload): set `youtubeId` to a video id or paste a
 *     full link, e.g. "https://www.youtube.com/watch?v=Bi7WveYKHvU".
 *  2. Local file: drop a `.mp3`/`.mp4` in `public/blindtest/` and set `src`.
 *
 * When `youtubeId` is set it takes priority. The playlist automatically
 * prefers YouTube-backed tracks so the game always has sound out of the box.
 * Missing media degrades gracefully (the round still runs + reveals the title).
 */

export type BlindtestCategory = 'anime' | 'cartoon' | 'music' | 'film';

export interface BlindtestTrack {
  id: string;
  /** The answer the players must find (e.g. "Naruto"). */
  title: string;
  /** Extra detail shown only on the reveal (song name, artist…). */
  subtitle?: string;
  category: BlindtestCategory;
  /**
   * YouTube video id OR full link — easiest source, no upload needed.
   * e.g. "Bi7WveYKHvU" or "https://www.youtube.com/watch?v=Bi7WveYKHvU".
   * (When set, this takes priority over `src`.)
   */
  youtubeId?: string;
  /** Local file under /public, e.g. "/blindtest/anime/naruto.mp3" (mp3 or mp4). */
  src?: string;
  /** Optional cover art shown on the reveal card. */
  cover?: string;
  /** Optional start offset in seconds (jump to the chorus). */
  clipStart?: number;
}

export const CATEGORY_META: Record<
  BlindtestCategory,
  { label: string; emoji: string; color: string }
> = {
  anime: { label: 'Anime', emoji: '🎌', color: '#f43f5e' },
  cartoon: { label: 'Dessin animé', emoji: '📺', color: '#22d3ee' },
  music: { label: 'Musique', emoji: '🎵', color: '#a855f7' },
  film: { label: 'Film', emoji: '🎬', color: '#fbbf24' },
};

/**
 * Starter library. Replace the `src` paths with your own files in
 * `public/blindtest/`. These reference the recommended folder layout.
 */
export const BLINDTEST_TRACKS: BlindtestTrack[] = [
  // ═══════════════════════════════════════════════════════════
  // 🎬 YOUTUBE TRACKS — easiest: just paste a youtube id / link.
  // Add as many as you want here; the playlist prefers these.
  //   { id, title (the answer), subtitle?, category, youtubeId }
  // ═══════════════════════════════════════════════════════════
  {
    id: 'yt-bi7',
    title: 'Ma musique',          // ⚠️ renomme avec le vrai titre (= la bonne réponse)
    subtitle: 'Ajoutée via YouTube',
    category: 'music',
    youtubeId: 'Bi7WveYKHvU',     // https://www.youtube.com/watch?v=Bi7WveYKHvU
  },

  // ——— ANIME ———
  { id: 'naruto', title: 'Naruto', subtitle: 'Blue Bird', category: 'anime', src: '/blindtest/anime/naruto.mp3', cover: '/blindtest/covers/naruto.jpg' },
  { id: 'aot', title: "L'Attaque des Titans", subtitle: 'Guren no Yumiya', category: 'anime', src: '/blindtest/anime/aot.mp3', cover: '/blindtest/covers/aot.jpg' },
  { id: 'onepiece', title: 'One Piece', subtitle: 'We Are!', category: 'anime', src: '/blindtest/anime/onepiece.mp3', cover: '/blindtest/covers/onepiece.jpg' },
  { id: 'dbz', title: 'Dragon Ball Z', subtitle: 'Cha-La Head-Cha-La', category: 'anime', src: '/blindtest/anime/dbz.mp3', cover: '/blindtest/covers/dbz.jpg' },
  { id: 'demonslayer', title: 'Demon Slayer', subtitle: 'Gurenge', category: 'anime', src: '/blindtest/anime/demonslayer.mp3', cover: '/blindtest/covers/demonslayer.jpg' },
  { id: 'jjk', title: 'Jujutsu Kaisen', subtitle: 'Kaikai Kitan', category: 'anime', src: '/blindtest/anime/jjk.mp3', cover: '/blindtest/covers/jjk.jpg' },
  { id: 'mha', title: 'My Hero Academia', subtitle: 'Peace Sign', category: 'anime', src: '/blindtest/anime/mha.mp3', cover: '/blindtest/covers/mha.jpg' },
  { id: 'deathnote', title: 'Death Note', subtitle: 'The WORLD', category: 'anime', src: '/blindtest/anime/deathnote.mp3', cover: '/blindtest/covers/deathnote.jpg' },

  // ——— DESSIN ANIMÉ / CARTOON ———
  { id: 'pokemon', title: 'Pokémon', subtitle: 'Générique FR', category: 'cartoon', src: '/blindtest/cartoon/pokemon.mp3', cover: '/blindtest/covers/pokemon.jpg' },
  { id: 'spongebob', title: 'Bob l’éponge', category: 'cartoon', src: '/blindtest/cartoon/spongebob.mp3', cover: '/blindtest/covers/spongebob.jpg' },
  { id: 'gravityfalls', title: 'Souvenirs de Gravity Falls', category: 'cartoon', src: '/blindtest/cartoon/gravityfalls.mp3', cover: '/blindtest/covers/gravityfalls.jpg' },
  { id: 'avatar', title: 'Avatar le dernier maître de l’air', category: 'cartoon', src: '/blindtest/cartoon/avatar.mp3', cover: '/blindtest/covers/avatar.jpg' },
  { id: 'adventuretime', title: 'Adventure Time', category: 'cartoon', src: '/blindtest/cartoon/adventuretime.mp3', cover: '/blindtest/covers/adventuretime.jpg' },
  { id: 'simpsons', title: 'Les Simpson', category: 'cartoon', src: '/blindtest/cartoon/simpsons.mp3', cover: '/blindtest/covers/simpsons.jpg' },

  // ——— MUSIQUE ———
  { id: 'music1', title: 'Musique 1', category: 'music', src: '/blindtest/music/track1.mp3' },
  { id: 'music2', title: 'Musique 2', category: 'music', src: '/blindtest/music/track2.mp3' },

  // ——— FILM ———
  { id: 'starwars', title: 'Star Wars', subtitle: 'Main Theme', category: 'film', src: '/blindtest/film/starwars.mp3', cover: '/blindtest/covers/starwars.jpg' },
  { id: 'pirates', title: 'Pirates des Caraïbes', subtitle: "He's a Pirate", category: 'film', src: '/blindtest/film/pirates.mp3', cover: '/blindtest/covers/pirates.jpg' },
];

export const BLINDTEST_ROUNDS = 8;
export const BLINDTEST_LISTEN_MS = 20000;
export const BLINDTEST_REVEAL_MS = 6500;
export const BLINDTEST_OPTIONS = 4;

/* ---------- deterministic RNG (shared by all clients via the seed) ---------- */
function rngFactory(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ordered playlist of track ids for the whole game (same on every client). */
export function makePlaylist(masterSeed: number, count: number): string[] {
  const rnd = rngFactory(masterSeed);
  // Prefer YouTube-backed tracks (guaranteed sound). Fall back to any track
  // with a source, then to the full list (titles still work as choices).
  const yt = BLINDTEST_TRACKS.filter((t) => t.youtubeId);
  const withSrc = BLINDTEST_TRACKS.filter((t) => t.youtubeId || t.src);
  const pool = yt.length ? yt : withSrc.length ? withSrc : BLINDTEST_TRACKS;
  const ids = shuffle(pool.map((t) => t.id), rnd);
  return ids.slice(0, Math.min(count, ids.length));
}

export interface BlindtestRound {
  track: BlindtestTrack;
  /** 4 candidate titles (ids), one of which is correct. */
  optionIds: string[];
  answerIndex: number;
}

/** Build the 4 multiple-choice options for a track (correct + distractors). */
export function makeRound(trackId: string, optionSeed: number): BlindtestRound | null {
  const track = BLINDTEST_TRACKS.find((t) => t.id === trackId);
  if (!track) return null;
  const rnd = rngFactory(optionSeed);

  // Prefer distractors from the same category, then fill from anywhere.
  const sameCat = BLINDTEST_TRACKS.filter((t) => t.id !== track.id && t.category === track.category);
  const others = BLINDTEST_TRACKS.filter((t) => t.id !== track.id && t.category !== track.category);
  const pool = [...shuffle(sameCat, rnd), ...shuffle(others, rnd)];
  const distractors = pool.slice(0, BLINDTEST_OPTIONS - 1).map((t) => t.id);

  const optionIds = shuffle([track.id, ...distractors], rnd);
  return { track, optionIds, answerIndex: optionIds.indexOf(track.id) };
}

export function trackById(id: string): BlindtestTrack | undefined {
  return BLINDTEST_TRACKS.find((t) => t.id === id);
}

/** Points for a correct answer, rewarding speed (≈100 slow → 1100 instant). */
export function scoreFor(correct: boolean, elapsedMs: number): number {
  if (!correct) return 0;
  const frac = Math.max(0, Math.min(1, elapsedMs / BLINDTEST_LISTEN_MS));
  return Math.round(1000 * (1 - frac)) + 100;
}
