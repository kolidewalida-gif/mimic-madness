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

/**
 * Débit soutenu avec des mots longs : l'anti-chevauchement doit repousser
 * chaque mot bien au-delà de sa position temporelle. C'est la seule forme de
 * piste qui met en évidence le décalage cumulé.
 */
const denseTrack: RhythmoTrack = {
  version: 1,
  clipId: 'clip-2',
  model: 'test-model',
  duration: 2,
  createdAt: '2026-08-18T20:00:00.000Z',
  cues: [{
    start: 0.5,
    end: 1.05,
    text: 'premier deuxieme troisieme quatrieme',
    words: [
      { text: 'premier', start: 0.5, end: 0.6 },
      { text: 'deuxieme', start: 0.65, end: 0.75 },
      { text: 'troisieme', start: 0.8, end: 0.9 },
      { text: 'quatrieme', start: 0.95, end: 1.05 },
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

/** Décalage horizontal appliqué à la bande, lu sur le nœud. */
const stripX = (strip: HTMLElement): number => {
  const match = /translate3d\((-?[\d.]+)px/.exec(strip.style.transform);
  expect(match).not.toBeNull();
  return Number.parseFloat(match![1]);
};

const styleNumber = (node: Element, property: 'left' | 'minWidth'): number =>
  Number.parseFloat((node as HTMLElement).style[property]);

/** Abscisse à l'écran du bord gauche d'un mot, tête de lecture à l'origine. */
const wordEdgeVsPlayhead = (
  strip: HTMLElement,
  node: Element,
  playhead: number,
): number => stripX(strip) + styleNumber(node, 'left') - playhead;

/** Monte la bande avec une largeur de viewport connue. */
const mountBand = (options: {
  currentTime: number;
  playheadRatio?: number;
  leadSeconds?: number;
  track?: RhythmoTrack;
}) => {
  const rafHarness = stubAnimationFrames();
  const video = document.createElement('video');
  Object.defineProperty(video, 'currentTime', {
    value: options.currentTime,
    writable: true,
  });
  const videoRef = { current: video } as RefObject<HTMLVideoElement>;
  const view = render(
    <RhythmoBand
      track={options.track ?? track}
      videoRef={videoRef}
      pxPerSecond={100}
      playheadRatio={options.playheadRatio ?? 0.2}
      leadSeconds={options.leadSeconds ?? 0}
    />,
  );

  const viewport = view.container.querySelector('.rb-viewport') as HTMLDivElement;
  Object.defineProperty(viewport, 'clientWidth', { value: 500 });

  return {
    ...rafHarness,
    video,
    view,
    strip: view.container.querySelector('.rb-strip') as HTMLDivElement,
    wordNodes: Array.from(view.container.querySelectorAll('.rb-word')),
    playhead: 500 * (options.playheadRatio ?? 0.2),
  };
};

describe('RhythmoBand temporal renderer', () => {
  it('place le mot prononcé exactement sur la tête de lecture', () => {
    /*
     * Régression vécue : la position venait de `temps × pxPerSecond`, alors que
     * l'anti-chevauchement repousse les mots vers la droite. L'écart
     * s'accumulait et le mot sous la tête de lecture n'était plus celui
     * prononcé — plusieurs secondes de retard sur une vidéo bavarde.
     */
    const band = mountBand({ currentTime: 0.5, track: denseTrack });

    band.runNextFrame();
    expect(wordEdgeVsPlayhead(band.strip, band.wordNodes[0], band.playhead)).toBeCloseTo(0);

    /*
     * Le quatrième mot est repoussé très loin de sa position temporelle : à
     * 0,95 s le temps pur ne donne que 95 px, alors que sa place réelle est
     * au-delà de 420 px. Il doit malgré tout arriver pile sur la tête de
     * lecture à l'instant où il est prononcé.
     */
    const pushed = styleNumber(band.wordNodes[3], 'left');
    expect(pushed).toBeGreaterThan(0.95 * 100 * 3);

    for (const [index, word] of denseTrack.cues[0].words.entries()) {
      band.video.currentTime = word.start;
      band.runNextFrame();
      expect(wordEdgeVsPlayhead(band.strip, band.wordNodes[index], band.playhead))
        .toBeCloseTo(0);
    }
  });

  it('fait traverser le mot pendant sa prononciation', () => {
    const band = mountBand({ currentTime: 1.8 });

    band.runNextFrame();
    const atStart = wordEdgeVsPlayhead(band.strip, band.wordNodes[1], band.playhead);

    // À la fin du mot, il a exactement traversé sa propre largeur.
    band.video.currentTime = 2.2;
    band.runNextFrame();
    const atEnd = wordEdgeVsPlayhead(band.strip, band.wordNodes[1], band.playhead);

    expect(atStart).toBeCloseTo(0);
    expect(atEnd).toBeCloseTo(-styleNumber(band.wordNodes[1], 'minWidth'));
  });

  it('uses the lead for movement, highlighting and past words, then cancels RAF', () => {
    const band = mountBand({ currentTime: 1.5, leadSeconds: 0.5 });

    // Temps de bande = 2,0 s : « second » (1,8–2,2) est en cours.
    band.runNextFrame();
    expect(band.wordNodes[0].classList.contains('is-past')).toBe(true);
    expect(band.wordNodes[1].classList.contains('is-live')).toBe(true);
    const crossing = wordEdgeVsPlayhead(band.strip, band.wordNodes[1], band.playhead);
    expect(crossing).toBeLessThan(0);
    expect(crossing).toBeGreaterThan(-styleNumber(band.wordNodes[1], 'minWidth'));

    // A backwards seek must move the live marker back as well as the strip.
    band.video.currentTime = 0.4;
    band.runNextFrame();
    expect(band.wordNodes[0].classList.contains('is-past')).toBe(false);
    expect(band.wordNodes[0].classList.contains('is-live')).toBe(true);
    expect(band.wordNodes[1].classList.contains('is-live')).toBe(false);

    const pendingFrameId = band.lastFrameId();
    band.view.unmount();
    expect(band.cancelAnimationFrameMock).toHaveBeenCalledWith(pendingFrameId);
    expect(band.frames.has(pendingFrameId)).toBe(false);
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
    const band = mountBand({ currentTime: 0.5 });

    band.runNextFrame();
    const before = stripX(band.strip);

    band.video.currentTime = 2;
    band.runNextFrame();
    expect(stripX(band.strip)).toBeLessThan(before);

    // La transcription fixe reste offerte, en complément et non en remplacement.
    expect(band.view.container.querySelector('.rb-static')).not.toBeNull();
  });

  it('suit le temps sans reparcourir tous les mots à chaque image', () => {
    const band = mountBand({ currentTime: 0 });

    band.runNextFrame();
    expect(band.wordNodes.map((node) => node.classList.contains('is-past')))
      .toEqual([false, false]);

    // Après le premier mot, seul celui-là est estompé.
    band.video.currentTime = 1.5;
    band.runNextFrame();
    expect(band.wordNodes.map((node) => node.classList.contains('is-past')))
      .toEqual([true, false]);

    // Après le dernier, les deux le sont.
    band.video.currentTime = 2.5;
    band.runNextFrame();
    expect(band.wordNodes.map((node) => node.classList.contains('is-past')))
      .toEqual([true, true]);

    // Retour en arrière : la frontière doit redescendre, pas rester bloquée.
    band.video.currentTime = 0.8;
    band.runNextFrame();
    expect(band.wordNodes.map((node) => node.classList.contains('is-past')))
      .toEqual([false, false]);
  });
});
