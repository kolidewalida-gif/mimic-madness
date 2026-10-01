import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
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
} from 'lucide-react';

import { InkBetaLogo } from '@/components/InkBetaBrand';
import { InkModal } from '@/components/menu/InkOverlay';
import { type PersonalHubTab } from '@/components/personal-hub/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { playInkSound } from '@/hooks/useInkSoundEffects';

import styles from './InkHomeBubble.module.css';
import { InteractiveMenuBubbles } from './InteractiveMenuBubbles';

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
        <section className={styles.scene}>
          <h2 id="mm-home3-tagline" className="sr-only">Prêt à jouer ?</h2>
          <div className={styles.avatarBubble}>
            <span className={styles.avatarSpark} aria-hidden="true">✦</span>
            <div className={styles.avatarSlot}>{avatarPicker}</div>
            <span className={styles.avatarTag}>C’est toi !</span>
          </div>

          <form className={styles.playBubble} onSubmit={(event) => {
            event.preventDefault();
            if (nameReady) onCreate();
          }}>
            <label htmlFor="mm-home3-name" className={styles.fieldLabel}>Ton pseudo</label>
            <div className={`${styles.nameField}${nameReady ? ` ${styles.nameFieldReady}` : ''}`}>
              <User aria-hidden="true" />
              <input
                id="mm-home3-name"
                placeholder="Ton pseudo…"
                value={playerName}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                maxLength={20}
                autoComplete="nickname"
                aria-describedby="mm-home3-name-help"
              />
              {nameReady && <Check className={styles.readyCheck} aria-hidden="true" />}
            </div>
            <p id="mm-home3-name-help" className={styles.nameStatus} role="status">
              {nameReady ? 'Ta bande t’attend. À toi de jouer !' : 'Choisis ton pseudo pour jouer avec ta bande.'}
            </p>
            <div className={styles.actionStack}>
              <button type="submit" disabled={!nameReady} className={`${styles.createButton} menu-focus`}>
                <span className={styles.actionIcon}><Play fill="currentColor" aria-hidden="true" /></span>
                <span>Créer une partie</span>
                <ArrowRight className={styles.actionArrow} aria-hidden="true" />
              </button>
              <button type="button" disabled={!nameReady} onClick={openJoin} className={`${styles.joinButton} menu-focus`}>
                <span className={styles.actionIcon}><UsersRound aria-hidden="true" /></span>
                <span>Rejoindre</span>
                <ArrowRight className={styles.actionArrow} aria-hidden="true" />
              </button>
            </div>
            <p className={styles.shortcuts}>Un salon, des amis, beaucoup de bruit.</p>
          </form>
        </section>
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
      <InteractiveMenuBubbles active={!showJoin && !isPersonalHubOpen && !isSocialOpen} />
    </div>
  );
};
