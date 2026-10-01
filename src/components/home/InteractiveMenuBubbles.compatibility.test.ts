// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('./InteractiveMenuBubbles.module.css', import.meta.url), 'utf8'));

// Structural regressions, not a substitute for real-browser rendering tests.
describe('Menu bubble CSS compatibility', () => {
  it('keeps essential pause rules free of unsupported relational selectors', () => {
    css.walkRules(rule => expect(rule.selector).not.toContain(':has('));
    css.walkDecls(decl => expect(decl.prop).not.toBe('scale'));
    expect(css.toString()).toContain('[data-pressed=true]');
  });
  it('restricts hover effects to mouse/trackpad devices', () => {
    css.walkRules(rule => {
      if (!rule.selector.includes(':hover')) return;
      expect(rule.parent?.type).toBe('atrule');
      const media = rule.parent as postcss.AtRule;
      expect(media.params).toMatch(/hover:hover|prefers-reduced-motion:reduce/);
    });
  });
  it('provides basic focus and safe-area fallbacks without hiding the controls', () => {
    const rules: string[] = [];
    css.walkRules(rule => { rules.push(rule.selector); });
    expect(rules).toContain('.bubble:focus::after');
    expect(css.toString()).toContain('bottom:6.2rem;');
    expect(css.toString()).toContain('-webkit-appearance:none;appearance:none');
  });
  it('lets visible bubbles beside the avatar receive clicks on narrow screens', () => {
    const menu = postcss.parse(readFileSync(new URL('./InkHomeBubble.module.css', import.meta.url), 'utf8'));
    const events: string[] = [];
    menu.walkRules(rule => {
      if (rule.selector !== '.scene') return;
      rule.walkDecls('pointer-events', decl => { events.push(decl.value); });
    });
    expect(events).toEqual(['none']);
    expect(menu.toString()).toContain('.avatarBubble, .playBubble { pointer-events: auto; }');
  });
});
