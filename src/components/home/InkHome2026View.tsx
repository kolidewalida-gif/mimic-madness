import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  AudioLines,
  Bell,
  Check,
  Hash,
  LogIn,
  Play,
  Settings,
  Share2,
  SlidersHorizontal,
  Trash2,
  User,
  UsersRound,
  Zap,
} from 'lucide-react';

import { InkBetaLogo } from '@/components/InkBetaBrand';
import { InkModal } from '@/components/menu/InkOverlay';
import { type PersonalHubTab } from '@/components/personal-hub/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { playInkSound } from '@/hooks/useInkSoundEffects';

import styles from './InkHome2026View.module.css';

interface RecentLobbyEntry {
  code: string;
}

interface InkHome2026ViewProps {
  avatarPicker: ReactNode;
  playerName: string;
  lobbyCode: string;
  nameReady: boolean;
  joinReady: boolean;
  displayName: string;
  profileAvatarUrl?: string;
  notificationCount: number;
  isPersonalHubOpen: boolean;
  isSocialOpen: boolean;
  showJoin: boolean;
  recentLobbies: readonly RecentLobbyEntry[];
  onPlayerNameChange: (name: string) => void;
  onLobbyCodeChange: (code: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onOpenJoin: () => void;
  onCloseJoin: () => void;
  onRemoveRecentLobby: (code: string) => void;
  onOpenPersonalHub: (tab: PersonalHubTab) => void;
  onOpenSocial: () => void;
}

const WAVE_BARS = Array.from({ length: 13 }, (_, index) => index);

export const InkHome2026View = ({
  avatarPicker,
  playerName,
  lobbyCode,
  nameReady,
  joinReady,
  displayName,
  profileAvatarUrl,
  notificationCount,
  isPersonalHubOpen,
  isSocialOpen,
  showJoin,
  recentLobbies,
  onPlayerNameChange,
  onLobbyCodeChange,
  onCreate,
  onJoin,
  onOpenJoin,
  onCloseJoin,
  onRemoveRecentLobby,
  onOpenPersonalHub,
  onOpenSocial,
}: InkHome2026ViewProps) => {
  const openJoin = () => {
    playInkSound('brushTap', 0.3);
    onOpenJoin();
  };

  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onJoin();
  };

