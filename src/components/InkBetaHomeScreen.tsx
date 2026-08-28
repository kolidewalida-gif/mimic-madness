/**
 * Accueil du thème Ink Beta.
 *
 * Cette variante reprend le langage des party-games web : une scène violette
 * très lisible, une mascotte expressive, des volumes épais et un appel à
 * l'action immédiat. Toute la logique de création, de jonction et de
 * persistance reste partagée avec les autres accueils.
 */
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  EyeOff,
  Hash,
  Headphones,
  ImageIcon,
  LogIn,
  Mic2,
  Play,
  Settings,
  SlidersHorizontal,
  Trash2,
  User,
  UsersRound,
} from 'lucide-react';

import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { useRecentLobbies } from '@/hooks/useRecentLobbies';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { GAME_MODE_META, INK_GAME_MODE_ORDER, type LobbyGameMode } from '@/lib/gameModes';
import { DeviceSettings } from '@/components/DeviceSettings';
import { NotificationCenter } from '@/components/NotificationCenter';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkDrawer, InkModal } from '@/components/menu/InkOverlay';

interface InkBetaHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

const MODE_ICONS: Partial<Record<LobbyGameMode, typeof Mic2>> = {
  normal: Mic2,
  audiophone: AudioLines,
  '2v2': UsersRound,
  quiz: CircleHelp,
  pixoguess: ImageIcon,
  undercover: EyeOff,
  memorise: Headphones,
};

const MODES = INK_GAME_MODE_ORDER.map((id) => ({
  id,
  ...GAME_MODE_META[id],
  icon: MODE_ICONS[id] ?? CircleHelp,
}));

/** Marque originale Ink Beta, dessinée localement pour rester nette partout. */
const InkBetaLogo = memo(() => (
  <h1 id="ik-main-title" className="ik-title" aria-label="Mimic Master Ink Beta">
    <span className="sr-only">Mimic Master Ink Beta</span>
    <svg className="ik-logo-svg" viewBox="0 0 680 270" aria-hidden="true" focusable="false">
      <path className="ik-logo-back" d="M76 52 605 37l39 42-22 134-531 18-48-45z" />
      <path className="ik-logo-splash" d="m48 118-35-17 31-12-20-29 47 16m565 68 34 15-35 11 16 30-42-20" />
      <g className="ik-logo-words">
        <text x="102" y="132" textLength="478" lengthAdjust="spacingAndGlyphs">MIMIC</text>
        <text x="80" y="215" textLength="525" lengthAdjust="spacingAndGlyphs">MASTER</text>
      </g>
      <path className="ik-logo-stroke" d="M119 226q216 20 430-8" />
      <g className="ik-logo-badge">
        <path d="m551 31 82 6 14 41-76 20-37-31z" />
        <text x="590" y="69">BETA</text>
      </g>
    </svg>
  </h1>
));
InkBetaLogo.displayName = 'InkBetaLogo';

/**
 * Mimo, la goutte de son Ink Beta. Son dessin est volontairement propre au
 * projet : silhouette d'encre, casque audio et petite onde de voix.
 */
