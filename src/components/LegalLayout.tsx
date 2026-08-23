/**
 * Coquille commune des pages légales publiques.
 *
 * Ces pages doivent rester lisibles sans compte et sans dépendre de l'état du
 * jeu : elles ne montent aucun hook de partie, seulement du contenu statique.
 */
import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_LAST_UPDATED, LEGAL_ROUTES, PUBLISHER_NAME } from '@/lib/legal';

interface LegalLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function LegalLayout({ title, description, children }: LegalLayoutProps) {
  useEffect(() => {
    document.title = `${title} — Mimic Master`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = meta?.content;
    if (meta) meta.content = description;
    return () => {
      if (meta && previous !== undefined) meta.content = previous;
    };
  }, [title, description]);

  return (
    <div className="if-root min-h-screen overflow-y-auto">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <Link to="/" className="if-mute text-xs underline hover:no-underline">
          ← Retour à l'accueil
        </Link>

        <h1 className="if-h1 mt-6">{title}</h1>
        <p className="if-muted mt-2 text-sm">{description}</p>

        <hr className="if-divider my-8" />

        <div className="space-y-8">{children}</div>

        <hr className="if-divider my-8" />

        <p className="if-mute text-xs">
          Dernière mise à jour : {LEGAL_LAST_UPDATED}.
        </p>

        <nav
          aria-label="Informations légales"
          className="mt-4 flex flex-wrap gap-4 border-t-0 pt-2"
        >
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

        <p className="if-mute mt-4 text-xs">
          © {new Date().getFullYear()} {PUBLISHER_NAME}.
        </p>
      </main>
    </div>
  );
}

/** Section titrée d'une page légale. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="if-h2">{heading}</h2>
      <div className="space-y-3 text-sm" style={{ color: 'var(--ink-text-dim)' }}>
        {children}
      </div>
    </section>
  );
}

export default LegalLayout;
