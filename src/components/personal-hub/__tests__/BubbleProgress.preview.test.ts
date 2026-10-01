// @vitest-environment node
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import { describe, expect, it } from 'vitest';

describe('BubbleProgress preview compatibility', () => {
  it('remains valid TSX after Lovable inserts attributes into the tabs', async () => {
    const source = readFileSync(new URL('../BubbleProgress.tsx', import.meta.url), 'utf8');
    // Reproduce the injection shown in the preview error: attributes are
    // inserted immediately after the component name, before its props.
    const instrumented = source.replace(/<(BubbleTabs|QuestPeriodTabs)(?=[\s<])/g,
      '<$1 data-lov-id="preview" data-component-name="Tabs"');
    expect(instrumented).not.toBe(source);
    await expect(transform(instrumented, { loader: 'tsx', jsx: 'automatic' })).resolves.toHaveProperty('code');
  });
});
