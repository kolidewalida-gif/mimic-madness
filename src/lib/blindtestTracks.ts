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

  // ═══════════════════════════════════════════════════════════
  // ——— ANIME (chaînes officielles : Sony Music, labels) ———
  // ═══════════════════════════════════════════════════════════
  { id: 'demon-slayer-op1', title: 'Demon Slayer', subtitle: 'Gurenge — LiSA', category: 'anime', youtubeId: 'CwkzK-F0Y00' },
  { id: 'jjk-op1', title: 'Jujutsu Kaisen', subtitle: 'Kaikai Kitan — Eve', category: 'anime', youtubeId: 'jLDLs2D-h7Q' },
  { id: 'aot-op1', title: "L'Attaque des Titans", subtitle: 'Guren no Yumiya — Linked Horizon', category: 'anime', youtubeId: 'AqaCwUgZAMI' },
  { id: 'aot-op2', title: "L'Attaque des Titans", subtitle: 'Shinzou wo Sasageyo — Linked Horizon', category: 'anime', youtubeId: 'zPzxdjpJUHQ' },
  { id: 'naruto-shippuden-op1', title: 'Naruto Shippuden', subtitle: 'Hero’s Come Back!! — Nobodyknows+', category: 'anime', youtubeId: 'tDP2VPpC0WU' },
  { id: 'naruto-blue-bird', title: 'Naruto Shippuden', subtitle: 'Blue Bird — Ikimono-gakari', category: 'anime', youtubeId: 'NA8Fdc7Rp_8' },
  { id: 'one-piece-we-are', title: 'One Piece', subtitle: 'We Are! — Hiroshi Kitadani', category: 'anime', youtubeId: 'lJjqlmnPV5k' },
  { id: 'dbz-cha-la', title: 'Dragon Ball Z', subtitle: 'Cha-La Head-Cha-La — Hironobu Kageyama', category: 'anime', youtubeId: 'lwSeP1UmKHc' },
  { id: 'mha-peace-sign', title: 'My Hero Academia', subtitle: 'Peace Sign — Kenshi Yonezu', category: 'anime', youtubeId: 'q0Bc1y0bFTM' },
  { id: 'death-note-the-world', title: 'Death Note', subtitle: 'The WORLD — Nightmare', category: 'anime', youtubeId: 'NQHKsTAjqMs' },
  { id: 'tokyo-ghoul-unravel', title: 'Tokyo Ghoul', subtitle: 'Unravel — TK from Ling Tosite Sigure', category: 'anime', youtubeId: 'gQDcL9wnQ-c' },
  { id: 'fma-brotherhood-again', title: 'Fullmetal Alchemist: Brotherhood', subtitle: 'Again — YUI', category: 'anime', youtubeId: '--IcUmcStrM' },
  { id: 'bleach-number-one', title: 'Bleach', subtitle: 'Number One — Hazel Fernandes', category: 'anime', youtubeId: 'pdLAhMjITJI' },
  { id: 'hxh-departure', title: 'Hunter x Hunter', subtitle: 'Departure! — Masatoshi Ono', category: 'anime', youtubeId: 'd6kBeJjTGnY' },
  { id: 'sao-crossing-field', title: 'Sword Art Online', subtitle: 'Crossing Field — LiSA', category: 'anime', youtubeId: '6bdz98Ojf4o' },
  { id: 'evangelion-cruel-angel', title: 'Neon Genesis Evangelion', subtitle: 'A Cruel Angel’s Thesis — Yoko Takahashi', category: 'anime', youtubeId: 'o6wtDPVkKqI' },
  { id: 'chainsaw-man-kick-back', title: 'Chainsaw Man', subtitle: 'KICK BACK — Kenshi Yonezu', category: 'anime', youtubeId: 'gpTQbN3fzGo' },
  { id: 'spy-x-family-mixed-nuts', title: 'Spy x Family', subtitle: 'Mixed Nuts — Official HIGE DANdism', category: 'anime', youtubeId: 'LX17gBlxqAQ' },

  // ═══════════════════════════════════════════════════════════
  // ——— DESSIN ANIMÉ / CARTOON ———
  // ═══════════════════════════════════════════════════════════
  { id: 'pokemon-fr', title: 'Pokémon', subtitle: 'Générique français', category: 'cartoon', youtubeId: 'rg6CiPI6h2g' },
  { id: 'spongebob-theme', title: 'Bob l’éponge', subtitle: 'SpongeBob SquarePants Theme', category: 'cartoon', youtubeId: 'BPFc3SVPSeg' },
  { id: 'gravity-falls-theme', title: 'Souvenirs de Gravity Falls', subtitle: 'Main Theme', category: 'cartoon', youtubeId: 'AVi6c9G6Cag' },
  { id: 'avatar-last-airbender', title: 'Avatar, le dernier maître de l’air', subtitle: 'Opening Theme', category: 'cartoon', youtubeId: 'GsuT2UEnoEw' },
  { id: 'adventure-time-theme', title: 'Adventure Time', subtitle: 'Main Title', category: 'cartoon', youtubeId: 'lLB6QGVtv-A' },
  { id: 'simpsons-theme', title: 'Les Simpson', subtitle: 'Main Theme — Danny Elfman', category: 'cartoon', youtubeId: 'Xqog63KOANc' },
  { id: 'rick-and-morty-theme', title: 'Rick et Morty', subtitle: 'Opening Theme', category: 'cartoon', youtubeId: 'Jh4QFaPmdss' },
  { id: 'powerpuff-girls-theme', title: 'Les Super Nanas', subtitle: 'Opening Theme', category: 'cartoon', youtubeId: 'cu_LBNcLFMo' },
  { id: 'scooby-doo-theme', title: 'Scooby-Doo', subtitle: 'Where Are You! Theme', category: 'cartoon', youtubeId: 'OFqL5o4tQUQ' },
  { id: 'tom-jerry-theme', title: 'Tom et Jerry', subtitle: 'Main Theme', category: 'cartoon', youtubeId: 'r323XGZuTLo' },

  // ═══════════════════════════════════════════════════════════
  // ——— MUSIQUE (clips officiels) ———
  // ═══════════════════════════════════════════════════════════
  { id: 'queen-bohemian', title: 'Bohemian Rhapsody', subtitle: 'Queen', category: 'music', youtubeId: 'fJ9rUzIMcZQ', clipStart: 60 },
  { id: 'michael-jackson-billie-jean', title: 'Billie Jean', subtitle: 'Michael Jackson', category: 'music', youtubeId: 'Zi_XLOBDo_Y', clipStart: 30 },
  { id: 'daft-punk-get-lucky', title: 'Get Lucky', subtitle: 'Daft Punk ft. Pharrell Williams', category: 'music', youtubeId: '5NV6Rdv1a3I' },
  { id: 'adele-rolling-in-the-deep', title: 'Rolling in the Deep', subtitle: 'Adele', category: 'music', youtubeId: 'rYEDA3JcQqw' },
  { id: 'ed-sheeran-shape-of-you', title: 'Shape of You', subtitle: 'Ed Sheeran', category: 'music', youtubeId: 'JGwWNGJdvx8' },
  { id: 'gangnam-style', title: 'Gangnam Style', subtitle: 'PSY', category: 'music', youtubeId: '9bZkp7q19f0' },
  { id: 'rick-astley-never-gonna', title: 'Never Gonna Give You Up', subtitle: 'Rick Astley', category: 'music', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'stromae-alors-on-danse', title: 'Alors on danse', subtitle: 'Stromae', category: 'music', youtubeId: 'VHoT4N43jK8' },

  // ═══════════════════════════════════════════════════════════
  // ——— FILM (bandes originales) ———
  // ═══════════════════════════════════════════════════════════
  { id: 'star-wars-main-theme', title: 'Star Wars', subtitle: 'Main Theme — John Williams', category: 'film', youtubeId: '_D0ZQPqeJkk' },
  { id: 'pirates-hes-a-pirate', title: 'Pirates des Caraïbes', subtitle: "He's a Pirate — Klaus Badelt", category: 'film', youtubeId: '6Vv6sk-RWxA' },
  { id: 'harry-potter-hedwig', title: 'Harry Potter', subtitle: 'Hedwig’s Theme — John Williams', category: 'film', youtubeId: 'wKi4U7BIQbE' },
  { id: 'jurassic-park-theme', title: 'Jurassic Park', subtitle: 'Main Theme — John Williams', category: 'film', youtubeId: '-b3MM1mlPoI' },
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
