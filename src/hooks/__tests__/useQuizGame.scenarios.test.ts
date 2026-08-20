/**
 * Mode QUIZ — scénarios de partie complète.
 *
 * Complète `useQuizGame.logic.test.ts` et `useQuizGame.autoAdvance.test.ts` en
 * jouant des situations multijoueurs réelles :
 *  - mécaniques : barème au temps, réponses libres et QCM
 *  - synchro entre joueurs : classement cohérent pour un même jeu de réponses
 *  - passage à la manche suivante : enchaînement des manches, fin de partie
 *  - reconnexion : score recalculable depuis les temps de réponse stockés
 */
import { describe, expect, it } from 'vitest';
import { calculatePoints, isAnswerCorrect, normalizeAnswer } from '@/hooks/useQuizGame';

const DURATION = 10_000;

interface Reponse {
  playerId: string;
  guess: string;
  responseTimeMs: number;
}

/** Reconstitue le classement d'une manche depuis les réponses brutes. */
const classement = (
  reponses: Reponse[],
  correctAnswer: string,
  isQcm = false,
): Array<{ playerId: string; points: number }> =>
  reponses
    .map((r) => ({
      playerId: r.playerId,
      points: isAnswerCorrect(r.guess, correctAnswer, isQcm)
        ? calculatePoints(r.responseTimeMs, DURATION)
        : 0,
    }))
    .sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId));

// ── 1. Barème au temps ─────────────────────────────────────────────────────

describe('quiz — barème au temps', () => {
  it('donne le maximum pour une réponse instantanée', () => {
    expect(calculatePoints(0, DURATION)).toBe(10);
  });

  it('ne donne aucun point à l’expiration', () => {
    expect(calculatePoints(DURATION, DURATION)).toBe(0);
  });

  it('donne la moitié des points à mi-parcours', () => {
    expect(calculatePoints(DURATION / 2, DURATION)).toBe(5);
  });

  it('décroît de façon monotone', () => {
    for (let t = 0; t < DURATION; t += 500) {
      expect(calculatePoints(t, DURATION)).toBeGreaterThanOrEqual(
        calculatePoints(t + 500, DURATION),
      );
    }
  });

  it('ne renvoie jamais de points négatifs', () => {
    for (let t = 0; t <= DURATION * 3; t += 1_000) {
      expect(calculatePoints(t, DURATION)).toBeGreaterThanOrEqual(0);
    }
  });

  it('ne dépasse jamais dix points', () => {
    for (let t = -5_000; t <= DURATION; t += 1_000) {
      expect(calculatePoints(t, DURATION)).toBeLessThanOrEqual(10);
    }
  });

  it('borne un temps négatif au maximum', () => {
    expect(calculatePoints(-1_000, DURATION)).toBe(10);
  });

  it('refuse une durée nulle', () => {
    expect(calculatePoints(1_000, 0)).toBe(0);
  });

  it('refuse une durée négative', () => {
    expect(calculatePoints(1_000, -5_000)).toBe(0);
  });

  it('s’adapte à une durée courte', () => {
    expect(calculatePoints(2_500, 5_000)).toBe(5);
  });

  it('s’adapte à une durée longue', () => {
    expect(calculatePoints(15_000, 30_000)).toBe(5);
  });

  it('renvoie toujours un entier', () => {
    for (let t = 0; t <= DURATION; t += 333) {
      expect(Number.isInteger(calculatePoints(t, DURATION))).toBe(true);
    }
  });

  it('donne le même score à deux joueurs au même temps', () => {
    expect(calculatePoints(3_210, DURATION)).toBe(calculatePoints(3_210, DURATION));
  });
});

// ── 2. Réponses libres ─────────────────────────────────────────────────────

