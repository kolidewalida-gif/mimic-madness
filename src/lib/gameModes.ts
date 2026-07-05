export type LobbyGameMode = 'normal' | '2v2' | 'quiz' | 'audiophone' | 'pixoguess' | 'monopoly' | 'undercover' | 'memorise' | 'mimic';

export const GAME_MODE_META: Record<
  LobbyGameMode,
  {
    label: string;
    emojiLabel: string;
    minPlayers: number;
  }
> = {
  normal: {
    label: 'Normal',
    emojiLabel: '🎮 Normal',
    minPlayers: 2,
  },
  '2v2': {
    label: '2v2',
    emojiLabel: '⚔️ 2v2',
    minPlayers: 4,
  },
  quiz: {
    label: 'Quiz',
    emojiLabel: '🧠 Quiz',
    minPlayers: 2,
  },
  audiophone: {
    label: 'Audio Phone',
    emojiLabel: '📞 Audio Phone',
    minPlayers: 2,
  },
  pixoguess: {
    label: 'BlurRush',
    emojiLabel: '⚡ BlurRush',
    minPlayers: 2,
  },
  monopoly: {
    label: 'Monopoly',
    emojiLabel: '🏠 Monopoly',
    minPlayers: 2,
  },
  undercover: {
    label: 'Undercover',
    emojiLabel: '🕵️ Undercover',
    minPlayers: 3,
  },
  memorise: {
    label: 'Blindtest Musical',
    emojiLabel: '🎵 Blindtest Musical',
    minPlayers: 2,
  },
  mimic: {
    label: 'Mimic',
    emojiLabel: '🎤 Mimic',
    minPlayers: 2,
  },
};

export function getModeLabel(mode: LobbyGameMode): string {
  return GAME_MODE_META[mode].label;
}

export function getModeEmojiLabel(mode: LobbyGameMode): string {
  return GAME_MODE_META[mode].emojiLabel;
}

export function getStartStatus(params: {
  mode: LobbyGameMode;
  connectedCount: number;
  teamsCount?: number;
  isAdmin?: boolean;
}): { canStart: boolean; reasons: string[] } {
  const { mode, connectedCount, teamsCount = 0, isAdmin = false } = params;
  const reasons: string[] = [];

  // Admins can play solo — skip all player count checks
  if (isAdmin) {
    return { canStart: true, reasons: [] };
  }

  if (mode === '2v2') {
    if (connectedCount < 4) reasons.push('Il faut au moins 4 joueurs connectés.');
    if (connectedCount % 2 !== 0) reasons.push('Il faut un nombre pair de joueurs.');
    if (teamsCount <= 0) reasons.push('Les équipes ne sont pas formées.');
  } else {
    if (connectedCount < 2) reasons.push('Il faut au moins 2 joueurs connectés.');
  }

  return { canStart: reasons.length === 0, reasons };
}
