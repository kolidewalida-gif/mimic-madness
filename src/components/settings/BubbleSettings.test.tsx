import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceSettings } from '@/components/DeviceSettings';

const mocks = vi.hoisted(() => ({
  devices: vi.fn(), changeInput: vi.fn(), reload: vi.fn(), start: vi.fn(), stop: vi.fn(), filter: vi.fn(), noise: vi.fn(),
  musicVolume: vi.fn(), sfxVolume: vi.fn(), auto: vi.fn(), theme: vi.fn(), color: vi.fn(), clearAvatar: vi.fn(), saveAvatar: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/hooks/useMediaDevices', () => ({ useMediaDevices: mocks.devices }));
vi.mock('@/hooks/useMicrophoneTest', () => ({ useMicrophoneTest: () => ({ isTesting: false, audioLevel: 0, startTest: mocks.start, stopTest: mocks.stop, noiseSuppressionEnabled: true, toggleNoiseSuppression: mocks.filter }) }));
vi.mock('@/hooks/useNoiseReduction', () => ({ useNoiseReduction: () => ({ isReady: true, isEnabled: false, error: null, toggle: mocks.noise }) }));
vi.mock('@/hooks/useBackgroundMusic', () => ({ useBackgroundMusic: () => ({ volume: .3, setVolume: mocks.musicVolume, autoMode: true, setAutoMode: mocks.auto }) }));
vi.mock('@/hooks/useSoundEffectsVolume', () => ({ useSoundEffectsVolume: () => ({ volume: .5, setVolume: mocks.sfxVolume }) }));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ inkbetaDark: false, setInkbetaDark: mocks.theme }) }));
vi.mock('@/hooks/useGlobalPlayerAvatar', () => ({ useGlobalPlayerAvatar: () => ({ avatarData: { type: 'image', imageUrl: '/avatar.png', backgroundColor: '#aabbcc' }, isLoading: false, DEFAULT_COLORS: ['#aabbcc', '#ffeebb'], setAvatarImage: mocks.saveAvatar, setAvatarColor: mocks.color, clearAvatar: mocks.clearAvatar }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useInkSoundEffects', () => ({ playInkSound: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  mocks.devices.mockReturnValue({ audioInputs: [{ deviceId: 'default', label: 'Mon micro', kind: 'audioinput' }], selectedAudioId: 'default', isLoading: false, error: null, changeAudioInput: mocks.changeInput, reloadDevices: mocks.reload });
});
afterEach(cleanup);
const openTab = (name: RegExp) => fireEvent.click(screen.getByRole('tab', { name }));

describe('Bubble settings', () => {
  it('lists devices without requesting permission simply by opening settings', () => {
    render(<DeviceSettings embedded />);
    expect(mocks.devices).toHaveBeenCalledWith({ requestPermissionOnMount: false });
    expect(screen.getByRole('combobox', { name: 'Entrée audio' })).toHaveTextContent('Mon micro');
    fireEvent.click(screen.getByRole('button', { name: 'Actualiser / autoriser' }));
    expect(mocks.reload).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Tester mon micro' }));
    expect(mocks.start).toHaveBeenCalledOnce();
  });

  it('keeps the browser and advanced noise filters independent', () => {
    render(<DeviceSettings embedded />);
    fireEvent.click(screen.getByRole('switch', { name: 'Filtre du navigateur' }));
    expect(mocks.filter).toHaveBeenCalledOnce();
    expect(mocks.noise).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('switch', { name: 'Isolation avancée' }));
    expect(mocks.noise).toHaveBeenCalledOnce();
  });

  it('supports arrow keys and restores focus to the selected tab', () => {
    render(<DeviceSettings playerId="alex" playerName="Alex" embedded />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /Micro/ }), { key: 'ArrowRight' });
    const volume = screen.getByRole('tab', { name: /Son/ });
    expect(volume).toHaveAttribute('aria-selected', 'true');
    expect(volume).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', volume.id);
    fireEvent.keyDown(volume, { key: 'End' });
    expect(screen.getByRole('tab', { name: /Avatar/ })).toHaveFocus();
  });

  it('hides avatar customization when no player identity is available', () => {
    render(<DeviceSettings embedded />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.queryByRole('tab', { name: /Avatar/ })).not.toBeInTheDocument();
  });

  it('sets both volumes from a preset and still allows individual adjustment', () => {
    render(<DeviceSettings embedded />);
    openTab(/Son/);
    fireEvent.click(screen.getByRole('button', { name: 'Équilibré' }));
    expect(mocks.musicVolume).toHaveBeenCalledWith(.4);
    expect(mocks.sfxVolume).toHaveBeenCalledWith(.5);
    fireEvent.change(screen.getByRole('slider', { name: 'Musique' }), { target: { value: '67' } });
    expect(mocks.musicVolume).toHaveBeenLastCalledWith(.67);
    fireEvent.click(screen.getByRole('switch', { name: 'Musique adaptative' }));
    expect(mocks.auto).toHaveBeenCalledWith(false);
  });

  it('applies the actual persisted dark-theme preference', () => {
    render(<DeviceSettings embedded />);
    openTab(/Ambiance/);
    expect(screen.getByRole('radio', { name: /Bubble Pop/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Bubble Night/ }));
    expect(mocks.theme).toHaveBeenCalledWith(true);
  });

  it('shows the full photo and retains avatar color and reset actions', () => {
    render(<DeviceSettings playerId="alex" playerName="Alex" embedded />);
    openTab(/Avatar/);
    expect(screen.getByRole('img', { name: 'Avatar de Alex' })).toHaveAttribute('src', '/avatar.png');
    fireEvent.click(screen.getByRole('button', { name: 'Couleur de fond 2' }));
    expect(mocks.color).toHaveBeenCalledWith('#ffeebb');
    fireEvent.click(screen.getByRole('button', { name: /Revenir à l’avatar/ }));
    expect(mocks.clearAvatar).toHaveBeenCalledOnce();
  });

  it('rejects oversized uploads without attempting to save', () => {
    render(<DeviceSettings playerId="alex" playerName="Alex" embedded />);
    openTab(/Avatar/);
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Image de l’avatar'), { target: { files: [file] } });
    expect(mocks.saveAvatar).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Image trop volumineuse' }));
  });

  it('reports unsuccessful avatar persistence and releases the upload button', async () => {
    mocks.saveAvatar.mockResolvedValue(false);
    render(<DeviceSettings playerId="alex" playerName="Alex" embedded />);
    openTab(/Avatar/);
    fireEvent.change(screen.getByLabelText('Image de l’avatar'), { target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Image non enregistrée' })));
    expect(screen.getByRole('button', { name: 'Choisir une image ou un GIF' })).toBeEnabled();
  });
});
