// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { ImitationChat } from './ImitationChat';
import type { ChatMessage } from '@/hooks/useLobbyChat';

const mocks = vi.hoisted(() => ({ chat: vi.fn(), send: vi.fn(), sound: vi.fn() }));
vi.mock('@/hooks/useLobbyChat', () => ({ useLobbyChat: mocks.chat }));
vi.mock('@/components/LobbyChat', () => ({ SOUNDBOARD_ITEMS: [{ id: 'win', label: 'Bravo', emoji: '👏' }], playSoundboardSound: mocks.sound }));
const message = (id: string, playerId = 'luna', messageType: ChatMessage['messageType'] = 'text'): ChatMessage => ({ id, lobbyId: 'room', playerId, playerName: playerId === 'self' ? 'Alex' : 'Luna', messageType, content: messageType === 'text' ? `Message ${id}` : 'win', createdAt: '2026-09-30T12:00:00Z' });
const setMessages = (messages: ChatMessage[], allMessages = messages) => mocks.chat.mockReturnValue({ messages, allMessages, isLoading: false, isSending: false, sendMessage: mocks.send });
const players = [{ id: 'self', name: 'Alex' }, { id: 'luna', name: 'Luna' }];
const mount = (phase = 'preview', child?: React.ReactNode) => <ImitationChat lobbyId="room" playerId="self" playerName="Alex" players={players} phase={phase}>{({ button, panel }) => <div>{button}<main>{child ?? 'Le jeu'}</main>{panel}</div>}</ImitationChat>;
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Chat' }));

describe('Imitation chat', () => {
  beforeEach(() => {
    vi.clearAllMocks(); setMessages([message('history')]); mocks.send.mockResolvedValue(true);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it('starts tucked in the header without treating history as unread', () => {
    render(mount());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1599px)');
    expect(screen.getByRole('button', { name: 'Chat' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.queryByText('1')).toBeNull();
    open(); expect(screen.getByText('Message history')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Message à la bande' }));
  });
  it('counts only new visible messages from other players, once', () => {
    const view = render(mount());
    setMessages([message('history'), message('mine', 'self'), message('new')], [message('history'), message('mine', 'self'), message('new'), message('muted', 'muted')]);
    view.rerender(mount()); expect(screen.getByRole('button', { name: 'Chat 1' })).toBeTruthy();
    view.rerender(mount()); expect(screen.getByRole('button', { name: 'Chat 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chat 1' }));
    expect(screen.getByRole('button', { name: 'Chat' })).toBeTruthy();
  });
  it('retains the draft through collapsing and phase changes, and restores focus', () => {
    const view = render(mount()); open();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Salut la bande' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le chat' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chat' }));
    view.rerender(mount('imitation')); open();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Salut la bande');
  });
  it('keeps a failed message and shows an actionable error', async () => {
    mocks.send.mockResolvedValue(false); render(mount()); open();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mon message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le message' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Mon message');
  });
  it('sends with Enter and keeps Shift+Enter available for new lines', async () => {
    render(mount()); open();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Coucou  ' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true }); expect(mocks.send).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(mocks.send).toHaveBeenCalledWith('Coucou', 'text');
    await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(''));
  });
  it('prevents duplicate sends and preserves a newer draft during the request', async () => {
    let finish!: (value: boolean) => void;
    mocks.send.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
    render(mount()); open();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Premier' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Suivant' } });
    finish(true);
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Suivant');
  });
  it('silences soundboard playback and sending throughout the imitation phase', () => {
    const view = render(mount()); open(); fireEvent.click(screen.getByRole('button', { name: 'Activer les sons reçus' }));
    view.rerender(mount('imitation'));
    setMessages([message('history'), message('sound', 'luna', 'soundboard')]); view.rerender(mount('imitation'));
    expect(mocks.sound).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sons' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Écouter Bravo' }).hasAttribute('disabled')).toBe(true);
  });
  it('only plays newly received sounds when explicitly enabled', () => {
    setMessages([message('old-sound', 'luna', 'soundboard')]); const view = render(mount()); open();
    fireEvent.click(screen.getByRole('button', { name: 'Activer les sons reçus' })); expect(mocks.sound).not.toHaveBeenCalled();
    setMessages([message('old-sound', 'luna', 'soundboard'), message('new-sound', 'luna', 'soundboard')]); view.rerender(mount());
    expect(mocks.sound).toHaveBeenCalledTimes(1);
    expect(mocks.sound).toHaveBeenCalledWith('win');
  });
  it('never remounts the phase when the sidebar opens or closes', () => {
    const mounts = vi.fn(); const unmounts = vi.fn();
    const Phase = () => { useEffect(() => { mounts(); return unmounts; }, []); return <button>Enregistrer</button>; };
    render(mount('imitation', <Phase />)); open(); fireEvent.click(screen.getByRole('button', { name: 'Fermer le chat' }));
    expect(mounts).toHaveBeenCalledTimes(1); expect(unmounts).not.toHaveBeenCalled();
  });
  it('does not yank the scroll position while reading older messages', () => {
    const view = render(mount()); open();
    const log = screen.getByRole('log');
    Object.defineProperties(log, { scrollHeight: { value: 1000, configurable: true }, clientHeight: { value: 200, configurable: true } });
    log.scrollTop = 100; fireEvent.scroll(log);
    setMessages([message('history'), message('new')]); view.rerender(mount());
    expect(log.scrollTop).toBe(100);
    fireEvent.click(screen.getByRole('button', { name: '1 nouveau message' }));
    expect(log.scrollTop).toBe(1000);
  });
  it('counts arrivals while browsing GIFs without leaving hidden controls focusable', () => {
    const view = render(mount()); open(); fireEvent.click(screen.getByRole('button', { name: 'GIF' }));
    expect(screen.queryByRole('log')).toBeNull();
    setMessages([message('history'), message('new')]); view.rerender(mount());
    expect(screen.getByRole('button', { name: 'Chat 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retour aux messages' }));
    expect(screen.getByRole('log')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chat' })).toBeTruthy();
  });
  it('does not submit during IME composition', () => {
    render(mount()); open(); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bonjour' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', isComposing: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('uses a focus-trapped dialog on smaller screens and closes the picker first', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(mount()); open(); expect(screen.getByRole('dialog', { name: 'Chat de la partie' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'GIF' }));
    expect(screen.getByRole('searchbox')).toBeTruthy();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('searchbox')).toBeNull());
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chat' }));
  });
  it('keeps the studio mounted and the draft intact when the temporary chat closes', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const mounts = vi.fn(); const unmounts = vi.fn();
    const Phase = () => { useEffect(() => { mounts(); return unmounts; }, []); return <video data-testid="reference" />; };
    render(mount('imitation', <Phase />));
    const video = screen.getByTestId('reference');
    open();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'On se retrouve au vote' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le chat' }));
    expect(screen.getByTestId('reference')).toBe(video);
    expect(mounts).toHaveBeenCalledTimes(1); expect(unmounts).not.toHaveBeenCalled();
    open(); expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('On se retrouve au vote');
  });
});
