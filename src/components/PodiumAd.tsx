import { AdSlot } from '@/components/AdSlot';
import type { AdGameMode } from '@/lib/adAnalytics';

const PODIUM_DELAY_MS = 10_000;

interface PodiumAdProps {
  gameMode: AdGameMode;
  instanceKey: string;
  className?: string;
}

/** Bannière non bloquante réservée aux résultats finaux et podiums. */
export const PodiumAd = ({ gameMode, instanceKey, className = '' }: PodiumAdProps) => (
  <AdSlot
    slot={
      import.meta.env.VITE_ADSENSE_SLOT_BANNER_PODIUM
      ?? import.meta.env.VITE_ADSENSE_SLOT_BANNER_RESULTS
    }
    format="horizontal"
    loadAfterMs={PODIUM_DELAY_MS}
    screen="results_podium"
    placement="results_podium_banner"
    gameMode={gameMode}
    instanceKey={instanceKey}
    className={`mx-auto my-6 h-[90px] w-full max-w-[728px] rounded-xl ${className}`}
    label="Publicité sur le podium"
  />
);

export default PodiumAd;
