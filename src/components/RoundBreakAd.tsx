import { AdSlot } from '@/components/AdSlot';
import type { AdGameMode } from '@/lib/adAnalytics';

const ROUND_BREAK_DELAY_MS = 10_000;

interface RoundBreakAdProps {
  gameMode: AdGameMode;
  instanceKey: string;
  className?: string;
}

/** Bannière non bloquante pour une pause inter-manches stable. */
export const RoundBreakAd = ({ gameMode, instanceKey, className = '' }: RoundBreakAdProps) => (
  <AdSlot
    slot={
      import.meta.env.VITE_ADSENSE_SLOT_BANNER_ROUND
      ?? import.meta.env.VITE_ADSENSE_SLOT_BANNER_RESULTS
    }
    format="horizontal"
    loadAfterMs={ROUND_BREAK_DELAY_MS}
    screen="round_break"
    placement="round_break_banner"
    gameMode={gameMode}
    instanceKey={instanceKey}
    className={`mx-auto my-6 h-[90px] w-full max-w-[728px] rounded-xl ${className}`}
    label="Publicité entre les manches"
  />
);

export default RoundBreakAd;
