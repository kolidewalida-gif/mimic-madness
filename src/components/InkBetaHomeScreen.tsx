/**
 * Menu principal du thème INK — une page de carnet rendue interactive.
 *
 * L'exigence structurante est la profondeur : le titre « MIMIC MASTER » est
 * peint sur la feuille, et le panneau est posé par-dessus en le recouvrant
 * partiellement. Cela ne s'obtient pas en empilant des éléments dans le flux —
 * le titre est en `position: absolute` avec `z-index: 2`, le panneau en
 * `z-index: 5`, et le titre est volontairement plus large que le panneau pour
 * déborder des deux côtés. Sans ce débordement l'effet « dessiné avant » ne se
 * lit pas, on croirait à un simple fond.
 *
 * Tout le vocabulaire graphique est dessiné : les cadres sont des chemins SVG
 * aux points volontairement décalés (`InkSketch.tsx`), pas des `border` CSS,
 * parce qu'une bordure CSS est mathématiquement parfaite et c'est précisément
 * ce qui trahit une interface au premier regard.
 *
 * Aucune logique de jeu n'est réimplémentée ici : création et jonction passent
 * par les mêmes rappels que les autres écrans d'accueil.
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
import { SketchButton, SketchDoodle, SketchFrame, SketchPanel } from '@/components/ink/InkSketch';

interface InkBetaHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

/**
 * Pictogrammes originaux du kiosque Ink Beta.
 *
 * Ils sont volontairement vectoriels et monochromes : l'ancien jeu d'images
 * colorées imposait sept mini-affiches de styles différents. Ici, le double
 * trait craie/violet est construit en CSS et reste net à toutes les tailles.
 */
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

/**
 * Lettrage vectoriel local, sans dépendance à un bitmap externe.
 * La légère turbulence ne bouge pas : elle casse seulement les arêtes trop
 * numériques du texte et conserve donc un rendu stable entre deux captures.
 */
const InkBetaLogo = memo(() => (
  <h1 id="ik-main-title" className="ik-title" aria-label="Mimic Master">
    <span className="sr-only">Mimic Master</span>
    <svg
      className="ik-logo-svg"
      viewBox="0 0 720 400"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="ik-logo-rough" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.055"
            numOctaves="2"
            seed="17"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3.2"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </defs>

      <g className="ik-logo-words" filter="url(#ik-logo-rough)">
        <text
          className="ik-logo-word ik-logo-word--mimic"
          x="70"
          y="166"
          textLength="590"
          lengthAdjust="spacingAndGlyphs"
        >
          MIMIC
        </text>
        <text
          className="ik-logo-word ik-logo-word--master"
          x="18"
          y="337"
          textLength="686"
          lengthAdjust="spacingAndGlyphs"
        >
          MASTER
        </text>
      </g>

      <g className="ik-logo-slashes" fill="none" strokeLinecap="round">
        <path d="M 553 139 Q 632 105 694 73" />
        <path d="M 569 154 Q 638 127 681 106" />
        <path d="M 405 367 Q 531 352 650 319" />
      </g>
      <g className="ik-logo-flecks" aria-hidden="true">
        <path d="M 42 120 l 13 -8 l -5 16 z" />
        <path d="M 678 240 l 16 5 l -13 8 z" />
        <circle cx="662" cy="64" r="4" />
        <circle cx="56" cy="292" r="3" />
      </g>
    </svg>
  </h1>
));
InkBetaLogo.displayName = 'InkBetaLogo';

/** Le menu stable démarrait sur un index figé, sans raison. */
const LAST_MODE_KEY = 'mimic.lastMode';

