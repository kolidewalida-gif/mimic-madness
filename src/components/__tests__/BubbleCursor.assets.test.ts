import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Bubble cursor assets', () => {
  it.each([
    ['arrow', 4, 3],
    ['hand', 13, 3],
  ] as const)('ships a self-contained 32px %s cursor with a valid hotspot', (name, x, y) => {
    const svg = readFileSync(resolve('public/cursors', `mimic-bubble-${name}.svg`), 'utf8');
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.getAttribute('width')).toBe('32');
    expect(parsed.documentElement.getAttribute('height')).toBe('32');
    expect(parsed.querySelector('script, image, animate, animateTransform, filter')).toBeNull();
    expect(svg).not.toMatch(/(?:href|src)=/);
    const css = readFileSync(resolve('src/components/cursor/BubbleCursor.css'), 'utf8');
    expect(css).toContain(`/cursors/mimic-bubble-${name}.svg') ${x} ${y},`);
    expect(x).toBeLessThan(32); expect(y).toBeLessThan(32);
  });
});
