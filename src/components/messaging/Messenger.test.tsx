// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectConversation } from './Conversation';
import { FriendsMessenger } from './FriendsMessenger';
import { useState } from 'react';

const mocks = vi.hoisted(() => ({ send: vi.fn(), read: vi.fn(), create: vi.fn(), update: vi.fn(), leave: vi.fn(), request: vi.fn(), user: { id: 'self' }, groupsAvailable: true }));
const contacts = [{ user_id: 'luna', display_name: 'Luna', avatar_url: null }, { user_id: 'jade', display_name: 'Jade', avatar_url: null }];
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, profile: { display_name: 'Alex' }, friendCode: 'ABCDEFGH', isLoading: false, signInWithGoogle: vi.fn() }) }));
vi.mock('@/hooks/useDirectMessages', () => ({ useUnreadCounts: () => ({ luna: 2 }), useDirectMessages: () => ({ messages: [], loading: false, error: '', send: mocks.send, markRead: mocks.read, hasMore: false, loadingOlder: false, loadOlder: vi.fn() }) }));
vi.mock('@/hooks/useMessageGroups', () => ({ useMessageGroups: () => ({ groups: [{ id: 'group1', name: 'La bande', owner_id: 'self', members: [{ user_id: 'self', display_name: 'Alex' }, ...contacts], last_message: null, created_at: '2026-09-30', unread_count: 0 }], available: mocks.groupsAvailable, create: mocks.create, update: mocks.update, leave: mocks.leave }), useGroupMessages: () => ({ messages: [], loading: false, error: '', send: mocks.send, markRead: mocks.read, hasMore: false, loadingOlder: false, loadOlder: vi.fn() }) }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: contacts, pendingRequests: [], isLoading: false, sendFriendRequest: mocks.request, acceptFriendRequest: vi.fn(), rejectFriendRequest: vi.fn() }) }));
vi.mock('@/hooks/useOnlinePresence', () => ({ useOnlinePresence: () => ({ getUserStatus: () => ({ online: true, lobbyCode: null }) }) }));
vi.mock('@/hooks/useGameInvitations', () => ({ useGameInvitations: () => ({ pendingInvitations: [], sendInvitation: vi.fn(), acceptInvitation: vi.fn(), declineInvitation: vi.fn() }) }));
function Standalone() { const [draft, setDraft] = useState(''); return <DirectConversation friend={contacts[0]} subtitle="Conversation privée" draft={draft} onDraft={setDraft} />; }
describe('Friends messenger', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.groupsAvailable = true; mocks.send.mockResolvedValue({ data: { id: 'sent' }, error: null }); mocks.read.mockResolvedValue(undefined); mocks.create.mockResolvedValue('group2'); });
  afterEach(cleanup);
  it('opens conversations in place and keeps a separate draft per friend', () => {
    render(<FriendsMessenger />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la conversation avec Luna' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message à Luna' }), { target: { value: 'Pour Luna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la conversation avec Jade' }));
    expect((screen.getByRole('textbox', { name: 'Message à Jade' }) as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la conversation avec Luna' }));
    expect((screen.getByRole('textbox', { name: 'Message à Luna' }) as HTMLTextAreaElement).value).toBe('Pour Luna');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('filters people and groups by name', () => {
    render(<FriendsMessenger />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Rechercher un ami ou un groupe' }), { target: { value: 'bande' } });
    expect(screen.getByRole('button', { name: 'Ouvrir le groupe La bande' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ouvrir la conversation avec Luna' })).toBeNull();
  });
  it('requires two friends and a name to create a group', async () => {
    render(<FriendsMessenger />); fireEvent.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    const form = screen.getByRole('region', { name: 'Créer un groupe' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nom du groupe' }), { target: { value: 'Les copains' } });
    expect(form.querySelector('button[type=submit]')?.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Luna' })); fireEvent.click(screen.getByRole('checkbox', { name: 'Jade' }));
    fireEvent.click(form.querySelector('button[type=submit]')!);
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Les copains', ['luna', 'jade']));
  });
  it('disables group creation honestly when the backend migration is unavailable', () => {
    mocks.groupsAvailable = false; render(<FriendsMessenger />);
    expect(screen.getByRole('button', { name: 'Créer un groupe' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Groupes indisponibles pour le moment.')).toBeTruthy();
  });
  it('preserves failed messages and does not pretend they were sent', async () => {
    mocks.send.mockResolvedValue({ data: null, error: new Error('offline') }); render(<Standalone />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Coucou' } }); fireEvent.click(screen.getByRole('button', { name: 'Envoyer le message' }));
    expect(await screen.findByRole('alert')).toBeTruthy(); expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Coucou');
  });
  it('prevents duplicate sends and does not erase a newer draft', async () => {
    let finish!: (value: unknown) => void; mocks.send.mockReturnValue(new Promise(resolve => { finish = resolve; })); render(<Standalone />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Premier' } }); fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' }); fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Suivant' } }); await act(async () => finish({ data: {}, error: null }));
    expect(mocks.send).toHaveBeenCalledTimes(1); expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Suivant');
  });
  it('supports Shift+Enter and IME input without accidental sending', () => {
    render(<Standalone />); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bonjour' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true }); fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', isComposing: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('requires an explicit second action to leave a group', async () => {
    render(<FriendsMessenger />); fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le groupe La bande' })); fireEvent.click(screen.getByRole('button', { name: 'Membres' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitter le groupe' })); expect(mocks.leave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer mon départ' })); await waitFor(() => expect(mocks.leave).toHaveBeenCalledWith('group1'));
  });
});
