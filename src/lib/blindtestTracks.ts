/**
 * "Blindtest Musical" — curated answers + iTunes search queries.
 *
 * Audio is fetched at runtime from the iTunes Search API (30s previews), so
 * there are no files to host and no fragile video ids. Each entry pairs a
 * clean ANSWER (what players must guess) with a search QUERY that reliably
 * returns the recognizable track.
 */

export type BlindtestCategory = 'anime' | 'cartoon' | 'music' | 'film';

export const CATEGORY_META: Record<
  BlindtestCategory,
  { label: string; emoji: string; color: string }
> = {
  anime: { label: 'Anime', emoji: '🎌', color: '#f43f5e' },
  cartoon: { label: 'Dessin animé', emoji: '📺', color: '#22d3ee' },
  music: { label: 'Musique', emoji: '🎵', color: '#a855f7' },
  film: { label: 'Film', emoji: '🎬', color: '#fbbf24' },
};

export interface BlindtestEntry {
  /** The answer players must find. */
  answer: string;
  category: BlindtestCategory;
  /** iTunes search query that returns the recognizable preview. */
  query: string;
  /** Optional hint to disambiguate which result to pick. */
  hint?: string;
}

export const BLINDTEST_ENTRIES: BlindtestEntry[] = [
  // ——— ANIME ———
  { answer: 'Naruto', category: 'anime', query: 'Blue Bird Ikimonogakari', hint: 'blue bird' },
  { answer: "L'Attaque des Titans", category: 'anime', query: 'Guren no Yumiya Linked Horizon', hint: 'guren' },
  { answer: 'Demon Slayer', category: 'anime', query: 'Gurenge LiSA', hint: 'gurenge' },
  { answer: 'One Piece', category: 'anime', query: 'We Are Hiroshi Kitadani', hint: 'we are' },
  { answer: 'Jujutsu Kaisen', category: 'anime', query: 'Kaikai Kitan Eve', hint: 'kaikai' },
  { answer: 'My Hero Academia', category: 'anime', query: 'Peace Sign Kenshi Yonezu', hint: 'peace sign' },
  { answer: 'Dragon Ball Z', category: 'anime', query: 'Cha-La Head-Cha-La', hint: 'cha-la' },
  { answer: 'Death Note', category: 'anime', query: 'the WORLD Nightmare', hint: 'world' },
  { answer: 'Tokyo Ghoul', category: 'anime', query: 'Unravel TK ling tosite sigure', hint: 'unravel' },
  { answer: 'Sword Art Online', category: 'anime', query: 'Crossing Field LiSA', hint: 'crossing' },
  { answer: 'Fullmetal Alchemist', category: 'anime', query: 'Again Yui', hint: 'again' },
  { answer: 'Hunter x Hunter', category: 'anime', query: 'Departure Masatoshi Ono', hint: 'departure' },
  { answer: 'Chainsaw Man', category: 'anime', query: 'Kick Back Kenshi Yonezu', hint: 'kick back' },
  { answer: 'Spy x Family', category: 'anime', query: 'Mixed Nuts Official Hige Dandism', hint: 'mixed nuts' },
  { answer: 'Bleach', category: 'anime', query: 'Asterisk Orange Range', hint: 'asterisk' },
  { answer: 'Evangelion', category: 'anime', query: 'A Cruel Angel Thesis', hint: 'cruel angel' },

  // ——— DESSIN ANIMÉ / CARTOON ———
  { answer: 'Pokémon', category: 'cartoon', query: 'Pokemon Theme Pokemon', hint: 'pokemon theme' },
  { answer: 'Bob l’éponge', category: 'cartoon', query: 'SpongeBob SquarePants Theme', hint: 'spongebob' },
  { answer: 'Les Simpson', category: 'cartoon', query: 'The Simpsons Theme Danny Elfman', hint: 'simpsons' },
  { answer: 'Gravity Falls', category: 'cartoon', query: 'Gravity Falls Theme', hint: 'gravity' },
  { answer: 'Adventure Time', category: 'cartoon', query: 'Adventure Time Theme', hint: 'adventure' },
  { answer: 'Steven Universe', category: 'cartoon', query: 'Steven Universe Theme', hint: 'steven' },
  { answer: 'Phineas et Ferb', category: 'cartoon', query: 'Phineas and Ferb Theme', hint: 'phineas' },
  { answer: 'Les Tortues Ninja', category: 'cartoon', query: 'Teenage Mutant Ninja Turtles Theme', hint: 'ninja turtles' },

  // ——— MUSIQUE ———
  { answer: 'Blinding Lights', category: 'music', query: 'Blinding Lights The Weeknd' },
  { answer: 'Bad Guy', category: 'music', query: 'bad guy Billie Eilish' },
  { answer: 'Shape of You', category: 'music', query: 'Shape of You Ed Sheeran' },
  { answer: 'Uptown Funk', category: 'music', query: 'Uptown Funk Bruno Mars' },
  { answer: 'Rolling in the Deep', category: 'music', query: 'Rolling in the Deep Adele' },
  { answer: 'Believer', category: 'music', query: 'Believer Imagine Dragons' },
  { answer: 'Levitating', category: 'music', query: 'Levitating Dua Lipa' },
  { answer: 'Smells Like Teen Spirit', category: 'music', query: 'Smells Like Teen Spirit Nirvana' },
  { answer: 'Billie Jean', category: 'music', query: 'Billie Jean Michael Jackson' },
  { answer: 'Seven Nation Army', category: 'music', query: 'Seven Nation Army The White Stripes' },

  // ——— FILM ———
  { answer: 'Star Wars', category: 'film', query: 'Star Wars Main Title John Williams', hint: 'main title' },
  { answer: 'Pirates des Caraïbes', category: 'film', query: "He's a Pirate Klaus Badelt", hint: 'pirate' },
  { answer: 'Le Roi Lion', category: 'film', query: 'Circle of Life Lion King', hint: 'circle of life' },
  { answer: 'Harry Potter', category: 'film', query: "Hedwig's Theme John Williams", hint: 'hedwig' },
  { answer: 'Jurassic Park', category: 'film', query: 'Jurassic Park Theme John Williams', hint: 'jurassic' },
  { answer: 'Interstellar', category: 'film', query: 'Cornfield Chase Hans Zimmer', hint: 'cornfield' },
  { answer: 'Titanic', category: 'film', query: 'My Heart Will Go On Celine Dion', hint: 'my heart' },
  { answer: 'Pirates des Caraïbes', category: 'film', query: 'Davy Jones Hans Zimmer', hint: 'davy jones' },
];

export const BLINDTEST_ROUNDS = 8;
export const BLINDTEST_LISTEN_MS = 20000;
export const BLINDTEST_REVEAL_MS = 6500;

/** Points for a correct answer, rewarding speed (≈100 slow → 1100 instant). */
export function scoreFor(correct: boolean, elapsedMs: number): number {
  if (!correct) return 0;
  const frac = Math.max(0, Math.min(1, elapsedMs / BLINDTEST_LISTEN_MS));
  return Math.round(1000 * (1 - frac)) + 100;
}
