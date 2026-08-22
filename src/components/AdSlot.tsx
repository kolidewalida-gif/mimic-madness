/**
 * Emplacement publicitaire (Google AdSense).
 *
 * L'identifiant éditeur et les slots viennent des variables d'env
 * (`VITE_ADSENSE_CLIENT`, ex. "ca-pub-1234567890123456"). Tant qu'ils ne sont
 * pas configurés, on affiche un cadre discret en développement et rien en
 * production : jamais d'espace vide ni de script inutile pour le joueur.
 */
import { useEffect, useRef } from 'react';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

let scriptPromise: Promise<void> | null = null;

function loadAdSense(client: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="https://pagead2.googlesyndication.com"]`);
    if (existing) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('adsense blocked'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface AdSlotProps {
  /** Identifiant du bloc créé dans AdSense. */
  slot?: string;
  /** Format : rail vertical ou bannière horizontale. */
  format?: 'vertical' | 'horizontal' | 'auto';
  className?: string;
  label?: string;
}

export function AdSlot({ slot, format = 'auto', className = '', label = 'Publicité' }: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const configured = Boolean(ADSENSE_CLIENT && slot);

  useEffect(() => {
    if (!configured || pushed.current) return;
    let cancelled = false;
    loadAdSense(ADSENSE_CLIENT!)
      .then(() => {
        if (cancelled || pushed.current || !ref.current) return;
        pushed.current = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      })
      .catch(() => {
        // Bloqueur de pub ou réseau : on laisse l'emplacement vide.
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (!configured) {
    if (!import.meta.env.DEV) return null;
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] text-white/25 ${className}`}
        aria-hidden="true"
      >
        {label}
      </div>
    );
  }

  return (
    <div className={className} role="complementary" aria-label={label}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format === 'auto' ? 'auto' : format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default AdSlot;
