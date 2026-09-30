// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
import { InkVoiceFilterPicker } from '@/components/InkVoiceFilterPicker';
import type { SocialPost } from '@/hooks/useSocialFeed';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useSocialComments', () => ({ useSocialComments: () => ({ comments: [], loading: false, posting: false, addComment: vi.fn(), removeComment: vi.fn() }) }));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: vi.fn() }));
vi.mock('@/components/VideoPreview', () => ({ VideoPreview: ({ clipId }: { clipId: string }) => <div data-testid="active-video">{clipId}</div> }));
vi.mock('@/components/VideoWithAudioOverlay', () => ({ VideoWithAudioOverlay: () => <div data-testid="overlay-video" /> }));

const posts: SocialPost[] = ['Luna', 'Jade'].map((name, i) => ({ id: `p${i}`, clip_id: `clip${i}`, challenge_clip_id: null, owner_id: `owner${i}`, owner_name: name, caption: 'Une prise de la bande', week_key: 'demo', likes_count: 12, views_count: 40, is_featured: false, created_at: '2026-09-30' }));

describe('Social bubble', () => {
  beforeEach(() => { Element.prototype.scrollTo = vi.fn(); });
  afterEach(cleanup);
  const mount = () => render(<SocialTikTokViewer embedded posts={posts} startIndex={0} onClose={vi.fn()} onLike={vi.fn()} />);
  it('starts with the video, not an empty comments panel', () => {
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
  it('keeps all voice effects reachable without crowding the recording console', () => {
    render(<InkVoiceFilterPicker value={[]} onChange={vi.fn()} bubble compact />);
    expect(screen.queryByRole('button', { name: /Lutin/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Toutes les voix (16)' }));
    expect(screen.getByRole('button', { name: /Lutin/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Moins d’effets' }).getAttribute('aria-expanded')).toBe('true');
  });
});
