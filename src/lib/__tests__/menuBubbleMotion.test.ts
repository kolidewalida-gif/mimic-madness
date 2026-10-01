import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateMenuBubbles, nextBubbleDestination } from '../menuBubbleMotion';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; document.documentElement.classList.remove('low-power'); });
function scene(reduced = false) {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const field = document.createElement('div'), slot = document.createElement('div');
  field.append(slot); document.body.append(field);
  Object.defineProperties(field, { clientWidth: { value: 900 }, clientHeight: { value: 700 } });
  Object.defineProperties(slot, { offsetWidth: { value: 80 }, offsetHeight: { value: 80 } });
  const animations: any[] = [];
  slot.animate = vi.fn(() => {
    const animation = { playState: 'running', onfinish: null, pause: vi.fn(function() { animation.playState = 'paused'; }), play: vi.fn(function() { animation.playState = 'running'; }), cancel: vi.fn() };
    animations.push(animation);
    return animation as unknown as Animation;
  });
  return { field, slot, animations, stop: animateMenuBubbles(field, [slot]) };
}
describe('Random menu bubble wandering', () => {
  it('can head right, down, left and up independently', () => {
    const from = { x: 400, y: 400 };
    const target = (angle: number) => { let call = 0; return nextBubbleDestination(from, 1000, 1000, () => call++ === 0 ? angle : 0); };
    expect(target(0).x).toBeGreaterThan(from.x);
    expect(target(.25).y).toBeGreaterThan(from.y);
    expect(target(.5).x).toBeLessThan(from.x);
    expect(target(.75).y).toBeLessThan(from.y);
  });
  it('keeps 1000 successive destinations inside desktop and mobile bounds', () => {
    for (const [w, h] of [[1500, 800], [280, 430], [0, 0]]) {
      let p = { x: 0, y: 0 }, seed = 21;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 1000; i++) {
        p = nextBubbleDestination(p, w, h, random);
        expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(w);
        expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(h);
      }
    }
  });
  it('starts the next random leg exactly at the previous destination', () => {
    const { slot, animations, stop } = scene();
    const first = vi.mocked(slot.animate).mock.calls[0][0] as Keyframe[];
    animations[0].onfinish();
    const second = vi.mocked(slot.animate).mock.calls[1][0] as Keyframe[];
    expect(second[0].transform).toBe(first[2].transform);
    stop(); expect(animations[1].cancel).toHaveBeenCalledOnce();
  });
  it('pauses for presses/overlays and resumes the same animation', async () => {
    const { field, slot, animations, stop } = scene();
    slot.dataset.pressed = 'true'; await Promise.resolve();
    expect(animations[0].pause).toHaveBeenCalled();
    slot.dataset.pressed = 'false'; await Promise.resolve();
    expect(animations[0].play).toHaveBeenCalled();
    field.dataset.paused = 'true'; await Promise.resolve();
    expect(animations[0].playState).toBe('paused');
    stop();
  });
  it('honors reduced motion and low-power mode without scheduling frames', () => {
    const reduced = scene(true); expect(reduced.slot.animate).not.toHaveBeenCalled(); reduced.stop();
    document.documentElement.classList.add('low-power');
    const lowPower = scene(); expect(lowPower.slot.animate).not.toHaveBeenCalled(); lowPower.stop();
  });
});
