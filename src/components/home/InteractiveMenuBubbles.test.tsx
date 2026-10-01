import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveMenuBubbles } from './InteractiveMenuBubbles';
import { playMenuBubblePop } from '@/lib/menuBubbleSound';

vi.mock('@/lib/menuBubbleSound', () => ({ playMenuBubblePop: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  vi.mocked(playMenuBubblePop).mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Menu bubbles', () => {
  it('provides nine named bubbles, but only one tab stop after the menu', () => {
    render(<InteractiveMenuBubbles />);
    const bubbles = screen.getAllByRole('button');
    expect(bubbles).toHaveLength(9);
    expect(bubbles.filter(button => button.tabIndex === 0)).toHaveLength(1);
    expect(bubbles[0]).toHaveAccessibleName('Éclater la bulle 1');
    expect(bubbles.every(button => button.getAttribute('type') === 'button')).toBe(true);
  });
  it('bursts once, prevents double clicks and respawns without losing the control', () => {
    render(<InteractiveMenuBubbles />);
    const first = screen.getByRole('button', { name: 'Éclater la bulle 1' });
    fireEvent.click(first); fireEvent.click(first);
    expect(playMenuBubblePop).toHaveBeenCalledTimes(1);
    expect(first).toHaveAttribute('aria-disabled', 'true');
    expect(first.parentElement).toHaveAttribute('data-popped', 'true');
    act(() => vi.advanceTimersByTime(2200));
    expect(first).toHaveAttribute('aria-disabled', 'false');
    expect(first.parentElement).toHaveAttribute('data-popped', 'false');
    fireEvent.click(first);
    expect(playMenuBubblePop).toHaveBeenCalledTimes(2);
  });
  it('navigates with arrows, wraps around and never traps Tab', () => {
    render(<InteractiveMenuBubbles />);
    const bubbles = screen.getAllByRole('button');
    fireEvent.keyDown(bubbles[0], { key: 'ArrowLeft' });
    expect(bubbles[8]).toHaveFocus();
    expect(bubbles[8].tabIndex).toBe(0);
    fireEvent.keyDown(bubbles[8], { key: 'ArrowRight' });
    expect(bubbles[0]).toHaveFocus();
    expect(fireEvent.keyDown(bubbles[0], { key: 'Tab' })).toBe(true);
  });
  it('pauses and disables the background while an overlay is open', () => {
    const view = render(<InteractiveMenuBubbles />);
    const first = screen.getByRole('button', { name: 'Éclater la bulle 1' });
    view.rerender(<InteractiveMenuBubbles active={false} />);
    expect(first).toBeDisabled();
    expect(first.tabIndex).toBe(-1);
    expect(screen.queryByRole('group')).toBeNull();
    fireEvent.click(first);
    expect(playMenuBubblePop).not.toHaveBeenCalled();
    view.rerender(<InteractiveMenuBubbles />);
    expect(first).not.toBeDisabled();
  });
  it('ignores clicks and pauses motion in a hidden tab, then recovers', () => {
    render(<InteractiveMenuBubbles />);
    const first = screen.getByRole('button', { name: 'Éclater la bulle 1' });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(first).toBeDisabled();
    expect(first.closest('[role=group]')).toHaveAttribute('data-paused', 'true');
    fireEvent.click(first);
    expect(playMenuBubblePop).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    expect(first).not.toBeDisabled();
  });
  it('clears every respawn timer on unmount', () => {
    const view = render(<InteractiveMenuBubbles />);
    screen.getAllByRole('button').slice(0, 3).forEach(button => fireEvent.click(button));
    expect(vi.getTimerCount()).toBe(3);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('still pops quickly in succession while limiting overlapping sounds', () => {
    render(<InteractiveMenuBubbles />);
    const buttons = screen.getAllByRole('button');
    buttons.slice(0, 3).forEach(button => fireEvent.click(button));
    buttons.slice(0, 3).forEach(button => expect(button).toHaveAttribute('aria-disabled', 'true'));
    expect(playMenuBubblePop).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(71));
    fireEvent.click(buttons[3]);
    expect(playMenuBubblePop).toHaveBeenCalledTimes(2);
  });
});
