/**
 * Accueil du thème Ink Beta.
 *
 * La logique de création, de jonction, de persistance et d'avatar reste ici.
 * La composition visuelle vit dans une vue isolée afin que les anciennes
 * générations de styles `.ik-*` ne puissent plus piloter l'accueil.
 */
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { AudioLines, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { InkBetaMascot } from '@/components/InkBetaBrand';
import { InkHome2026View } from '@/components/home/InkHome2026View';
import { type PersonalHubTab } from '@/components/personal-hub/types';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRecentLobbies } from '@/hooks/useRecentLobbies';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { GAME_AVATARS, findGameAvatarIndex } from '@/lib/gameAvatars';
import { type LobbyGameMode } from '@/lib/gameModes';

interface InkBetaHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void | Promise<void>;
  onJoinGame: (playerName: string, lobbyCode: string) => void | Promise<void>;
  onOpenPersonalHub: (tab: PersonalHubTab) => void;
  onOpenSocial: () => void;
  isPersonalHubOpen: boolean;
  isSocialOpen: boolean;
  notificationCount?: number;
}

interface InkBetaAvatarPortraitProps {
  imageUrl: string;
  alt: string;
}

const InkBetaAvatarPortrait = memo(({ imageUrl, alt }: InkBetaAvatarPortraitProps) => {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  if (hasImageError) return <InkBetaMascot />;

  return (
    <div className="ik-mascot ik-mascot--avatar">
      <div className="ik-mascot-avatar-frame">
        <img
          src={imageUrl}
          alt={alt}
          className="ik-mascot-avatar-image"
          draggable={false}
          onError={() => setHasImageError(true)}
        />
      </div>
      <span className="ik-mascot-pulse ik-mascot-pulse--one" aria-hidden="true" />
      <span className="ik-mascot-pulse ik-mascot-pulse--two" aria-hidden="true" />
    </div>
  );
});
InkBetaAvatarPortrait.displayName = 'InkBetaAvatarPortrait';

/** Sélecteur de l’avatar joueur, placé sur le grand Mimo de l’accueil. */
const InkBetaAvatarPicker = memo(() => {
  const { user, profile, updateProfile } = useAuth();
  const { avatarData, setAvatarImage, isLoading: avatarLoading } = useGlobalPlayerAvatar(
    user?.id || '',
  );
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarImageUrl =
    avatarData.type === 'image' && avatarData.imageUrl
      ? avatarData.imageUrl
      : profile?.avatar_url || undefined;
  const selectedGameAvatarIndex = findGameAvatarIndex(avatarImageUrl);
  const selectedGameAvatar = selectedGameAvatarIndex >= 0
    ? GAME_AVATARS[selectedGameAvatarIndex]
    : undefined;

  const persistAvatarImage = async (imageUrl: string, successMessage: string) => {
    if (!user || isSavingAvatar) return false;

    const previousProfileAvatar = profile?.avatar_url ?? null;
    let profileUpdated = false;
    setIsSavingAvatar(true);
    playInkSound('brushTap', 0.35);

    try {
      await updateProfile({ avatar_url: imageUrl });
      profileUpdated = true;

      const globalAvatarSaved = await setAvatarImage(imageUrl);
      if (!globalAvatarSaved) throw new Error('Global avatar persistence failed');

      toast.success(successMessage);
      playInkSound('inkSuccess', 0.5);
      return true;
    } catch (error) {
      if (profileUpdated) {
        try {
          await updateProfile({ avatar_url: previousProfileAvatar });
        } catch (rollbackError) {
          console.error('Error rolling back profile avatar:', rollbackError);
        }
      }
      console.error('Error selecting avatar:', error);
      toast.error("Impossible de changer l'avatar");
      return false;
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const selectGameAvatar = (nextIndex: number) => {
    const avatar = GAME_AVATARS[nextIndex];
    if (!avatar) return;
    void persistAvatarImage(avatar.src, `${avatar.label} équipé !`);
  };

  const stepGameAvatar = (direction: -1 | 1) => {
    const lastIndex = GAME_AVATARS.length - 1;
    const nextIndex = selectedGameAvatarIndex < 0
      ? (direction > 0 ? 0 : lastIndex)
      : (selectedGameAvatarIndex + direction + GAME_AVATARS.length) % GAME_AVATARS.length;
    selectGameAvatar(nextIndex);
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, GIF ou WebP');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      event.target.value = '';
      return;
    }

    try {
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error || new Error('Avatar file read failed'));
        reader.readAsDataURL(file);
      });
      await persistAvatarImage(imageUrl, 'Photo de profil mise à jour !');
    } catch (error) {
      console.error('Error reading avatar:', error);
      toast.error("Impossible de charger l'image");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!user) {
    return (
      <>
        <InkBetaMascot />
        <div className="ik-mascot-caption">
          <AudioLines aria-hidden="true" />
          <span>Micro prêt · talent facultatif</span>
        </div>
      </>
    );
  }

  const avatarControlsDisabled = isSavingAvatar || avatarLoading;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      <div className="ink-game-avatar-picker" aria-busy={avatarControlsDisabled}>
        <button
          type="button"
          onClick={() => stepGameAvatar(-1)}
          disabled={avatarControlsDisabled}
          aria-label="Avatar précédent"
          className="ink-game-avatar-arrow ink-game-avatar-arrow--previous menu-focus"
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <div className="ink-game-avatar-stage">
          {avatarImageUrl ? (
            <InkBetaAvatarPortrait
              imageUrl={avatarImageUrl}
              alt={`Avatar de ${profile?.display_name || 'Joueur'}`}
            />
          ) : (
            <InkBetaMascot />
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarControlsDisabled}
            aria-label="Importer une photo de profil"
            aria-busy={isSavingAvatar}
            title="Importer une photo"
            className="ink-game-avatar-edit menu-focus"
          >
            {isSavingAvatar ? (
              <span className="ink-game-avatar-spinner" aria-hidden="true" />
            ) : (
              <Camera aria-hidden="true" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => stepGameAvatar(1)}
          disabled={avatarControlsDisabled}
          aria-label="Avatar suivant"
          className="ink-game-avatar-arrow ink-game-avatar-arrow--next menu-focus"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="ink-game-avatar-caption" aria-live="polite" aria-atomic="true">
        <strong>
          {selectedGameAvatar?.label || (avatarImageUrl ? 'Photo personnalisée' : 'Choisis ton Mimo')}
        </strong>
        <span>
          {selectedGameAvatar
            ? `${String(selectedGameAvatarIndex + 1).padStart(2, '0')} / ${String(GAME_AVATARS.length).padStart(2, '0')}`
            : `${GAME_AVATARS.length} avatars du jeu`}
        </span>
      </div>
    </>
  );
});
InkBetaAvatarPicker.displayName = 'InkBetaAvatarPicker';

