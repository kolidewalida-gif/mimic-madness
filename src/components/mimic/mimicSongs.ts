/**
 * MimicSongs — curated karaoke-friendly catalogue (ISOLATED to Mimic).
 * These are well-known, singable hits with a high chance of having synced
 * lyrics on LRCLIB and a clean iTunes preview. `query` feeds the iTunes search.
 */
export interface MimicSong {
  title: string;
  artist: string;
  query: string;
}

export const MIMIC_SONGS: MimicSong[] = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', query: 'Bohemian Rhapsody Queen' },
  { title: "Don't Stop Believin'", artist: 'Journey', query: "Don't Stop Believin Journey" },
  { title: 'Rolling in the Deep', artist: 'Adele', query: 'Rolling in the Deep Adele' },
  { title: 'Someone Like You', artist: 'Adele', query: 'Someone Like You Adele' },
  { title: 'Shape of You', artist: 'Ed Sheeran', query: 'Shape of You Ed Sheeran' },
  { title: 'Perfect', artist: 'Ed Sheeran', query: 'Perfect Ed Sheeran' },
  { title: 'Blinding Lights', artist: 'The Weeknd', query: 'Blinding Lights The Weeknd' },
  { title: 'Uptown Funk', artist: 'Mark Ronson', query: 'Uptown Funk Bruno Mars' },
  { title: 'Bad Guy', artist: 'Billie Eilish', query: 'bad guy Billie Eilish' },
  { title: 'Shake It Off', artist: 'Taylor Swift', query: 'Shake It Off Taylor Swift' },
  { title: 'Wonderwall', artist: 'Oasis', query: 'Wonderwall Oasis' },
  { title: 'Sweet Child O\u2019 Mine', artist: 'Guns N\u2019 Roses', query: 'Sweet Child O Mine Guns N Roses' },
  { title: 'Livin\u2019 on a Prayer', artist: 'Bon Jovi', query: 'Livin on a Prayer Bon Jovi' },
  { title: "I Want It That Way", artist: 'Backstreet Boys', query: 'I Want It That Way Backstreet Boys' },
  { title: 'Wannabe', artist: 'Spice Girls', query: 'Wannabe Spice Girls' },
  { title: 'Believer', artist: 'Imagine Dragons', query: 'Believer Imagine Dragons' },
  { title: 'Counting Stars', artist: 'OneRepublic', query: 'Counting Stars OneRepublic' },
  { title: 'Happy', artist: 'Pharrell Williams', query: 'Happy Pharrell Williams' },
  { title: 'Roar', artist: 'Katy Perry', query: 'Roar Katy Perry' },
  { title: 'Firework', artist: 'Katy Perry', query: 'Firework Katy Perry' },
  { title: 'Bad Romance', artist: 'Lady Gaga', query: 'Bad Romance Lady Gaga' },
  { title: 'Poker Face', artist: 'Lady Gaga', query: 'Poker Face Lady Gaga' },
  { title: 'Rolling Stone', artist: 'The Rolling Stones', query: "(I Can't Get No) Satisfaction Rolling Stones" },
  { title: 'Hey Jude', artist: 'The Beatles', query: 'Hey Jude The Beatles' },
  { title: 'Let It Be', artist: 'The Beatles', query: 'Let It Be The Beatles' },
  { title: 'Billie Jean', artist: 'Michael Jackson', query: 'Billie Jean Michael Jackson' },
  { title: 'Beat It', artist: 'Michael Jackson', query: 'Beat It Michael Jackson' },
  { title: 'I Will Always Love You', artist: 'Whitney Houston', query: 'I Will Always Love You Whitney Houston' },
  { title: 'Halo', artist: 'Beyoncé', query: 'Halo Beyonce' },
  { title: 'Umbrella', artist: 'Rihanna', query: 'Umbrella Rihanna' },
  { title: 'Diamonds', artist: 'Rihanna', query: 'Diamonds Rihanna' },
  { title: 'Someone You Loved', artist: 'Lewis Capaldi', query: 'Someone You Loved Lewis Capaldi' },
  { title: 'Stay', artist: 'The Kid LAROI', query: 'Stay The Kid LAROI Justin Bieber' },
  { title: 'As It Was', artist: 'Harry Styles', query: 'As It Was Harry Styles' },
  { title: 'Flowers', artist: 'Miley Cyrus', query: 'Flowers Miley Cyrus' },
  { title: 'Levitating', artist: 'Dua Lipa', query: 'Levitating Dua Lipa' },
  { title: 'Dance Monkey', artist: 'Tones and I', query: 'Dance Monkey Tones and I' },
  { title: 'Believe', artist: 'Cher', query: 'Believe Cher' },
  { title: 'Take On Me', artist: 'a-ha', query: 'Take On Me a-ha' },
  { title: 'Africa', artist: 'Toto', query: 'Africa Toto' },
  { title: 'Sweet Dreams', artist: 'Eurythmics', query: 'Sweet Dreams Eurythmics' },
  { title: 'Torn', artist: 'Natalie Imbruglia', query: 'Torn Natalie Imbruglia' },
  { title: 'Zombie', artist: 'The Cranberries', query: 'Zombie The Cranberries' },
  { title: 'Creep', artist: 'Radiohead', query: 'Creep Radiohead' },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', query: 'Smells Like Teen Spirit Nirvana' },
  { title: 'Mr. Brightside', artist: 'The Killers', query: 'Mr Brightside The Killers' },
  { title: 'Viva la Vida', artist: 'Coldplay', query: 'Viva la Vida Coldplay' },
  { title: 'Yellow', artist: 'Coldplay', query: 'Yellow Coldplay' },
  { title: 'Dernière danse', artist: 'Indila', query: 'Dernière danse Indila' },
  { title: 'Alors on danse', artist: 'Stromae', query: 'Alors on danse Stromae' },
  { title: 'Papaoutai', artist: 'Stromae', query: 'Papaoutai Stromae' },
  { title: 'La Vie en rose', artist: 'Édith Piaf', query: 'La Vie en rose Edith Piaf' },
  { title: 'Djadja', artist: 'Aya Nakamura', query: 'Djadja Aya Nakamura' },
  { title: 'Balance ton quoi', artist: 'Angèle', query: 'Balance ton quoi Angèle' },
  { title: 'Formidable', artist: 'Stromae', query: 'Formidable Stromae' },
  { title: 'Je veux', artist: 'Zaz', query: 'Je veux Zaz' },
  { title: 'All of Me', artist: 'John Legend', query: 'All of Me John Legend' },
  { title: 'Say Something', artist: 'A Great Big World', query: 'Say Something A Great Big World' },
  { title: 'Hallelujah', artist: 'Jeff Buckley', query: 'Hallelujah Jeff Buckley' },
  { title: 'Let It Go', artist: 'Idina Menzel', query: 'Let It Go Idina Menzel Frozen' },
];

export function pickRandomSong(exclude: Set<string> = new Set()): MimicSong {
  const pool = MIMIC_SONGS.filter((s) => !exclude.has(s.title.toLowerCase()));
  const src = pool.length ? pool : MIMIC_SONGS;
  return src[Math.floor(Math.random() * src.length)];
}