  return (
    <div className={`ik-root menu-screen-safe ${styles.root}`}>
      <div className="ik-party-bg" aria-hidden="true" />
      <div className="ik-party-rays" aria-hidden="true" />
      <div className="ik-party-dots" aria-hidden="true" />
      <div className={styles.stageLights} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <InkBetaLogo titleId="mm-home3-brand-title" />
          </div>

          <nav className={styles.tools} aria-label="Menu du joueur">
            <button
              type="button"
              onClick={() => {
                playInkSound('inkClick', 0.3);
                onOpenPersonalHub('notifications');
              }}
              className={`${styles.tool} menu-focus`}
              aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} non lue${notificationCount > 1 ? 's' : ''}` : ''}`}
              aria-haspopup="dialog"
            >
              <Bell aria-hidden="true" />
              <span className={styles.toolLabel}>Alertes</span>
              {notificationCount > 0 && (
                <b className={styles.notificationBadge} aria-hidden="true">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </b>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playInkSound('brushTap', 0.3);
                onOpenSocial();
              }}
              className={`${styles.tool} menu-focus`}
              aria-label="Ouvrir Social"
              aria-haspopup="dialog"
              aria-expanded={isSocialOpen}
            >
              <Share2 aria-hidden="true" />
              <span className={styles.toolLabel}>Social</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playInkSound('brushTap', 0.3);
                onOpenPersonalHub('friends');
              }}
              className={`${styles.tool} menu-focus`}
              aria-label="Ouvrir les amis"
              aria-haspopup="dialog"
            >
              <UsersRound aria-hidden="true" />
              <span className={styles.toolLabel}>Amis</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playInkSound('inkClick', 0.3);
                onOpenPersonalHub('settings');
              }}
              className={`${styles.tool} menu-focus`}
              aria-label="Ouvrir les réglages"
              aria-haspopup="dialog"
            >
              <Settings aria-hidden="true" />
              <span className={styles.toolLabel}>Options</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playInkSound('inkClick', 0.3);
                onOpenPersonalHub('profile');
              }}
              className={`${styles.tool} ${styles.profileTool} menu-focus`}
              aria-label={`Ouvrir le profil de ${displayName}`}
              aria-haspopup="dialog"
              aria-expanded={isPersonalHubOpen}
            >
              {profileAvatarUrl ? (
                <Avatar className={styles.profileThumb} aria-hidden="true">
                  <AvatarImage src={profileAvatarUrl} className="object-cover" />
                  <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <User aria-hidden="true" />
              )}
              <span className={styles.profileName}>{displayName}</span>
            </button>
          </nav>
        </div>
      </header>

      <main className={`${styles.main} custom-scrollbar`} aria-labelledby="mm-home3-tagline">
        <div className={styles.scene}>
          <section className={styles.identityPanel} aria-labelledby="mm-home3-tagline">
            <div className={styles.panelScribble} aria-hidden="true" />

            <div className={styles.heroCopy}>
              <span className={styles.kicker}>
                <span className={styles.liveDot} aria-hidden="true" />
                Le party game qui donne de la voix
              </span>
              <h2 id="mm-home3-tagline">
                Fais du bruit.
                <span>Marque la soirée.</span>
              </h2>
              <p>
                Ton pseudo, ta bande, un salon. Ensuite, vous choisissez ensemble
                comment mettre le feu à la partie.
              </p>
            </div>

            <div className={styles.identityWorkspace}>
              <div className={styles.avatarBay}>
                <div className={styles.sectionLabel}>
                  <span>01</span>
                  <div>
                    <strong>Ton personnage</strong>
                    <small>Choisis ton énergie</small>
                  </div>
                </div>
                <div className={styles.avatarSlot}>{avatarPicker}</div>
              </div>

              <div className={styles.nameDeck}>
                <div className={styles.stepHeading}>
                  <span className={styles.stepIcon} aria-hidden="true">
                    <User />
                  </span>
                  <div>
                    <span>Ton nom de scène</span>
                    <h3>Qui monte sur scène ?</h3>
                  </div>
                </div>

                <label htmlFor="mm-home3-name" className={styles.fieldLabel}>
                  Ton pseudo
                  <span>20 caractères max.</span>
                </label>
                <div className={`${styles.nameField}${nameReady ? ` ${styles.nameFieldReady}` : ''}`}>
                  <User aria-hidden="true" />
                  <input
                    id="mm-home3-name"
                    placeholder="Ex. DJ Croissant"
                    value={playerName}
                    onChange={(event) => onPlayerNameChange(event.target.value)}
                    maxLength={20}
                    autoComplete="nickname"
                  />
                  {nameReady && <Check className={styles.readyCheck} aria-hidden="true" />}
                </div>

                <p
                  className={`${styles.nameStatus}${nameReady ? ` ${styles.nameStatusReady}` : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  <span aria-hidden="true" />
                  {nameReady
                    ? `${playerName.trim()}, la scène est à toi.`
                    : 'Écris ton pseudo pour déverrouiller le salon.'}
                </p>

                <div className={styles.fastStart}>
                  <Zap aria-hidden="true" />
                  <p>
                    <strong>Démarrage express</strong>
                    <span>Pas de réglages à rallonge : la partie se construit dans le salon.</span>
                  </p>
                </div>
              </div>
            </div>

            <ol className={styles.route} aria-label="Parcours pour démarrer une partie">
              <li className={nameReady ? styles.routeDone : styles.routeActive}>
                <span>{nameReady ? <Check aria-hidden="true" /> : '1'}</span>
                <div>
                  <strong>Ton pseudo</strong>
                  <small>Prends ta place</small>
                </div>
              </li>
              <li className={nameReady ? styles.routeActive : undefined}>
                <span>2</span>
                <div>
                  <strong>Ton salon</strong>
                  <small>Invite la bande</small>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Votre mode</strong>
                  <small>Décidez ensemble</small>
                </div>
              </li>
            </ol>
          </section>

          <aside className={styles.launchPanel} aria-labelledby="mm-home3-launch-title">
            <div className={styles.launchTopline}>
              <span>02 · Lancement</span>
              <span className={`${styles.readiness}${nameReady ? ` ${styles.readinessReady}` : ''}`}>
                <i aria-hidden="true" />
                {nameReady ? 'Prêt à jouer' : 'Pseudo requis'}
              </span>
            </div>

            <div className={styles.launchHeading}>
              <span className={styles.launchIcon} aria-hidden="true">
                <AudioLines />
              </span>
              <h3 id="mm-home3-launch-title">Monte ton salon</h3>
              <p>Crée ta scène ou saisis le code envoyé par un ami.</p>
            </div>

            <div className={styles.soundCheck} aria-hidden="true">
              <div className={styles.record}>
                <span />
                <i />
              </div>
              <div className={styles.soundCheckBody}>
                <div className={styles.waveform}>
                  {WAVE_BARS.map((bar) => <span key={bar} />)}
                </div>
                <small>Sound check</small>
                <strong>La bande t’attend</strong>
              </div>
            </div>

            <div className={styles.actionStack}>
              <button
                type="button"
                disabled={!nameReady}
                onClick={onCreate}
                className={`${styles.createButton} menu-focus`}
              >
                <span className={styles.actionIcon}>
                  <Play fill="currentColor" aria-hidden="true" />
                </span>
                <span className={styles.actionCopy}>
                  <strong>Créer un salon</strong>
                  <small>Je deviens l’hôte</small>
                </span>
                <ArrowRight className={styles.actionArrow} aria-hidden="true" />
              </button>

              <button
                type="button"
                disabled={!nameReady}
                onClick={openJoin}
                className={`${styles.joinButton} menu-focus`}
              >
                <span className={styles.actionIcon}>
                  <Hash aria-hidden="true" />
                </span>
                <span className={styles.actionCopy}>
                  <strong>J’ai un code</strong>
                  <small>Je rejoins la troupe</small>
                </span>
                <ArrowRight className={styles.actionArrow} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.modeNote}>
              <UsersRound aria-hidden="true" />
              <p>
                <strong>Décidez ensemble</strong>
                <span>Le mode de jeu se choisit une fois toute la bande dans le salon.</span>
              </p>
            </div>

            <p className={styles.shortcuts}>
              {nameReady ? (
                <>
                  <kbd>Entrée</kbd> créer <span aria-hidden="true">·</span> <kbd>J</kbd> rejoindre
                </>
              ) : (
                'Entre ton pseudo pour lancer la soirée.'
              )}
            </p>
          </aside>
        </div>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>
          Mimic Master <b>Ink Beta</b>
          <i aria-hidden="true" />
          La fête commence ici
        </span>
        <nav aria-label="Informations légales">
          <Link className="menu-focus" to="/confidentialite">Confidentialité</Link>
          <Link className="menu-focus" to="/conditions">Conditions</Link>
          <Link className="menu-focus" to="/mentions-legales">Mentions légales</Link>
        </nav>
        <button
          type="button"
          className={`${styles.quickSettings} menu-focus`}
          onClick={() => onOpenPersonalHub('settings')}
        >
          <SlidersHorizontal aria-hidden="true" />
          <span>Réglages rapides</span>
        </button>
      </footer>

      <InkModal
        isOpen={showJoin}
        onClose={onCloseJoin}
        title="Rejoindre un salon"
        subtitle="Le code à 4 caractères partagé par l’hôte"
        icon={<Hash className="h-5 w-5" />}
        className={styles.joinModal}
        bodyClassName={styles.joinModalBody}
      >
        <form className={styles.joinForm} onSubmit={submitJoin}>
          <div className={styles.joinLead}>
            <span>Accès invité</span>
            <p>Entre le code, et tu arrives directement auprès de ta bande.</p>
          </div>

          <label htmlFor="mm-home3-code" className={styles.codeLabel}>
            Code du salon
            <span>{lobbyCode.length} / 4</span>
          </label>
          <div className={`${styles.codeField}${lobbyCode.length === 4 ? ` ${styles.codeFieldReady}` : ''}`}>
            <Hash aria-hidden="true" />
            <input
              id="mm-home3-code"
              data-autofocus
              placeholder="XXXX"
              value={lobbyCode}
              onChange={(event) => onLobbyCodeChange(
                event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
              )}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="mm-home3-code-help"
            />
            {lobbyCode.length === 4 && <Check aria-hidden="true" />}
          </div>
          <p id="mm-home3-code-help" className={styles.codeHelp}>
            Lettres et chiffres uniquement · ton pseudo actuel sera utilisé.
          </p>

          {recentLobbies.length > 0 && (
            <section className={styles.recentLobbies} aria-labelledby="mm-home3-recents-title">
              <div className={styles.recentHeading}>
                <h3 id="mm-home3-recents-title">Salons récents</h3>
                <span>{recentLobbies.length}</span>
              </div>
              <ul>
                {recentLobbies.map((entry) => (
                  <li key={entry.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onLobbyCodeChange(entry.code);
                        playInkSound('brushTap', 0.3);
                      }}
                      className={`${styles.recentCode} menu-focus`}
                    >
                      <Hash aria-hidden="true" />
                      <span>{entry.code}</span>
                      <small>Utiliser ce code</small>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveRecentLobby(entry.code)}
                      className={`${styles.recentRemove} menu-focus`}
                      aria-label={`Supprimer le lobby récent ${entry.code}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!joinReady && lobbyCode.length > 0 && (
            <p className={styles.formMessage} role="status">
              Le code doit contenir 4 caractères et ton pseudo doit être renseigné.
            </p>
          )}

          <div className={styles.joinActions}>
            <button
              type="button"
              className={`${styles.cancelButton} menu-focus`}
              onClick={onCloseJoin}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`${styles.submitButton} menu-focus`}
              disabled={!joinReady}
            >
              <LogIn aria-hidden="true" />
              Rejoindre la bande
            </button>
          </div>
        </form>
      </InkModal>
    </div>
  );
};
