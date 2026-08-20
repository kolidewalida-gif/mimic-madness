// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  playSample: vi.fn(() => true),
  playSustainedSample: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@/lib/sfx/samples', () => ({
  playSample: mocks.playSample,
  playSustainedSample: mocks.playSustainedSample,
}));

let useStagedTask: typeof import('@/hooks/useStagedTask').useStagedTask;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mocks.playSustainedSample.mockReturnValue({ stop: mocks.stop });
  useStagedTask = (await import('@/hooks/useStagedTask')).useStagedTask;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('étape de traitement mise en scène', () => {
  it('laisse la barre finir sa course même si la tâche est instantanée', async () => {
    /*
     * L'inversion audio est quasi instantanée. Sans durée minimale, l'étape
     * clignotait : le joueur ne voyait rien et n'entendait rien.
     */
    const { result } = renderHook(() => useStagedTask());

    let settled = false;
    await act(async () => {
      void result.current
        .run(async () => 'fini', { label: 'Inversion…', minDurationMs: 6_000 })
        .then(() => { settled = true; });
      await Promise.resolve();
    });

    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.label).toBe('Inversion…');

    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(settled).toBe(false);
    expect(result.current.state.ratio).toBeGreaterThan(0.4);
    expect(result.current.state.ratio).toBeLessThan(0.6);

    await act(async () => { await vi.advanceTimersByTimeAsync(3_200); });
    expect(settled).toBe(true);
    expect(result.current.state.isRunning).toBe(false);
  });

  it('plafonne la barre tant que la tâche n’a pas rendu la main', async () => {
    // Afficher 100 % avant la fin serait un mensonge : on s'arrête à 92 %.
    let release: (value: string) => void = () => {};
    const { result } = renderHook(() => useStagedTask());

    await act(async () => {
      void result.current.run(
        () => new Promise<string>((resolve) => { release = resolve; }),
        { label: 'Inversion…', minDurationMs: 2_000 },
      );
      await Promise.resolve();
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.ratio).toBeCloseTo(0.92, 2);

    await act(async () => {
      release('fini');
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.state.isRunning).toBe(false);
  });

  it('n’attend jamais l’animation au détriment de la tâche', async () => {
    // La tâche dure plus que la durée minimale : elle doit être attendue.
    const { result } = renderHook(() => useStagedTask());
    let value: string | null = null;

    await act(async () => {
      void result.current
        .run(
          () => new Promise<string>((resolve) => setTimeout(() => resolve('tard'), 5_000)),
          { label: 'Inversion…', minDurationMs: 1_000 },
        )
        .then((resolved) => { value = resolved; });
      await Promise.resolve();
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(value).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(4_000); });
    expect(value).toBe('tard');
  });

  it('joue le son d’attente en boucle puis l’arrête', async () => {
    const { result } = renderHook(() => useStagedTask());

    await act(async () => {
      void result.current.run(async () => true, {
        label: 'Inversion…',
        minDurationMs: 1_000,
        sound: 'processRewind',
        endSound: 'processDone',
      });
      await Promise.resolve();
    });

    expect(mocks.playSustainedSample).toHaveBeenCalledWith('processRewind', 0.5);
    expect(mocks.stop).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(mocks.playSample).toHaveBeenCalledWith('processDone', 0.5);
    expect(mocks.stop).toHaveBeenCalled();
  });

  it('coupe le son et remet l’état à zéro quand la tâche échoue', async () => {
    // Un échec doit apparaître tout de suite, sans faire patienter devant une
    // barre qui n'aboutira à rien — et sans laisser le son tourner.
    const { result } = renderHook(() => useStagedTask());
    let caught: unknown = null;

    await act(async () => {
      void result.current
        .run(async () => { throw new Error('envoi refusé'); }, {
          label: 'Inversion…',
          minDurationMs: 6_000,
          sound: 'processRewind',
        })
        .catch((error: unknown) => { caught = error; });
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(caught).toBeInstanceOf(Error);
    expect(result.current.state.isRunning).toBe(false);
    expect(mocks.stop).toHaveBeenCalled();
  });

  it('coupe le son au démontage', async () => {
    const { result, unmount } = renderHook(() => useStagedTask());

    await act(async () => {
      void result.current.run(
        () => new Promise(() => {}),
        { label: 'Inversion…', minDurationMs: 6_000, sound: 'processRewind' },
      );
      await Promise.resolve();
    });

    unmount();
    expect(mocks.stop).toHaveBeenCalled();
  });
});
