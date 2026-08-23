import { useEffect, useState } from 'react';
import {
  Check,
  ExternalLink,
  Heart,
  Infinity as InfinityIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { InkModal } from '@/components/menu/InkOverlay';
import { GameButton, GameTag } from '@/components/game-ui/GameUI';
import { useAdFree } from '@/hooks/useAdFree';
import { useAuth } from '@/hooks/useAuth';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import {
  getPaddleCustomerPortalUrl,
  PRICE_AD_FREE_MONTHLY,
  PRICE_SUPPORTER_LIFETIME,
  type PaddleOffer,
} from '@/lib/paddle';

interface SupportMimicMasterDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OfferCardProps {
  offer: PaddleOffer;
  title: string;
  price: string;
  cadence: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  benefits: string[];
  recommended?: boolean;
  disabled?: boolean;
  loading: boolean;
  onChoose: (offer: PaddleOffer) => void;
}

function OfferCard({
  offer,
  title,
  price,
  cadence,
  description,
  icon,
  accent,
  benefits,
  recommended = false,
  disabled = false,
  loading,
  onChoose,
}: OfferCardProps) {
  return (
    <article
      className="relative flex h-full flex-col rounded-2xl border-2 border-white/10 bg-black/20 p-4"
      style={{ boxShadow: recommended ? `0 0 0 1px ${accent}, 0 14px 35px rgba(0,0,0,.28)` : undefined }}
    >
      {recommended && (
        <span className="absolute -top-3 right-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black" style={{ background: accent }}>
          Le plus généreux
        </span>
      )}
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-black" style={{ background: accent }} aria-hidden="true">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="text-xs font-semibold text-white/50">{description}</p>
        </div>
      </div>
      <p className="mb-4 flex items-end gap-1 text-white">
        <span className="text-3xl font-black">{price}</span>
        <span className="pb-1 text-xs font-bold text-white/50">{cadence}</span>
      </p>
      <ul className="mb-5 flex flex-1 flex-col gap-2 text-sm font-semibold text-white/75">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: accent }} aria-hidden="true" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <GameButton
        data-autofocus={offer === PRICE_AD_FREE_MONTHLY || undefined}
        variant="primary"
        accent={accent}
        block
        disabled={disabled}
        loading={loading}
        loadingLabel="Ouverture de Paddle…"
        onClick={() => onChoose(offer)}
      >
        {disabled ? 'Déjà actif' : 'Choisir cette offre'}
      </GameButton>
    </article>
  );
}

export function SupportMimicMasterDialog({ isOpen, onClose }: SupportMimicMasterDialogProps) {
  const { session } = useAuth();
  const { isAdFree, source, expiresAt, environment, isLoading } = useAdFree();
  const { openCheckout, pendingOffer, checkoutCompleted, error } = usePaddleCheckout();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !isAdFree) {
      setPortalUrl(null);
      setPortalError(null);
      setPortalLoading(false);
      return;
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      setPortalUrl(null);
      setPortalLoading(false);
      setPortalError('Ta session a expiré. Reconnecte-toi pour gérer ton abonnement.');
      return;
    }

    setPortalLoading(true);
    setPortalError(null);
    void getPaddleCustomerPortalUrl(accessToken)
      .then((url) => {
        if (!cancelled) setPortalUrl(url);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          const message = cause instanceof Error ? cause.message : 'Portail client indisponible.';
          setPortalError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setPortalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdFree, isOpen, session?.access_token, source]);

  const activeLabel = source === 'lifetime'
    ? 'Supporter à vie actif — toutes les publicités sont masquées.'
    : expiresAt
      ? `Sans pub actif jusqu’au ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(expiresAt))}.`
      : null;

  return (
    <InkModal
      isOpen={isOpen}
      onClose={onClose}
      title="Soutenir Mimic Master"
      subtitle="Moins de pubs, plus de parties"
      icon={<Heart className="h-5 w-5" fill="currentColor" />}
      iconGradient="linear-gradient(135deg, var(--c-pink), var(--c-violet))"
      className="max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white/75">
            <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            {isLoading
              ? 'Vérification de ton droit sans pub…'
              : activeLabel ?? 'Choisis la formule qui te convient.'}
          </div>
          {environment === 'sandbox' && <GameTag accent="var(--c-yellow)">Mode test</GameTag>}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <OfferCard
            offer={PRICE_AD_FREE_MONTHLY}
            title="Sans pub"
            price="1,99 €"
            cadence="/ mois"
            description="Simple et résiliable"
            icon={<ShieldCheck className="h-5 w-5" />}
            accent="var(--c-cyan)"
            benefits={[
              'Toutes les publicités masquées immédiatement',
              'Accès conservé jusqu’à la fin de la période payée',
              'Gestion et annulation depuis le portail Paddle',
            ]}
            disabled={source === 'subscription' || source === 'lifetime'}
            loading={pendingOffer === PRICE_AD_FREE_MONTHLY}
            onChoose={(offer) => void openCheckout(offer)}
          />
          <OfferCard
            offer={PRICE_SUPPORTER_LIFETIME}
            title="Supporter à vie"
            price="3,99 €"
            cadence="une seule fois"
            description="Un merci permanent"
            icon={<InfinityIcon className="h-5 w-5" />}
            accent="var(--c-yellow)"
            benefits={[
              'Toutes les publicités masquées à vie',
              'Un paiement unique, sans renouvellement',
              'Tu soutiens directement les prochaines nouveautés',
            ]}
            recommended
            disabled={source === 'lifetime'}
            loading={pendingOffer === PRICE_SUPPORTER_LIFETIME}
            onChoose={(offer) => void openCheckout(offer)}
          />
        </div>

        {checkoutCompleted && !isAdFree && (
          <p role="status" className="flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 p-3 text-sm font-bold text-violet-100">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Paiement confirmé. Activation du droit sans pub en cours…
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold text-red-100">
            {error.message}
          </p>
        )}

        {isAdFree && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold text-white/50">
              Consulte tes paiements, mets à jour ta carte ou annule ton abonnement.
            </p>
            {portalUrl ? (
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="if-btn if-btn--neutral menu-focus inline-flex items-center gap-2"
              >
                Gérer ou annuler
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <GameButton variant="neutral" disabled loading={portalLoading} loadingLabel="Chargement du portail…">
                Portail client
              </GameButton>
            )}
          </div>
        )}
        {portalError && <p role="alert" className="text-xs font-semibold text-red-200">{portalError}</p>}

        <p className="text-center text-[11px] font-semibold text-white/35">
          Paiement sécurisé et facturation gérés par Paddle. Les droits sont activés après confirmation du webhook.
        </p>
      </div>
    </InkModal>
  );
}
