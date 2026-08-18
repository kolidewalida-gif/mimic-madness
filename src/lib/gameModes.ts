export type LobbyGameMode = 'normal' | '2v2' | 'quiz' | 'audiophone' | 'pixoguess' | 'monopoly' | 'undercover' | 'memorise' | 'mimic';

export interface GameModeMeta {
  label: string;
  shortLabel: string;
  emojiLabel: string;
  tagline: string;
  description: string;
  minPlayers: number;
  accent: string;
  fallbackColor: string;
  fallbackEmoji: string;
  imageCandidates: string[];
}

export const GAME_MODE_ORDER: LobbyGameMode[] = [
  'normal', 'audiophone', '2v2', 'quiz', 'pixoguess', 'undercover', 'memorise', 'mimic', 'monopoly',
];

/** Modes disponibles dans le thème Ink (Monopoly et Mimic retirés). */
export const INK_GAME_MODE_ORDER: LobbyGameMode[] = GAME_MODE_ORDER.filter(
  (m) => m !== 'monopoly' && m !== 'mimic',
);


export const GAME_MODE_META: Record<LobbyGameMode, GameModeMeta> = {
  normal: {
    label: 'Imitation', shortLabel: 'IMITATION', emojiLabel: '🎮 Imitation',
    tagline: 'Imite le son ou le chanteur',
    description: 'Relève des défis vidéo et reproduis les performances des autres joueurs.',
    minPlayers: 2, accent: '#a06bff', fallbackColor: '#7b45d9', fallbackEmoji: '🎤',
    imageCandidates: ['/lobby/cards/imitation.png', '/lobby/cards/imitation.jpg'],
  },
  audiophone: {
    label: 'Audio Phone', shortLabel: 'AUDIO PHONE', emojiLabel: '📞 Audio Phone',
    tagline: 'Le téléphone arabe audio',
    description: 'Enregistre, écoute et imite une chaîne audio qui déraille à chaque passage.',
    minPlayers: 2, accent: '#ff9640', fallbackColor: '#d9701f', fallbackEmoji: '🔊',
    imageCandidates: ['/lobby/cards/audiophone.png', '/lobby/cards/audiophone.jpg'],
  },
  '2v2': {
    label: '2 vs 2', shortLabel: '2 VS 2', emojiLabel: '⚔️ 2v2',
    tagline: 'Combat en équipes', description: 'Deux équipes s’affrontent dans une série de défis synchronisés.',
    minPlayers: 4, accent: '#5b8cff', fallbackColor: '#3560d9', fallbackEmoji: '⚔️',
    imageCandidates: ['/lobby/cards/2v2.png', '/lobby/cards/2v2.jpg'],
  },
  quiz: {
    label: 'Quiz', shortLabel: 'QUIZ', emojiLabel: '🧠 Quiz',
    tagline: 'Teste tes connaissances', description: 'Réponds aux questions en direct et grimpe au classement.',
    minPlayers: 2, accent: '#ffce3d', fallbackColor: '#d9a41f', fallbackEmoji: '❓',
    imageCandidates: ['/lobby/cards/quiz.png', '/lobby/cards/quiz.jpg'],
  },
  pixoguess: {
    label: 'BlurRush', shortLabel: 'BLURRUSH', emojiLabel: '⚡ BlurRush',
    tagline: 'Devine l’image avant les autres', description: 'Une image se révèle progressivement : sois le premier à la reconnaître.',
    minPlayers: 2, accent: '#40c9ff', fallbackColor: '#2196d9', fallbackEmoji: '🖼️',
    imageCandidates: ['/lobby/cards/blindtest.png', '/lobby/cards/blindtest.jpg'],
  },
  monopoly: {
    label: 'Monopoly', shortLabel: 'MONOPOLY', emojiLabel: '🏠 Monopoly',
    tagline: 'Plateau multijoueur', description: 'Une partie de plateau 3D pensée pour le salon et les soirées.',
    minPlayers: 2, accent: '#3ddc91', fallbackColor: '#1fa86a', fallbackEmoji: '🏠',
    imageCandidates: ['/lobby/cards/monopoly.png', '/lobby/cards/monopoly.jpg'],
  },
  undercover: {
    label: 'Undercover', shortLabel: 'UNDERCOVER', emojiLabel: '🕵️ Undercover',
    tagline: 'Trouve l’infiltré', description: 'Donne des indices sans te trahir et démasque le joueur undercover.',
    minPlayers: 3, accent: '#ff5c8a', fallbackColor: '#d93a68', fallbackEmoji: '🕵️',
    imageCandidates: ['/lobby/cards/undercover.png', '/lobby/cards/undercover.jpg'],
  },
  memorise: {
    label: 'Blindtest Musical', shortLabel: 'BLINDTEST', emojiLabel: '🎵 Blindtest Musical',
    tagline: 'Reconnais chaque titre au plus vite', description: 'Musiques, films, séries, anime et K-pop avec extraits synchronisés.',
    minPlayers: 2, accent: '#2fd8c5', fallbackColor: '#1aa896', fallbackEmoji: '🎵',
    imageCandidates: ['/lobby/cards/blindtest.png', '/lobby/cards/blindtest.jpg', '/lobby/cards/memorise.png'],
  },
  mimic: {
    label: 'Mimic', shortLabel: 'MIMIC', emojiLabel: '🎤 Mimic',
    tagline: 'Karaoké compétitif en direct', description: 'Teste ton micro, chante à ton tour et reproduis rythme, énergie et justesse.',
    minPlayers: 2, accent: '#ff6b5b', fallbackColor: '#d9422f', fallbackEmoji: '🎤',
    imageCandidates: ['/lobby/cards/mimic.png', '/lobby/cards/mimic.jpg'],
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

  if (isAdmin) return { canStart: true, reasons };

  if (mode === '2v2') {
    if (connectedCount < 4) reasons.push('Il faut au moins 4 joueurs connectés.');
    if (connectedCount % 2 !== 0) reasons.push('Il faut un nombre pair de joueurs.');
    if (teamsCount <= 0) reasons.push('Les équipes ne sont pas formées.');
  } else if (connectedCount < GAME_MODE_META[mode].minPlayers) {
    reasons.push(`Il faut au moins ${GAME_MODE_META[mode].minPlayers} joueurs connectés.`);
  }

  return { canStart: reasons.length === 0, reasons };
}