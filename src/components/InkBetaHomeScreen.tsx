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
import { Hash, Settings, Trash2, User, UsersRound } from 'lucide-react';

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
import { GameImage } from '@/components/game-ui/GameUI';
import { SketchButton, SketchFrame, SketchPanel } from '@/components/ink/InkSketch';

interface InkBetaHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

/**
 * Illustrations propres au thème.
 *
 * Les cartes du thème stable portent le nom du mode et un compteur de joueurs
 * peints dans l'image : le nom faisait doublon avec le libellé rendu en CSS, et
 * le compteur contredisait `minPlayers`. Les gravures livrées ici n'ont aucun
 * texte, et les anciennes restent en repli si un fichier manque.
 */
const INK_ART: Partial<Record<LobbyGameMode, string>> = {
  normal: '/ink-beta/mode-normal.png',
  audiophone: '/ink-beta/mode-audiophone.png',
  '2v2': '/ink-beta/mode-2v2.png',
  quiz: '/ink-beta/mode-quiz.png',
  pixoguess: '/ink-beta/mode-pixoguess.png',
  undercover: '/ink-beta/mode-undercover.png',
  memorise: '/ink-beta/mode-memorise.png',
};

const MODES = INK_GAME_MODE_ORDER.map((id) => {
  const meta = GAME_MODE_META[id];
  const art = INK_ART[id];
  return {
    id,
    ...meta,
    imageCandidates: art ? [art, ...meta.imageCandidates] : meta.imageCandidates,
  };
});

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
      {/* Ardoise pleine page, plus un grain fin par-dessus. */}
      <div
        className="ik-paper-bg"
        style={{ backgroundImage: 'url("/ink-beta/background.png")' }}
        aria-hidden="true"
      />
      <div className="ik-grain" aria-hidden="true" />

      {/* ============ EN-TÊTE ============
          Volontairement réduit à l'essentiel : le menu doit rester le point
          focal, et la version précédente entassait huit contrôles dans une
          bande à défilement horizontal. */}
      <header className="relative z-[6] flex flex-shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-7">
        <span className="ik-hand text-2xl sm:text-3xl">Mimic Master</span>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {user && <NotificationCenter />}

          <button
            type="button"
            onClick={() => { playInkSound('inkClick', 0.3); setShowSettings(true); }}
            className="ik-btn ik-btn--sm menu-focus !w-auto"
            aria-label="Paramètres"
          >
            <SketchFrame className="ik-frame" seed={302} strokeWidth={1.6} />
            <span className="ik-btn-label"><Settings className="h-4 w-4" aria-hidden="true" /></span>
          </button>

          <button
            type="button"
            onClick={() => { playInkSound('inkClick', 0.3); setShowProfile(true); }}
            className="ik-btn ik-btn--sm menu-focus !w-auto"
            aria-label={`Profil de ${displayName}`}
          >
            <SketchFrame className="ik-frame" seed={303} strokeWidth={1.6} />
            <span className="ik-btn-label flex items-center gap-1.5">
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden max-w-[110px] truncate sm:inline">{displayName}</span>
            </span>
          </button>
        </div>
      </header>

      {/* ============ SCÈNE ============
          Le titre et le panneau partagent le même centre. Le titre est dessous
          et dépasse, le panneau le recouvre. */}
      <main className="custom-scrollbar relative z-[2] flex min-h-0 flex-1 flex-col justify-center gap-8 overflow-y-auto px-4 py-3 sm:gap-10 sm:px-10">
        {/* Panneau à gauche, logo à droite, comme sur la planche. Sur mobile la
            colonne s'empile et le logo passe au-dessus du panneau. */}
        <div className="mx-auto flex w-full max-w-[1440px] flex-col-reverse items-center gap-8 md:flex-row md:items-center md:justify-between md:gap-12">
          <SketchPanel seed={2101} rotate={-0.6} className="w-[min(94vw,520px)] flex-shrink-0">
            <div className="ik-field">
              <label htmlFor="ik-name" className="ik-label mb-0.5 block">
                Ton pseudo
              </label>
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

            <div className="mt-6 flex flex-col gap-3">
              <SketchButton
                seed={4101}
                drawDelay={420}
                disabled={!nameReady}
                onClick={handleCreate}
                className="ik-btn--primary"
              >
                Créer une partie
              </SketchButton>

              <SketchButton
                seed={4102}
                drawDelay={520}
                disabled={!nameReady}
                onClick={() => { playInkSound('brushTap', 0.3); setShowJoin(true); }}
              >
                Rejoindre
              </SketchButton>

              <SketchButton
                seed={4103}
                drawDelay={600}
                onClick={() => { playInkSound('inkClick', 0.3); setShowSettings(true); }}
              >
                Options
              </SketchButton>
            </div>

            {/* Mode retenu, en note sous les boutons — « Mode : Invitation »
                sur la planche, le libellé en craie et la valeur en violet. */}
            <p className="ik-label mt-6 flex items-baseline gap-1.5">
              <span>Mode :</span>
              <span className="text-[color:var(--ik-violet-soft)]">{selected.label}</span>
            </p>

            {!nameReady && (
              <p className="ik-label ik-muted mt-1">Écris ton pseudo pour commencer.</p>
            )}
          </SketchPanel>

          {/* Le titre. `h1` porté par l'image pour rester accessible. */}
          <h1
            className="ik-title"
            style={{ backgroundImage: 'url("/ink-beta/logo.png")' }}
            role="img"
            aria-label="Mimic Master"
          />
        </div>

        {/* ============ CHOIX DU MODE ============
            Les tuiles fournies portent déjà leur cadre et leur nom : on ne
            superpose donc ni bordure ni libellé. */}
        <section className="mx-auto w-full max-w-[1440px]">
          {/* Pas de titre de section : la référence n'en a pas, et les tuiles
              portent déjà leur nom. */}
          <h2 className="sr-only">Choisis ton mode</h2>

          <div
            className="grid grid-cols-4 gap-3 sm:grid-cols-7 sm:gap-4"
            role="group"
            aria-label="Modes de jeu"
          >
            {MODES.map((mode, index) => {
              const isSelected = index === modeIndex;
              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={mode.label}
                  title={mode.label}
                  onClick={() => { playInkSound('brushTap', 0.3); goToMode(index); }}
                  className={`ik-mode menu-focus${isSelected ? ' is-selected' : ''}`}
                >
                  <span className="ik-mode-art">
                    <GameImage
                      candidates={mode.imageCandidates}
                      alt=""
                      fallback={<span aria-hidden="true">{mode.fallbackEmoji}</span>}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* ============ PIED ============ */}
      <footer className="relative z-[6] flex flex-shrink-0 flex-wrap items-center justify-center gap-3 px-4 pb-2">
        <nav aria-label="Informations légales" className="flex items-center gap-3">
          <Link className="ik-label menu-focus hover:underline" to="/confidentialite">Confidentialité</Link>
          <Link className="ik-label menu-focus hover:underline" to="/conditions">Conditions</Link>
          <Link className="ik-label menu-focus hover:underline" to="/mentions-legales">Mentions légales</Link>
        </nav>
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
        subtitle="Micro, caméra, son et thème"
        icon={<Settings className="h-5 w-5" />}
      >
        <DeviceSettings embedded showPreview onClose={() => setShowSettings(false)} />
      </InkModal>
    </div>
  );
};

export const InkBetaHomeScreen = memo(InkBetaHomeScreenComponent);
