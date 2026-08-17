import { memo } from 'react';

interface InkStripesBackgroundProps {
  /** Base flat color */
  base?: string;
  /** Stripe color (slightly lighter/darker than base) */
  stripe?: string;
}

/**
 * Simple flat diagonal-stripe background (Gartic Phone / Rentguessr vibe),
 * in Mimic Master violet. No blur, no blobs, no images — pure CSS, cheap.
 */
const InkStripesBackgroundComponent = ({
  base = '#0b0708',
  stripe = '#141013',
}: InkStripesBackgroundProps) => (
  <div
    className="absolute inset-0 pointer-events-none ink-stripes-bg"
    style={{
      backgroundColor: base,
      backgroundImage: `repeating-linear-gradient(135deg, ${stripe} 0px, ${stripe} 42px, transparent 42px, transparent 84px)`,
    }}
  />
);

export const InkStripesBackground = memo(InkStripesBackgroundComponent);
