import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CountdownOverlay } from '../CountdownOverlay';

const mocks = vi.hoisted(() => ({ sound: vi.fn(), reduced: false }));
vi.mock('@/hooks/useSoundEffects', () => ({ playSoundEffect: mocks.sound }));
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mocks.reduced,
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  motion: { div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div> },
}));

describe('Bubble imitation countdown', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000); vi.clearAllMocks(); mocks.reduced = false; });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('shows 3, 2, 1 then starts once at the deadline', () => {
    const complete = vi.fn();
    render(<CountdownOverlay isActive onComplete={complete} />);
    expect(screen.getByRole('status').textContent).toContain('3');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('status').textContent).toContain('2');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('status').textContent).toContain('1');
    expect(complete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('status')).toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(mocks.sound.mock.calls.map(call => call[0])).toEqual(['countdown', 'countdown', 'countdown', 'start']);
    act(() => vi.advanceTimersByTime(4000));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('uses the server anchor when a player joins late', () => {
    const complete = vi.fn();
    render(<CountdownOverlay isActive onComplete={complete} completeAt={101_500} />);
    expect(screen.getByRole('status').textContent).toContain('2');
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('status').textContent).toContain('1');
    act(() => vi.advanceTimersByTime(1000));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('starts immediately for an already elapsed anchor without flashing 3', () => {
    const complete = vi.fn();
    render(<CountdownOverlay isActive onComplete={complete} completeAt={99_000} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(mocks.sound).toHaveBeenCalledTimes(1);
    expect(mocks.sound).toHaveBeenCalledWith('start', 0.6);
  });

  it('does not restart when its callback changes', () => {
    const first = vi.fn(); const latest = vi.fn();
    const view = render(<CountdownOverlay isActive onComplete={first} />);
    act(() => vi.advanceTimersByTime(1000));
    view.rerender(<CountdownOverlay isActive onComplete={latest} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it('cancels cleanly and can be used again for the next video', () => {
    const complete = vi.fn();
    const view = render(<CountdownOverlay isActive onComplete={complete} />);
    act(() => vi.advanceTimersByTime(1000));
    view.rerender(<CountdownOverlay isActive={false} onComplete={complete} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(complete).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    view.rerender(<CountdownOverlay isActive onComplete={complete} />);
    expect(screen.getByRole('status').textContent).toContain('3');
    act(() => vi.advanceTimersByTime(3000));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('clears the timer on unmount', () => {
    const complete = vi.fn();
    const view = render(<CountdownOverlay isActive onComplete={complete} />);
    view.unmount();
    act(() => vi.advanceTimersByTime(3000));
    expect(complete).not.toHaveBeenCalled();
  });

  it('keeps a single accessible announcement and honors reduced motion', () => {
    mocks.reduced = true;
    render(<CountdownOverlay isActive onComplete={vi.fn()} title="La prise de Luna commence dans…" />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').getAttribute('aria-atomic')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe('La prise de Luna commence dans… 3');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does nothing before activation', () => {
    render(<CountdownOverlay isActive={false} onComplete={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(mocks.sound).not.toHaveBeenCalled();
  });
});