const InkBetaHomeScreenComponent = ({
  onCreateGame,
  onJoinGame,
  onOpenPersonalHub,
  onOpenSocial,
  isPersonalHubOpen,
  isSocialOpen,
  notificationCount = 0,
}: InkBetaHomeScreenProps) => {
  const { user, profile } = useAuth();
  const { play } = useBackgroundMusic();

  const {
    recent: recentLobbies,
    pushLobby: pushRecentLobby,
    removeLobby: removeRecentLobby,
  } = useRecentLobbies();

  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem('playerName') ?? ''; } catch { return ''; }
  });
  const [lobbyCode, setLobbyCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const nameReady = playerName.trim().length > 0;
  const joinReady = nameReady && lobbyCode.trim().length === 4;
  const displayName = profile?.display_name || playerName || 'Joueur';
  const profileAvatarUrl = user ? profile?.avatar_url || undefined : undefined;
  const anyOverlayOpen = showJoin || isPersonalHubOpen || isSocialOpen;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const name = playerName.trim();
        if (name) localStorage.setItem('playerName', name);
        else localStorage.removeItem('playerName');
      } catch { /* Le stockage peut être désactivé. */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [playerName]);

  useEffect(() => {
    if (profile?.display_name && !playerName) setPlayerName(profile.display_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  const handleCreate = useCallback(() => {
    if (!nameReady) return;
    play();
    playInkSound('inkSuccess', 0.5);
    /* Le salon reste l'unique source de vérité pour le choix du mode. */
    onCreateGame(playerName.trim());
  }, [nameReady, play, onCreateGame, playerName]);

  const handleJoin = useCallback(() => {
    const code = lobbyCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (!nameReady || code.length !== 4) return;
    play();
    playInkSound('inkSuccess', 0.5);
    pushRecentLobby(code);
    onJoinGame(playerName.trim(), code);
  }, [lobbyCode, nameReady, play, pushRecentLobby, onJoinGame, playerName]);

  useKeyboardShortcuts([
    {
      key: 'Enter',
      enabled: !anyOverlayOpen && nameReady,
      handler: handleCreate,
      label: 'Créer une partie',
    },
    {
      key: 'j',
      enabled: !anyOverlayOpen && nameReady,
      handler: () => { playInkSound('brushTap', 0.3); setShowJoin(true); },
      label: 'Rejoindre une partie',
    },
    {
      key: 's',
      enabled: !anyOverlayOpen,
      handler: () => onOpenPersonalHub('settings'),
      label: 'Paramètres',
    },
  ]);

  return (
    <InkHome2026View
      avatarPicker={<InkBetaAvatarPicker />}
      playerName={playerName}
      lobbyCode={lobbyCode}
      nameReady={nameReady}
      joinReady={joinReady}
      displayName={displayName}
      profileAvatarUrl={profileAvatarUrl}
      notificationCount={notificationCount}
      isPersonalHubOpen={isPersonalHubOpen}
      isSocialOpen={isSocialOpen}
      showJoin={showJoin}
      recentLobbies={recentLobbies}
      onPlayerNameChange={setPlayerName}
      onLobbyCodeChange={setLobbyCode}
      onCreate={handleCreate}
      onJoin={handleJoin}
      onOpenJoin={() => setShowJoin(true)}
      onCloseJoin={() => setShowJoin(false)}
      onRemoveRecentLobby={removeRecentLobby}
      onOpenPersonalHub={onOpenPersonalHub}
      onOpenSocial={onOpenSocial}
    />
  );
};

export const InkBetaHomeScreen = memo(InkBetaHomeScreenComponent);
