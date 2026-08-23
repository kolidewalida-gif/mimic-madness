/**
 * Accueil public, visible sans compte.
 *
 * Le jeu exige une connexion Google, ce qui laissait les robots d'indexation et
 * l'examen AdSense devant un simple bouton, donc devant une page sans contenu.
 * Cet écran présente réellement le jeu, ses modes et ses règles, tout en
 * conservant le bouton de connexion comme action principale.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GAME_MODE_META,
  INK_GAME_MODE_ORDER,
  type LobbyGameMode,
} from '@/lib/gameModes';
import {
  LEGAL_ROUTES,
  PRICE_AD_FREE_MONTHLY_LABEL,
  PRICE_SUPPORTER_LIFETIME_LABEL,
  PUBLISHER_NAME,
} from '@/lib/legal';

interface PublicLandingProps {
  onSignIn: () => void;
}

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Crée un salon',
    body:
      'Connecte-toi avec Google, choisis un mode de jeu et lance un salon. Un code à partager apparaît immédiatement.',
  },
  {
    title: 'Invite tes amis',
    body:
      'Tes amis rejoignent avec le code depuis leur navigateur, sur ordinateur comme sur téléphone. Aucune installation.',
  },
  {
    title: 'Jouez en direct',
    body:
      'Les manches, les votes et les scores se synchronisent en temps réel pour tout le monde, du premier défi au podium.',
  },
];

const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Faut-il installer quelque chose ?',
    answer:
      "Non. Mimic Master fonctionne entièrement dans le navigateur, sur ordinateur, tablette et téléphone. Une connexion internet et un compte Google suffisent.",
  },
  {
    question: 'Combien de joueurs faut-il ?',
    answer:
      "La plupart des modes démarrent à deux joueurs. Undercover en demande trois, et le mode 2 vs 2 quatre joueurs répartis en deux équipes.",
  },
  {
    question: 'Le jeu est-il gratuit ?',
    answer:
      "Oui, tous les modes de jeu sont accessibles gratuitement. Le site est financé par la publicité, et une offre de soutien permet de la retirer.",
  },
  {
    question: 'Pourquoi un micro et une caméra sont-ils demandés ?',
    answer:
      "Certains modes reposent sur l'imitation vocale ou vidéo. L'accès au micro ou à la caméra n'est demandé que dans ces modes, et uniquement après ton accord explicite dans le navigateur.",
  },
  {
    question: 'Puis-je jouer sur téléphone ?',
    answer:
      "Oui. L'interface s'adapte aux petits écrans, et le salon reste synchronisé même si les joueurs mélangent téléphones et ordinateurs.",
  },
];

function ModeCard({ mode }: { mode: LobbyGameMode }) {
  const meta = GAME_MODE_META[mode];
  return (
    <li className="if-panel p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">{meta.fallbackEmoji}</span>
        <h3 className="if-h2">{meta.label}</h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--ink-text-dim)' }}>
        {meta.description}
      </p>
      <p className="if-label mt-auto">
        Dès {meta.minPlayers} joueurs · {meta.tagline}
      </p>
    </li>
  );
}

export function PublicLanding({ onSignIn }: PublicLandingProps) {
  useEffect(() => {
    document.title = 'Mimic Master — Jeu de soirée multijoueur en ligne';
  }, []);

  return (
    <div className="if-root min-h-screen overflow-y-auto">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <header className="if-hero space-y-4">
          <h1 className="if-wordmark">
            MIMIC <em>MASTER</em>
          </h1>
          <p className="if-hero-sub mx-auto max-w-2xl">
            Le jeu de soirée multijoueur qui se joue dans le navigateur. Imitations,
            quiz, blindtest et infiltrés : crée un salon, partage le code et jouez
            ensemble en temps réel.
          </p>
          <div className="mx-auto flex max-w-sm flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={onSignIn}
              className="if-btn if-btn--primary if-btn--lg menu-focus w-full"
            >
              Connexion avec Google
            </button>
            <p className="if-mute text-xs">
              Gratuit, sans installation. Un compte Google suffit pour créer ou
              rejoindre un salon.
            </p>
          </div>
        </header>

        <hr className="if-divider my-10" />

        <section aria-labelledby="comment-jouer" className="space-y-5">
          <h2 id="comment-jouer" className="if-h1">Comment jouer</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="if-panel p-4 space-y-2">
                <span className="if-tag if-tag--accent">Étape {index + 1}</span>
                <h3 className="if-h2">{step.title}</h3>
                <p className="text-sm" style={{ color: 'var(--ink-text-dim)' }}>
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <hr className="if-divider my-10" />

        <section aria-labelledby="modes" className="space-y-5">
          <h2 id="modes" className="if-h1">Les modes de jeu</h2>
          <p className="if-muted text-sm max-w-2xl">
            Chaque mode a ses propres règles et son propre rythme. Le salon retient
            le mode choisi par l'hôte, et les scores se cumulent jusqu'au podium
            final.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {INK_GAME_MODE_ORDER.map((mode) => (
              <ModeCard key={mode} mode={mode} />
            ))}
          </ul>
        </section>

        <hr className="if-divider my-10" />

        <section aria-labelledby="sans-pub" className="space-y-4">
          <h2 id="sans-pub" className="if-h1">Jouer sans publicité</h2>
          <p className="text-sm max-w-2xl" style={{ color: 'var(--ink-text-dim)' }}>
            Le jeu reste gratuit grâce à la publicité, affichée uniquement en marge
            de l'écran d'accueil et pendant les pauses entre les manches, jamais
            par-dessus une partie en cours.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            <li className="if-panel p-4 space-y-1">
              <h3 className="if-h2">Sans pub — {PRICE_AD_FREE_MONTHLY_LABEL} / mois</h3>
              <p className="text-sm" style={{ color: 'var(--ink-text-dim)' }}>
                Retire toutes les publicités. Résiliable à tout moment, l'accès
                reste actif jusqu'à la fin de la période payée.
              </p>
            </li>
            <li className="if-panel p-4 space-y-1">
              <h3 className="if-h2">
                Supporter à vie — {PRICE_SUPPORTER_LIFETIME_LABEL}
              </h3>
              <p className="text-sm" style={{ color: 'var(--ink-text-dim)' }}>
                Un paiement unique, sans renouvellement, qui retire les publicités
                définitivement et soutient les prochaines nouveautés.
              </p>
            </li>
          </ul>
          <p className="if-mute text-xs">
            Les paiements sont traités par Paddle, qui agit comme vendeur officiel.
            Aucune donnée bancaire ne transite par Mimic Master.
          </p>
        </section>

        <hr className="if-divider my-10" />

        <section aria-labelledby="faq" className="space-y-5">
          <h2 id="faq" className="if-h1">Questions fréquentes</h2>
          <dl className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.question} className="if-panel p-4 space-y-1">
                <dt className="if-h2">{item.question}</dt>
                <dd className="text-sm" style={{ color: 'var(--ink-text-dim)' }}>
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <hr className="if-divider my-10" />

        <section className="space-y-4 text-center">
          <h2 className="if-h1">Prêt à lancer une partie ?</h2>
          <div className="mx-auto max-w-sm">
            <button
              type="button"
              onClick={onSignIn}
              className="if-btn if-btn--primary if-btn--lg menu-focus w-full"
            >
              Connexion avec Google
            </button>
          </div>
        </section>

        <footer className="mt-12 space-y-3 text-center">
          <hr className="if-divider" />
          <nav aria-label="Informations légales" className="flex flex-wrap justify-center gap-4 pt-3">
            {LEGAL_ROUTES.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className="if-mute text-xs underline hover:no-underline"
              >
                {route.label}
              </Link>
            ))}
          </nav>
          <p className="if-mute text-xs">
            © {new Date().getFullYear()} {PUBLISHER_NAME}. Jeu de soirée
            multijoueur en ligne.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default PublicLanding;
