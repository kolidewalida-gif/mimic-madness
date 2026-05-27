/**
 * Quest catalog — defines all daily/weekly quests available in the game.
 *
 * Each quest declares:
 *  - id: stable identifier used in DB
 *  - kind: 'daily' or 'weekly' (different reset cadence)
 *  - title / description: UI text
 *  - icon: lucide icon name string (resolved in components)
 *  - color: accent color for the cartoon card
 *  - target: how many times the action must happen
 *  - xpReward: XP granted when claimed
 *  - bonusReward: optional cosmetic / extra
 *  - event: action name passed to `trackQuestProgress(event)` so we know
 *           which quests should advance when something happens in-game
 */
export type QuestKind = 'daily' | 'weekly';

export type QuestEvent =
  | 'play_undercover'
  | 'play_quiz'
  | 'play_imitation'
  | 'play_blurrush'
  | 'play_audiophone'
  | 'play_monopoly'
  | 'win_round'
  | 'send_chat_message'
  | 'send_gif'
  | 'vote_imitation'
  | 'invite_friend'
  | 'host_lobby'
  | 'submit_imitation'
  | 'login';

export interface QuestDefinition {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  icon: string;
  color: string;
  target: number;
  xpReward: number;
  bonusReward?: { label: string; emoji: string };
  event: QuestEvent;
}

/* ============================================================
   DAILY QUESTS — reset every 24h (UTC)
   Pool of 8, the panel surfaces 3 per day rotating on date.
============================================================ */
export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: 'daily_play_3_undercover',
    kind: 'daily',
    title: '3 Undercover',
    description: 'Joue 3 parties d\'Undercover',
    icon: 'eye',
    color: '#a855f7',
    target: 3,
    xpReward: 80,
    event: 'play_undercover',
  },
  {
    id: 'daily_vote_10_imitations',
    kind: 'daily',
    title: 'Vote x10',
    description: 'Vote pour 10 imitations',
    icon: 'thumbs-up',
    color: '#06b6d4',
    target: 10,
    xpReward: 60,
    event: 'vote_imitation',
  },
  {
    id: 'daily_send_5_messages',
    kind: 'daily',
    title: 'Bavardage',
    description: 'Envoie 5 messages dans le chat',
    icon: 'message-circle',
    color: '#f472b6',
    target: 5,
    xpReward: 40,
    event: 'send_chat_message',
  },
  {
    id: 'daily_send_2_gifs',
    kind: 'daily',
    title: 'GIF Master',
    description: 'Envoie 2 GIFs',
    icon: 'image',
    color: '#fbbf24',
    target: 2,
    xpReward: 35,
    event: 'send_gif',
  },
  {
    id: 'daily_play_1_quiz',
    kind: 'daily',
    title: 'Cervelle en marche',
    description: 'Joue une partie de Quiz',
    icon: 'brain',
    color: '#34d399',
    target: 1,
    xpReward: 50,
    event: 'play_quiz',
  },
  {
    id: 'daily_submit_imitation',
    kind: 'daily',
    title: 'Imitateur',
    description: 'Soumets une imitation',
    icon: 'mic',
    color: '#ef4444',
    target: 1,
    xpReward: 60,
    event: 'submit_imitation',
  },
  {
    id: 'daily_play_blurrush',
    kind: 'daily',
    title: 'BlurRush',
    description: 'Joue une partie de BlurRush',
    icon: 'zap',
    color: '#60a5fa',
    target: 1,
    xpReward: 50,
    event: 'play_blurrush',
  },
  {
    id: 'daily_invite_friend',
    kind: 'daily',
    title: 'Invitation',
    description: 'Invite un ami à jouer',
    icon: 'user-plus',
    color: '#fb923c',
    target: 1,
    xpReward: 70,
    event: 'invite_friend',
  },
];

/* ============================================================
   WEEKLY QUESTS — reset every Monday (ISO week)
   Pool of 4, all 4 are active every week (no rotation).
============================================================ */
export const WEEKLY_QUESTS: QuestDefinition[] = [
  {
    id: 'weekly_play_15_games',
    kind: 'weekly',
    title: 'Marathon',
    description: 'Joue 15 parties (tous modes)',
    icon: 'flame',
    color: '#ef4444',
    target: 15,
    xpReward: 400,
    bonusReward: { label: '+1 jour de streak', emoji: '🔥' },
    event: 'play_imitation',
  },
  {
    id: 'weekly_win_5_rounds',
    kind: 'weekly',
    title: 'Vainqueur',
    description: 'Gagne 5 manches',
    icon: 'trophy',
    color: '#fbbf24',
    target: 5,
    xpReward: 350,
    event: 'win_round',
  },
  {
    id: 'weekly_host_3_lobbies',
    kind: 'weekly',
    title: 'Hôte de la semaine',
    description: 'Crée 3 lobbies en tant qu\'hôte',
    icon: 'crown',
    color: '#a855f7',
    target: 3,
    xpReward: 300,
    event: 'host_lobby',
  },
  {
    id: 'weekly_send_50_messages',
    kind: 'weekly',
    title: 'Animateur',
    description: 'Envoie 50 messages dans le chat',
    icon: 'message-square',
    color: '#06b6d4',
    target: 50,
    xpReward: 250,
    event: 'send_chat_message',
  },
];

/* ============================================================
   PERIOD KEYS
============================================================ */
/** Returns yyyy-mm-dd for a given Date (UTC). */
export const dailyPeriodKey = (date: Date = new Date()): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Returns yyyy-W## (ISO week) for a given Date. */
export const weeklyPeriodKey = (date: Date = new Date()): string => {
  // Algorithme ISO 8601: shift to nearest Thursday in the same week
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const weekNr = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNr).padStart(2, '0')}`;
};

/**
 * Pick today's 3 daily quests deterministically from the pool, so all
 * players see the same daily slate. Rotation is keyed on the date.
 */
export const getActiveDailyQuests = (date: Date = new Date()): QuestDefinition[] => {
  const seed = Number(dailyPeriodKey(date).replace(/-/g, ''));
  const pool = [...DAILY_QUESTS];
  // Deterministic shuffle based on seed
  for (let i = pool.length - 1; i > 0; i--) {
    const r = (seed * (i + 1)) % (i + 1);
    [pool[i], pool[r]] = [pool[r], pool[i]];
  }
  return pool.slice(0, 3);
};

export const getActiveWeeklyQuests = (): QuestDefinition[] => WEEKLY_QUESTS;

/**
 * Find every active quest (daily + weekly) that listens to a given event.
 * Used by `trackQuestProgress` to know which rows to bump.
 */
export const findQuestsForEvent = (event: QuestEvent): QuestDefinition[] => {
  const today = getActiveDailyQuests();
  const weekly = getActiveWeeklyQuests();
  return [...today, ...weekly].filter((q) => q.event === event);
};