describe('quiz — réponses libres', () => {
  it('accepte une réponse exacte', () => {
    expect(isAnswerCorrect('Paris', 'Paris')).toBe(true);
  });

  it('accepte malgré la casse', () => {
    expect(isAnswerCorrect('PARIS', 'paris')).toBe(true);
  });

  it('accepte malgré les accents', () => {
    expect(isAnswerCorrect('Genève', 'Geneve')).toBe(true);
  });

  it('accepte malgré les espaces superflus', () => {
    expect(isAnswerCorrect('  Paris  ', 'Paris')).toBe(true);
  });

  it('accepte malgré la ponctuation', () => {
    expect(isAnswerCorrect('Paris !', 'Paris')).toBe(true);
  });

  it('accepte une phrase contenant la réponse', () => {
    expect(isAnswerCorrect("je pense que c'est paris", 'Paris')).toBe(true);
  });

  it('refuse une réponse différente', () => {
    expect(isAnswerCorrect('Lyon', 'Paris')).toBe(false);
  });

  it('refuse une réponse tronquée', () => {
    expect(isAnswerCorrect('Par', 'Paris')).toBe(false);
  });

  it('refuse une réponse vide', () => {
    expect(isAnswerCorrect('', 'Paris')).toBe(false);
  });

  it('refuse quand la réponse attendue est vide', () => {
    expect(isAnswerCorrect('Paris', '')).toBe(false);
  });

  it('refuse quand la réponse attendue est de la ponctuation', () => {
    expect(isAnswerCorrect('nimporte quoi', '!!!')).toBe(false);
  });

  it('normalise les espaces multiples', () => {
    expect(normalizeAnswer('le   grand    mur')).toBe('le grand mur');
  });

  it('conserve un espace unique entre les mots', () => {
    expect(isAnswerCorrect('la tour eiffel', 'La Tour Eiffel')).toBe(true);
  });

  it('conserve les chiffres', () => {
    expect(isAnswerCorrect('1789', '1789')).toBe(true);
  });

  it('distingue deux nombres proches', () => {
    expect(isAnswerCorrect('1788', '1789')).toBe(false);
  });
});

// ── 3. Questions à choix multiples ─────────────────────────────────────────

describe('quiz — questions à choix multiples', () => {
  it('accepte le choix exact', () => {
    expect(isAnswerCorrect('Paris', 'Paris', true)).toBe(true);
  });

  it('accepte malgré la casse en QCM', () => {
    expect(isAnswerCorrect('paris', 'Paris', true)).toBe(true);
  });

  it('accepte malgré les accents en QCM', () => {
    expect(isAnswerCorrect('Geneve', 'Genève', true)).toBe(true);
  });

  it('refuse une réponse contenant le choix en QCM', () => {
    // En QCM la correspondance doit être exacte : on choisit une option.
    expect(isAnswerCorrect("c'est paris", 'Paris', true)).toBe(false);
  });

  it('refuse un choix différent en QCM', () => {
    expect(isAnswerCorrect('Lyon', 'Paris', true)).toBe(false);
  });

  it('refuse un choix vide en QCM', () => {
    expect(isAnswerCorrect('', 'Paris', true)).toBe(false);
  });

  it('est plus strict qu’une réponse libre', () => {
    const phrase = "je dirais paris";
    expect(isAnswerCorrect(phrase, 'Paris', false)).toBe(true);
    expect(isAnswerCorrect(phrase, 'Paris', true)).toBe(false);
  });
});

// ── 4. Course entre joueurs (synchro du classement) ────────────────────────

