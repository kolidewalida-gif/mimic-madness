/**
 * Menu « Kiosque » — thème `inkbeta`, beta fermée administrateurs.
 *
 * Écrit de zéro, pas dérivé d'`InkHomeScreen`. L'objectif est de corriger ce
 * qui rendait le menu stable générique, et trois de ces défauts sont
 * structurels, pas décoratifs :
 *
 *  1. L'action primaire (pseudo, Créer, Rejoindre) vivait à l'intérieur du
 *     panneau descriptif, qui se re-rend à chaque changement de mode. Elle est
 *     ici dans un « billet » fixe, en bas, qui ne bouge jamais.
 *  2. L'en-tête entassait huit contrôles dans une bande à défilement
 *     horizontal, illisible au doigt. Il en reste trois ; le reste est
 *     accessible depuis le tiroir profil et les paramètres, qui existaient déjà.
 *  3. Les sept modes défilaient dans une rangée, artwork désaturé au repos.
 *     Ils sont maintenant tous visibles d'un coup, en pleine saturation.
 *
 * Tout le vocabulaire visuel vit dans la couche `.kq-*` en fin de
 * `src/index.css`, commutable entre surface papier et surface encre.
 */
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Hash,
  Keyboard,
  LogIn,
  Moon,
  Play,
  Settings,
  Sun,
  Trash2,
  User,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { useRecentLobbies } from '@/hooks/useRecentLobbies';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/hooks/useTheme';
import { GAME_MODE_META, INK_GAME_MODE_ORDER, type LobbyGameMode } from '@/lib/gameModes';
import { DeviceSettings } from '@/components/DeviceSettings';
import { NotificationCenter } from '@/components/NotificationCenter';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkDrawer, InkModal } from '@/components/menu/InkOverlay';
import { InkShortcutsModal } from '@/components/InkShortcutsModal';
import { GameImage } from '@/components/game-ui/GameUI';

interface InkBetaHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

/**
 * Illustrations propres à la beta.
 *
 * Les cartes du thème stable portent le nom du mode et un compteur de joueurs
 * peints dans l'image — le nom faisait donc doublon avec le titre rendu en CSS,
 * et le compteur contredisait `minPlayers` (« 1 JOUEUR » sur un mode qui en
 * exige 2). Ces sérigraphies-ci ne contiennent aucun texte : le nom et le
 * nombre de joueurs viennent tous les deux de `GAME_MODE_META`.
 *
 * Le thème `ink` stable continue de lire `meta.imageCandidates`, intact. Les
 * anciennes cartes restent en repli si un fichier manque.
 */
const BETA_ART: Partial<Record<LobbyGameMode, string>> = {
  normal: '/lobby/cards/kiosque/normal.png',
  audiophone: '/lobby/cards/kiosque/audiophone.png',
  '2v2': '/lobby/cards/kiosque/2v2.png',
  quiz: '/lobby/cards/kiosque/quiz.png',
  pixoguess: '/lobby/cards/kiosque/pixoguess.png',
  undercover: '/lobby/cards/kiosque/undercover.png',
  memorise: '/lobby/cards/kiosque/memorise.png',
};

/** Dérivé de la source unique `GAME_MODE_META`, comme le menu stable. */
const MODES = INK_GAME_MODE_ORDER.map((id) => {
  const meta = GAME_MODE_META[id];
  const beta = BETA_ART[id];
  return {
    id,
    ...meta,
    /* La sérigraphie d'abord, les anciennes cartes en repli. */
    imageCandidates: beta ? [beta, ...meta.imageCandidates] : meta.imageCandidates,
  };
});

/** Clé du dernier mode joué. Le menu stable démarrait sur un index figé. */
const LAST_MODE_KEY = 'mimic.lastMode';

