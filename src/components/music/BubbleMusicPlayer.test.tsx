import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BubbleMusicPlayer } from './BubbleMusicPlayer';

const music = vi.hoisted(() => ({
  volume: .4, setVolume: vi.fn(), isPlaying: false, pause: vi.fn(), play: vi.fn(),
  currentTrack: { id: 404, name: 'Poolside Chainsaw (Remix)', src: '/music/test.mp3', moods: ['epic'] as const, genre: 'Remix' },
  tracks: [{ id: 404, name: 'Poolside Chainsaw (Remix)', src: '/music/test.mp3', moods: ['epic'] as const, genre: 'Remix' }],
  nextTrack: vi.fn(), previousTrack: vi.fn(), selectTrack: vi.fn(), progress: 32, duration: 143,
  seek: vi.fn(), autoMode: true, setAutoMode: vi.fn(),
}));
vi.mock('@/hooks/useBackgroundMusic', () => ({ useBackgroundMusic: () => music }));
beforeEach(() => { vi.clearAllMocks(); music.volume = .4; music.isPlaying = false; });
afterEach(cleanup);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le jukebox' }));

describe('Bubble jukebox', () => {
  it('connects play, pause, restart and seek to the real player contract', () => {
    const view = render(<BubbleMusicPlayer />);
    fireEvent.click(screen.getByRole('button', { name: /Lire Poolside/ }));
    expect(music.play).toHaveBeenCalledOnce();
    music.isPlaying = true;
    view.rerender(<BubbleMusicPlayer />);
    fireEvent.click(screen.getByRole('button', { name: /Mettre en pause/ }));
    expect(music.pause).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer la piste' }));
    expect(music.seek).toHaveBeenCalledWith(0);
    fireEvent.change(screen.getByRole('slider', { name: 'Position de lecture' }), { target: { value: '80' } });
    expect(music.seek).toHaveBeenLastCalledWith(80);
  });

  it('remembers the last nonzero volume when unmuting', () => {
    const view = render(<BubbleMusicPlayer />);
    fireEvent.click(screen.getByRole('button', { name: 'Couper la musique' }));
    expect(music.setVolume).toHaveBeenCalledWith(0);
    music.volume = 0;
    view.rerender(<BubbleMusicPlayer />);
    fireEvent.click(screen.getByRole('button', { name: 'Réactiver la musique' }));
    expect(music.setVolume).toHaveBeenLastCalledWith(.4);
  });

  it('opens a keyboard-accessible library and restores focus after Escape', async () => {
    render(<BubbleMusicPlayer />);
    open();
    expect(screen.getByRole('dialog', { name: 'Jukebox Mimic Master' })).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fermer le jukebox' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Ouvrir le jukebox' })).toHaveFocus();
  });

  it('searches the library, handles empty results and selects a track', () => {
    render(<BubbleMusicPlayer />);
    open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Chercher une piste' }), { target: { value: 'introuvable' } });
    expect(screen.getByText('Aucune piste trouvée')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Afficher toutes les pistes' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Poolside Chainsaw/ }));
    expect(music.selectTrack).toHaveBeenCalledWith(404);
    expect(music.play).toHaveBeenCalledOnce();
  });

  it('keeps adaptive playback and volume in the mix panel', () => {
    render(<BubbleMusicPlayer />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Le mix' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Volume de la musique' }), { target: { value: '25' } });
    expect(music.setVolume).toHaveBeenCalledWith(.25);
    fireEvent.click(screen.getByRole('switch', { name: /Ambiance automatique/ }));
    expect(music.setAutoMode).toHaveBeenCalledWith(false);
    expect(screen.getByText(/blindtest garde son propre son/)).toBeInTheDocument();
  });

  it('dismisses the nonmodal library when clicking outside', async () => {
    render(<BubbleMusicPlayer />);
    open();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
