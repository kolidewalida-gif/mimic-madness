import { getSharedAudioContext } from '@/lib/audioUnlock';
import { getSoundEffectsVolume } from '@/hooks/useSoundEffectsVolume';

let latestRequest = 0;

/** A short rubbery plop, not the menu click sample. No downloads or new context. */
export function playMenuBubblePop(size: number, horizontalPosition: number, variant: number) {
  const request = ++latestRequest;
  try {
    const volume = getSoundEffectsVolume();
    if (!(volume > 0) || document.visibilityState === 'hidden') return;
    const ctx = getSharedAudioContext();
    if (!ctx || ctx.state === 'closed') return;
    const requestedAt = performance.now();
    const start = () => {
      // No backlog of pops when Safari resumes after an interruption or when
      // a browser's autoplay policy takes too long to unlock the context.
      if (ctx.state !== 'running' || document.visibilityState === 'hidden' ||
          performance.now() - requestedAt > 250) return;
      const currentVolume = getSoundEffectsVolume();
      if (!(currentVolume > 0)) return;
      const safeSize = Number.isFinite(size) ? Math.max(44, Math.min(180, size)) : 90;
      const safeVariant = Number.isFinite(variant) ? variant : 1;
      const pitch = (1.22 - safeSize / 360) * (1 + ((safeVariant % 3) - 1) * .045);
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = Math.min(1, currentVolume) * .55;
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass'; warm.frequency.value = 3200; warm.Q.value = .45;
      master.connect(warm);
      const pan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Number.isFinite(horizontalPosition) ? Math.max(-.45, Math.min(.45, (horizontalPosition - .5) * .9)) : 0;
        warm.connect(pan); pan.connect(ctx.destination);
      } else warm.connect(ctx.destination);

      let remaining = 2;
      const voice = (time: number, duration: number, from: number, to: number, peak: number) => {
        const osc = ctx.createOscillator();
        const envelope = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(from * pitch, time);
        osc.frequency.exponentialRampToValueAtTime(to * pitch, time + duration);
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(peak, time + .005);
        envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
        osc.connect(envelope); envelope.connect(master);
        osc.onended = () => {
          osc.disconnect(); envelope.disconnect();
          if (--remaining === 0) { master.disconnect(); warm.disconnect(); pan?.disconnect(); }
        };
        osc.start(time); osc.stop(time + duration + .015);
      };
      voice(now, .14, 720, 165, .5);
      voice(now + .045, .12, 180, 285, .15);
    };
    if (ctx.state === 'running') start();
    else {
      // Call resume within the actual click/keyboard gesture. WebKit also has
      // an "interrupted" state, so do not limit this to "suspended".
      void ctx.resume().then(() => {
        if (request === latestRequest) start();
      }).catch(() => { /* Autoplay denied: keep the burst, silently. */ });
    }
  } catch { /* Audio unavailable: the visual interaction still works. */ }
}
