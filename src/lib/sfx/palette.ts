/**
 * Palettes sonores par mode de jeu.
 *
 * Le problème : les 49 échantillons du projet sont générés depuis un seul style
 * — « cartoon party game, warm rounded and bouncy ». Tous les modes sonnent donc
 * pareil, alors qu'un jeu d'espionnage feutré et un plateau télé n'ont rien à
 * voir. Et la banque part d'un parti pris enfantin qui ne convient plus.
 *
 * La contrainte : on ne peut pas générer de nouveaux fichiers pour l'instant.
 * Refaire la banque coûterait des crédits qui ne reviennent qu'au prochain
 * cycle de facturation.
 *
 * L'approche : mettre en forme les échantillons existants au moment de la
 * lecture. C'est une technique de conception sonore ordinaire — un même
 * échantillon retraité selon le contexte — et elle donne trois leviers :
 *
 *   1. `rate`   — la hauteur. Un clic transposé plus grave devient mat et
 *                 sérieux, plus aigu il devient vif et précis.
 *   2. `filter` — le timbre. Un passe-bas bas assourdit, un passe-bande étroit
 *                 imite un haut-parleur de téléphone.
 *   3. `trim`   — le niveau. Un mode discret doit rester en retrait.
 *
 * Plus un quatrième levier, gratuit : **choisir un autre échantillon existant**
 * pour un même nom logique. En quiz, `success` a tout intérêt à jouer le son de
 * bonne réponse déjà présent plutôt que le ding générique.
 *
 * Ce module ne touche pas à Web Audio : il ne calcule que des paramètres, pour
 * rester testable sans navigateur.
 */

/** Modes de jeu, alignés sur `GameMode` de `src/pages/Index.tsx`. */
export type SfxMode =
  | 'normal'
  | '2v2'
  | 'quiz'
  | 'audiophone'
  | 'pixoguess'
  | 'monopoly'
  | 'undercover'
  | 'memorise'
  | 'mimic';

export interface SfxFilter {
  type: BiquadFilterType;
  /** Fréquence de coupure ou centrale, en hertz. */
  frequency: number;
  q: number;
}

export interface SfxPalette {
  /** Facteur de vitesse de lecture. 1 = hauteur d'origine. */
  rate: number;
  /** Mise en forme du timbre. `null` laisse l'échantillon intact. */
  filter: SfxFilter | null;
  /** Correction de niveau propre au mode. */
  trim: number;
  /** Ce que la palette cherche à évoquer. Sert la relecture, pas le code. */
  intent: string;
}

/**
 * Palette hors partie : menus, lobby, social.
 *
 * Volontairement neutre et un peu adoucie. C'est ce qu'on entend le plus
 * souvent, donc c'est là qu'une dureté fatigue le plus vite.
 */
export const NEUTRAL_PALETTE: SfxPalette = {
  rate: 1,
  filter: { type: 'lowpass', frequency: 7000, q: 0.5 },
  trim: 1,
  intent: 'Neutre et chaud, pour les écrans hors partie.',
};

const PALETTES: Record<SfxMode, SfxPalette> = {
  /*
   * Imitation — le mode central. Chaleureux et vocal, sans excès : il sert de
   * référence, les autres s'en écartent dans une direction lisible.
   */
  normal: {
    rate: 1,
    filter: { type: 'lowpass', frequency: 6800, q: 0.5 },
    trim: 1,
    intent: 'Chaleureux et vocal, la référence du jeu.',
  },
  // Même identité que l'imitation solo, à peine plus affirmée pour l'affrontement.
  '2v2': {
    rate: 1.02,
    filter: { type: 'lowpass', frequency: 7200, q: 0.5 },
    trim: 1,
    intent: 'Comme l\'imitation, un cran plus mordant pour le duel.',
  },
  /*
   * Quiz — plateau de télévision : vif, brillant, articulé. La transposition
   * vers l'aigu raccourcit l'attaque perçue, ce qui rend les validations plus
   * nettes.
   */
  quiz: {
    rate: 1.07,
    filter: { type: 'lowpass', frequency: 8600, q: 0.5 },
    trim: 0.97,
    intent: 'Plateau télé : vif, brillant, articulé.',
  },
  /*
   * Téléphone arabe audio — le mode joue sur la dégradation du son. Un
   * passe-bande étroit autour de 1,7 kHz est exactement la bande d'un
   * haut-parleur de téléphone : l'interface commente le jeu.
   */
  audiophone: {
    rate: 0.98,
    filter: { type: 'bandpass', frequency: 1700, q: 0.9 },
    trim: 1.05,
    intent: 'Bande téléphonique étroite, en écho au principe du mode.',
  },
  /*
   * Devinette d'image — registre photographique : précis et net, comme un
   * déclencheur.
   */
  pixoguess: {
    rate: 1.1,
    filter: { type: 'lowpass', frequency: 9500, q: 0.5 },
    trim: 0.95,
    intent: 'Photographique : précis, net, déclencheur.',
  },
  /*
   * Monopoly — plateau en bois. Grave et mat, on doit entendre le pion et le
   * carton plutôt que le néon.
   */
  monopoly: {
    rate: 0.92,
    filter: { type: 'lowpass', frequency: 4600, q: 0.6 },
    trim: 1,
    intent: 'Bois et carton : grave, mat, posé.',
  },
  /*
   * Undercover — jeu de bluff. Feutré et en retrait : un son fort trahirait le
   * ton du mode, où l'on chuchote.
   */
  undercover: {
    rate: 0.9,
    filter: { type: 'lowpass', frequency: 3600, q: 0.7 },
    trim: 0.82,
    intent: 'Feutré et discret, on chuchote.',
  },
  /*
   * Blind test — registre musical. Un peu plus haut et ouvert pour laisser
   * passer les harmoniques, sans mordre sur la musique jouée par-dessus.
   */
  memorise: {
    rate: 1.03,
    filter: { type: 'lowpass', frequency: 9000, q: 0.4 },
    trim: 0.9,
    intent: 'Musical et ouvert, sans masquer la piste jouée.',
  },
  /*
   * Mimic — chant et voix. Médiums en avant, là où vit la voix humaine.
   */
  mimic: {
    rate: 1,
    filter: { type: 'lowpass', frequency: 7400, q: 0.5 },
    trim: 1,
    intent: 'Médiums en avant, registre de la voix.',
  },
};