describe('quiz — classement d’une manche', () => {
  const reponses: Reponse[] = [
    { playerId: 'a', guess: 'Paris', responseTimeMs: 1_000 },
    { playerId: 'b', guess: 'Paris', responseTimeMs: 4_000 },
    { playerId: 'c', guess: 'Lyon', responseTimeMs: 900 },
  ];

  it('récompense le joueur le plus rapide ayant juste', () => {
    expect(classement(reponses, 'Paris')[0].playerId).toBe('a');
  });

  it('n’accorde aucun point à une mauvaise réponse même très rapide', () => {
    const scores = classement(reponses, 'Paris');
    expect(scores.find((s) => s.playerId === 'c')?.points).toBe(0);
  });

  it('classe le second joueur correct devant celui qui s’est trompé', () => {
    const scores = classement(reponses, 'Paris');
    const b = scores.findIndex((s) => s.playerId === 'b');
    const c = scores.findIndex((s) => s.playerId === 'c');
    expect(b).toBeLessThan(c);
  });

  it('donne le même classement quel que soit l’ordre d’arrivée des lignes', () => {
    expect(classement([...reponses].reverse(), 'Paris')).toEqual(classement(reponses, 'Paris'));
  });

  it('donne des points égaux à deux joueurs au même temps', () => {
    const scores = classement(
      [
        { playerId: 'a', guess: 'Paris', responseTimeMs: 2_000 },
        { playerId: 'b', guess: 'Paris', responseTimeMs: 2_000 },
      ],
      'Paris',
    );
    expect(scores[0].points).toBe(scores[1].points);
  });

  it('n’accorde aucun point quand personne ne répond juste', () => {
    const scores = classement(
      [
        { playerId: 'a', guess: 'Lyon', responseTimeMs: 500 },
        { playerId: 'b', guess: 'Nice', responseTimeMs: 600 },
      ],
      'Paris',
    );
    expect(scores.every((s) => s.points === 0)).toBe(true);
  });

  it('gère une manche sans aucune réponse', () => {
    expect(classement([], 'Paris')).toEqual([]);
  });

  it('applique le mode QCM à toute la manche', () => {
    const scores = classement(
      [
        { playerId: 'a', guess: "c'est paris", responseTimeMs: 500 },
        { playerId: 'b', guess: 'Paris', responseTimeMs: 3_000 },
      ],
      'Paris',
      true,
    );
    expect(scores[0].playerId).toBe('b');
    expect(scores.find((s) => s.playerId === 'a')?.points).toBe(0);
  });
});

// ── 5. Partie complète ─────────────────────────────────────────────────────

describe('quiz — partie complète sur plusieurs manches', () => {
  const manches = [
    { answer: 'Paris', reponses: [
      { playerId: 'a', guess: 'Paris', responseTimeMs: 1_000 },
      { playerId: 'b', guess: 'Paris', responseTimeMs: 5_000 },
    ] },
    { answer: 'Rome', reponses: [
      { playerId: 'a', guess: 'Lyon', responseTimeMs: 2_000 },
      { playerId: 'b', guess: 'Rome', responseTimeMs: 2_000 },
    ] },
    { answer: 'Madrid', reponses: [
      { playerId: 'a', guess: 'Madrid', responseTimeMs: 8_000 },
      { playerId: 'b', guess: 'Madrid', responseTimeMs: 3_000 },
    ] },
  ];

  /** Cumule les scores de toutes les manches. */
  const cumul = () => {
    const totals = new Map<string, number>();
    for (const manche of manches) {
      for (const { playerId, points } of classement(manche.reponses, manche.answer)) {
        totals.set(playerId, (totals.get(playerId) ?? 0) + points);
      }
    }
    return totals;
  };

  it('cumule les points de chaque manche', () => {
    const totals = cumul();
    expect(totals.get('a')).toBeGreaterThan(0);
    expect(totals.get('b')).toBeGreaterThan(0);
  });

  it('désigne le vainqueur au cumul et non sur une seule manche', () => {
    const totals = cumul();
    // b marque sur les trois manches, a manque la deuxième.
    expect(totals.get('b')).toBeGreaterThan(totals.get('a') as number);
  });

  it('donne le même cumul à tous les clients', () => {
    const premier = cumul();
    const second = cumul();
    expect([...premier.entries()].sort()).toEqual([...second.entries()].sort());
  });

  it('n’attribue rien pour une manche entièrement ratée', () => {
    const scores = classement(
      [{ playerId: 'a', guess: 'Berlin', responseTimeMs: 100 }],
      'Rome',
    );
    expect(scores[0].points).toBe(0);
  });

  it('recalcule le score identique après reconnexion', () => {
    // Les temps de réponse sont stockés : le score se recalcule à l'identique.
    const avant = classement(manches[0].reponses, manches[0].answer);
    const apres = classement(manches[0].reponses, manches[0].answer);
    expect(apres).toEqual(avant);
  });

  it('reste cohérent avec de nombreux joueurs', () => {
    const nombreux: Reponse[] = Array.from({ length: 12 }, (_, i) => ({
      playerId: `j${String(i).padStart(2, '0')}`,
      guess: 'Paris',
      responseTimeMs: i * 700,
    }));
    const scores = classement(nombreux, 'Paris');
    expect(scores).toHaveLength(12);
    // Le plus rapide devant, le plus lent derrière.
    expect(scores[0].playerId).toBe('j00');
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i - 1].points).toBeGreaterThanOrEqual(scores[i].points);
    }
  });
});
