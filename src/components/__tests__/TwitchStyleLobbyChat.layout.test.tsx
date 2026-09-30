import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/hooks/useLobbyChat';
import { TwitchStyleLobbyChat } from '@/components/TwitchStyleLobbyChat';

const mocks = vi.hoisted(() => ({ useLobbyChat: vi.fn(), sendMessage: vi.fn() }));
vi.mock('@/hooks/useLobbyChat', () => ({ useLobbyChat: mocks.useLobbyChat }));
vi.mock('@/hooks/useChatColor', () => ({ useChatColor: () => ({ colorId: 'default' }) }));
vi.mock('@/hooks/useQuestTracker', () => ({ useQuestTracker: () => ({ track: vi.fn() }) }));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: vi.fn() }));

const messages: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
  id: `message-${i}`, lobbyId: 'room', playerId: 'alex', playerName: 'Alex',
  content: i % 5 === 0 ? '/game-avatars/mimo-pop.svg' : `Message ${i} ${'long'.repeat(70)}`,
  messageType: i % 5 === 0 ? 'gif' : 'text', createdAt: new Date(2026, 8, 30, 12, i),
}));
const chat = () => <TwitchStyleLobbyChat lobbyId="room" playerId="alex" playerName="Alex" />;
const setMessages = (list: ChatMessage[]) => mocks.useLobbyChat.mockReturnValue({
  messages: list, isLoading: false, isSending: false, sendMessage: mocks.sendMessage,
});

beforeEach(() => { vi.clearAllMocks(); setMessages(messages); });
afterEach(cleanup);

describe('lobby chat scroll boundaries', () => {
  // JSDOM cannot measure CSS layout; actual empty/full panel heights are checked
  // separately in the browser. These tests protect the scroll container contract.
  it('keeps all 100 messages in a separate keyboard-accessible scroll region', () => {
    render(chat());
    const region = screen.getByRole('region', { name: 'Messages du salon' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('min-h-0', 'overflow-y-auto', 'overscroll-contain');
    expect(region.children).toHaveLength(100);
    expect(region.querySelectorAll('img')).toHaveLength(20);
    expect(region.firstElementChild).toHaveClass('flex-shrink-0');
    expect(region).not.toContainElement(screen.getByRole('textbox', { name: 'Message' }));
    expect(region.parentElement).toHaveClass('lobby-chat', 'overflow-hidden');
  });

  it('preserves reading position on new messages and can return to the latest', () => {
    const view = render(chat());
    const region = screen.getByRole('region', { name: 'Messages du salon' });
    Object.defineProperties(region, {
      scrollHeight: { configurable: true, value: 5000 },
      clientHeight: { configurable: true, value: 300 },
    });
    const scrollTo = vi.fn();
    Object.defineProperty(region, 'scrollTo', { configurable: true, value: scrollTo });
    region.scrollTop = 200;
    fireEvent.scroll(region);
    setMessages([...messages, { ...messages[0], id: 'new-message' }]);
    view.rerender(chat());
    expect(region.scrollTop).toBe(200);
    fireEvent.click(screen.getByRole('button', { name: 'Nouveaux messages' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 5000, behavior: 'smooth' });
    expect(region.scrollTop).toBe(5000);
    expect(screen.queryByRole('button', { name: 'Nouveaux messages' })).not.toBeInTheDocument();
  });
});
