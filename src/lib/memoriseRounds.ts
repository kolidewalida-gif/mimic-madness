/**
 * "Memorise" game logic. A round shows a grid board of emojis to memorize,
 * then asks a question about it (what was at a position / how many of X).
 *
 * Everything is derived deterministically from a numeric seed so every client
 * generates the exact same board + question from a single broadcast value.
 */

export const MEMORISE_EMOJIS = [
  '🍎', '🚗', '🐶', '⭐', '⚽', '🎸', '🍕', '🐱', '🌺', '🎩',
  '💎', '🎈', '🦄', '🍔', '🐸', '🌈', '🔥', '🍩', '👑', '🚀',
];

export const GRID = 3; // 3x3
export const POSITIONS_FR = [
  'en haut à gauche', 'en haut au centre', 'en haut à droite',
  'au milieu à gauche', 'au centre', 'au milieu à droite',
  'en bas à gauche', 'en bas au centre', 'en bas à droite',
];

export const MEMORISE_ROUNDS = 5;
export const MEMORISE_MEMO_MS = 15000;
export const MEMORISE_ANSWER_MS = 12000;
export const MEMORISE_REVEAL_MS = 4500;

export interface MemoriseQuestion {
  text: string;
  options: string[];
  answerIndex: number;
}
export interface MemoriseRound {
  board: string[];
  question: MemoriseQuestion;
}

function rngFactory(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeBoard(rnd: () => number): string[] {
  const n = GRID * GRID;
  const palette = shuffle(MEMORISE_EMOJIS, rnd).slice(0, 6); // repeats make count questions fun
  const board: string[] = [];
  for (let i = 0; i < n; i++) board.push(pick(palette, rnd));
  return board;
}

function makeQuestion(board: string[], rnd: () => number): MemoriseQuestion {
  if (rnd() < 0.5) {
    // position question
    const idx = Math.floor(rnd() * board.length);
    const correct = board[idx];
    const others = shuffle(MEMORISE_EMOJIS.filter((e) => e !== correct), rnd).slice(0, 3);
    const options = shuffle([correct, ...others], rnd);
    return { text: `Quel symbole était ${POSITIONS_FR[idx]} ?`, options, answerIndex: options.indexOf(correct) };
  }
  // count question
  const present = Array.from(new Set(board));
  const target = pick(present, rnd);
  const count = board.filter((e) => e === target).length;
  const opts = new Set<number>([count]);
  while (opts.size < 4) {
    const c = Math.max(0, count + Math.floor(rnd() * 5) - 2);
    opts.add(c);
  }
  const options = shuffle(Array.from(opts), rnd).map(String);
  return { text: `Combien de fois apparaissait ${target} ?`, options, answerIndex: options.indexOf(String(count)) };
}

export function makeRound(seed: number): MemoriseRound {
  const rnd = rngFactory(seed);
  const board = makeBoard(rnd);
  const question = makeQuestion(board, rnd);
  return { board, question };
}

/** Points for a correct answer, rewarding speed (≈100 slow → 1100 instant). */
export function scoreFor(correct: boolean, elapsedMs: number): number {
  if (!correct) return 0;
  const frac = Math.max(0, Math.min(1, elapsedMs / MEMORISE_ANSWER_MS));
  return Math.round(1000 * (1 - frac)) + 100;
}
