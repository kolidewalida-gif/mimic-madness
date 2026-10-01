import { getSharedAudioContext } from '@/lib/audioUnlock';
import { getSoundEffectsVolume } from '@/hooks/useSoundEffectsVolume';

/** A short rubbery plop, not the menu click sample. No downloads or new context. */
export function playMenuBubblePop(size: number, horizontalPosition: number, variant: number) {
  try {
    const volume = getSoundEffectsVolume();
    if (!(volume > 0) || document.visibilityState === 'hidden') return;
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const safeSize = Number.isFinite(size) ? Math.max(44, Math.min(180, size)) : 90;
    const pitch = (1.22 - safeSize / 360) * (1 + ((variant % 3) - 1) * .045);
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = Math.min(1, volume) * .55;
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.value = 3200; warm.Q.value = .45;
    master.connect(warm);
    const pan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Number.isFinite(horizontalPosition) ? Math.max(-.45, Math.min(.45, (horizontalPosition - .5) * .9)) : 0;
      warm.connect(pan); pan.connect(ctx.destination);
    } else warm.connect(ctx.destination);

    let remaining = 2;
    const voice = (start: number, duration: number, from: number, to: number, peak: number) => {
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(from * pitch, start);
      osc.frequency.exponentialRampToValueAtTime(to * pitch, start + duration);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(peak, start + .005);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(envelope); envelope.connect(master);
      osc.onended = () => {
        osc.disconnect(); envelope.disconnect();
        if (--remaining === 0) { master.disconnect(); warm.disconnect(); pan?.disconnect(); }
      };
      osc.start(start); osc.stop(start + duration + .015);
    };
    voice(now, .14, 720, 165, .5);
    voice(now + .045, .12, 180, 285, .15);
  } catch { /* Audio unavailable: the visual interaction still works. */ }
}