const readLastMode = (): number => {
  try {
    const index = MODES.findIndex((m) => m.id === localStorage.getItem(LAST_MODE_KEY));
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

  /* Le pseudo sert d'identité aux invitations : on le conserve. */
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

  return (
    <div
      className="ik-root menu-screen-safe flex h-screen w-full flex-col overflow-hidden"
      style={accent}
    >
      <div className="ik-paper-bg" aria-hidden="true" />
      <div className="ik-grain" aria-hidden="true" />
      <SketchFrame className="ik-shell-frame" seed={1701} strokeWidth={1.4} drawDelay={80} />

      <header className="ik-topbar relative z-[8] flex flex-shrink-0 items-center justify-between">
        <div className="ik-signature" aria-label="Mimic Master, atelier Ink">
          <span className="ik-signature-name">Mimic Master</span>
          <span className="ik-signature-edition">atelier ink · série privée</span>
        </div>

        <div className="ik-tools flex flex-shrink-0 items-center">
          {user && <NotificationCenter />}

          <button
            type="button"
            onClick={() => { playInkSound('brushTap', 0.3); setShowFriends(true); }}
            className="ik-tool menu-focus"
            aria-label="Mes amis"
          >
            <SketchFrame className="ik-frame" seed={301} strokeWidth={1.5} />
            <UsersRound className="ik-tool-icon" aria-hidden="true" />
            <span className="ik-tool-label">Amis</span>
          </button>

          <button
            type="button"
            onClick={() => { playInkSound('inkClick', 0.3); setShowSettings(true); }}
            className="ik-tool menu-focus"
            aria-label="Paramètres"
          >
            <SketchFrame className="ik-frame" seed={302} strokeWidth={1.5} />
            <Settings className="ik-tool-icon" aria-hidden="true" />
            <span className="ik-tool-label">Réglages</span>
          </button>

          <button
            type="button"
            onClick={() => { playInkSound('inkClick', 0.3); setShowProfile(true); }}
            className="ik-tool ik-tool--profile menu-focus"
            aria-label={`Profil de ${displayName}`}
          >
            <SketchFrame className="ik-frame" seed={303} strokeWidth={1.5} />
            <User className="ik-tool-icon" aria-hidden="true" />
            <span className="ik-tool-label max-w-[120px] truncate">{displayName}</span>
          </button>
        </div>
      </header>

      <main className="ik-main custom-scrollbar relative z-[2] min-h-0 flex-1 overflow-y-auto">
        <div className="ik-canvas">
          <section className="ik-hero" aria-labelledby="ik-main-title">
            <InkBetaLogo />

            <SketchDoodle kind="arrow" className="ik-hero-arrow" drawDelay={260} />
            <SketchDoodle kind="star" className="ik-hero-star" drawDelay={420} />
            <p className="ik-hero-note" aria-hidden="true">un nom. un mode. aucune excuse.</p>

            <SketchPanel seed={2101} rotate={-0.7} className="ik-ticket">
              <div className="ik-ticket-head">
                <span className="ik-ticket-kicker">Ton billet pour la partie</span>
                <span className="ik-ticket-number" aria-hidden="true">
                  N° {String(modeIndex + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="ik-field">
                <label htmlFor="ik-name" className="ik-label block">Ton nom de scène</label>
                <input
                  id="ik-name"
                  className="ik-input"
                  placeholder="Écris ton nom…"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  maxLength={20}
                  autoComplete="nickname"
                />
              </div>

              <div className="ik-ticket-actions">
                <SketchButton
                  seed={4101}
                  drawDelay={420}
                  disabled={!nameReady}
                  onClick={handleCreate}
                  className="ik-btn--primary"
                >
                  <Play className="ik-action-icon" fill="currentColor" aria-hidden="true" />
                  <span>Créer la partie</span>
                </SketchButton>

                <SketchButton
                  seed={4102}
                  drawDelay={520}
                  disabled={!nameReady}
                  onClick={() => { playInkSound('brushTap', 0.3); setShowJoin(true); }}
                >
                  <LogIn className="ik-action-icon" aria-hidden="true" />
                  <span>Entrer un code</span>
                </SketchButton>
              </div>

              <div className="ik-ticket-foot">
                <p className="ik-ticket-mode">
                  <span>À l'affiche</span>
                  <strong>{selected.label}</strong>
                </p>
                <button
                  type="button"
                  className="ik-ticket-settings menu-focus"
                  onClick={() => { playInkSound('inkClick', 0.3); setShowSettings(true); }}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Options
                </button>
              </div>

              {!nameReady && (
                <p className="ik-ticket-hint" role="status">Signe ton billet pour commencer.</p>
              )}
            </SketchPanel>
          </section>

          <section className="ik-program" aria-labelledby="ik-program-title">
            <div className="ik-program-head">
              <div>
                <span className="ik-program-kicker">Programme du soir</span>
                <h2 id="ik-program-title" className="ik-program-title">Choisis ton terrain de jeu</h2>
              </div>

              <div className="ik-mode-nav" aria-label="Navigation entre les modes">
                <button
                  type="button"
                  className="ik-mode-nav-btn menu-focus"
                  onClick={() => { playInkSound('brushTap', 0.25); goToMode(modeIndex - 1); }}
                  aria-label="Mode précédent"
                >
                  <SketchFrame className="ik-frame" seed={5101} strokeWidth={1.5} />
                  <ChevronLeft aria-hidden="true" />
                </button>
                <p className="ik-mode-position" aria-live="polite">
                  <span>{String(modeIndex + 1).padStart(2, '0')} / {String(MODES.length).padStart(2, '0')}</span>
                  <strong>{selected.label}</strong>
                </p>
                <button
                  type="button"
                  className="ik-mode-nav-btn menu-focus"
                  onClick={() => { playInkSound('brushTap', 0.25); goToMode(modeIndex + 1); }}
                  aria-label="Mode suivant"
                >
                  <SketchFrame className="ik-frame" seed={5102} strokeWidth={1.5} />
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="ik-mode-rail" role="group" aria-label="Modes de jeu">
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
                    style={{ ['--ik-mode-index' as string]: index }}
                  >
                    <SketchFrame
                      className="ik-mode-frame"
                      seed={5200 + index * 37}
                      strokeWidth={1.45}
                      drawDelay={390 + index * 42}
                    />
                    <span className="ik-mode-art">
                      <span className="ik-mode-card-number" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="ik-mode-glyph" aria-hidden="true">
                        <ModeIcon className="ik-mode-icon ik-mode-icon--echo" />
                        <ModeIcon className="ik-mode-icon" />
                      </span>
                      <span className="ik-mode-copy">
                        <strong>{mode.shortLabel}</strong>
                        <small>{mode.tagline}</small>
                      </span>
                      <span className="ik-mode-min">
                        {mode.minPlayers}+ joueurs
                      </span>
                    </span>
                    {isSelected && <span className="ik-mode-mark" aria-hidden="true">×</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <footer className="ik-footer relative z-[7] flex flex-shrink-0 items-center justify-center">
        <span className="ik-footer-mark" aria-hidden="true">✦</span>
        <nav aria-label="Informations légales" className="flex items-center">
          <Link className="menu-focus" to="/confidentialite">Confidentialité</Link>
          <Link className="menu-focus" to="/conditions">Conditions</Link>
          <Link className="menu-focus" to="/mentions-legales">Mentions légales</Link>
        </nav>
        <span className="ik-footer-mark" aria-hidden="true">✦</span>
      </footer>

      {/* ============ TIROIRS ET MODALES ============
          Réutilisés tels quels : rien de la logique existante n'est réécrit. */}
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
            className="ik-btn menu-focus"
            onClick={() => { setShowProfile(false); setShowFriends(true); }}
          >
            <SketchFrame className="ik-frame" seed={6101} strokeWidth={2} />
            <span className="ik-btn-label flex items-center gap-2">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              Mes amis
            </span>
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
          <div className="ik-field">
            <label htmlFor="ik-code" className="ik-label mb-1 block">Code du lobby</label>
            <input
              id="ik-code"
              data-autofocus
              className="ik-input text-center text-3xl tracking-[0.3em]"
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
              <h3 className="ik-label mb-1.5">Lobbies récents</h3>
              <ul className="flex flex-col gap-1.5">
                {recentLobbies.map((entry) => (
                  <li key={entry.code} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setLobbyCode(entry.code); playInkSound('brushTap', 0.3); }}
                      className="ik-hand menu-focus flex-1 text-left text-xl"
                    >
                      {entry.code}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecentLobby(entry.code)}
                      className="menu-focus p-1.5 text-[color:var(--ik-ink-faint)] hover:text-[color:var(--ik-ink)]"
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
            <SketchButton seed={7101} onClick={() => setShowJoin(false)}>
              Annuler
            </SketchButton>
            <SketchButton seed={7102} type="submit" disabled={!joinReady}>
              Rejoindre
            </SketchButton>
          </div>

          {!joinReady && lobbyCode.length > 0 && (
            <p className="ik-label ik-muted">Le code doit contenir 4 caractères.</p>
          )}
        </form>
      </InkModal>

      <InkModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Options"
        subtitle="Audio, volume, apparence et avatar"
        icon={<Settings className="h-5 w-5" />}
        className="ik-options-modal"
      >
        <DeviceSettings embedded showPreview onClose={() => setShowSettings(false)} />
      </InkModal>
    </div>
  );
};

export const InkBetaHomeScreen = memo(InkBetaHomeScreenComponent);
