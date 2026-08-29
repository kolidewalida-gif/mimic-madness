/**
 * Accueil du thème Ink Beta.
 *
 * Cette variante reprend le langage des party-games web : une scène violette
 * très lisible, une mascotte expressive, des volumes épais et un appel à
 * l'action immédiat. Toute la logique de création, de jonction et de
 * persistance reste partagée avec les autres accueils.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AudioLines,
  Camera,
  ChevronLeft,
  ChevronRight,
  Hash,
  LogIn,
  Play,
  Settings,
  Share2,
  SlidersHorizontal,
  Trash2,
  User,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useGlobalPlayerAvatar } from '@/hooks/useGlobalPlayerAvatar';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { useRecentLobbies } from '@/hooks/useRecentLobbies';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { GAME_AVATARS, findGameAvatarIndex } from '@/lib/gameAvatars';
import { type LobbyGameMode } from '@/lib/gameModes';
import { DeviceSettings } from '@/components/DeviceSettings';
import { MusicPlayerBar } from '@/components/MusicPlayerBar';
import { NotificationCenter } from '@/components/NotificationCenter';
import { InkBetaLogo, InkBetaMascot } from '@/components/InkBetaBrand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkDrawer, InkModal } from '@/components/menu/InkOverlay';

interface InkBetaHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
  /** Ouvre le Social Studio, monté par la page. */
  onOpenSocial?: () => void;
}

/*
 * La table d'icônes de mode et la liste `MODES` ont disparu avec le sélecteur de
 * l'accueil : seul le salon choisit le mode, et ses tuiles portent leurs propres
 * vignettes, chargées depuis `GAME_MODE_META`.
 */