const InkBetaMascot = memo(() => (
  <div className="ik-mascot" aria-hidden="true">
    <svg viewBox="0 0 360 350" focusable="false">
      <circle className="ik-mascot-ring ik-mascot-ring--outer" cx="180" cy="178" r="142" />
      <circle className="ik-mascot-ring ik-mascot-ring--inner" cx="180" cy="178" r="130" />
      <path className="ik-mascot-shadow" d="M86 252c20 47 166 58 194 3-18 57-166 62-194-3Z" />
      <path className="ik-mascot-body" d="M180 42c-46 0-91 28-105 77-12 42 6 79 7 118 0 23-16 42-6 60 9 16 30 12 45-2 15 27 44 28 59 2 18 26 48 23 61-4 17 15 39 16 47-1 8-18-8-35-8-57 1-39 18-75 6-116-14-49-59-77-106-77Z" />
      <path className="ik-mascot-forehead" d="M78 128c22-56 73-76 102-76 41 0 87 29 103 77-34-17-61-24-102-24-40 0-70 7-103 23Z" />
      <path className="ik-mascot-wave" d="M83 235c18 18 35-8 53 8 18 17 35-9 53 7 18 17 35-9 53 6 13 11 25 1 38-4 0 15 6 29 2 39-13 27-43 30-61 5-15 26-44 25-59-2-15 14-36 18-45 2-9-17 4-34 5-51Z" />
      <path className="ik-mascot-headset" d="M72 178C58 104 101 55 176 53c76-2 124 47 111 124" />
      <rect className="ik-mascot-ear" x="56" y="159" width="42" height="73" rx="19" />
      <rect className="ik-mascot-ear" x="262" y="159" width="42" height="73" rx="19" />
      <path className="ik-mascot-mic" d="M285 214c11 31-16 51-44 48" />
      <circle className="ik-mascot-mic-tip" cx="236" cy="261" r="9" />
      <g className="ik-mascot-eye">
        <circle cx="131" cy="161" r="38" />
        <circle className="ik-mascot-pupil" cx="139" cy="164" r="17" />
        <circle className="ik-mascot-glint" cx="145" cy="157" r="6" />
      </g>
      <g className="ik-mascot-eye">
        <circle cx="229" cy="161" r="38" />
        <circle className="ik-mascot-pupil" cx="221" cy="164" r="17" />
        <circle className="ik-mascot-glint" cx="227" cy="157" r="6" />
      </g>
      <path className="ik-mascot-mouth" d="M141 209q39 42 78 0-39 16-78 0Z" />
      <path className="ik-mascot-tongue" d="M166 225q16 12 31 0" />
    </svg>
    <span className="ik-mascot-pulse ik-mascot-pulse--one" />
    <span className="ik-mascot-pulse ik-mascot-pulse--two" />
  </div>
));
InkBetaMascot.displayName = 'InkBetaMascot';

const LAST_MODE_KEY = 'mimic.lastMode';

const readLastMode = (): number => {
  try {
    const index = MODES.findIndex((mode) => mode.id === localStorage.getItem(LAST_MODE_KEY));
    return index >= 0 ? index : 0;
  } catch {
    return 0;
  }
};

