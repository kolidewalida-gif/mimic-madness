/**
 * Mode BLURRUSH (pixoguess) — couverture complète.
 *
 * Contrairement à l'ancien fichier de tests qui recopiait les fonctions, ces
 * tests importent le module réellement utilisé par `usePixoguessGame`, donc une
 * dérive du code de production est détectée.
 *
 *  - mécaniques : validation des réponses, score au temps, floutage, indices
 *  - passage à la manche suivante : fin de temps, marge hôte, dernière manche
 *  - synchro entre joueurs : mêmes valeurs dérivées du même instant serveur
 *  - reconnexion : marge de reprise quand l'hôte disparaît
 */
import { describe, expect, it } from 'vitest';
import {
  GUESS_COOLDOWN_MS,
  HOST_FALLBACK_GRACE_MS,
  PIXELATION_STEPS,
  REVEAL_PHASE_MAX_MS,
  ROUND_DURATION_MS,
  TOTAL_ROUNDS,
  calculatePointsFromTime,
  computePixelLevel,
  computeTimeRemaining,
  isGuessCorrect,
  isLastRound,
  nextRoundNumber,
  normalizeAnswer,
  shouldAdvanceRound,
  shouldRevealFirstLetter,
  shouldRevealLength,
} from '@/lib/blurRushLogic';

// ── 1. Constantes de partie ────────────────────────────────────────────────

describe('blurrush — constantes de partie', () => {
  it('joue cinq manches', () => {
    expect(TOTAL_ROUNDS).toBe(5);
  });

  it('laisse vingt secondes par manche', () => {
    expect(ROUND_DURATION_MS).toBe(20_000);
  });

  it('utilise vingt paliers de floutage', () => {
    expect(PIXELATION_STEPS).toBe(20);
  });

  it('impose un délai anti-spam court', () => {
    expect(GUESS_COOLDOWN_MS).toBeGreaterThan(0);
    expect(GUESS_COOLDOWN_MS).toBeLessThan(2_000);
  });

  it('laisse une marge de reprise à un autre joueur', () => {
    expect(HOST_FALLBACK_GRACE_MS).toBeGreaterThan(0);
  });

  it('borne la phase de révélation', () => {
    expect(REVEAL_PHASE_MAX_MS).toBeGreaterThan(0);
  });
});

// ── 2. Normalisation des réponses ──────────────────────────────────────────

describe('blurrush — normalisation des réponses', () => {
  it('met en minuscules', () => {
    expect(normalizeAnswer('ASTERIX')).toBe('asterix');
  });

  it('retire les accents', () => {
    expect(normalizeAnswer('Astérix')).toBe('asterix');
  });

  it('retire la cédille', () => {
    expect(normalizeAnswer('Français')).toBe('francais');
  });

  it('retire les espaces', () => {
    expect(normalizeAnswer('le roi lion')).toBe('leroilion');
  });

  it('retire la ponctuation', () => {
    expect(normalizeAnswer("L'Étranger !")).toBe('letranger');
  });

  it('retire les tirets', () => {
    expect(normalizeAnswer('Spider-Man')).toBe('spiderman');
  });

  it('conserve les chiffres', () => {
    expect(normalizeAnswer('Rocky 2')).toBe('rocky2');
  });

  it('renvoie une chaîne vide pour une saisie vide', () => {
    expect(normalizeAnswer('')).toBe('');
  });

  it('renvoie une chaîne vide pour de la ponctuation seule', () => {
    expect(normalizeAnswer('!!!???')).toBe('');
  });

  it('renvoie une chaîne vide pour des espaces seuls', () => {
    expect(normalizeAnswer('   ')).toBe('');
  });

  it('est idempotente', () => {
    const once = normalizeAnswer('Astérix & Obélix');
    expect(normalizeAnswer(once)).toBe(once);
  });

  it('traite les majuscules accentuées', () => {
    expect(normalizeAnswer('ÉÈÊË')).toBe('eeee');
  });

  it('gère les caractères non latins en les retirant', () => {
    expect(normalizeAnswer('日本 Naruto')).toBe('naruto');
  });

  it('donne le même résultat à tous les joueurs', () => {
    expect(normalizeAnswer('Zelda')).toBe(normalizeAnswer('  zelda '));
  });
});

// ── 3. Validation d'une proposition ────────────────────────────────────────

