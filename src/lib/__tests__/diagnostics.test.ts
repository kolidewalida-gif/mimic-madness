import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDiagnostics,
  diagnose,
  formatDiagnostics,
  getDiagnostics,
  subscribeDiagnostics,
} from '@/lib/diagnostics';

beforeEach(() => {
  clearDiagnostics();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  clearDiagnostics();
});

describe('journal de diagnostic', () => {
  it('enregistre le domaine, le niveau et les détails', () => {
    diagnose.error('voting', 'Instantané refusé', { lobbyId: 'abc' });

    const [entry] = getDiagnostics();
    expect(entry.scope).toBe('voting');
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('Instantané refusé');
    expect(entry.data).toEqual({ lobbyId: 'abc' });
  });

  it('double chaque entrée dans la console selon son niveau', () => {
    // Le miroir console est ce qui rend le journal utilisable sans ouvrir le
    // panneau, donc il fait partie du contrat.
    diagnose.info('lobby', 'ok');
    diagnose.warn('lobby', 'attention');
    diagnose.error('lobby', 'raté');

    expect(console.info).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('borne le tampon pour ne pas gonfler pendant une partie', () => {
    for (let index = 0; index < 400; index += 1) {
      diagnose.info('boucle', `événement ${index}`);
    }

    const snapshot = getDiagnostics();
    expect(snapshot).toHaveLength(300);
    // Les plus anciennes sont oubliées, les récentes conservées.
    expect(snapshot.at(-1)?.message).toBe('événement 399');
    expect(snapshot[0]?.message).toBe('événement 100');
  });

  it('raccourcit les valeurs trop longues', () => {
    diagnose.info('voting', 'ligne', { texte: 'x'.repeat(400) });

    const valeur = getDiagnostics()[0].data?.texte as string;
    expect(valeur.length).toBeLessThan(130);
    expect(valeur.endsWith('…')).toBe(true);
  });

  it('résume un tableau volumineux au lieu de le recopier', () => {
    diagnose.info('voting', 'joueurs', { liste: Array.from({ length: 40 }, (_, i) => i) });
    expect(getDiagnostics()[0].data?.liste).toBe('[40 éléments]');
  });

  it('rend une erreur lisible plutôt qu’un objet vide', () => {
    // `JSON.stringify(new Error(...))` donne `{}` : sans ce traitement, la
    // cause d'un échec disparaîtrait du journal copié.
    diagnose.error('recorder', 'échec', { erreur: new TypeError('pas une fonction') });
    expect(getDiagnostics()[0].data?.erreur).toBe('TypeError: pas une fonction');
  });

  it('prévient les abonnés à chaque nouvelle entrée', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDiagnostics(listener);
    // L'abonnement livre immédiatement l'état courant.
    expect(listener).toHaveBeenCalledTimes(1);

    diagnose.info('voting', 'nouvelle');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    diagnose.info('voting', 'ignorée');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('produit une trace copiable avec son contexte', () => {
    diagnose.warn('imitation', 'canal perdu', { tentative: 3 });
    const texte = formatDiagnostics();

    expect(texte).toContain('# Diagnostic Mimic Master');
    expect(texte).toContain('# Navigateur');
    expect(texte).toContain('WARN');
    expect(texte).toContain('[imitation] canal perdu');
    expect(texte).toContain('"tentative":3');
  });
});