/*
 * La marque et Mimo vivent dans `InkBetaBrand` : le lobby beta affiche
 * exactement les mêmes dessins, et les recopier ici aurait fait diverger les
 * deux écrans à la première retouche.
 */

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
  onOpenSocial,
}: InkBetaHomeScreenProps) => {
  const { user, profile } = useAuth();
  const { play } = useBackgroundMusic();
  const { level } = usePlayerLevel();

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
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  const nameReady = playerName.trim().length > 0;
  const joinReady = nameReady && lobbyCode.trim().length === 4;
  const displayName = profile?.display_name || playerName || 'Joueur';
  const profileAvatarUrl = user ? profile?.avatar_url || undefined : undefined;
  const anyOverlayOpen = showJoin || showSettings || showProfile || showFriends;

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
    /*
     * Aucun mode transmis : `createLobby` ne l'écrit pas, et le salon a son
     * propre sélecteur, qui est la seule source de vérité.
     */
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
    /* Les flèches gauche et droite parcouraient les modes : plus rien à parcourir. */
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
      handler: () => setShowSettings(true),
      label: 'Paramètres',
    },
  ]);

  return (
    <div
      /*
        `ik-home-v2` porte la composition propre à l'accueil. Elle vivait sur
        `ik-layout-v2`, que le salon et les écrans de jeu portent aussi : ses
        règles fuyaient sur eux et masquaient notamment leur pastille de manche.

        La variable `--accent`, qui suivait le mode choisi, a disparu avec le
        sélecteur : plus aucune règle beta ne la lit.
      */
      className="ik-root ik-layout-v2 ik-home-v2 menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
    >
      <div className="ik-party-bg" aria-hidden="true" />
      <div className="ik-party-rays" aria-hidden="true" />
      <div className="ik-party-dots" aria-hidden="true" />

      <header className="ik-topbar relative z-[8] flex-shrink-0">
        {/* La pastille « Accès beta » a été retirée : le logo porte déjà le badge. */}

        <InkBetaLogo />

        <div className="ik-topbar-side ik-topbar-side--end">
          <div className="ik-tools">
            {user && <span className="ik-notifications"><NotificationCenter /></span>}

            {/*
              Social remis dans la barre : le dialogue était déjà monté par la
              page pour toute la famille Ink, mais l'accueil beta n'avait aucun
              bouton pour l'ouvrir.
            */}
            {onOpenSocial && (
              <button
                type="button"
                onClick={() => { playInkSound('brushTap', 0.3); onOpenSocial(); }}
                className="ik-tool menu-focus"
                aria-label="Ouvrir le Social Studio"
              >
                <Share2 aria-hidden="true" />
                <span>Social</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { playInkSound('brushTap', 0.3); setShowFriends(true); }}
              className="ik-tool menu-focus"
              aria-label="Mes amis"
            >
              <UsersRound aria-hidden="true" />
              <span>Amis</span>
            </button>

            <button
              type="button"
              onClick={() => { playInkSound('inkClick', 0.3); setShowSettings(true); }}
              className="ik-tool menu-focus"
              aria-label="Paramètres"
            >
              <Settings aria-hidden="true" />
              <span>Options</span>
            </button>

            <button
              type="button"
              onClick={() => { playInkSound('inkClick', 0.3); setShowProfile(true); }}
              className="ik-tool ik-tool--profile menu-focus"
              aria-label={`Profil de ${displayName}`}
            >
              {profileAvatarUrl ? (
                <Avatar className="ik-profile-thumb" aria-hidden="true">
                  <AvatarImage src={profileAvatarUrl} className="object-cover" />
                  <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <User aria-hidden="true" />
              )}
              <span className="max-w-[105px] truncate">{displayName}</span>
            </button>
          </div>
        </div>
      </header>

      <main
        className="ik-main custom-scrollbar relative z-[2] min-h-0 flex-1 overflow-y-auto"
        aria-labelledby="ik-home-tagline"
      >
        <div className="ik-canvas ik-home-scene">
          <section className="ik-home-hero" aria-labelledby="ik-home-tagline">
            <div className="ik-home-hero-copy">
              <span className="ik-home-kicker">
                <AudioLines aria-hidden="true" />
                Le party game qui donne de la voix
              </span>
              <h2 id="ik-home-tagline">
                Fais du bruit.
                <em>Marque les esprits.</em>
              </h2>
              <p>Choisis ton pseudo, ouvre le salon et laisse ta troupe décider du chaos.</p>
            </div>

            <div className="ik-home-promises" aria-label="Les points forts de la partie">
              <span><Play fill="currentColor" aria-hidden="true" /> Salon prêt en un instant</span>
              <span><UsersRound aria-hidden="true" /> Mode choisi en équipe</span>
            </div>
          </section>

          <div className="ik-home-stage">
            <section className="ik-home-card ik-home-identity" aria-labelledby="ik-home-name-title">
              <span className="ik-home-card-index" aria-hidden="true">01</span>

              <div className="ik-home-identity-layout">
                <div className="ik-mascot-zone">
                  <span className="ik-home-avatar-label">Ton avatar</span>
                  <InkBetaAvatarPicker />
                </div>

                <div className="ik-home-name-card">
                  <div className="ik-step">
                    <span>Étape 01</span>
                    <h3 id="ik-home-name-title">Entre dans le jeu</h3>
                    <p>Un pseudo, et la troupe saura qui applaudir — ou accuser.</p>
                  </div>

                  <div className="ik-field">
                    <label htmlFor="ik-name" className="sr-only">Ton pseudo</label>
                    <User aria-hidden="true" />
                    <input
                      id="ik-name"
                      className="ik-input"
                      placeholder="Ton pseudo cool"
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                      maxLength={20}
                      autoComplete="nickname"
                    />
                  </div>

                  <p className={`ik-home-name-state${nameReady ? ' is-ready' : ''}`} role="status">
                    <span aria-hidden="true" />
                    {nameReady
                      ? 'Pseudo prêt — la scène t’attend.'
                      : 'Écris ton pseudo pour déverrouiller le salon.'}
                  </p>
                </div>
              </div>
            </section>

            <section className="ik-home-card ik-home-launch" aria-labelledby="ik-home-launch-title">
              <span className="ik-home-card-index" aria-hidden="true">02</span>

              <div className="ik-step">
                <span>Étape 02</span>
                <h3 id="ik-home-launch-title">Rassemble la troupe</h3>
                <p>Crée une partie ou rejoins un salon en quelques secondes.</p>
              </div>

              <div className="ik-home-mode-note">
                <UsersRound aria-hidden="true" />
                <span>Le mode se choisit ensemble, une fois dans le salon.</span>
              </div>

              <div className="ik-launch-action">
                <div className="ik-launch-buttons">
                  <button
                    type="button"
                    disabled={!nameReady}
                    onClick={handleCreate}
                    className="ik-primary-action menu-focus"
                  >
                    <span className="ik-primary-action-icon">
                      <Play fill="currentColor" aria-hidden="true" />
                    </span>
                    <span className="ik-home-action-copy">
                      <strong>Créer mon salon</strong>
                      <small>Je deviens l'hôte</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!nameReady}
                    onClick={() => { playInkSound('brushTap', 0.3); setShowJoin(true); }}
                    className="ik-secondary-action menu-focus"
                  >
                    <Hash aria-hidden="true" />
                    <span className="ik-home-action-copy">
                      <strong>J'ai un code</strong>
                      <small>Je rejoins la troupe</small>
                    </span>
                  </button>
                </div>

                {!nameReady ? (
                  <p className="ik-start-hint" role="status">Entre ton pseudo pour lancer la partie.</p>
                ) : (
                  <p className="ik-start-hint">Entrée : créer · J : rejoindre</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>


      <footer className="ik-footer relative z-[7] flex-shrink-0">
        <span className="ik-footer-brand">Mimic Master <b>Ink Beta</b></span>
        <nav aria-label="Informations légales">
          <Link className="menu-focus" to="/confidentialite">Confidentialité</Link>
          <Link className="menu-focus" to="/conditions">Conditions</Link>
          <Link className="menu-focus" to="/mentions-legales">Mentions légales</Link>
        </nav>
        <button
          type="button"
          className="ik-footer-settings menu-focus"
          onClick={() => setShowSettings(true)}
        >
          <SlidersHorizontal aria-hidden="true" /> Réglages rapides
        </button>
      </footer>

      <InkDrawer
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        side="left"
        title="Mon profil"
        subtitle={`Niveau ${level}`}
        icon={<User className="h-5 w-5" />}
        className="ik-party-overlay ik-profile-drawer"
      >
        <div className="flex flex-col gap-3">
          <InkProfileSidebar variant="inkBeta" />
          <button
            type="button"
            className="ik-secondary-action menu-focus"
            onClick={() => { setShowProfile(false); setShowFriends(true); }}
          >
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Mes amis
          </button>
        </div>
      </InkDrawer>

      <InkDrawer
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        side="left"
        title="Mes amis"
        icon={<UsersRound className="h-5 w-5" />}
        className="ik-party-overlay ik-friends-drawer"
      >
        <InkFriendsSidebar />
      </InkDrawer>

      <InkModal
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        title="Rejoindre un salon"
        subtitle="Entre le code à 4 caractères"
        icon={<Hash className="h-5 w-5" />}
        className="ik-party-overlay ik-join-modal"
      >
        <form
          className="ik-join-form"
          onSubmit={(event) => { event.preventDefault(); handleJoin(); }}
        >
          <div className="ik-field ik-code-field">
            <label htmlFor="ik-code" className="sr-only">Code du salon</label>
            <Hash aria-hidden="true" />
            <input
              id="ik-code"
              data-autofocus
              className="ik-input"
              placeholder="XXXX"
              value={lobbyCode}
              onChange={(event) =>
                setLobbyCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))
              }
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {recentLobbies.length > 0 && (
            <div className="ik-recent-lobbies">
              <h3>Salons récents</h3>
              <ul>
                {recentLobbies.map((entry) => (
                  <li key={entry.code}>
                    <button
                      type="button"
                      onClick={() => { setLobbyCode(entry.code); playInkSound('brushTap', 0.3); }}
                      className="ik-recent-code menu-focus"
                    >
                      {entry.code}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecentLobby(entry.code)}
                      className="ik-recent-remove menu-focus"
                      aria-label={`Supprimer le lobby récent ${entry.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ik-join-actions">
            <button
              type="button"
              className="ik-secondary-action menu-focus"
              onClick={() => setShowJoin(false)}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="ik-primary-action menu-focus"
              disabled={!joinReady}
            >
              <LogIn aria-hidden="true" /> Rejoindre
            </button>
          </div>

          {!joinReady && lobbyCode.length > 0 && (
            <p className="ik-form-message">Le code doit contenir 4 caractères et ton pseudo doit être renseigné.</p>
          )}
        </form>
      </InkModal>

      <InkModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Options"
        subtitle="Audio, volume et apparence"
        icon={<Settings className="h-5 w-5" />}
        className="ik-party-overlay ik-options-modal"
      >
        <DeviceSettings embedded showPreview onClose={() => setShowSettings(false)} />
      </InkModal>
    </div>
  );
};

export const InkBetaHomeScreen = memo(InkBetaHomeScreenComponent);