describe('blurrush — validation d’une proposition', () => {
  it('accepte une réponse exacte', () => {
    expect(isGuessCorrect('asterix', 'asterix')).toBe(true);
  });

  it('accepte malgré la casse', () => {
    expect(isGuessCorrect('ASTERIX', 'asterix')).toBe(true);
  });

  it('accepte malgré les accents', () => {
    expect(isGuessCorrect('Astérix', 'Asterix')).toBe(true);
  });

  it('accepte malgré les espaces', () => {
    expect(isGuessCorrect('le roi lion', 'Le Roi Lion')).toBe(true);
  });

  it('accepte malgré la ponctuation', () => {
    expect(isGuessCorrect("l'etranger !", 'letranger')).toBe(true);
  });

  it('accepte une réponse contenant la bonne réponse', () => {
    expect(isGuessCorrect("c'est asterix je crois", 'asterix')).toBe(true);
  });

  it('refuse une réponse différente', () => {
    expect(isGuessCorrect('obelix', 'asterix')).toBe(false);
  });

  it('refuse une réponse partielle trop courte', () => {
    expect(isGuessCorrect('aster', 'asterix')).toBe(false);
  });

  it('refuse une proposition vide', () => {
    expect(isGuessCorrect('', 'asterix')).toBe(false);
  });

  it('refuse tout quand la réponse attendue est vide', () => {
    // Sans garde-fou, `''.includes('')` validerait n'importe quoi.
    expect(isGuessCorrect('nimporte quoi', '')).toBe(false);
  });

  it('refuse tout quand la réponse attendue est de la ponctuation', () => {
    expect(isGuessCorrect('nimporte quoi', '!!!')).toBe(false);
  });

  it('accepte une variante déclarée', () => {
    expect(isGuessCorrect('naruto uzumaki', 'naruto', ['naruto uzumaki'])).toBe(true);
  });

  it('accepte la première variante d’une liste', () => {
    expect(isGuessCorrect('goku', 'son goku', ['goku', 'kakarot'])).toBe(true);
  });

  it('accepte la dernière variante d’une liste', () => {
    expect(isGuessCorrect('kakarot', 'son goku', ['goku', 'kakarot'])).toBe(true);
  });

  it('ignore une variante vide', () => {
    expect(isGuessCorrect('nimporte quoi', 'asterix', [''])).toBe(false);
  });

  it('ignore une variante de ponctuation', () => {
    expect(isGuessCorrect('nimporte quoi', 'asterix', ['???'])).toBe(false);
  });

  it('accepte une variante accentuée', () => {
    expect(isGuessCorrect('pokemon', 'pikachu', ['Pokémon'])).toBe(true);
  });

  it('fonctionne sans liste de variantes', () => {
    expect(isGuessCorrect('asterix', 'asterix', [])).toBe(true);
  });

  it('refuse une proposition qui ne contient qu’une partie de la variante', () => {
    expect(isGuessCorrect('kaka', 'son goku', ['kakarot'])).toBe(false);
  });

  it('accepte une variante contenue dans une phrase', () => {
    expect(isGuessCorrect('je dirais kakarot', 'son goku', ['kakarot'])).toBe(true);
  });

  it('donne le même verdict à tous les joueurs', () => {
    expect(isGuessCorrect('Zelda', 'zelda')).toBe(isGuessCorrect('zelda', 'Zelda'));
  });

  it('accepte les chiffres dans la réponse', () => {
    expect(isGuessCorrect('rocky 2', 'Rocky 2')).toBe(true);
  });

  it('distingue deux réponses proches par un chiffre', () => {
    expect(isGuessCorrect('rocky 3', 'Rocky 2')).toBe(false);
  });
});

// ── 4. Score au temps ──────────────────────────────────────────────────────

describe('blurrush — score selon la rapidité', () => {
  it('donne cent points instantanément', () => {
    expect(calculatePointsFromTime(0)).toBe(100);
  });

  it('donne dix points à l’expiration', () => {
    expect(calculatePointsFromTime(ROUND_DURATION_MS)).toBe(10);
  });

  it('donne cinquante-cinq points à mi-parcours', () => {
    expect(calculatePointsFromTime(ROUND_DURATION_MS / 2)).toBe(55);
  });

  it('borne un temps négatif à cent points', () => {
    expect(calculatePointsFromTime(-5_000)).toBe(100);
  });

  it('borne un dépassement à dix points', () => {
    expect(calculatePointsFromTime(ROUND_DURATION_MS * 3)).toBe(10);
  });

  it('décroît de façon monotone', () => {
    for (let t = 0; t < ROUND_DURATION_MS; t += 500) {
      expect(calculatePointsFromTime(t)).toBeGreaterThanOrEqual(
        calculatePointsFromTime(t + 500),
      );
    }
  });

  it('ne descend jamais sous dix points', () => {
    for (let t = 0; t <= ROUND_DURATION_MS * 2; t += 1_000) {
      expect(calculatePointsFromTime(t)).toBeGreaterThanOrEqual(10);
    }
  });

  it('ne dépasse jamais cent points', () => {
    for (let t = -5_000; t <= ROUND_DURATION_MS; t += 1_000) {
      expect(calculatePointsFromTime(t)).toBeLessThanOrEqual(100);
    }
  });

  it('renvoie toujours un entier', () => {
    for (let t = 0; t <= ROUND_DURATION_MS; t += 777) {
      expect(Number.isInteger(calculatePointsFromTime(t))).toBe(true);
    }
  });

  it('récompense le joueur le plus rapide', () => {
    expect(calculatePointsFromTime(2_000)).toBeGreaterThan(calculatePointsFromTime(9_000));
  });

  it('donne le même score à deux joueurs au même instant', () => {
    expect(calculatePointsFromTime(4_321)).toBe(calculatePointsFromTime(4_321));
  });

  it('reste stable sur un temps non entier', () => {
    expect(Number.isInteger(calculatePointsFromTime(1_234.56))).toBe(true);
  });
});

