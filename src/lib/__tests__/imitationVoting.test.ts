import { describe, expect, it } from 'vitest';
import {
  hasPlayableAudio,
  resolveVoteAvailability,
  type VotableImitation,
} from '@/lib/imitationVoting';

const solo = (overrides: Partial<VotableImitation> = {}): VotableImitation => ({
  playerIds: ['pessi'],
  clipIds: ['clip-1'],
  userVote: null,
  ...overrides,
});

const team = (overrides: Partial<VotableImitation> = {}): VotableImitation => ({
  playerIds: ['ada', 'bob'],
  clipIds: ['clip-a', 'clip-b'],
  userVote: null,
  ...overrides,
});

describe('disponibilité du vote', () => {
  it('autorise le vote sur l’imitation d’un autre joueur', () => {
    expect(resolveVoteAvailability(solo(), 'moi', true)).toEqual({
      kind: 'votable',
      targetIds: ['pessi'],
    });
  });

  it('refuse le vote sans audio, de façon nommée', () => {
    /*
     * Régression vécue : la garde du clic refusait ce cas alors que l'affichage
     * l'ignorait. Les boutons « Bof » et « Top ! » restaient actifs et leur clic
     * ne produisait rien — ni vote, ni message, ni erreur. Un état nommé permet
     * à l'interface de l'expliquer au lieu de rester muette.
     */
    expect(resolveVoteAvailability(solo({ clipIds: [null] }), 'moi', true)).toEqual({
      kind: 'no-audio',
    });
  });

  it('refuse le vote pour soi-même, même sans audio', () => {
    // L'appartenance prime : le message « Votre imitation » reste correct.
    expect(resolveVoteAvailability(solo({ playerIds: ['moi'] }), 'moi', true)).toEqual({
      kind: 'own',
    });
    expect(
      resolveVoteAvailability(solo({ playerIds: ['moi'], clipIds: [null] }), 'moi', true),
    ).toEqual({ kind: 'own' });
  });

  it('reconnaît un vote déjà émis', () => {
    expect(resolveVoteAvailability(solo({ userVote: 'like' }), 'moi', true)).toEqual({
      kind: 'already-voted',
    });
  });

  it('attend la certification de la session', () => {
    expect(resolveVoteAvailability(solo(), 'moi', false)).toEqual({ kind: 'not-ready' });
    expect(resolveVoteAvailability(null, 'moi', true)).toEqual({ kind: 'not-ready' });
    expect(resolveVoteAvailability(undefined, 'moi', true)).toEqual({ kind: 'not-ready' });
    expect(resolveVoteAvailability(solo({ playerIds: [] }), 'moi', true)).toEqual({
      kind: 'not-ready',
    });
  });

  it('ne cible en 2v2 que les coéquipiers réellement audibles', () => {
    expect(resolveVoteAvailability(team({ clipIds: ['clip-a', null] }), 'moi', true)).toEqual({
      kind: 'votable',
      targetIds: ['ada'],
    });
  });

  it('refuse une équipe entièrement muette', () => {
    expect(resolveVoteAvailability(team({ clipIds: [null, null] }), 'moi', true)).toEqual({
      kind: 'no-audio',
    });
  });

  it('refuse le vote quand le joueur fait partie de l’équipe', () => {
    expect(resolveVoteAvailability(team({ playerIds: ['moi', 'bob'] }), 'moi', true)).toEqual({
      kind: 'own',
    });
  });

  it('supporte un tableau de clips plus court que celui des joueurs', () => {
    // Robustesse : un décalage entre les deux tableaux ne doit pas produire de
    // cible fantôme.
    expect(resolveVoteAvailability(team({ clipIds: ['clip-a'] }), 'moi', true)).toEqual({
      kind: 'votable',
      targetIds: ['ada'],
    });
  });
});

describe('présence d’audio à lire', () => {
  it('suit la présence d’au moins un clip', () => {
    expect(hasPlayableAudio(solo())).toBe(true);
    expect(hasPlayableAudio(solo({ clipIds: [null] }))).toBe(false);
    expect(hasPlayableAudio(team({ clipIds: [null, 'clip-b'] }))).toBe(true);
    expect(hasPlayableAudio(team({ clipIds: [null, null] }))).toBe(false);
    expect(hasPlayableAudio(null)).toBe(false);
    expect(hasPlayableAudio(undefined)).toBe(false);
  });
});
