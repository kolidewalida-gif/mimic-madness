// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdFreeContextValue } from '@/hooks/useAdFree';

const mocks = vi.hoisted(() => ({
  useAdFree: vi.fn(),
  createAdImpressionId: vi.fn(),
  recordAdEvent: vi.fn(),
}));

vi.mock('@/hooks/useAdFree', () => ({ useAdFree: mocks.useAdFree }));
vi.mock('@/lib/adAnalytics', () => ({
  createAdImpressionId: mocks.createAdImpressionId,
  recordAdEvent: mocks.recordAdEvent,
}));

let AdSlot: typeof import('@/components/AdSlot').AdSlot;
let entitlement: AdFreeContextValue;
let impressionSequence = 0;

const state = (isResolved: boolean, isAdFree: boolean): AdFreeContextValue => ({
  environment: 'sandbox',
  isLoading: !isResolved,
  isResolved,
  isAdFree,
  source: isAdFree ? 'subscription' : null,
  expiresAt: isAdFree ? '2026-08-18T13:00:00.000Z' : null,
  error: null,
  refresh: async () => undefined,
});

const slot = () => (
  <AdSlot
    slot="1234567890"
    screen="home"
    placement="home_rail_left"
    instanceKey="support-test"
    loadAfterMs={100_000}
  />
);

beforeAll(async () => {
  vi.stubEnv('VITE_ADSENSE_CLIENT', 'ca-pub-test');
  AdSlot = (await import('@/components/AdSlot')).AdSlot;
});

beforeEach(() => {
  vi.clearAllMocks();
  impressionSequence = 0;
  entitlement = state(false, false);
  mocks.useAdFree.mockImplementation(() => entitlement);
  mocks.createAdImpressionId.mockImplementation(
    () => `00000000-0000-4000-8000-${String(++impressionSequence).padStart(12, '0')}`,
  );
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('garde sans pub des AdSlot', () => {
  it('ne monte aucun lifecycle avant résolution ou avec un droit actif, puis le remonte à l’expiration', async () => {
    const view = render(slot());

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(mocks.recordAdEvent).not.toHaveBeenCalled();

    entitlement = state(true, true);
    view.rerender(slot());
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(mocks.recordAdEvent).not.toHaveBeenCalled();

    entitlement = state(true, false);
    view.rerender(slot());
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(mocks.recordAdEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'scheduled',
      screen: 'home',
      placement: 'home_rail_left',
    }));
    expect(document.querySelector('script[src*="googlesyndication"]')).toBeNull();

    entitlement = state(true, true);
    view.rerender(slot());
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });

    entitlement = state(true, false);
    view.rerender(slot());
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    const scheduledEvents = mocks.recordAdEvent.mock.calls.filter(
      ([event]) => event.eventType === 'scheduled',
    );
    expect(scheduledEvents).toHaveLength(2);
  });
});