const readLastMode = (): number => {
  try {
    const stored = localStorage.getItem(LAST_MODE_KEY);
    const index = MODES.findIndex((m) => m.id === stored);
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
  const { betaSurface, setBetaSurface } = useTheme();
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
  const [showShortcuts, setShowShortcuts] = useState(false);

  const selected = MODES[modeIndex];
  const nameReady = playerName.trim().length > 0;
  const joinReady = nameReady && lobbyCode.trim().length === 4;
  const displayName = profile?.display_name || playerName || 'Joueur';

  const anyOverlayOpen =
    showJoin || showSettings || showProfile || showFriends || showShortcuts;

  /* Le pseudo sert d'identité aux invitations : on le garde en mémoire. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const name = playerName.trim();
        if (name) localStorage.setItem('playerName', name);
        else localStorage.removeItem('playerName');
      } catch { /* stockage désactivable */ }
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

  const toggleSurface = useCallback(() => {
    playInkSound('brushTap', 0.3);
    setBetaSurface(betaSurface === 'paper' ? 'ink' : 'paper');
  }, [betaSurface, setBetaSurface]);

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
      label: 'Lancer la partie',
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
      label: 'Ouvrir les paramètres',
    },
    {
      key: '?',
      shift: true,
      enabled: !anyOverlayOpen,
      handler: () => setShowShortcuts(true),
      label: 'Afficher les raccourcis',
    },
  ]);

  const accentStyle = useMemo(
    () => ({ ['--accent' as string]: selected.accent }),
    [selected.accent],
  );

  return (
    <div
      className="kq-root menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
      style={accentStyle}
    >
      <div className="kq-grain" aria-hidden="true" />

      {/* ============ BANDEAU DE TÊTE — trois entrées ============
          Amis, Social, Sans pub et Langue vivent dans le tiroir profil
          et les paramètres. Huit cibles alignées ici imposaient une
          bande à défilement horizontal sur téléphone. */}
      <header className="kq-masthead flex flex-shrink-0 items-center justify-between gap-3 px-3 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="kq-display kq-h2 truncate">Mimic Master</span>
          <span
            className="kq-tag"
            style={{ ['--accent' as string]: 'var(--kq-yellow)' }}
            title="Interface en test, réservée aux administrateurs"
          >
            Beta
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
          {user && <NotificationCenter />}

          <button
            type="button"
            onClick={toggleSurface}
            className="kq-icon-btn menu-focus"
            aria-label={
              betaSurface === 'paper' ? 'Passer sur la surface encre' : 'Passer sur la surface papier'
            }
            title={betaSurface === 'paper' ? 'Surface papier' : 'Surface encre'}
          >
            {betaSurface === 'paper'
              ? <Sun className="h-[18px] w-[18px]" />
              : <Moon className="h-[18px] w-[18px]" />}
          </button>

          <button
            type="button"
            onClick={() => { playInkSound('inkClick', 0.3); setShowSettings(true); }}
            className="kq-icon-btn menu-focus"
            aria-label="Paramètres"
            title="Paramètres"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>

          <button
            type="button"
            onClick={() => { playInkSound('inkClick', 0.3); setShowProfile(true); }}
            className="kq-btn kq-btn--sm menu-focus"
            aria-label={`Ouvrir le profil de ${displayName}`}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="hidden max-w-[110px] truncate sm:inline">{displayName}</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline">Niv {level}</span>
          </button>
        </div>
      </header>

      {/* ============ CORPS ============ */}
      <main className="custom-scrollbar relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3 sm:gap-4">

          {/* ---- Affiche mise en avant ---- */}
          <section className="kq-feature" aria-labelledby="kq-mode-name">
            <span className="kq-feature-art" aria-hidden="true">
              <GameImage
                candidates={selected.imageCandidates}
                alt=""
                fallback={<span aria-hidden="true">{selected.fallbackEmoji}</span>}
              />
            </span>

            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="kq-tag">{selected.minPlayers}+ joueurs</span>
              </div>

              <h2 id="kq-mode-name" className="kq-display kq-h1">
                {selected.label}
              </h2>
              <p className="kq-display mt-0.5 text-lg" style={{ color: 'var(--kq-text-dim)', textShadow: 'none' }}>
                {selected.tagline}
              </p>
              <p className="kq-muted mt-2 max-w-[52ch] text-sm leading-relaxed">
                {selected.description}
              </p>
            </div>
          </section>

          {/* ---- Mur d'affiches ---- */}
          <section>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <h3 className="kq-label">Choisis ton mode</h3>
              <span className="kq-label hidden sm:inline" aria-hidden="true">← →</span>
            </div>

            <div className="kq-wall" role="group" aria-label="Modes de jeu">
              {MODES.map((mode, index) => {
                const isSelected = index === modeIndex;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={isSelected}
                    title={mode.label}
                    onClick={() => { playInkSound('brushTap', 0.3); goToMode(index); }}
                    className={`kq-poster menu-focus${isSelected ? ' is-selected' : ''}`}
                    style={{ ['--accent' as string]: mode.accent }}
                  >
                    {isSelected && (
                      <span className="kq-stamp" aria-hidden="true">
                        <Check className="h-3.5 w-3.5" strokeWidth={4} />
                      </span>
                    )}
                    <span className="kq-poster-art" aria-hidden="true">
                      <GameImage
                        candidates={mode.imageCandidates}
                        alt=""
                        fallback={<span aria-hidden="true">{mode.fallbackEmoji}</span>}
                      />
                    </span>
                    <span className="kq-poster-name">{mode.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* ============ LE BILLET ============
          Zone d'action fixe. Elle ne se re-rend pas au changement de mode,
          donc le bouton principal reste exactement au même endroit. */}
      <div className="flex-shrink-0 px-3 pb-3 sm:px-6 sm:pb-4">
        <div className="kq-ticket mx-auto w-full max-w-[1080px] p-2.5 sm:p-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="kq-name" className="kq-label mb-1 block">
                Ton pseudo
              </label>
              <input
                id="kq-name"
                className="kq-input"
                placeholder="ENTRE TON PSEUDO"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                maxLength={20}
                autoComplete="nickname"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="kq-btn kq-btn--primary kq-btn--xl menu-focus flex-1 sm:flex-none"
                disabled={!nameReady}
                onClick={handleCreate}
              >
                <Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                Jouer
              </button>
              <button
                type="button"
                className="kq-btn kq-btn--xl menu-focus"
                disabled={!nameReady}
                onClick={() => { playInkSound('brushTap', 0.3); setShowJoin(true); }}
              >
                <LogIn className="h-[18px] w-[18px]" aria-hidden="true" />
                Rejoindre
              </button>
            </div>
          </div>

          {!nameReady && (
            <p className="kq-label mt-1.5">Entre un pseudo pour commencer.</p>
          )}
        </div>
      </div>

      {/* ============ PIED ============ */}
      <footer className="flex flex-shrink-0 items-center justify-center gap-3 px-3 pb-1.5">
        <nav aria-label="Informations légales" className="flex items-center gap-3">
          <Link className="kq-label menu-focus hover:underline" to="/confidentialite">Confidentialité</Link>
          <Link className="kq-label menu-focus hover:underline" to="/conditions">Conditions</Link>
          <Link className="kq-label menu-focus hover:underline" to="/mentions-legales">Mentions légales</Link>
        </nav>
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          className="kq-label menu-focus inline-flex items-center gap-1 hover:underline"
        >
          <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
          Raccourcis
        </button>
      </footer>

      {/* ============ TIROIR PROFIL ============
          Point d'accès unique à tout ce qui a quitté le bandeau. */}
      <InkDrawer
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        side="left"
        title="Mon profil"
        subtitle={`Niveau ${level}`}
        icon={<User className="h-5 w-5" />}
      >
        <div className="flex flex-col gap-3">
          <InkProfileSidebar />
          <button
            type="button"
            className="kq-btn menu-focus w-full"
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
      >
        <InkFriendsSidebar />
      </InkDrawer>

      {/* ============ REJOINDRE ============ */}
      <InkModal
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        title="Rejoindre une partie"
        subtitle="Code à 4 caractères"
        icon={<Hash className="h-5 w-5" />}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => { event.preventDefault(); handleJoin(); }}
        >
          <div>
            <label htmlFor="kq-code" className="kq-label mb-1.5 block">Code du lobby</label>
            <input
              id="kq-code"
              data-autofocus
              className="kq-input kq-code-input"
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
            <div>
              <h4 className="kq-label mb-1.5">Lobbies récents</h4>
              <ul className="flex flex-col gap-1.5">
                {recentLobbies.map((entry) => (
                  <li key={entry.code} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setLobbyCode(entry.code); playInkSound('brushTap', 0.3); }}
                      className="kq-btn kq-btn--sm menu-focus flex-1 justify-start"
                    >
                      {entry.code}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecentLobby(entry.code)}
                      className="kq-icon-btn menu-focus"
                      aria-label={`Supprimer le lobby récent ${entry.code}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" className="kq-btn menu-focus flex-1" onClick={() => setShowJoin(false)}>
              Annuler
            </button>
            <button type="submit" className="kq-btn kq-btn--primary menu-focus flex-1" disabled={!joinReady}>
              Rejoindre
            </button>
          </div>

          {!joinReady && lobbyCode.length > 0 && (
            <p className="kq-label">Le code doit contenir 4 caractères.</p>
          )}
        </form>
      </InkModal>

      {/* ============ PARAMÈTRES ============ */}
      <InkModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Paramètres"
        subtitle="Micro, caméra, son et thème"
        icon={<Settings className="h-5 w-5" />}
      >
        <DeviceSettings embedded showPreview onClose={() => setShowSettings(false)} />
      </InkModal>

      <InkShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        extra={[
          { keys: ['←'], label: 'Mode précédent' },
          { keys: ['→'], label: 'Mode suivant' },
          { keys: ['Enter'], label: 'Lancer la partie' },
          { keys: ['J'], label: 'Rejoindre une partie' },
          { keys: ['S'], label: 'Ouvrir les paramètres' },
        ]}
      />
    </div>
  );
};

export const InkBetaHomeScreen = memo(InkBetaHomeScreenComponent);