/**
 * Choix d'un autre échantillon **déjà existant** pour un nom logique donné.
 *
 * Aucune entrée ne peut désigner un fichier absent : la cible est toujours un
 * identifiant du manifeste, et un test le vérifie. C'est le levier le moins
 * coûteux pour donner du caractère, puisqu'il ne demande aucun nouvel asset.
 */
const REMAPS: Partial<Record<SfxMode, Record<string, string>>> = {
  quiz: {
    // Le mode a ses propres sons de bonne et mauvaise réponse : les génériques
    // n'ont aucune raison de leur passer devant.
    success: 'quiz-correct',
    error: 'quiz-wrong',
    countdown: 'quiz-rush',
  },
  undercover: {
    // Une salve d'applaudissements briserait le ton du mode.
    celebration: 'ui-reveal',
    success: 'ui-reveal',
    start: 'ui-suspense',
  },
  audiophone: {
    // La révélation est le cœur du mode, pas une simple validation.
    success: 'ui-reveal',
  },
  memorise: {
    // Timbre cristallin, cohérent avec un mode musical.
    success: 'ui-gem',
  },
  monopoly: {
    // L'argent est la monnaie du mode, au sens propre.
    success: 'ui-coin',
  },
};

/** Tous les modes déclarés. Utile aux tests et aux réglages. */
export const sfxModes = (): SfxMode[] => Object.keys(PALETTES) as SfxMode[];

/** Toutes les cibles de remappage déclarées, pour vérifier qu'elles existent. */
export const remapTargets = (): string[] => {
  const targets = new Set<string>();
  for (const table of Object.values(REMAPS)) {
    for (const target of Object.values(table ?? {})) targets.add(target);
  }
  return [...targets];
};

/*
 * Mode courant, en variable de module.
 *
 * `playSample` est une fonction libre appelée depuis une centaine d'endroits,
 * dont beaucoup hors React. Un contexte React ne lui serait pas accessible. Le
 * projet a déjà ce précédent : `playSoundEffect` lit le thème sur
 * `document.body`. Une variable exportée reste plus simple et testable.
 */
let activeMode: SfxMode | null = null;

/** Déclare le mode en cours. `null` revient à la palette neutre. */
export const setActiveSfxMode = (mode: SfxMode | null): void => {
  activeMode = mode;
};

export const getActiveSfxMode = (): SfxMode | null => activeMode;

/** Palette du mode courant, ou la neutre hors partie. */
export const activePalette = (): SfxPalette =>
  activeMode ? PALETTES[activeMode] : NEUTRAL_PALETTE;

/** Palette d'un mode donné. */
export const paletteFor = (mode: SfxMode | null): SfxPalette =>
  mode ? PALETTES[mode] : NEUTRAL_PALETTE;

/**
 * Nom d'échantillon à jouer pour ce nom logique, dans le mode courant.
 *
 * Renvoie le nom d'origine quand le mode n'a pas d'avis, ce qui laisse la
 * résolution d'alias habituelle opérer.
 */
export const resolveSampleName = (name: string, mode = activeMode): string =>
  (mode ? REMAPS[mode]?.[name] : undefined) ?? name;

/** Remise à zéro entre deux tests. */
export const resetSfxModeForTests = (): void => {
  activeMode = null;
};
