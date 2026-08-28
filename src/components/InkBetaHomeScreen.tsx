/**
 * Accueil du thème Ink Beta.
 *
 * Une console cyber-audio propre à Mimic Master : casque synthétique, signal
 * vocal et panneaux techniques. Toute la logique de création, de jonction,
 * d'administration et de persistance reste partagée avec les autres accueils.
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

import mimicMasterCore from '@/assets/mimic-master-logo-v2.png';
import { DeviceSettings } from '@/components/DeviceSettings';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { NotificationCenter } from '@/components/NotificationCenter';
import { InkDrawer, InkModal } from '@/components/menu/InkOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { useRecentLobbies } from '@/hooks/useRecentLobbies';
import { GAME_MODE_META, INK_GAME_MODE_ORDER, type LobbyGameMode } from '@/lib/gameModes';

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

const SIGNAL_LEVELS = [18, 34, 56, 29, 72, 43, 84, 58, 96, 68, 100, 61, 89, 47, 76, 36, 62, 28, 49, 22];

/** Marque typographique compacte, séparée des titres des portails Ink. */
const InkBetaBrand = memo(() => (
  <h1 id="ik-main-title" className="ik-home-brand" aria-label="Mimic Master Ink Beta">
    <span className="ik-brand-mark" aria-hidden="true"><AudioLines /></span>
    <span className="ik-brand-name" aria-hidden="true">
      <b>MIMIC</b>
      <strong>MASTER</strong>
    </span>
    <span className="ik-brand-edition" aria-hidden="true">INK // BETA</span>
  </h1>
));
InkBetaBrand.displayName = 'InkBetaBrand';

/** Cœur visuel construit autour du casque officiel et d'un signal audio local. */
const InkBetaCore = memo(() => (
  <div className="ik-core-zone" aria-hidden="true">
    <div className="ik-core-status">
      <span><i /> Signal link</span>
      <small>VOICE NODE // 01</small>
    </div>

    <div className="ik-core-frame">
      <span className="ik-core-corner ik-core-corner--tl" />
      <span className="ik-core-corner ik-core-corner--tr" />
      <span className="ik-core-corner ik-core-corner--bl" />
      <span className="ik-core-corner ik-core-corner--br" />
      <img
        className="ik-core-image"
        src={mimicMasterCore}
        alt=""
        draggable={false}
      />
      <span className="ik-core-scan" />
    </div>

    <div className="ik-spectrum">
      {SIGNAL_LEVELS.map((level, index) => (
        <span
          key={`${level}-${index}`}
          style={{ ['--signal-level' as string]: `${level}%`, ['--signal-delay' as string]: `${index * -47}ms` }}
        />
      ))}
    </div>

    <p className="ik-core-caption"><AudioLines /> Voice engine armed</p>
  </div>
));
InkBetaCore.displayName = 'InkBetaCore';

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
      className="ik-root ik-cyber-root menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
      style={accent}
    >
      <div className="ik-cyber-aurora" aria-hidden="true" />
      <div className="ik-cyber-grid" aria-hidden="true" />
      <div className="ik-cyber-scanlines" aria-hidden="true" />

      <header className="ik-topbar relative z-[8] flex-shrink-0">
        <InkBetaBrand />

        <div className="ik-system-strip" aria-hidden="true">
          <span><i /> Core online</span>
          <span>Voice synthesis lab</span>
        </div>

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
            <div className="ik-command-header">
              <div>
                <span>SESSION // 01</span>
                <h2>Initialise ta voix</h2>
              </div>
              <button
                type="button"
                className="ik-code-access menu-focus"
                disabled={!nameReady}
                onClick={() => { playInkSound('brushTap', 0.3); setShowJoin(true); }}
              >
                <Hash aria-hidden="true" />
                <span>J'ai un code</span>
              </button>
            </div>

            <div className="ik-play-content">
              <InkBetaCore />

              <div className="ik-start-card">
                <div className="ik-start-heading">
                  <span>OPERATOR</span>
                  <div>
                    <p>Identité joueur</p>
                    <small>Ce nom sera diffusé dans le salon</small>
                  </div>
                </div>

                <div className="ik-field">
                  <label htmlFor="ik-name" className="sr-only">Ton pseudo</label>
                  <User aria-hidden="true" />
                  <input
                    id="ik-name"
                    className="ik-input"
                    placeholder="Ton pseudo"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    maxLength={20}
                    autoComplete="nickname"
                  />
                </div>

                <div className="ik-current-mode" aria-live="polite">
                  <span className="ik-current-mode-icon"><SelectedModeIcon aria-hidden="true" /></span>
                  <span>
                    <small>Canal actif</small>
                    <strong>{selected.label}</strong>
                  </span>
                  <button
                    type="button"
                    className="menu-focus"
                    onClick={() => { playInkSound('brushTap', 0.25); goToMode(modeIndex + 1); }}
                  >
                    Suivant
                  </button>
                </div>

                <div className="ik-console-readout" aria-hidden="true">
                  <span><i /> Micro armé</span>
                  <span>Signal {String(modeIndex + 1).padStart(2, '0')}</span>
                </div>

                <button
                  type="button"
                  disabled={!nameReady}
                  onClick={handleCreate}
                  className="ik-primary-action menu-focus"
                >
                  <span className="ik-primary-action-icon"><Play fill="currentColor" aria-hidden="true" /></span>
                  <span>Lancer la session</span>
                </button>

                {!nameReady ? (
                  <p className="ik-start-hint" role="status">Renseigne ton identité pour activer la session.</p>
                ) : (
                  <p className="ik-start-hint">Entrée : lancer · J : rejoindre · S : options</p>
                )}
              </div>
            </div>
          </section>

          <aside className="ik-mode-panel" aria-labelledby="ik-mode-title">
            <div className="ik-mode-panel-head">
              <span>MATRIX // {String(MODES.length).padStart(2, '0')}</span>
              <h2 id="ik-mode-title">Canaux de jeu</h2>
            </div>

            <div className="ik-mode-feature" style={{ ['--mode-accent' as string]: selected.accent }}>
              <span className="ik-mode-feature-icon"><SelectedModeIcon aria-hidden="true" /></span>
              <div>
                <small>Canal {String(modeIndex + 1).padStart(2, '0')}</small>
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
                    <span className="ik-mode-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="ik-mode-icon"><ModeIcon aria-hidden="true" /></span>
                    <span className="ik-mode-name">{mode.shortLabel}</span>
                    <span className="ik-mode-check" aria-hidden="true" />
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
          <SlidersHorizontal aria-hidden="true" /> Réglages système
        </button>
      </footer>

      <InkDrawer
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        side="left"
        title="Mon profil"
        subtitle={`Niveau ${level}`}
        icon={<User className="h-5 w-5" />}
        className="ik-cyber-overlay ik-profile-drawer"
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
        className="ik-cyber-overlay ik-friends-drawer"
      >
        <InkFriendsSidebar />
      </InkDrawer>

      <InkModal
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        title="Rejoindre un salon"
        subtitle="Entre le code à 4 caractères"
        icon={<Hash className="h-5 w-5" />}
        className="ik-cyber-overlay ik-join-modal"
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
        className="ik-cyber-overlay ik-options-modal"
      >
        <DeviceSettings embedded showPreview onClose={() => setShowSettings(false)} />
      </InkModal>
    </div>
  );
};

export const InkBetaHomeScreen = memo(InkBetaHomeScreenComponent);