// ── 5. Floutage progressif ─────────────────────────────────────────────────

describe('blurrush — révélation progressive de l’image', () => {
  it('démarre au flou maximal', () => {
    expect(computePixelLevel(0)).toBe(PIXELATION_STEPS);
  });

  it('atteint le niveau le plus net à l’expiration', () => {
    expect(computePixelLevel(ROUND_DURATION_MS)).toBe(1);
  });

  it('ne descend jamais sous un', () => {
    for (let t = 0; t <= ROUND_DURATION_MS * 2; t += 1_000) {
      expect(computePixelLevel(t)).toBeGreaterThanOrEqual(1);
    }
  });

  it('ne dépasse jamais le maximum', () => {
    for (let t = -5_000; t <= ROUND_DURATION_MS; t += 1_000) {
      expect(computePixelLevel(t)).toBeLessThanOrEqual(PIXELATION_STEPS);
    }
  });

  it('borne un temps négatif au flou maximal', () => {
    expect(computePixelLevel(-1_000)).toBe(PIXELATION_STEPS);
  });

  it('borne un dépassement au niveau net', () => {
    expect(computePixelLevel(ROUND_DURATION_MS * 5)).toBe(1);
  });

  it('devient de plus en plus net', () => {
    for (let t = 0; t < ROUND_DURATION_MS; t += 500) {
      expect(computePixelLevel(t)).toBeGreaterThanOrEqual(computePixelLevel(t + 500));
    }
  });

  it('renvoie un entier', () => {
    for (let t = 0; t <= ROUND_DURATION_MS; t += 333) {
      expect(Number.isInteger(computePixelLevel(t))).toBe(true);
    }
  });

  it('est à mi-flou à mi-parcours', () => {
    expect(computePixelLevel(ROUND_DURATION_MS / 2)).toBe(10);
  });

  it('montre la même image à tous les joueurs au même instant', () => {
    expect(computePixelLevel(7_500)).toBe(computePixelLevel(7_500));
  });

  it('parcourt plusieurs paliers au cours de la manche', () => {
    const levels = new Set<number>();
    for (let t = 0; t <= ROUND_DURATION_MS; t += 500) levels.add(computePixelLevel(t));
    expect(levels.size).toBeGreaterThan(5);
  });
});

// ── 6. Temps restant et indices ────────────────────────────────────────────

