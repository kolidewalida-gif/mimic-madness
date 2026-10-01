import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BubbleAppearanceView, type AppearanceData } from '../BubbleAppearance';
import { BubbleProgressView, type BubbleProgressData } from '../BubbleProgress';
import { BubbleProfilePage, LevelTicket } from '../BubblePlayerUI';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkPersonalHub } from '@/components/InkPersonalHub';
import { LEVEL_REWARDS } from '@/hooks/usePlayerLevel';
import type { QuestWithProgress } from '@/hooks/useQuests';

const mock = vi.hoisted(() => ({ user: { id: 'test-player' } as { id: string } | null, updateProfile: vi.fn().mockResolvedValue(undefined), avatar: vi.fn().mockResolvedValue(true), signOut: vi.fn(), login: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user, profile: { display_name: 'Alex', avatar_url: null }, stats: { games_played: 10, games_won: 3, current_streak: 2, best_streak: 4 }, isLoading: false, updateProfile: mock.updateProfile, signOut: mock.signOut, signInWithGoogle: mock.login }) }));
vi.mock('@/hooks/useEquippedTitle', () => ({ useEquippedTitle: () => ({ equippedTitle: null }) }));
vi.mock('@/hooks/useGlobalPlayerAvatar', () => ({ useGlobalPlayerAvatar: () => ({ avatarData: { type: 'image', imageUrl: '/game-avatars/mimo-pop.svg' }, setAvatarImage: mock.avatar, isLoading: false }) }));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: vi.fn() }));
vi.mock('@/hooks/useNotificationCenter', () => ({ useNotificationCenter: () => ({ items: [], unreadCount: 0 }) }));
vi.mock('@/hooks/usePlayerLoadout', () => ({ usePlayerLoadout: () => ({ frameTier: 'none', effectTier: 'none', featuredBadge: null, prestigeScore: 0 }) }));
vi.mock('sonner', () => ({ toast: { success: mock.success, error: mock.error } }));
vi.mock('@/hooks/usePlayerLevel', async importOriginal => {
  const original = await importOriginal<typeof import('@/hooks/usePlayerLevel')>();
  return { ...original, usePlayerLevel: () => ({ level: 14, totalXp: 8200, currentXp: 600, xpForCurrentLevel: 7600, xpForNextLevel: 9200, progressPercent: 37.5, unlockedRewards: ['title_player'] }) };
});
const level = { level: 14, totalXp: 8200, currentXp: 600, xpForCurrentLevel: 7600, xpForNextLevel: 9200, progressPercent: 37.5 };
const quest = (overrides: Partial<QuestWithProgress> = {}): QuestWithProgress => ({ id: 'vote', kind: 'daily', title: 'Vote x10', description: 'Vote pour 10 imitations', icon: 'thumbs-up', color: '#38bdf8', target: 10, progress: 10, xpReward: 60, event: 'vote_imitation', isComplete: true, isClaimed: false, periodKey: 'demo', ...overrides });
const progress: BubbleProgressData = { level, streak: { current: 3, best: 7 }, daily: [quest()], weekly: [quest({ id: 'weekly', kind: 'weekly', title: 'La semaine', isComplete: false, progress: 2 })], questsLoading: false, achievements: [{ id: 'win', title: 'Première victoire', description: 'Gagne une partie', rarity: 'rare', icon: 'trophy' },{ id: 'record', title: 'Première prise', description: 'Enregistre une imitation', rarity: 'common', icon: 'mic' }], unlockedAchievementIds: ['win'], rewards: LEVEL_REWARDS, unlockedRewardIds: ['badge_beginner'] };
const appearance: AppearanceData = { name: 'Alex', level: 14, title: LEVEL_REWARDS.find(r => r.id === 'title_player')!, titles: LEVEL_REWARDS.filter(r => r.type === 'title'), unlockedIds: ['title_player','title_veteran'], frame: 'bronze', effect: 'sparkle', badge: 'Explorateur', prestige: 12 };
beforeEach(() => { vi.clearAllMocks(); mock.user = { id: 'test-player' }; });
afterEach(cleanup);

