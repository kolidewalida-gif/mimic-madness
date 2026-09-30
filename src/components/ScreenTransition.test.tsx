import { useEffect } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScreenTransition } from './ScreenTransition';

vi.mock('@/hooks/useInkMode', () => ({ useInkMode: () => ({ isInkMode: false }) }));
vi.mock('@/hooks/useSoundEffects', () => ({ playSoundEffect: vi.fn() }));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: vi.fn() }));
afterEach(cleanup);

describe('stable page behind a menu', () => {
  it('does not keep a transform, filter or forced GPU layer on an idle page', () => {
    render(<ScreenTransition screenKey="home"><main>Accueil</main></ScreenTransition>);
    const page = screen.getByRole('main').parentElement!;
    expect(page.className).not.toMatch(/will-change|blur-0|scale-100|translate-[xy]-0/);
  });

  it('updates menu props without remounting or replaying the screen transition', () => {
    const mounted = vi.fn(), unmounted = vi.fn();
    const Page = ({ open }: { open: boolean }) => {
      useEffect(() => { mounted(); return unmounted; }, []);
      return <main>{open ? 'Menu ouvert' : 'Menu fermé'}</main>;
    };
    const { rerender } = render(<ScreenTransition screenKey="home"><Page open={false} /></ScreenTransition>);
    rerender(<ScreenTransition screenKey="home"><Page open /></ScreenTransition>);
    expect(screen.getByRole('main')).toHaveTextContent('Menu ouvert');
    expect(mounted).toHaveBeenCalledOnce(); expect(unmounted).not.toHaveBeenCalled();
    expect(screen.getByRole('main').parentElement).toHaveClass('opacity-100');
  });
});
