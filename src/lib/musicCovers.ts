import type { MusicTrack, MusicMood } from '@/hooks/useBackgroundMusic';

export interface TrackCover {
  gradient: string;
  emoji: string;
  artist: string;
}

const PAIRS: [string, string][] = [
  ['#a855f7', '#22d3ee'],
  ['#fb7185', '#fbbf24'],
  ['#34d399', '#06b6d4'],
  ['#f472b6', '#a855f7'],
  ['#60a5fa', '#7c3aed'],
  ['#f97316', '#ef4444'],
  ['#22d3ee', '#34d399'],
  ['#facc15', '#fb7185'],
  ['#818cf8', '#22d3ee'],
  ['#c084fc', '#f472b6'],
];

const MOOD_EMOJI: Record<MusicMood, string> = {
  chill: '🌊', energetic: '⚡', tense: '🕯️', epic: '🏆', mysterious: '🌑', playful: '🎈',
};
const MOOD_GENRE: Record<MusicMood, string> = {
  chill: 'Chillwave', energetic: 'High Energy', tense: 'Suspense', epic: 'Épique', mysterious: 'Mystère', playful: 'Fun',
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Strip a leading emoji from a track name for a clean title. */
export function titleOf(name: string): string {
  return name.replace(/^\s*\p{Extended_Pictographic}+\s*/u, '').trim() || name;
}

export function coverFor(track: MusicTrack | null | undefined): TrackCover {
  if (!track) return { gradient: 'linear-gradient(135deg,#3f3f46,#18181b)', emoji: '🎵', artist: 'Mimic Master' };
  const [a, b] = PAIRS[hash(track.name) % PAIRS.length];
  const mood = track.moods?.[0];
  const leadEmoji = track.name.match(/\p{Extended_Pictographic}/u)?.[0];
  const emoji = leadEmoji || (mood ? MOOD_EMOJI[mood] : '🎵');
  const artist = mood ? MOOD_GENRE[mood] : 'Mimic Master';
  return { gradient: `linear-gradient(135deg, ${a}, ${b})`, emoji, artist };
}
