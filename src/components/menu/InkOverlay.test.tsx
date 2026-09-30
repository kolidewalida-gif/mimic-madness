import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InkDrawer, InkModal } from './InkOverlay';
import { menuPanelMotion, menuScrimMotion } from './overlayMotion';

const motionState = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', () => {
  const makeSurface = (tag: 'div' | 'button') => forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & {
    initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown;
  }>(({ initial, animate, exit, transition, ...props }, ref) => {
    void exit; void transition;
    const attributes = { ...props, ref, 'data-initial': JSON.stringify(initial), 'data-animate': JSON.stringify(animate) };
    return tag === 'div' ? <div {...attributes} ref={ref as React.Ref<HTMLDivElement>} /> : <button {...attributes} ref={ref as React.Ref<HTMLButtonElement>} />;
  });
  return { motion: { div: makeSurface('div'), button: makeSurface('button') },
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    useReducedMotion: () => motionState.reduced };
});

beforeEach(() => { vi.useFakeTimers(); motionState.reduced = false; });
afterEach(() => { cleanup(); vi.useRealTimers(); document.body.style.overflow = ''; document.body.style.paddingRight = ''; });
const focusFrame = () => act(() => { vi.advanceTimersByTime(20); });

describe('menu opening without flashes', () => {
  it('keeps the menu opaque and does not scale the full surface', () => {
    render(<InkModal isOpen title="Réglages" onClose={() => {}}><input aria-label="Micro" /></InkModal>);
    expect(JSON.parse(screen.getByRole('dialog').dataset.initial!)).toEqual({ opacity: 1, y: 14 });
    expect(JSON.parse(screen.getByRole('dialog').dataset.animate!)).toEqual({ opacity: 1, y: 0 });
  });

  it('still restores opacity when reopening during an exit', () => {
    const motion = menuPanelMotion(false);
    expect(motion.exit.opacity).toBe(0);
    expect(motion.animate.opacity).toBe(1);
  });

  it('uses a bounded easing for the scrim instead of a spring', () => {
    expect(menuScrimMotion(false).transition).toEqual({ duration: .2, ease: [.22, 1, .36, 1] });
  });

  it('opens modal and drawer immediately with reduced motion', () => {
    motionState.reduced = true;
    const { rerender } = render(<InkModal isOpen title="Réglages" onClose={() => {}}>Contenu</InkModal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-initial', 'false');
    rerender(<InkDrawer isOpen title="Amis" onClose={() => {}}>Contenu</InkDrawer>);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-initial', 'false');
    expect(menuScrimMotion(true).transition.duration).toBe(0);
  });

  it('does not restore/refocus when callbacks change on a menu update', () => {
    const { rerender } = render(<InkModal isOpen title="Réglages" onClose={() => {}}><input aria-label="Nom" /></InkModal>);
    focusFrame();
    screen.getByRole('textbox').focus();
    rerender(<InkModal isOpen title="Son" onClose={() => {}}><input aria-label="Nom" /></InkModal>);
    expect(screen.getByRole('textbox')).toHaveFocus();
    focusFrame();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('uses the latest callback for Escape without restarting the focus effect', () => {
    const oldClose = vi.fn(), newClose = vi.fn();
    const { rerender } = render(<InkModal isOpen title="Réglages" onClose={oldClose}>Contenu</InkModal>);
    rerender(<InkModal isOpen title="Réglages" onClose={newClose}>Contenu</InkModal>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(newClose).toHaveBeenCalledOnce(); expect(oldClose).not.toHaveBeenCalled();
  });

  it('restores the opening button and keeps the scrim out of the tab order', () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Options</button><InkModal isOpen={open} title="Réglages" onClose={() => setOpen(false)}><input data-autofocus aria-label="Nom" /></InkModal></>;
    };
    render(<Demo />);
    const trigger = screen.getByRole('button', { name: 'Options' });
    trigger.focus(); fireEvent.click(trigger); focusFrame();
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getAllByRole('button', { name: 'Fermer Réglages' }).find(button => button.tabIndex === -1)).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });
});
