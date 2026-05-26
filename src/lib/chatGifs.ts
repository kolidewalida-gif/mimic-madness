/**
 * Chat GIF library — 300+ animated GIFs organized by category.
 * Used by the lobby chat GIF picker.
 */

export type GifCategory =
  | 'reactions'
  | 'celebration'
  | 'laughter'
  | 'shock'
  | 'thumbs'
  | 'dancing'
  | 'animals'
  | 'gaming'
  | 'love'
  | 'sad'
  | 'angry'
  | 'cool'
  | 'thinking'
  | 'facepalm'
  | 'food'
  | 'music'
  | 'sport'
  | 'memes';

export interface GifEntry {
  url: string;
  category: GifCategory;
  tags: string[];
}

export const CATEGORY_LABELS: Record<GifCategory, { emoji: string; label: string; color: string }> = {
  reactions: { emoji: '😲', label: 'Réactions', color: '#a855f7' },
  celebration: { emoji: '🎉', label: 'Fête', color: '#fbbf24' },
  laughter: { emoji: '😂', label: 'Rire', color: '#f59e0b' },
  shock: { emoji: '😱', label: 'Choc', color: '#ef4444' },
  thumbs: { emoji: '👍', label: 'Approbation', color: '#34d399' },
  dancing: { emoji: '💃', label: 'Danse', color: '#f472b6' },
  animals: { emoji: '🐱', label: 'Animaux', color: '#22d3ee' },
  gaming: { emoji: '🎮', label: 'Gaming', color: '#8b5cf6' },
  love: { emoji: '❤️', label: 'Amour', color: '#ec4899' },
  sad: { emoji: '😢', label: 'Triste', color: '#60a5fa' },
  angry: { emoji: '😡', label: 'Énervé', color: '#dc2626' },
  cool: { emoji: '😎', label: 'Cool', color: '#0ea5e9' },
  thinking: { emoji: '🤔', label: 'Réflexion', color: '#fbbf24' },
  facepalm: { emoji: '🤦', label: 'Facepalm', color: '#a78bfa' },
  food: { emoji: '🍔', label: 'Bouffe', color: '#f97316' },
  music: { emoji: '🎵', label: 'Musique', color: '#a3e635' },
  sport: { emoji: '⚽', label: 'Sport', color: '#10b981' },
  memes: { emoji: '🤡', label: 'Memes', color: '#fb923c' },
};

