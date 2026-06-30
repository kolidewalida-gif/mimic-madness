/**
 * "Blindtest Musical" — curated answers + iTunes search queries.
 *
 * Audio is fetched at runtime from the iTunes Search API (30s previews), so
 * there are no files to host and no fragile video ids. Each entry pairs a
 * clean ANSWER (what players must guess) with a search QUERY that reliably
 * returns the recognizable track. Dead/empty queries are auto-skipped in game.
 */

export type BlindtestCategory = 'anime' | 'cartoon' | 'music' | 'film' | 'jeuxvideo' | 'disney';

export const CATEGORY_META: Record<
  BlindtestCategory,
  { label: string; emoji: string; color: string }
> = {
  anime: { label: 'Anime', emoji: '🎌', color: '#f43f5e' },
  cartoon: { label: 'Dessin animé', emoji: '📺', color: '#22d3ee' },
  music: { label: 'Musique', emoji: '🎵', color: '#a855f7' },
  film: { label: 'Film', emoji: '🎬', color: '#fbbf24' },
  jeuxvideo: { label: 'Jeux Vidéo', emoji: '🎮', color: '#34d399' },
  disney: { label: 'Disney', emoji: '🏰', color: '#38bdf8' },
};

export interface BlindtestEntry {
  answer: string;
  category: BlindtestCategory;
  query: string;
  hint?: string;
}