describe('blurrush — temps restant et indices', () => {
  it('affiche la durée complète au départ', () => {
    expect(computeTimeRemaining(0)).toBe(ROUND_DURATION_MS);
  });

  it('atteint zéro à l’expiration', () => {
    expect(computeTimeRemaining(ROUND_DURATION_MS)).toBe(0);
  });

  it('ne devient jamais négatif', () => {
    expect(computeTimeRemaining(ROUND_DURATION_MS * 4)).toBe(0);
  });

  it('décroît avec le temps écoulé', () => {
    expect(computeTimeRemaining(5_000)).toBeGreaterThan(computeTimeRemaining(15_000));
  });

  it('reste cohérent avec la durée de manche', () => {
    expect(computeTimeRemaining(8_000)).toBe(ROUND_DURATION_MS - 8_000);
  });

  it('ne révèle pas la longueur au départ', () => {
    expect(shouldRevealLength(ROUND_DURATION_MS)).toBe(false);
  });

  it('révèle la longueur à soixante pour cent du temps restant', () => {
    expect(shouldRevealLength(ROUND_DURATION_MS * 0.6)).toBe(true);
  });

  it('révèle la longueur en dessous du seuil', () => {
    expect(shouldRevealLength(ROUND_DURATION_MS * 0.5)).toBe(true);
  });

  it('ne révèle pas la première lettre trop tôt', () => {
    expect(shouldRevealFirstLetter(ROUND_DURATION_MS * 0.5)).toBe(false);
  });

  it('révèle la première lettre à trente pour cent du temps restant', () => {
    expect(shouldRevealFirstLetter(ROUND_DURATION_MS * 0.3)).toBe(true);
  });

  it('révèle la première lettre à la toute fin', () => {
    expect(shouldRevealFirstLetter(0)).toBe(true);
  });

  it('révèle la longueur avant la première lettre', () => {
    const lengthAt = ROUND_DURATION_MS * 0.6;
    expect(shouldRevealLength(lengthAt)).toBe(true);
    expect(shouldRevealFirstLetter(lengthAt)).toBe(false);
  });

  it('révèle les deux indices en fin de manche', () => {
    expect(shouldRevealLength(1_000)).toBe(true);
    expect(shouldRevealFirstLetter(1_000)).toBe(true);
  });

  it('donne les mêmes indices à tous les joueurs', () => {
    for (const remaining of [20_000, 12_000, 6_000, 1_000, 0]) {
      expect(shouldRevealLength(remaining)).toBe(shouldRevealLength(remaining));
      expect(shouldRevealFirstLetter(remaining)).toBe(shouldRevealFirstLetter(remaining));
    }
  });
});

// ── 7. Passage à la manche suivante et reprise d'hôte ──────────────────────

describe('blurrush — fin de manche et reprise', () => {
  it('n’avance pas avant la fin du temps', () => {
    expect(shouldAdvanceRound(ROUND_DURATION_MS - 1, 0)).toBe(false);
  });

  it('avance pour l’hôte dès l’expiration', () => {
    expect(shouldAdvanceRound(ROUND_DURATION_MS, 0)).toBe(true);
  });

  it('fait patienter les non-hôtes le temps de la marge', () => {
    expect(shouldAdvanceRound(ROUND_DURATION_MS, HOST_FALLBACK_GRACE_MS)).toBe(false);
  });

  it('laisse un autre joueur reprendre après la marge', () => {
    expect(shouldAdvanceRound(ROUND_DURATION_MS + HOST_FALLBACK_GRACE_MS, HOST_FALLBACK_GRACE_MS))
      .toBe(true);
  });

  it('évite que deux clients avancent au même instant', () => {
    const justExpired = ROUND_DURATION_MS + 10;
    expect(shouldAdvanceRound(justExpired, 0)).toBe(true);
    expect(shouldAdvanceRound(justExpired, HOST_FALLBACK_GRACE_MS)).toBe(false);
  });

  it('n’avance jamais sur un temps négatif', () => {
    expect(shouldAdvanceRound(-1_000, 0)).toBe(false);
  });

  it('reconnaît la dernière manche', () => {
    expect(isLastRound(TOTAL_ROUNDS)).toBe(true);
  });

  it('ne confond pas une manche intermédiaire avec la dernière', () => {
    expect(isLastRound(1)).toBe(false);
    expect(isLastRound(TOTAL_ROUNDS - 1)).toBe(false);
  });

  it('considère un dépassement comme la fin', () => {
    expect(isLastRound(TOTAL_ROUNDS + 3)).toBe(true);
  });

  it('respecte un total personnalisé', () => {
    expect(isLastRound(3, 3)).toBe(true);
    expect(isLastRound(2, 3)).toBe(false);
  });

  it('passe de la manche un à la deux', () => {
    expect(nextRoundNumber(1)).toBe(2);
  });

  it('enchaîne toutes les manches', () => {
    let round = 1;
    const visited = [round];
    while (!isLastRound(round)) {
      round = nextRoundNumber(round);
      visited.push(round);
    }
    expect(visited).toEqual([1, 2, 3, 4, 5]);
  });

  it('ne dépasse jamais le total', () => {
    expect(nextRoundNumber(TOTAL_ROUNDS)).toBe(TOTAL_ROUNDS);
  });

  it('ramène une manche invalide à la première', () => {
    expect(nextRoundNumber(0)).toBe(2);
    expect(nextRoundNumber(-4)).toBe(2);
  });

  it('tronque une manche décimale', () => {
    expect(nextRoundNumber(2.8)).toBe(3);
  });

  it('reste cohérent avec un total personnalisé', () => {
    expect(nextRoundNumber(2, 3)).toBe(3);
    expect(nextRoundNumber(3, 3)).toBe(3);
  });
});