describe('Bubble progression', () => {
  it('switches daily/weekly missions and supports keyboard tabs', () => {
    render(<BubbleProgressView data={progress} signedIn onClaim={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Cette semaine' }));
    expect(screen.getByText('La semaine')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Récupérer/ })).not.toBeInTheDocument();
    const missions = screen.getByRole('tab', { name: 'Missions' });
    missions.focus(); fireEvent.keyDown(missions, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Succès' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Succès' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Première victoire')).toBeInTheDocument();
  });
  it('claims once and locks controls while waiting for the server', async () => {
    let resolve!: (value: number) => void;
    const claim = vi.fn(() => new Promise<number>(done => { resolve = done; }));
    render(<BubbleProgressView data={progress} signedIn onClaim={claim} />);
    const button = screen.getByRole('button', { name: /Récupérer 60 XP/ });
    fireEvent.click(button); fireEvent.click(button);
    expect(claim).toHaveBeenCalledTimes(1); expect(claim).toHaveBeenCalledWith('vote'); expect(button).toBeDisabled();
    resolve(60); await waitFor(() => expect(mock.success).toHaveBeenCalledWith('Mission accomplie ! +60 XP'));
    expect(screen.getByText('Récupéré')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Récupérer 60 XP/ })).not.toBeInTheDocument();
  });
  it('recovers from claim rejection without claiming success', async () => {
    const claim = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null);
    render(<BubbleProgressView data={progress} signedIn onClaim={claim} />);
    const button = screen.getByRole('button', { name: /Récupérer 60 XP/ }); fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button);
    await waitFor(() => expect(mock.error).toHaveBeenCalledTimes(2)); expect(mock.success).not.toHaveBeenCalled();
  });
  it('does not offer rewards for incomplete, claimed or guest missions', () => {
    render(<BubbleProgressView data={{ ...progress, daily: [quest({ isComplete: false, progress: 2 }), quest({ id: 'done', title: 'Finie', isClaimed: true })] }} signedIn onClaim={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Récupérer/ })).not.toBeInTheDocument(); expect(screen.getByText('Récupéré')).toBeInTheDocument();
    cleanup(); render(<BubbleProgressView data={progress} signedIn={false} onClaim={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Récupérer/ })).toBeDisabled();
  });
  it('filters earned and upcoming achievements and rewards', () => {
    render(<BubbleProgressView data={progress} signedIn onClaim={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Succès' })); fireEvent.click(screen.getByRole('button', { name: 'Gagnés' }));
    expect(screen.getByText('Première victoire')).toBeInTheDocument(); expect(screen.queryByText('Première prise')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Récompenses' })); fireEvent.click(screen.getByRole('button', { name: 'À venir' }));
    expect(screen.queryByText('Debutant')).not.toBeInTheDocument(); expect(screen.getByText('Cadre Or')).toBeInTheDocument();
  });
  it('shows a complete collection without a dead roadmap', () => {
    render(<BubbleProgressView data={{ ...progress, unlockedRewardIds: LEVEL_REWARDS.map(r => r.id) }} signedIn onClaim={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Récompenses' })); fireEvent.click(screen.getByRole('button', { name: 'À venir' }));
    expect(screen.getByText('Collection complète !')).toBeInTheDocument();
  });
  it('does not promise a nonexistent level at the maximum', () => {
    render(<LevelTicket data={{ ...level, level: 30, totalXp: 92270 }} />);
    expect(screen.getByText('Au sommet !')).toBeInTheDocument(); expect(screen.queryByText(/niveau 31/)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('Bubble wardrobe', () => {
  it('shows the equipped title and never offers a locked title for equip', () => {
    render(<BubbleAppearanceView data={appearance} signedIn onEquip={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Retirer le titre Joueur' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Équiper le titre Veteran' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Équiper le titre Legende/ })).not.toBeInTheDocument(); expect(screen.getByText('Au niveau 25')).toBeInTheDocument();
  });
  it('equips the exact title and prevents duplicate/conflicting operations', async () => {
    let resolve!: (value: boolean) => void;
    const equip = vi.fn(() => new Promise<boolean>(done => { resolve = done; })); const remove = vi.fn();
    render(<BubbleAppearanceView data={appearance} signedIn onEquip={equip} onRemove={remove} />);
    const button = screen.getByRole('button', { name: 'Équiper le titre Veteran' }); fireEvent.click(button); fireEvent.click(button);
    expect(equip).toHaveBeenCalledTimes(1); expect(equip).toHaveBeenCalledWith('title_veteran');
    expect(screen.getByRole('button', { name: 'Retirer le titre Joueur' })).toBeDisabled();
    resolve(true); await waitFor(() => expect(button).toBeEnabled()); expect(mock.success).toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
  it('removes a title through the actual callback and reports failures', async () => {
    const remove = vi.fn().mockResolvedValue(false);
    render(<BubbleAppearanceView data={appearance} signedIn onEquip={vi.fn()} onRemove={remove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retirer le titre Joueur' }));
    await waitFor(() => expect(mock.error).toHaveBeenCalled()); expect(remove).toHaveBeenCalledTimes(1); expect(mock.success).not.toHaveBeenCalled();
  });
  it('disables all mutations for guests and while loading', () => {
    render(<BubbleAppearanceView data={appearance} signedIn={false} onEquip={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Équiper/ })).toBeDisabled(); expect(screen.getByRole('button', { name: /Retirer/ })).toBeDisabled();
    cleanup(); render(<BubbleAppearanceView data={appearance} signedIn loading onEquip={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Équiper/ })).toBeDisabled();
  });
});

describe('Bubble profile', () => {
  it('starts each hub section at the top before paint', () => {
    const callbacks = { onTabChange: vi.fn(), onOpenSocial: vi.fn(), onClose: vi.fn(), onJoinLobby: vi.fn(), onAcceptInvitation: vi.fn(), onDeclineInvitation: vi.fn() };
    const { rerender } = render(<InkPersonalHub isOpen activeTab="profile" {...callbacks} />);
    const content = screen.getByRole('main');
    content.scrollTop = 250;
    rerender(<InkPersonalHub isOpen activeTab="appearance" {...callbacks} />);
    expect(content.scrollTop).toBe(0);
    expect(screen.getByText('Un style bien à toi.')).toBeInTheDocument();
  });
  it('keeps editing connected to the existing save handler', async () => {
    render(<InkProfileSidebar variant="hub" />); fireEvent.click(screen.getByRole('button', { name: 'Modifier le pseudo' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nouveau pseudo' }), { target: { value: '  Luna  ' } }); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pseudo' }));
    await waitFor(() => expect(mock.updateProfile).toHaveBeenCalledWith({ display_name: 'Luna' }));
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  });
  it('cancels editing with Escape without closing the parent or saving', () => {
    render(<InkProfileSidebar variant="hub" />); fireEvent.click(screen.getByRole('button', { name: 'Modifier le pseudo' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' }); expect(screen.queryByRole('textbox')).not.toBeInTheDocument(); expect(mock.updateProfile).not.toHaveBeenCalled();
  });
  it('keeps photo controls and shortcuts available', () => {
    const navigate = vi.fn(); render(<BubbleProfilePage onNavigate={navigate}><InkProfileSidebar variant="hub" /></BubbleProfilePage>);
    expect(screen.getByRole('button', { name: 'Changer la photo de profil' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Mon vestiaire/ })); expect(navigate).toHaveBeenCalledWith('appearance');
    expect(screen.getByRole('img', { name: 'Taux de victoire : 30%' })).toBeInTheDocument();
  });
  it('gives guests an honest profile state with a login action', () => {
    mock.user = null; render(<InkProfileSidebar variant="hub" />);
    expect(screen.queryByRole('button', { name: 'Changer la photo de profil' })).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Connexion Google' })); expect(mock.login).toHaveBeenCalledTimes(1);
  });
});