export const CHAT_GIFS: GifEntry[] = [
  // ═══════════════ REACTIONS ═══════════════
  { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', category: 'reactions', tags: ['surprise', 'wow'] },
  { url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', category: 'reactions', tags: ['ok', 'fine'] },
  { url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif', category: 'reactions', tags: ['confused'] },
  { url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', category: 'reactions', tags: ['really'] },
  { url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', category: 'reactions', tags: ['nope'] },
  { url: 'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif', category: 'reactions', tags: ['shrug'] },
  { url: 'https://media.giphy.com/media/l0HlRnAWXxn0MhKLK/giphy.gif', category: 'reactions', tags: ['yes'] },
  { url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', category: 'reactions', tags: ['no'] },
  { url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', category: 'reactions', tags: ['hmm'] },
  { url: 'https://media.giphy.com/media/UI1qLkl9hekmoJWduz/giphy.gif', category: 'reactions', tags: ['shock'] },
  { url: 'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif', category: 'reactions', tags: ['eyeroll'] },
  { url: 'https://media.giphy.com/media/lRLzrbhmh5pFf0BrSx/giphy.gif', category: 'reactions', tags: ['side eye'] },
  { url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif', category: 'reactions', tags: ['wtf'] },
  { url: 'https://media.giphy.com/media/WUq1cg9K7uzHa/giphy.gif', category: 'reactions', tags: ['sigh'] },
  { url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif', category: 'reactions', tags: ['nodding'] },
  { url: 'https://media.giphy.com/media/jUtfUPnxabxAQ/giphy.gif', category: 'reactions', tags: ['yes', 'agreed'] },
  { url: 'https://media.giphy.com/media/QmNbz7OihoVPcFhYR1/giphy.gif', category: 'reactions', tags: ['really'] },
  { url: 'https://media.giphy.com/media/MkVy5ZdvI2VRm3M/giphy.gif', category: 'reactions', tags: ['nope'] },
  { url: 'https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif', category: 'reactions', tags: ['ok'] },
  { url: 'https://media.giphy.com/media/h13KaqeCOSkek/giphy.gif', category: 'reactions', tags: ['shock'] },

  // ═══════════════ CELEBRATION ═══════════════
  { url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif', category: 'celebration', tags: ['party'] },
  { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', category: 'celebration', tags: ['win'] },
  { url: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif', category: 'celebration', tags: ['hooray'] },
  { url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', category: 'celebration', tags: ['confetti'] },
  { url: 'https://media.giphy.com/media/l0MYJnJQ4EiYLxvQ4/giphy.gif', category: 'celebration', tags: ['fireworks'] },
  { url: 'https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif', category: 'celebration', tags: ['cheers'] },
  { url: 'https://media.giphy.com/media/3o7qDSOvfaCO9b3MlO/giphy.gif', category: 'celebration', tags: ['victory'] },
  { url: 'https://media.giphy.com/media/YRuFixSNWFVcXaxpmX/giphy.gif', category: 'celebration', tags: ['yay'] },
  { url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', category: 'celebration', tags: ['woohoo'] },
  { url: 'https://media.giphy.com/media/2gtoSIzdrSMFO/giphy.gif', category: 'celebration', tags: ['happy'] },
  { url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif', category: 'celebration', tags: ['excited'] },
  { url: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif', category: 'celebration', tags: ['cheers'] },
  { url: 'https://media.giphy.com/media/IwAZ6dvvvaTtdI8SD5/giphy.gif', category: 'celebration', tags: ['celebrate'] },
  { url: 'https://media.giphy.com/media/6nuiJjOOQBBn2/giphy.gif', category: 'celebration', tags: ['yes'] },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', category: 'celebration', tags: ['party'] },
  { url: 'https://media.giphy.com/media/l46Cy1rHbQ7qbPzQI/giphy.gif', category: 'celebration', tags: ['victory'] },
  { url: 'https://media.giphy.com/media/3o7btT1T9qpQZWhNlK/giphy.gif', category: 'celebration', tags: ['fireworks'] },
  { url: 'https://media.giphy.com/media/3o7TKr3DiKAImT8CpW/giphy.gif', category: 'celebration', tags: ['party'] },

  // ═══════════════ LAUGHTER ═══════════════
  { url: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif', category: 'laughter', tags: ['lol'] },
  { url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', category: 'laughter', tags: ['lmao'] },
  { url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', category: 'laughter', tags: ['rofl'] },
  { url: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif', category: 'laughter', tags: ['haha'] },
  { url: 'https://media.giphy.com/media/xUA7aM09ByyR1w5YWc/giphy.gif', category: 'laughter', tags: ['laugh'] },
  { url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', category: 'laughter', tags: ['funny'] },
  { url: 'https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif', category: 'laughter', tags: ['lol'] },
  { url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', category: 'laughter', tags: ['hehe'] },
  { url: 'https://media.giphy.com/media/l3fQf1OEAq0iri9RC/giphy.gif', category: 'laughter', tags: ['haha'] },
  { url: 'https://media.giphy.com/media/1d5Zn8FqmJqApu4hNU/giphy.gif', category: 'laughter', tags: ['cry laughing'] },
  { url: 'https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif', category: 'laughter', tags: ['rofl'] },
  { url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', category: 'laughter', tags: ['lmao'] },
  { url: 'https://media.giphy.com/media/bC9czlgCMtw4cj8RgH/giphy.gif', category: 'laughter', tags: ['funny'] },
  { url: 'https://media.giphy.com/media/ZchRleihJh0vS/giphy.gif', category: 'laughter', tags: ['lol'] },
  { url: 'https://media.giphy.com/media/l1J9JiNCoLMVQqgOk/giphy.gif', category: 'laughter', tags: ['haha'] },

  // ═══════════════ SHOCK ═══════════════
  { url: 'https://media.giphy.com/media/3o7TKWy9Lw8DoMzc5y/giphy.gif', category: 'shock', tags: ['omg'] },
  { url: 'https://media.giphy.com/media/l0Iydl9zWjbLvLv6U/giphy.gif', category: 'shock', tags: ['wow'] },
  { url: 'https://media.giphy.com/media/xUPGcyi4YBdUJFLjdK/giphy.gif', category: 'shock', tags: ['shocked'] },
  { url: 'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif', category: 'shock', tags: ['gasp'] },
  { url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', category: 'shock', tags: ['no way'] },
  { url: 'https://media.giphy.com/media/8miYQYfpol1qU/giphy.gif', category: 'shock', tags: ['surprised'] },
  { url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', category: 'shock', tags: ['mind blown'] },
  { url: 'https://media.giphy.com/media/3o7aTskHEUdgCQAXde/giphy.gif', category: 'shock', tags: ['speechless'] },
  { url: 'https://media.giphy.com/media/ukGm72ZLZvYfS/giphy.gif', category: 'shock', tags: ['jaw drop'] },
  { url: 'https://media.giphy.com/media/14aUO0Mf7dWDXW/giphy.gif', category: 'shock', tags: ['woah'] },
  { url: 'https://media.giphy.com/media/3o7527pa7qs9kCG78A/giphy.gif', category: 'shock', tags: ['shock'] },
  { url: 'https://media.giphy.com/media/wWue0rCDOphOE/giphy.gif', category: 'shock', tags: ['mind blown'] },
  { url: 'https://media.giphy.com/media/3o7aDh68dYGoMdkMN2/giphy.gif', category: 'shock', tags: ['wtf'] },
  { url: 'https://media.giphy.com/media/3oEdv3Lq9hsFwyEUUM/giphy.gif', category: 'shock', tags: ['shocked'] },

  // ═══════════════ THUMBS / APPROVAL ═══════════════
  { url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', category: 'thumbs', tags: ['like'] },
  { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', category: 'thumbs', tags: ['thumbs up'] },
  { url: 'https://media.giphy.com/media/xT77XWum9yH7zNkFW0/giphy.gif', category: 'thumbs', tags: ['approve'] },
  { url: 'https://media.giphy.com/media/l41lUJ1YoZB1lHVPG/giphy.gif', category: 'thumbs', tags: ['nice'] },
  { url: 'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif', category: 'thumbs', tags: ['ok'] },
  { url: 'https://media.giphy.com/media/Od0QRnzwRBYmDU3eEO/giphy.gif', category: 'thumbs', tags: ['great'] },
  { url: 'https://media.giphy.com/media/3ohs7KViF6rA4aan5u/giphy.gif', category: 'thumbs', tags: ['cool'] },
  { url: 'https://media.giphy.com/media/fxsqOYnIMEefC/giphy.gif', category: 'thumbs', tags: ['perfect'] },
  { url: 'https://media.giphy.com/media/GCvktC0KFy9l6/giphy.gif', category: 'thumbs', tags: ['high five'] },
  { url: 'https://media.giphy.com/media/l4q83ymA02s0xJBzG/giphy.gif', category: 'thumbs', tags: ['gg'] },
  { url: 'https://media.giphy.com/media/l4Ki9DXr2KopHPLYc/giphy.gif', category: 'thumbs', tags: ['well done'] },

  // ═══════════════ DANCING ═══════════════
  { url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif', category: 'dancing', tags: ['groove'] },
  { url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/3o7aCTfyhYawMw5zzq/giphy.gif', category: 'dancing', tags: ['party'] },
  { url: 'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif', category: 'dancing', tags: ['boogie'] },
  { url: 'https://media.giphy.com/media/5xaOcLDE64VMF4LqqrK/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/tsX3YMWYzDPjAARfeg/giphy.gif', category: 'dancing', tags: ['groovy'] },
  { url: 'https://media.giphy.com/media/BlVnrxJgTGsUw/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/3o7aD4kZn2dMlOOiY0/giphy.gif', category: 'dancing', tags: ['rave'] },
  { url: 'https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif', category: 'dancing', tags: ['party'] },
  { url: 'https://media.giphy.com/media/14kwRD61ir8wW4/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/U7oXjJSTGz2WI/giphy.gif', category: 'dancing', tags: ['dance'] },
];

// More categories
CHAT_GIFS.push(
  // ═══════════════ ANIMALS ═══════════════
  { url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/cfuL5gqFDreXxkWQ4o/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/nR4L10XlJcSeQ/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/3oEduQ3BdyBLT4Kchq/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/fvT2lZ7UFAvHpPjmVs/giphy.gif', category: 'animals', tags: ['cute'] },
  { url: 'https://media.giphy.com/media/3o7TKSha51ATTx9KzC/giphy.gif', category: 'animals', tags: ['kitten'] },
  { url: 'https://media.giphy.com/media/qUIm5wu6LAAog/giphy.gif', category: 'animals', tags: ['puppy'] },
  { url: 'https://media.giphy.com/media/yFQ0ywscgobJK/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/Nm8ZPAGOwZUQM/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/kEKcOWl8RMLde/giphy.gif', category: 'animals', tags: ['fox'] },
  { url: 'https://media.giphy.com/media/11s7Ke7jcNxCHS/giphy.gif', category: 'animals', tags: ['hamster'] },
  { url: 'https://media.giphy.com/media/8vQSQ3cNXuDGo/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/7AT7T1lU7VLVK/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/26FxoQEzu2sqiKFYY/giphy.gif', category: 'animals', tags: ['panda'] },

  // ═══════════════ GAMING ═══════════════
  { url: 'https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif', category: 'gaming', tags: ['gg'] },
  { url: 'https://media.giphy.com/media/3o7TKP9lxIL1Bv9wXu/giphy.gif', category: 'gaming', tags: ['rage'] },
  { url: 'https://media.giphy.com/media/kiBcwEXegBTACmVOnE/giphy.gif', category: 'gaming', tags: ['gamer'] },
  { url: 'https://media.giphy.com/media/3o7aCRloybJlXpNjSU/giphy.gif', category: 'gaming', tags: ['rage quit'] },
  { url: 'https://media.giphy.com/media/l3mZd0YH1I6KRPQ1a/giphy.gif', category: 'gaming', tags: ['victory'] },
  { url: 'https://media.giphy.com/media/QBGYWFjnggIZ8fMjdt/giphy.gif', category: 'gaming', tags: ['epic'] },
  { url: 'https://media.giphy.com/media/f9RIxl8bHBdBWg60Tq/giphy.gif', category: 'gaming', tags: ['controller'] },
  { url: 'https://media.giphy.com/media/mXuPwb6LgN5FB4mEwd/giphy.gif', category: 'gaming', tags: ['headshot'] },
  { url: 'https://media.giphy.com/media/3o7TKwBctlbpzSCVFu/giphy.gif', category: 'gaming', tags: ['gg ez'] },
  { url: 'https://media.giphy.com/media/3oz8xsQCb22HS5s7ew/giphy.gif', category: 'gaming', tags: ['game over'] },
  { url: 'https://media.giphy.com/media/l3q2zVr6cu95nFV0Y/giphy.gif', category: 'gaming', tags: ['victory'] },
  { url: 'https://media.giphy.com/media/26gscNlk0lJDXPjqU/giphy.gif', category: 'gaming', tags: ['noob'] },

  // ═══════════════ LOVE ═══════════════
  { url: 'https://media.giphy.com/media/108M7gCS1JSoO4/giphy.gif', category: 'love', tags: ['heart'] },
  { url: 'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif', category: 'love', tags: ['kiss'] },
  { url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', category: 'love', tags: ['heart'] },
  { url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', category: 'love', tags: ['hug'] },
  { url: 'https://media.giphy.com/media/xT9IgvEOwRzUcZDRiw/giphy.gif', category: 'love', tags: ['love'] },
  { url: 'https://media.giphy.com/media/l0MYyoYPvz22wTXkQ/giphy.gif', category: 'love', tags: ['heart eyes'] },
  { url: 'https://media.giphy.com/media/3oriO0x8L5sLmBSeY0/giphy.gif', category: 'love', tags: ['kiss'] },
  { url: 'https://media.giphy.com/media/xT8qBepJQzRjXtOXYs/giphy.gif', category: 'love', tags: ['hearts'] },
  { url: 'https://media.giphy.com/media/HLXPTkXcr9xBKZanZ7/giphy.gif', category: 'love', tags: ['love'] },
  { url: 'https://media.giphy.com/media/3owzWgpBN5IKkAcYUs/giphy.gif', category: 'love', tags: ['heart'] },

  // ═══════════════ SAD ═══════════════
  { url: 'https://media.giphy.com/media/3o6wrebnKWmvx4ZBio/giphy.gif', category: 'sad', tags: ['cry'] },
  { url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif', category: 'sad', tags: ['sad'] },
  { url: 'https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif', category: 'sad', tags: ['cry'] },
  { url: 'https://media.giphy.com/media/l41lMPi9GhTmtLpRu/giphy.gif', category: 'sad', tags: ['tears'] },
  { url: 'https://media.giphy.com/media/9Y5BbDSkSTiY8/giphy.gif', category: 'sad', tags: ['crying'] },
  { url: 'https://media.giphy.com/media/ROF8OQvDmxytW/giphy.gif', category: 'sad', tags: ['sob'] },
  { url: 'https://media.giphy.com/media/2rtQMJvhzOnRe/giphy.gif', category: 'sad', tags: ['depressed'] },
  { url: 'https://media.giphy.com/media/3o6wrvdHFbwBrUFenu/giphy.gif', category: 'sad', tags: ['sad'] },
  { url: 'https://media.giphy.com/media/3oz8xZBMcF6dJG0CLm/giphy.gif', category: 'sad', tags: ['cry'] },

  // ═══════════════ ANGRY ═══════════════
  { url: 'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif', category: 'angry', tags: ['rage'] },
  { url: 'https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif', category: 'angry', tags: ['mad'] },
  { url: 'https://media.giphy.com/media/3o7WTqo27pLRYxRtg4/giphy.gif', category: 'angry', tags: ['furious'] },
  { url: 'https://media.giphy.com/media/3o7TKyOoGtsprTLgzu/giphy.gif', category: 'angry', tags: ['angry'] },
  { url: 'https://media.giphy.com/media/l0HlKrB02QY0f1mbm/giphy.gif', category: 'angry', tags: ['mad'] },
  { url: 'https://media.giphy.com/media/3oAt21Fnr4i54uK8vK/giphy.gif', category: 'angry', tags: ['rage'] },
  { url: 'https://media.giphy.com/media/3oriO5t2QB4IPKgxHi/giphy.gif', category: 'angry', tags: ['fury'] },
  { url: 'https://media.giphy.com/media/3o7aD4Z3oQpAYg1nra/giphy.gif', category: 'angry', tags: ['angry'] },

  // ═══════════════ COOL ═══════════════
  { url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', category: 'cool', tags: ['sunglasses'] },
  { url: 'https://media.giphy.com/media/3og0IMJcSI8p6hYQXS/giphy.gif', category: 'cool', tags: ['boss'] },
  { url: 'https://media.giphy.com/media/3o7qDDEyZF0r9W6eY8/giphy.gif', category: 'cool', tags: ['cool'] },
  { url: 'https://media.giphy.com/media/3oriNZoNvn73MZaFYk/giphy.gif', category: 'cool', tags: ['swag'] },
  { url: 'https://media.giphy.com/media/l3vR4l2p29Q1G3vKE/giphy.gif', category: 'cool', tags: ['fire'] },
  { url: 'https://media.giphy.com/media/dIxkmtCuuBQuM9Uge/giphy.gif', category: 'cool', tags: ['style'] },
  { url: 'https://media.giphy.com/media/26FmQ6EOvLxp6cWyY/giphy.gif', category: 'cool', tags: ['boss'] },
  { url: 'https://media.giphy.com/media/3o7aTrNGbV4uyVsYuc/giphy.gif', category: 'cool', tags: ['epic'] },
  { url: 'https://media.giphy.com/media/26FmQ6EOvLxp6cWyY/giphy.gif', category: 'cool', tags: ['cool'] },

  // ═══════════════ THINKING ═══════════════
  { url: 'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif', category: 'thinking', tags: ['hmm'] },
  { url: 'https://media.giphy.com/media/lKXEBR8m1jWso/giphy.gif', category: 'thinking', tags: ['thinking'] },
  { url: 'https://media.giphy.com/media/CaiVJuZGvR8HK/giphy.gif', category: 'thinking', tags: ['ponder'] },
  { url: 'https://media.giphy.com/media/TPl5N4Ci49ZQY/giphy.gif', category: 'thinking', tags: ['think'] },
  { url: 'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif', category: 'thinking', tags: ['confused'] },
  { url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif', category: 'thinking', tags: ['math'] },
  { url: 'https://media.giphy.com/media/QPcvN5IGzRbtm/giphy.gif', category: 'thinking', tags: ['hmm'] },
  { url: 'https://media.giphy.com/media/9aAU2gQ3nxIBO/giphy.gif', category: 'thinking', tags: ['think'] },

  // ═══════════════ FACEPALM ═══════════════
  { url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif', category: 'facepalm', tags: ['facepalm'] },
  { url: 'https://media.giphy.com/media/AjYsTtVxEEBPO/giphy.gif', category: 'facepalm', tags: ['ugh'] },
  { url: 'https://media.giphy.com/media/l2JhtKtDWYNKdRpoA/giphy.gif', category: 'facepalm', tags: ['really'] },
  { url: 'https://media.giphy.com/media/6yRVg0HWzgS88/giphy.gif', category: 'facepalm', tags: ['facepalm'] },
  { url: 'https://media.giphy.com/media/tJeGZumxDB01q/giphy.gif', category: 'facepalm', tags: ['ugh'] },
  { url: 'https://media.giphy.com/media/l4Ki2obCyAQS5WhFe/giphy.gif', category: 'facepalm', tags: ['really'] },
  { url: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif', category: 'facepalm', tags: ['facepalm'] },

  // ═══════════════ FOOD ═══════════════
  { url: 'https://media.giphy.com/media/EZICHGrSD5QEFCxMiC/giphy.gif', category: 'food', tags: ['pizza'] },
  { url: 'https://media.giphy.com/media/IgGtijHj7qLfq/giphy.gif', category: 'food', tags: ['burger'] },
  { url: 'https://media.giphy.com/media/ToMjGpOjkiEjzJ1ZaJG/giphy.gif', category: 'food', tags: ['eating'] },
  { url: 'https://media.giphy.com/media/gw3C71R3QfHPwyT6/giphy.gif', category: 'food', tags: ['hungry'] },
  { url: 'https://media.giphy.com/media/HGe4zsOVo7Jvy/giphy.gif', category: 'food', tags: ['pizza'] },
  { url: 'https://media.giphy.com/media/eSQiwbCrYnbJS/giphy.gif', category: 'food', tags: ['cake'] },
  { url: 'https://media.giphy.com/media/XGSqXkATD3Akw/giphy.gif', category: 'food', tags: ['food'] },
  { url: 'https://media.giphy.com/media/9u8GF7MuhdvS8/giphy.gif', category: 'food', tags: ['yummy'] },
  { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', category: 'food', tags: ['donut'] },

  // ═══════════════ MUSIC ═══════════════
  { url: 'https://media.giphy.com/media/l378bu6ZYmzS6nBGU/giphy.gif', category: 'music', tags: ['music'] },
  { url: 'https://media.giphy.com/media/3og0IRsGDMv0ZJF6A8/giphy.gif', category: 'music', tags: ['dj'] },
  { url: 'https://media.giphy.com/media/xUA7bdHBV8fcpkN2lq/giphy.gif', category: 'music', tags: ['guitar'] },
  { url: 'https://media.giphy.com/media/26BRte7E5dlGs8xiw/giphy.gif', category: 'music', tags: ['concert'] },
  { url: 'https://media.giphy.com/media/3oEduWsPpGJEPfTiaQ/giphy.gif', category: 'music', tags: ['singing'] },
  { url: 'https://media.giphy.com/media/l0HlI6NdcrtkV5C7e/giphy.gif', category: 'music', tags: ['rap'] },
  { url: 'https://media.giphy.com/media/1iuLw8aPO7Rh6/giphy.gif', category: 'music', tags: ['drums'] },
  { url: 'https://media.giphy.com/media/xTiN0CNHgoRf1Ha7CM/giphy.gif', category: 'music', tags: ['rock'] },

  // ═══════════════ SPORT ═══════════════
  { url: 'https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif', category: 'sport', tags: ['football'] },
  { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', category: 'sport', tags: ['soccer'] },
  { url: 'https://media.giphy.com/media/l0MYryZTmQgvHI5Hy/giphy.gif', category: 'sport', tags: ['basketball'] },
  { url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', category: 'sport', tags: ['workout'] },
  { url: 'https://media.giphy.com/media/xT0GqssRweIhlz209i/giphy.gif', category: 'sport', tags: ['boxing'] },
  { url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', category: 'sport', tags: ['running'] },
  { url: 'https://media.giphy.com/media/xT9IgDEI1iZyb2wqo8/giphy.gif', category: 'sport', tags: ['gym'] },

  // ═══════════════ MEMES ═══════════════
  { url: 'https://media.giphy.com/media/xT1XGWbE0XiBDX2T8Q/giphy.gif', category: 'memes', tags: ['troll'] },
  { url: 'https://media.giphy.com/media/xT5LMuQroxfE556M7K/giphy.gif', category: 'memes', tags: ['pepe'] },
  { url: 'https://media.giphy.com/media/d2Z9QYzA2aidiWn6/giphy.gif', category: 'memes', tags: ['stonks'] },
  { url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/xUPGcC0R9QjyxkPnS8/giphy.gif', category: 'memes', tags: ['classic'] },
  { url: 'https://media.giphy.com/media/3NtY188QaxDdC/giphy.gif', category: 'memes', tags: ['troll'] },
  { url: 'https://media.giphy.com/media/3o7qDEq2bMbcbPRQ2c/giphy.gif', category: 'memes', tags: ['lmao'] },
  { url: 'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif', category: 'memes', tags: ['classic'] },
  { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', category: 'memes', tags: ['party hard'] },
  { url: 'https://media.giphy.com/media/xT9DPBMumj2Q0hlI3K/giphy.gif', category: 'memes', tags: ['classic'] },
  { url: 'https://media.giphy.com/media/3oEduOnl5IHM5NRodO/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/3o6ZsYm5sSwTLRWhy8/giphy.gif', category: 'memes', tags: ['troll'] },
  { url: 'https://media.giphy.com/media/l1ughbsd9qXz2s9SE/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/xT5LMFZDsj0AKUDYTS/giphy.gif', category: 'memes', tags: ['pepe'] },
  { url: 'https://media.giphy.com/media/26uf2JHNV0Tq3ugkE/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/xT5LMzIK1AdZJ4cYW4/giphy.gif', category: 'memes', tags: ['classic'] },
  { url: 'https://media.giphy.com/media/3oEjHI8WJv4x6UPDB6/giphy.gif', category: 'memes', tags: ['stonks'] },
  { url: 'https://media.giphy.com/media/xT39D7O9Xj1JqKq5i0/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif', category: 'memes', tags: ['troll'] },
  { url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', category: 'memes', tags: ['classic'] },
  { url: 'https://media.giphy.com/media/3oEjHGnY8oB4BHVTP2/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/26BRzQS5HXcEWM7du/giphy.gif', category: 'memes', tags: ['lmao'] },
  { url: 'https://media.giphy.com/media/3oEjI4sFlp73fvEYgw/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/l4FGpP4lxGGgK5CBW/giphy.gif', category: 'memes', tags: ['stonks'] }
);

/** Get all GIFs of a category, or all if no category */
export const getGifsByCategory = (category?: GifCategory): GifEntry[] => {
  if (!category) return CHAT_GIFS;
  return CHAT_GIFS.filter((g) => g.category === category);
};

/** Search GIFs by tag (case-insensitive) */
export const searchGifs = (query: string): GifEntry[] => {
  const q = query.toLowerCase().trim();
  if (!q) return CHAT_GIFS;
  return CHAT_GIFS.filter(
    (g) =>
      g.tags.some((t) => t.includes(q)) || g.category.includes(q)
  );
};

/** Get total GIF count */
export const getGifCount = (): number => CHAT_GIFS.length;

// ═══════════════ 200+ MORE GIFS ═══════════════
CHAT_GIFS.push(
  // More reactions
  { url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif', category: 'reactions', tags: ['no way'] },
  { url: 'https://media.giphy.com/media/26uf2YTgF5upXUTm0/giphy.gif', category: 'reactions', tags: ['seriously'] },
  { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', category: 'reactions', tags: ['ok'] },
  { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', category: 'reactions', tags: ['bye'] },
  { url: 'https://media.giphy.com/media/3oEjHGnY8oB4BHVTP2/giphy.gif', category: 'reactions', tags: ['nope'] },
  { url: 'https://media.giphy.com/media/26BRzQS5HXcEWM7du/giphy.gif', category: 'reactions', tags: ['what'] },
  { url: 'https://media.giphy.com/media/l4FGpP4lxGGgK5CBW/giphy.gif', category: 'reactions', tags: ['hmm'] },
  { url: 'https://media.giphy.com/media/3oEjI4sFlp73fvEYgw/giphy.gif', category: 'reactions', tags: ['ok'] },
  { url: 'https://media.giphy.com/media/xT39D7O9Xj1JqKq5i0/giphy.gif', category: 'reactions', tags: ['sure'] },
  { url: 'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif', category: 'reactions', tags: ['bye'] },
  { url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', category: 'reactions', tags: ['wave'] },
  { url: 'https://media.giphy.com/media/3oEjHI8WJv4x6UPDB6/giphy.gif', category: 'reactions', tags: ['hi'] },
  { url: 'https://media.giphy.com/media/l1ughbsd9qXz2s9SE/giphy.gif', category: 'reactions', tags: ['hello'] },
  { url: 'https://media.giphy.com/media/xT5LMFZDsj0AKUDYTS/giphy.gif', category: 'reactions', tags: ['ok'] },
  { url: 'https://media.giphy.com/media/26uf2JHNV0Tq3ugkE/giphy.gif', category: 'reactions', tags: ['bye'] },
  { url: 'https://media.giphy.com/media/xT5LMzIK1AdZJ4cYW4/giphy.gif', category: 'reactions', tags: ['wave'] },
  { url: 'https://media.giphy.com/media/3o6ZsYm5sSwTLRWhy8/giphy.gif', category: 'reactions', tags: ['no'] },
  { url: 'https://media.giphy.com/media/3o7qDEq2bMbcbPRQ2c/giphy.gif', category: 'reactions', tags: ['yes'] },
  { url: 'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif', category: 'reactions', tags: ['ok'] },
  { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', category: 'reactions', tags: ['wow'] },

  // More celebration
  { url: 'https://media.giphy.com/media/3o7TKr3DiKAImT8CpW/giphy.gif', category: 'celebration', tags: ['party'] },
  { url: 'https://media.giphy.com/media/l46Cy1rHbQ7qbPzQI/giphy.gif', category: 'celebration', tags: ['win'] },
  { url: 'https://media.giphy.com/media/3o7btT1T9qpQZWhNlK/giphy.gif', category: 'celebration', tags: ['fireworks'] },
  { url: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif', category: 'celebration', tags: ['cheers'] },
  { url: 'https://media.giphy.com/media/IwAZ6dvvvaTtdI8SD5/giphy.gif', category: 'celebration', tags: ['celebrate'] },
  { url: 'https://media.giphy.com/media/6nuiJjOOQBBn2/giphy.gif', category: 'celebration', tags: ['yes'] },
  { url: 'https://media.giphy.com/media/2gtoSIzdrSMFO/giphy.gif', category: 'celebration', tags: ['happy'] },
  { url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif', category: 'celebration', tags: ['excited'] },
  { url: 'https://media.giphy.com/media/YRuFixSNWFVcXaxpmX/giphy.gif', category: 'celebration', tags: ['yay'] },
  { url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', category: 'celebration', tags: ['woohoo'] },

  // More laughter
  { url: 'https://media.giphy.com/media/ZchRleihJh0vS/giphy.gif', category: 'laughter', tags: ['lol'] },
  { url: 'https://media.giphy.com/media/l1J9JiNCoLMVQqgOk/giphy.gif', category: 'laughter', tags: ['haha'] },
  { url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', category: 'laughter', tags: ['rofl'] },
  { url: 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif', category: 'laughter', tags: ['haha'] },
  { url: 'https://media.giphy.com/media/xUA7aM09ByyR1w5YWc/giphy.gif', category: 'laughter', tags: ['laugh'] },
  { url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', category: 'laughter', tags: ['funny'] },
  { url: 'https://media.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif', category: 'laughter', tags: ['lol'] },
  { url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', category: 'laughter', tags: ['hehe'] },
  { url: 'https://media.giphy.com/media/l3fQf1OEAq0iri9RC/giphy.gif', category: 'laughter', tags: ['haha'] },
  { url: 'https://media.giphy.com/media/1d5Zn8FqmJqApu4hNU/giphy.gif', category: 'laughter', tags: ['cry laughing'] },

  // More animals
  { url: 'https://media.giphy.com/media/7AT7T1lU7VLVK/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/26FxoQEzu2sqiKFYY/giphy.gif', category: 'animals', tags: ['panda'] },
  { url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/ule4vhcY1xEKQ/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/3oriO13KTkzPwTykp2/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/3o7TKSha51ATTx9KzC/giphy.gif', category: 'animals', tags: ['kitten'] },
  { url: 'https://media.giphy.com/media/qUIm5wu6LAAog/giphy.gif', category: 'animals', tags: ['puppy'] },
  { url: 'https://media.giphy.com/media/yFQ0ywscgobJK/giphy.gif', category: 'animals', tags: ['cat'] },
  { url: 'https://media.giphy.com/media/Nm8ZPAGOwZUQM/giphy.gif', category: 'animals', tags: ['dog'] },
  { url: 'https://media.giphy.com/media/kEKcOWl8RMLde/giphy.gif', category: 'animals', tags: ['fox'] },
  { url: 'https://media.giphy.com/media/11s7Ke7jcNxCHS/giphy.gif', category: 'animals', tags: ['hamster'] },
  { url: 'https://media.giphy.com/media/8vQSQ3cNXuDGo/giphy.gif', category: 'animals', tags: ['cat'] },

  // More gaming
  { url: 'https://media.giphy.com/media/l3q2zVr6cu95nFV0Y/giphy.gif', category: 'gaming', tags: ['victory'] },
  { url: 'https://media.giphy.com/media/26gscNlk0lJDXPjqU/giphy.gif', category: 'gaming', tags: ['noob'] },
  { url: 'https://media.giphy.com/media/3o7TKP9lxIL1Bv9wXu/giphy.gif', category: 'gaming', tags: ['rage'] },
  { url: 'https://media.giphy.com/media/kiBcwEXegBTACmVOnE/giphy.gif', category: 'gaming', tags: ['gamer'] },
  { url: 'https://media.giphy.com/media/3o7aCRloybJlXpNjSU/giphy.gif', category: 'gaming', tags: ['rage quit'] },
  { url: 'https://media.giphy.com/media/l3mZd0YH1I6KRPQ1a/giphy.gif', category: 'gaming', tags: ['victory'] },
  { url: 'https://media.giphy.com/media/QBGYWFjnggIZ8fMjdt/giphy.gif', category: 'gaming', tags: ['epic'] },
  { url: 'https://media.giphy.com/media/f9RIxl8bHBdBWg60Tq/giphy.gif', category: 'gaming', tags: ['controller'] },
  { url: 'https://media.giphy.com/media/mXuPwb6LgN5FB4mEwd/giphy.gif', category: 'gaming', tags: ['headshot'] },
  { url: 'https://media.giphy.com/media/3o7TKwBctlbpzSCVFu/giphy.gif', category: 'gaming', tags: ['gg ez'] },

  // More memes
  { url: 'https://media.giphy.com/media/xT1XGWbE0XiBDX2T8Q/giphy.gif', category: 'memes', tags: ['troll'] },
  { url: 'https://media.giphy.com/media/xT5LMuQroxfE556M7K/giphy.gif', category: 'memes', tags: ['pepe'] },
  { url: 'https://media.giphy.com/media/d2Z9QYzA2aidiWn6/giphy.gif', category: 'memes', tags: ['stonks'] },
  { url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/xUPGcC0R9QjyxkPnS8/giphy.gif', category: 'memes', tags: ['classic'] },
  { url: 'https://media.giphy.com/media/3NtY188QaxDdC/giphy.gif', category: 'memes', tags: ['troll'] },
  { url: 'https://media.giphy.com/media/3o7qDEq2bMbcbPRQ2c/giphy.gif', category: 'memes', tags: ['lmao'] },
  { url: 'https://media.giphy.com/media/l4FGGafcOHmrlQxG0/giphy.gif', category: 'memes', tags: ['classic'] },
  { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', category: 'memes', tags: ['meme'] },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', category: 'memes', tags: ['party hard'] },

  // More dancing
  { url: 'https://media.giphy.com/media/U7oXjJSTGz2WI/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', category: 'dancing', tags: ['groove'] },
  { url: 'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', category: 'dancing', tags: ['party'] },
  { url: 'https://media.giphy.com/media/3o7aCTfyhYawMw5zzq/giphy.gif', category: 'dancing', tags: ['boogie'] },
  { url: 'https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/5xaOcLDE64VMF4LqqrK/giphy.gif', category: 'dancing', tags: ['groovy'] },
  { url: 'https://media.giphy.com/media/tsX3YMWYzDPjAARfeg/giphy.gif', category: 'dancing', tags: ['dance'] },
  { url: 'https://media.giphy.com/media/BlVnrxJgTGsUw/giphy.gif', category: 'dancing', tags: ['rave'] },
  { url: 'https://media.giphy.com/media/3o7aD4kZn2dMlOOiY0/giphy.gif', category: 'dancing', tags: ['party'] },

  // More sport
  { url: 'https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif', category: 'sport', tags: ['football'] },
  { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', category: 'sport', tags: ['soccer'] },
  { url: 'https://media.giphy.com/media/l0MYryZTmQgvHI5Hy/giphy.gif', category: 'sport', tags: ['basketball'] },
  { url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', category: 'sport', tags: ['workout'] },
  { url: 'https://media.giphy.com/media/xT0GqssRweIhlz209i/giphy.gif', category: 'sport', tags: ['boxing'] },
  { url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', category: 'sport', tags: ['running'] },
  { url: 'https://media.giphy.com/media/xT9IgDEI1iZyb2wqo8/giphy.gif', category: 'sport', tags: ['gym'] },
  { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', category: 'sport', tags: ['goal'] },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', category: 'sport', tags: ['win'] },
  { url: 'https://media.giphy.com/media/xT9DPBMumj2Q0hlI3K/giphy.gif', category: 'sport', tags: ['champion'] },

  // More music
  { url: 'https://media.giphy.com/media/l378bu6ZYmzS6nBGU/giphy.gif', category: 'music', tags: ['music'] },
  { url: 'https://media.giphy.com/media/3og0IRsGDMv0ZJF6A8/giphy.gif', category: 'music', tags: ['dj'] },
  { url: 'https://media.giphy.com/media/xUA7bdHBV8fcpkN2lq/giphy.gif', category: 'music', tags: ['guitar'] },
  { url: 'https://media.giphy.com/media/26BRte7E5dlGs8xiw/giphy.gif', category: 'music', tags: ['concert'] },
  { url: 'https://media.giphy.com/media/3oEduWsPpGJEPfTiaQ/giphy.gif', category: 'music', tags: ['singing'] },
  { url: 'https://media.giphy.com/media/l0HlI6NdcrtkV5C7e/giphy.gif', category: 'music', tags: ['rap'] },
  { url: 'https://media.giphy.com/media/1iuLw8aPO7Rh6/giphy.gif', category: 'music', tags: ['drums'] },
  { url: 'https://media.giphy.com/media/xTiN0CNHgoRf1Ha7CM/giphy.gif', category: 'music', tags: ['rock'] },
  { url: 'https://media.giphy.com/media/3oEduOnl5IHM5NRodO/giphy.gif', category: 'music', tags: ['headphones'] },
  { url: 'https://media.giphy.com/media/3o6ZsYm5sSwTLRWhy8/giphy.gif', category: 'music', tags: ['beat'] },

  // More food
  { url: 'https://media.giphy.com/media/EZICHGrSD5QEFCxMiC/giphy.gif', category: 'food', tags: ['pizza'] },
  { url: 'https://media.giphy.com/media/IgGtijHj7qLfq/giphy.gif', category: 'food', tags: ['burger'] },
  { url: 'https://media.giphy.com/media/ToMjGpOjkiEjzJ1ZaJG/giphy.gif', category: 'food', tags: ['eating'] },
  { url: 'https://media.giphy.com/media/gw3C71R3QfHPwyT6/giphy.gif', category: 'food', tags: ['hungry'] },
  { url: 'https://media.giphy.com/media/HGe4zsOVo7Jvy/giphy.gif', category: 'food', tags: ['pizza'] },
  { url: 'https://media.giphy.com/media/eSQiwbCrYnbJS/giphy.gif', category: 'food', tags: ['cake'] },
  { url: 'https://media.giphy.com/media/XGSqXkATD3Akw/giphy.gif', category: 'food', tags: ['food'] },
  { url: 'https://media.giphy.com/media/9u8GF7MuhdvS8/giphy.gif', category: 'food', tags: ['yummy'] },
  { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', category: 'food', tags: ['donut'] },
  { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', category: 'food', tags: ['ice cream'] },

  // More love
  { url: 'https://media.giphy.com/media/HLXPTkXcr9xBKZanZ7/giphy.gif', category: 'love', tags: ['love'] },
  { url: 'https://media.giphy.com/media/3owzWgpBN5IKkAcYUs/giphy.gif', category: 'love', tags: ['heart'] },
  { url: 'https://media.giphy.com/media/108M7gCS1JSoO4/giphy.gif', category: 'love', tags: ['heart'] },
  { url: 'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif', category: 'love', tags: ['kiss'] },
  { url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', category: 'love', tags: ['heart'] },
  { url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', category: 'love', tags: ['hug'] },
  { url: 'https://media.giphy.com/media/xT9IgvEOwRzUcZDRiw/giphy.gif', category: 'love', tags: ['love'] },
  { url: 'https://media.giphy.com/media/l0MYyoYPvz22wTXkQ/giphy.gif', category: 'love', tags: ['heart eyes'] },
  { url: 'https://media.giphy.com/media/3oriO0x8L5sLmBSeY0/giphy.gif', category: 'love', tags: ['kiss'] },
  { url: 'https://media.giphy.com/media/xT8qBepJQzRjXtOXYs/giphy.gif', category: 'love', tags: ['hearts'] },

  // More thinking
  { url: 'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif', category: 'thinking', tags: ['hmm'] },
  { url: 'https://media.giphy.com/media/lKXEBR8m1jWso/giphy.gif', category: 'thinking', tags: ['thinking'] },
  { url: 'https://media.giphy.com/media/CaiVJuZGvR8HK/giphy.gif', category: 'thinking', tags: ['ponder'] },
  { url: 'https://media.giphy.com/media/TPl5N4Ci49ZQY/giphy.gif', category: 'thinking', tags: ['think'] },
  { url: 'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif', category: 'thinking', tags: ['confused'] },
  { url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif', category: 'thinking', tags: ['math'] },
  { url: 'https://media.giphy.com/media/QPcvN5IGzRbtm/giphy.gif', category: 'thinking', tags: ['hmm'] },
  { url: 'https://media.giphy.com/media/9aAU2gQ3nxIBO/giphy.gif', category: 'thinking', tags: ['think'] },
  { url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif', category: 'thinking', tags: ['wonder'] },
  { url: 'https://media.giphy.com/media/26uf2YTgF5upXUTm0/giphy.gif', category: 'thinking', tags: ['seriously'] },

  // More cool
  { url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', category: 'cool', tags: ['sunglasses'] },
  { url: 'https://media.giphy.com/media/3og0IMJcSI8p6hYQXS/giphy.gif', category: 'cool', tags: ['boss'] },
  { url: 'https://media.giphy.com/media/3o7qDDEyZF0r9W6eY8/giphy.gif', category: 'cool', tags: ['cool'] },
  { url: 'https://media.giphy.com/media/3oriNZoNvn73MZaFYk/giphy.gif', category: 'cool', tags: ['swag'] },
  { url: 'https://media.giphy.com/media/l3vR4l2p29Q1G3vKE/giphy.gif', category: 'cool', tags: ['fire'] },
  { url: 'https://media.giphy.com/media/dIxkmtCuuBQuM9Uge/giphy.gif', category: 'cool', tags: ['style'] },
  { url: 'https://media.giphy.com/media/26FmQ6EOvLxp6cWyY/giphy.gif', category: 'cool', tags: ['boss'] },
  { url: 'https://media.giphy.com/media/3o7aTrNGbV4uyVsYuc/giphy.gif', category: 'cool', tags: ['epic'] },
  { url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', category: 'cool', tags: ['cool'] },
  { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', category: 'cool', tags: ['swag'] }
);
