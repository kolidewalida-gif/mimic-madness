// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RhythmoBand } from '@/components/rhythmo/RhythmoBand';
import type { RhythmoTrack } from '@/lib/rhythmo/types';

const track: RhythmoTrack = {
  version: 1,
  clipId: 'clip-1',
  model: 'test-model',
  duration: 3,
  createdAt: '2026-08-18T20:00:00.000Z',
  cues: [{
    start: 0.5,
    end: 2.2,
    text: 'premier second',
    words: [
      { text: 'premier', start: 0.5, end: 1.2 },
      { text: 'second', start: 1.8, end: 2.2 },
    ],
  }],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Prend la main sur la boucle d'animation pour la dérouler image par image. */
const stubAnimationFrames = () => {
  let nextFrameId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
    nextFrameId += 1;
    frames.set(nextFrameId, callback);
    return nextFrameId;
  });
  const cancelAnimationFrameMock = vi.fn((frameId: number) => {
    frames.delete(frameId);
  });
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);

  const runNextFrame = () => {
    const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
    expect(entry).toBeDefined();
    if (!entry) return;
    frames.delete(entry[0]);
    act(() => entry[1](0));
  };

  return {
    frames,
    runNextFrame,
    cancelAnimationFrameMock,
    lastFrameId: () => nextFrameId,
  };
};

describe('RhythmoBand temporal renderer', () => {
  it('uses the lead for movement, highlighting and past words, then cancels RAF', () => {
    let nextFrameId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1;
      frames.set(nextFrameId, callback);
      return nextFrameId;
    });
    const cancelAnimationFrameMock = vi.fn((frameId: number) => {
      frames.delete(frameId);
    });
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);

    const video = document.createElement('video');
    Object.defineProperty(video, 'currentTime', { value: 1.5, writable: true });
    const videoRef = { current: video } as RefObject<HTMLVideoElement>;
    const view = render(
      <RhythmoBand
        track={track}
        videoRef={videoRef}
        pxPerSecond={100}
        playheadRatio={0.2}
        leadSeconds={0.5}
      />,
    );

    const viewport = view.container.querySelector('.rb-viewport') as HTMLDivElement;
    const strip = view.container.querySelector('.rb-strip') as HTMLDivElement;
    const wordNodes = Array.from(view.container.querySelectorAll('.rb-word'));
    Object.defineProperty(viewport, 'clientWidth', { value: 500 });

    const runNextFrame = () => {
      const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
      expect(entry).toBeDefined();
      if (!entry) return;
      frames.delete(entry[0]);
      act(() => entry[1](0));
    };

    runNextFrame();
    expect(strip.style.transform).toBe('translate3d(-100px,0,0)');
    expect(wordNodes[0].classList.contains('is-past')).toBe(true);
    expect(wordNodes[1].classList.contains('is-live')).toBe(true);

    // A backwards seek must move the live marker back as well as the strip.
    video.currentTime = 0.4;
    runNextFrame();
    expect(strip.style.transform).toBe('translate3d(10px,0,0)');
    expect(wordNodes[0].classList.contains('is-past')).toBe(false);
    expect(wordNodes[0].classList.contains('is-live')).toBe(true);
    expect(wordNodes[1].classList.contains('is-live')).toBe(false);

    const pendingFrameId = nextFrameId;
    view.unmount();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(pendingFrameId);
    expect(frames.has(pendingFrameId)).toBe(false);
  });

  it('continue de défiler quand le mouvement réduit est demandé', () => {
    /*
     * Régression vécue : la bande restait figée sur les premiers mots chez un
     * joueur ayant désactivé les animations dans Windows. Le défilement porte
     * l'information de timing, il n'est pas décoratif : le suspendre rend le
     * mode imitation injouable.
     */
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const rafHarness = stubAnimationFrames();

    const video = document.createElement('video');
    Object.defineProperty(video, 'currentTime', { value: 1.5, writable: true });
    const videoRef = { current: video } as RefObject<HTMLVideoElement>;
    const view = render(
      <RhythmoBand
        track={track}
        videoRef={videoRef}
        pxPerSecond={100}
        playheadRatio={0.2}
        leadSeconds={0.5}
      />,
    );

    const viewport = view.container.querySelector('.rb-viewport') as HTMLDivElement;
    const strip = view.container.querySelector('.rb-strip') as HTMLDivElement;
    Object.defineProperty(viewport, 'clientWidth', { value: 500 });

    rafHarness.runNextFrame();
    expect(strip.style.transform).toBe('translate3d(-100px,0,0)');

    // Le temps avance : la bande doit suivre, pas rester au point de départ.
    video.currentTime = 2;
    rafHarness.runNextFrame();
    expect(strip.style.transform).toBe('translate3d(-150px,0,0)');

    // La transcription fixe reste offerte, en complément et non en remplacement.
    expect(view.container.querySelector('.rb-static')).not.toBeNull();
  });

  it('suit le temps sans reparcourir tous les mots à chaque image', () => {
    const rafHarness = stubAnimationFrames();

    const video = document.createElement('video');
    Object.defineProperty(video, 'currentTime', { value: 0, writable: true });
    const videoRef = { current: video } as RefObject<HTMLVideoElement>;
    const view = render(
      <RhythmoBand track={track} videoRef={videoRef} pxPerSecond={100} playheadRatio={0} />,
    );

    const viewport = view.container.querySelector('.rb-viewport') as HTMLDivElement;
    const wordNodes = Array.from(view.container.querySelectorAll('.rb-word'));
    Object.defineProperty(viewport, 'clientWidth', { value: 500 });

    rafHarness.runNextFrame();
    expect(wordNodes.map((node) => node.classList.contains('is-past'))).toEqual([false, false]);

    // Après le premier mot, seul celui-là est estompé.
    video.currentTime = 1.5;
    rafHarness.runNextFrame();
    expect(wordNodes.map((node) => node.classList.contains('is-past'))).toEqual([true, false]);

    // Après le dernier, les deux le sont.
    video.currentTime = 2.5;
    rafHarness.runNextFrame();
    expect(wordNodes.map((node) => node.classList.contains('is-past'))).toEqual([true, true]);

    // Retour en arrière : la frontière doit redescendre, pas rester bloquée.
    video.currentTime = 0.8;
    rafHarness.runNextFrame();
    expect(wordNodes.map((node) => node.classList.contains('is-past'))).toEqual([false, false]);
  });
});