const InkBetaHomeScreenComponent = ({
  onCreateGame,
  onJoinGame,
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
  const [modeIndex, setModeIndex] = useState(readLastMode);

  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  const selected = MODES[modeIndex];
  const nameReady = playerName.trim().length > 0;
  const joinReady = nameReady && lobbyCode.trim().length === 4;
  const displayName = profile?.display_name || playerName || 'Joueur';
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

  const goToMode = useCallback((next: number) => {
    const length = MODES.length;
    const index = ((next % length) + length) % length;
    setModeIndex(index);
    try { localStorage.setItem(LAST_MODE_KEY, MODES[index].id); } catch { /* idem */ }
  }, []);

  const handleCreate = useCallback(() => {
    if (!nameReady) return;
    play();
    playInkSound('inkSuccess', 0.5);
    onCreateGame(playerName.trim(), selected.id as LobbyGameMode);
  }, [nameReady, play, onCreateGame, playerName, selected.id]);

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
      key: 'ArrowLeft',
      enabled: !anyOverlayOpen,
      handler: () => { playInkSound('brushTap', 0.25); goToMode(modeIndex - 1); },
      label: 'Mode précédent',
    },
    {
      key: 'ArrowRight',
      enabled: !anyOverlayOpen,
      handler: () => { playInkSound('brushTap', 0.25); goToMode(modeIndex + 1); },
      label: 'Mode suivant',
    },
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

  const accent = useMemo(
    () => ({ ['--accent' as string]: selected.accent }),
    [selected.accent],
  );
  const SelectedModeIcon = selected.icon;

  return (
    <div
      className="ik-root ik-layout-v2 menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
      style={accent}
    >
      <div className="ik-party-bg" aria-hidden="true" />
      <div className="ik-party-rays" aria-hidden="true" />
      <div className="ik-party-dots" aria-hidden="true" />

      <header className="ik-topbar relative z-[8] flex-shrink-0">
        <div className="ik-topbar-side ik-topbar-side--start">
          <span className="ik-beta-chip"><span /> Accès beta</span>
        </div>

        <InkBetaLogo />

        <div className="ik-topbar-side ik-topbar-side--end">
          <div className="ik-tools">
            {user && <span className="ik-notifications"><NotificationCenter /></span>}

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
              <User aria-hidden="true" />
              <span className="max-w-[105px] truncate">{displayName}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="ik-main custom-scrollbar relative z-[2] min-h-0 flex-1 overflow-y-auto">
        <div className="ik-canvas">
          <section className="ik-play-panel" aria-labelledby="ik-main-title">
            <div className="ik-panel-tabs" aria-label="Actions de partie">
              <span className="ik-panel-tab is-active">Nouvelle partie</span>
              <button
                type="button"
                className="ik-panel-tab menu-focus"
                disabled={!nameReady}
                onClick={() => { playInkSound('brushTap', 0.3); setShowJoin(true); }}
              >
                J'ai un code
              </button>
            </div>

            <div className="ik-play-title">
              <span className="ik-play-title-spark" aria-hidden="true">✦</span>
              <h2>Fais du bruit, imite tout !</h2>
              <span className="ik-play-title-spark" aria-hidden="true">✦</span>
            </div>

            <div className="ik-play-content">
              <div className="ik-mascot-zone">
                <InkBetaMascot />
                <div className="ik-mascot-caption">
                  <AudioLines aria-hidden="true" />
                  <span>Micro prêt · talent facultatif</span>
                </div>
              </div>

              <div className="ik-start-card">
                <div className="ik-start-heading">
                  <span>01</span>
                  <div>
                    <p>Choisis ton pseudo</p>
                    <small>Il sera visible par toute la troupe</small>
                  </div>
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

                <div className="ik-current-mode" aria-live="polite">
                  <span className="ik-current-mode-icon"><SelectedModeIcon aria-hidden="true" /></span>
                  <span>
                    <small>Mode sélectionné</small>
                    <strong>{selected.label}</strong>
                  </span>
                  <button
                    type="button"
                    className="menu-focus"
                    onClick={() => { playInkSound('brushTap', 0.25); goToMode(modeIndex + 1); }}
                  >
                    Changer
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!nameReady}
                  onClick={handleCreate}
                  className="ik-primary-action menu-focus"
                >
                  <span className="ik-primary-action-icon"><Play fill="currentColor" aria-hidden="true" /></span>
                  <span>Démarrer</span>
                </button>

                {!nameReady ? (
                  <p className="ik-start-hint" role="status">Entre un pseudo pour lancer la partie.</p>
                ) : (
                  <p className="ik-start-hint">Entrée pour jouer · J pour rejoindre</p>
                )}
              </div>
            </div>
          </section>

          <aside className="ik-mode-panel" aria-labelledby="ik-mode-title">
            <div className="ik-mode-panel-head">
              <span>Étape 02</span>
              <h2 id="ik-mode-title">Choisis un mode</h2>
            </div>

            <div className="ik-mode-feature" style={{ ['--mode-accent' as string]: selected.accent }}>
              <span className="ik-mode-feature-icon"><SelectedModeIcon aria-hidden="true" /></span>
              <div>
                <strong>{selected.label}</strong>
                <p>{selected.tagline}</p>
              </div>
              <span className="ik-mode-players">{selected.minPlayers}+</span>
            </div>

            <p className="ik-mode-description">{selected.description}</p>

            <div className="ik-mode-grid" role="group" aria-label="Modes de jeu">
              {MODES.map((mode, index) => {
                const isSelected = index === modeIndex;
                const ModeIcon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${mode.label} — ${mode.tagline}`}
                    title={mode.description}
                    onClick={() => { playInkSound('brushTap', 0.3); goToMode(index); }}
                    className={`ik-mode menu-focus${isSelected ? ' is-selected' : ''}`}
                    style={{ ['--mode-accent' as string]: mode.accent }}
                  >
                    <span className="ik-mode-icon"><ModeIcon aria-hidden="true" /></span>
                    <span className="ik-mode-name">{mode.shortLabel}</span>
                    <span className="ik-mode-check" aria-hidden="true">✓</span>
                  </button>
                );
              })}
            </div>

            <div className="ik-mode-nav" aria-label="Navigation entre les modes">
              <button
                type="button"
                className="ik-mode-nav-btn menu-focus"
                onClick={() => { playInkSound('brushTap', 0.25); goToMode(modeIndex - 1); }}
                aria-label="Mode précédent"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <p className="ik-mode-position" aria-live="polite">
                <strong>{String(modeIndex + 1).padStart(2, '0')}</strong>
                <span>/ {String(MODES.length).padStart(2, '0')}</span>
              </p>
              <button
                type="button"
                className="ik-mode-nav-btn menu-focus"
                onClick={() => { playInkSound('brushTap', 0.25); goToMode(modeIndex + 1); }}
                aria-label="Mode suivant"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </aside>
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
          <InkProfileSidebar />
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