export const BLINDTEST_ENTRIES: BlindtestEntry[] = [
  // ═══════════════ ANIME ═══════════════
  { answer: 'Naruto', category: 'anime', query: 'Blue Bird Ikimonogakari', hint: 'blue bird' },
  { answer: "L'Attaque des Titans", category: 'anime', query: 'Guren no Yumiya Linked Horizon', hint: 'guren' },
  { answer: 'Demon Slayer', category: 'anime', query: 'Gurenge LiSA', hint: 'gurenge' },
  { answer: 'One Piece', category: 'anime', query: 'We Are Hiroshi Kitadani', hint: 'we are' },
  { answer: 'Jujutsu Kaisen', category: 'anime', query: 'Kaikai Kitan Eve', hint: 'kaikai' },
  { answer: 'My Hero Academia', category: 'anime', query: 'Peace Sign Kenshi Yonezu', hint: 'peace sign' },
  { answer: 'Dragon Ball Z', category: 'anime', query: 'Cha-La Head-Cha-La Hironobu Kageyama', hint: 'cha-la' },
  { answer: 'Death Note', category: 'anime', query: 'the WORLD Nightmare', hint: 'world' },
  { answer: 'Tokyo Ghoul', category: 'anime', query: 'Unravel TK ling tosite sigure', hint: 'unravel' },
  { answer: 'Sword Art Online', category: 'anime', query: 'Crossing Field LiSA', hint: 'crossing' },
  { answer: 'Fullmetal Alchemist', category: 'anime', query: 'Again Yui', hint: 'again' },
  { answer: 'Hunter x Hunter', category: 'anime', query: 'Departure Masatoshi Ono', hint: 'departure' },
  { answer: 'Chainsaw Man', category: 'anime', query: 'Kick Back Kenshi Yonezu', hint: 'kick back' },
  { answer: 'Spy x Family', category: 'anime', query: 'Mixed Nuts Official Hige Dandism', hint: 'mixed nuts' },
  { answer: 'Bleach', category: 'anime', query: 'Asterisk Orange Range', hint: 'asterisk' },
  { answer: 'Evangelion', category: 'anime', query: "A Cruel Angel's Thesis Yoko Takahashi", hint: 'cruel angel' },
  { answer: 'Fairy Tail', category: 'anime', query: 'Snow Fairy Funkist', hint: 'snow fairy' },
  { answer: 'Black Clover', category: 'anime', query: 'Black Catcher Vickeblanka', hint: 'black catcher' },
  { answer: 'Haikyuu', category: 'anime', query: 'Imagination Spyair', hint: 'imagination' },
  { answer: 'Tokyo Revengers', category: 'anime', query: 'Cry Baby Official Hige Dandism', hint: 'cry baby' },
  { answer: "JoJo's Bizarre Adventure", category: 'anime', query: 'Bloody Stream Coda', hint: 'bloody stream' },
  { answer: 'Cowboy Bebop', category: 'anime', query: 'Tank Seatbelts Yoko Kanno', hint: 'tank' },
  { answer: 'Mob Psycho 100', category: 'anime', query: '99 Mob Choir', hint: '99' },
  { answer: 'One Punch Man', category: 'anime', query: 'The Hero JAM Project', hint: 'hero' },
  { answer: 'Steins;Gate', category: 'anime', query: 'Hacking to the Gate Kanako Ito', hint: 'hacking' },
  { answer: 'Re:Zero', category: 'anime', query: 'Redo Konomi Suzuki', hint: 'redo' },
  { answer: 'Vinland Saga', category: 'anime', query: 'Mukanjyo Survive Said The Prophet', hint: 'mukanjyo' },
  { answer: 'Blue Lock', category: 'anime', query: 'Chaos Lulu Unfair', hint: 'chaos' },

  // ═══════════════ DESSIN ANIMÉ ═══════════════
  { answer: 'Pokémon', category: 'cartoon', query: 'Pokemon Theme Pokemon', hint: 'pokemon theme' },
  { answer: 'Bob l’éponge', category: 'cartoon', query: 'SpongeBob SquarePants Theme', hint: 'spongebob' },
  { answer: 'Les Simpson', category: 'cartoon', query: 'The Simpsons Theme Danny Elfman', hint: 'simpsons' },
  { answer: 'Gravity Falls', category: 'cartoon', query: 'Gravity Falls Theme', hint: 'gravity' },
  { answer: 'Adventure Time', category: 'cartoon', query: 'Adventure Time Theme', hint: 'adventure' },
  { answer: 'Steven Universe', category: 'cartoon', query: 'Steven Universe Theme', hint: 'steven' },
  { answer: 'Phineas et Ferb', category: 'cartoon', query: 'Phineas and Ferb Theme', hint: 'phineas' },
  { answer: 'Les Tortues Ninja', category: 'cartoon', query: 'Teenage Mutant Ninja Turtles Theme', hint: 'ninja turtles' },
  { answer: 'Rick et Morty', category: 'cartoon', query: 'Rick and Morty Theme', hint: 'rick' },
  { answer: 'Scooby-Doo', category: 'cartoon', query: 'Scooby Doo Where Are You', hint: 'scooby' },
  { answer: 'Kim Possible', category: 'cartoon', query: 'Call Me Beep Me Kim Possible', hint: 'beep me' },
  { answer: 'Teen Titans', category: 'cartoon', query: 'Teen Titans Theme Puffy AmiYumi', hint: 'teen titans' },
  { answer: 'DuckTales', category: 'cartoon', query: 'DuckTales Theme', hint: 'ducktales' },
  { answer: 'Inspecteur Gadget', category: 'cartoon', query: 'Inspector Gadget Theme', hint: 'gadget' },
  { answer: 'Avatar le dernier maître de l’air', category: 'cartoon', query: 'Avatar The Last Airbender Suite', hint: 'avatar' },

  // ═══════════════ MUSIQUE ═══════════════
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
  { answer: 'Bohemian Rhapsody', category: 'music', query: 'Bohemian Rhapsody Queen' },
  { answer: "Sweet Child O' Mine", category: 'music', query: "Sweet Child O Mine Guns N Roses" },
  { answer: 'Wonderwall', category: 'music', query: 'Wonderwall Oasis' },
  { answer: 'Take On Me', category: 'music', query: 'Take On Me a-ha' },
  { answer: 'Viva la Vida', category: 'music', query: 'Viva la Vida Coldplay' },
  { answer: 'Get Lucky', category: 'music', query: 'Get Lucky Daft Punk' },
  { answer: 'Lose Yourself', category: 'music', query: 'Lose Yourself Eminem' },
  { answer: 'Shake It Off', category: 'music', query: 'Shake It Off Taylor Swift' },
  { answer: 'Despacito', category: 'music', query: 'Despacito Luis Fonsi' },
  { answer: 'Gangnam Style', category: 'music', query: 'Gangnam Style PSY' },
  { answer: 'Dynamite', category: 'music', query: 'Dynamite BTS' },
  { answer: 'As It Was', category: 'music', query: 'As It Was Harry Styles' },
  { answer: 'Flowers', category: 'music', query: 'Flowers Miley Cyrus' },
  { answer: 'Alors on danse', category: 'music', query: 'Alors on danse Stromae' },
  { answer: 'Dernière danse', category: 'music', query: 'Dernière danse Indila' },
  { answer: 'Djadja', category: 'music', query: 'Djadja Aya Nakamura' },
  { answer: 'Balance ton quoi', category: 'music', query: 'Balance ton quoi Angèle' },
  { answer: 'La Vie en rose', category: 'music', query: 'La Vie en rose Edith Piaf' },

  // ═══════════════ FILM ═══════════════
  { answer: 'Star Wars', category: 'film', query: 'Star Wars Main Title John Williams', hint: 'main title' },
  { answer: 'Pirates des Caraïbes', category: 'film', query: "He's a Pirate Klaus Badelt", hint: 'pirate' },
  { answer: 'Harry Potter', category: 'film', query: "Hedwig's Theme John Williams", hint: 'hedwig' },
  { answer: 'Jurassic Park', category: 'film', query: 'Jurassic Park Theme John Williams', hint: 'jurassic' },
  { answer: 'Interstellar', category: 'film', query: 'Cornfield Chase Hans Zimmer', hint: 'cornfield' },
  { answer: 'Titanic', category: 'film', query: 'My Heart Will Go On Celine Dion', hint: 'my heart' },
  { answer: 'Le Parrain', category: 'film', query: 'The Godfather Waltz Nino Rota', hint: 'godfather' },
  { answer: 'Mission Impossible', category: 'film', query: 'Mission Impossible Theme', hint: 'mission' },
  { answer: 'James Bond', category: 'film', query: 'James Bond Theme', hint: 'bond' },
  { answer: 'Indiana Jones', category: 'film', query: 'Raiders March John Williams', hint: 'raiders' },
  { answer: 'Retour vers le futur', category: 'film', query: 'Back to the Future Theme Alan Silvestri', hint: 'future' },
  { answer: 'Rocky', category: 'film', query: 'Gonna Fly Now Rocky', hint: 'gonna fly' },
  { answer: 'Le Seigneur des Anneaux', category: 'film', query: 'Concerning Hobbits Howard Shore', hint: 'hobbits' },
  { answer: 'Gladiator', category: 'film', query: 'Now We Are Free Hans Zimmer', hint: 'now we are free' },
  { answer: 'Le Bon, la Brute et le Truand', category: 'film', query: 'The Good the Bad and the Ugly Ennio Morricone', hint: 'good bad ugly' },

  // ═══════════════ JEUX VIDÉO ═══════════════
  { answer: 'Super Mario Bros', category: 'jeuxvideo', query: 'Super Mario Bros Theme Koji Kondo', hint: 'mario' },
  { answer: 'The Legend of Zelda', category: 'jeuxvideo', query: 'The Legend of Zelda Main Theme Koji Kondo', hint: 'zelda' },
  { answer: 'Tetris', category: 'jeuxvideo', query: 'Tetris Theme Korobeiniki', hint: 'tetris' },
  { answer: 'Minecraft', category: 'jeuxvideo', query: 'Minecraft Sweden C418', hint: 'sweden' },
  { answer: 'Sonic the Hedgehog', category: 'jeuxvideo', query: 'Sonic Green Hill Zone', hint: 'green hill' },
  { answer: 'Undertale', category: 'jeuxvideo', query: 'Megalovania Toby Fox', hint: 'megalovania' },
  { answer: 'Final Fantasy', category: 'jeuxvideo', query: 'One Winged Angel Nobuo Uematsu', hint: 'winged angel' },
  { answer: 'Skyrim', category: 'jeuxvideo', query: 'Dragonborn Skyrim Jeremy Soule', hint: 'dragonborn' },
  { answer: 'The Last of Us', category: 'jeuxvideo', query: 'The Last of Us Theme Gustavo Santaolalla', hint: 'last of us' },
  { answer: 'Halo', category: 'jeuxvideo', query: 'Halo Theme Martin O\'Donnell', hint: 'halo' },
  { answer: 'Doom', category: 'jeuxvideo', query: "At Doom's Gate Mick Gordon", hint: 'doom' },
  { answer: 'Animal Crossing', category: 'jeuxvideo', query: 'Animal Crossing Main Theme', hint: 'animal crossing' },
  { answer: 'Mario Kart', category: 'jeuxvideo', query: 'Mario Kart 8 Main Theme', hint: 'mario kart' },

  // ═══════════════ DISNEY ═══════════════
  { answer: 'La Reine des Neiges', category: 'disney', query: 'Let It Go Idina Menzel Frozen', hint: 'let it go' },
  { answer: 'Le Roi Lion', category: 'disney', query: 'Circle of Life Lion King', hint: 'circle of life' },
  { answer: 'Aladdin', category: 'disney', query: 'A Whole New World Aladdin', hint: 'whole new world' },
  { answer: 'La Petite Sirène', category: 'disney', query: 'Part of Your World Little Mermaid', hint: 'part of your world' },
  { answer: 'La Belle et la Bête', category: 'disney', query: 'Beauty and the Beast Celine Dion', hint: 'beauty' },
  { answer: 'Vaiana', category: 'disney', query: "How Far I'll Go Moana", hint: 'how far' },
  { answer: 'Toy Story', category: 'disney', query: "You've Got a Friend in Me Randy Newman", hint: 'friend in me' },
  { answer: 'Coco', category: 'disney', query: 'Remember Me Coco', hint: 'remember me' },
  { answer: 'Encanto', category: 'disney', query: "We Don't Talk About Bruno Encanto", hint: 'bruno' },
  { answer: 'Mulan', category: 'disney', query: 'Reflection Mulan', hint: 'reflection' },
  { answer: 'Hercule', category: 'disney', query: 'Go the Distance Hercules', hint: 'go the distance' },
  { answer: 'Pocahontas', category: 'disney', query: 'Colors of the Wind Pocahontas', hint: 'colors of the wind' },
];

export const BLINDTEST_ROUNDS = 10;
export const BLINDTEST_LISTEN_MS = 20000;
export const BLINDTEST_REVEAL_MS = 6500;

/** Points for a correct answer, rewarding speed (≈100 slow → 1100 instant). */
export function scoreFor(correct: boolean, elapsedMs: number): number {
  if (!correct) return 0;
  const frac = Math.max(0, Math.min(1, elapsedMs / BLINDTEST_LISTEN_MS));
  return Math.round(1000 * (1 - frac)) + 100;
}
