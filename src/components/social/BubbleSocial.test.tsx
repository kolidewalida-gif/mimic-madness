// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
import { InkVoiceFilterPicker } from '@/components/InkVoiceFilterPicker';
import type { SocialPost } from '@/hooks/useSocialFeed';
import { createRef } from 'react';
import { FeedTile } from '@/components/social/FeedTile';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useSocialComments', () => ({ useSocialComments: () => ({ comments: [], loading: false, posting: false, addComment: vi.fn(), removeComment: vi.fn() }) }));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: vi.fn() }));
vi.mock('@/components/VideoPreview', () => ({ VideoPreview: ({ clipId }: { clipId: string }) => <div data-testid="active-video">{clipId}</div> }));
vi.mock('@/components/VideoWithAudioOverlay', () => ({ VideoWithAudioOverlay: () => <div data-testid="overlay-video" /> }));
vi.mock('@/components/social/FeedVideo', () => ({ FeedVideo: () => <div /> }));

const posts: SocialPost[] = ['Luna', 'Jade'].map((name, i) => ({ id: `p${i}`, clip_id: `clip${i}`, challenge_clip_id: null, owner_id: `owner${i}`, owner_name: name, caption: 'Une prise de la bande', week_key: 'demo', likes_count: 12, views_count: 40, is_featured: false, created_at: '2026-09-30' }));

describe('Social bubble', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const mount = () => render(<SocialTikTokViewer embedded posts={posts} startIndex={0} onClose={vi.fn()} onLike={vi.fn()} />);
  it('starts with just the video on smaller screens', () => {
    mount();
    expect(screen.queryByRole('region', { name: 'Commentaires persistants' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Afficher les commentaires' }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Afficher les commentaires' }));
    expect(screen.getByRole('region', { name: 'Commentaires persistants' })).toBeTruthy();
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });
  it('keeps only one active publication and clamps navigation', async () => {
    mount();
    expect(screen.getByRole('button', { name: 'Publication précédente' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Publication suivante' }));
    expect(await screen.findByText('clip1')).toBeTruthy();
    expect(screen.getAllByTestId('active-video')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Publication suivante' }).hasAttribute('disabled')).toBe(true);
  });
  it('makes sound accessible even when the comments panel is closed', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Activer le son de la vidéo' }));
    expect(screen.getByRole('button', { name: 'Couper le son de la vidéo' })).toBeTruthy();
  });
  it('opens comments alongside the video on desktop and returns focus when closing', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(min-width: 1000px)', addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    mount();
    expect(screen.getByRole('region', { name: 'Commentaires persistants' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer les commentaires' }));
    expect(screen.queryByRole('region', { name: 'Commentaires persistants' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Afficher les commentaires' }));
  });
  it('accumulates gentle trackpad movement and prevents rapid skips', () => {
    vi.useFakeTimers();
    mount();
    const stage = screen.getByRole('region', { name: 'Création de Luna' });
    fireEvent.wheel(stage, { deltaY: 20 });
    fireEvent.wheel(stage, { deltaY: 20 });
    expect(screen.getByText('clip0')).toBeTruthy();
    fireEvent.wheel(stage, { deltaY: 25 });
    expect(screen.getByText('clip1')).toBeTruthy();
    fireEvent.wheel(stage, { deltaY: -120 });
    expect(screen.getByText('clip1')).toBeTruthy();
    vi.advanceTimersByTime(551);
    fireEvent.wheel(stage, { deltaY: -120 });
    expect(screen.getByText('clip0')).toBeTruthy();
  });
  it('keeps comment scrolling separate from feed navigation', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Afficher les commentaires' }));
    fireEvent.wheel(screen.getByRole('region', { name: 'Commentaires persistants' }), { deltaY: 200 });
    expect(screen.getByText('clip0')).toBeTruthy();
  });
  it('supports desktop shortcuts without hijacking the volume slider', () => {
    mount();
    const viewer = screen.getByRole('region', { name: /Lecteur Social intégré/ });
    fireEvent.keyDown(viewer, { key: 'ArrowDown' });
    expect(screen.getByText('clip1')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Volume de la vidéo' }), { key: 'ArrowUp' });
    expect(screen.getByText('clip1')).toBeTruthy();
    fireEvent.keyDown(viewer, { key: ' ' });
    expect(screen.getByRole('button', { name: 'Reprendre la lecture' })).toBeTruthy();
  });
  it('preserves the active clip when a new publication appears at the top', () => {
    const props = { embedded: true, startIndex: 0, onClose: vi.fn(), onLike: vi.fn() };
    const { rerender } = render(<SocialTikTokViewer {...props} posts={posts} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publication suivante' }));
    const freshPost = { ...posts[0], id: 'new', clip_id: 'new-clip' };
    rerender(<SocialTikTokViewer {...props} posts={[freshPost, ...posts]} />);
    expect(screen.getByText('clip1')).toBeTruthy();
    expect(screen.getAllByTestId('active-video')).toHaveLength(1);
  });
  it('exposes the grid tile element for smooth layout animations', () => {
    const ref = createRef<HTMLElement>();
    render(<FeedTile ref={ref} post={posts[0]} isOwner={false} onLike={vi.fn()} onOpen={vi.fn()} />);
    expect(ref.current?.tagName).toBe('ARTICLE');
  });
  it('keeps all voice effects reachable without crowding the recording console', () => {
    render(<InkVoiceFilterPicker value={[]} onChange={vi.fn()} bubble compact />);
    expect(screen.queryByRole('button', { name: /Lutin/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Toutes les voix (16)' }));
    expect(screen.getByRole('button', { name: /Lutin/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Moins d’effets' }).getAttribute('aria-expanded')).toBe('true');
  });
});
