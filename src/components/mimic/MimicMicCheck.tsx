import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, RotateCcw, TriangleAlert } from 'lucide-react';
import { MIMIC, MIMIC_SPECTRUM, mglow } from './mimicTheme';

type MicState = 'idle' | 'requesting' | 'listening' | 'ready' | 'error';

interface MimicMicCheckProps {
  onReadyChange: (ready: boolean) => void;
}

export const MimicMicCheck = ({ onReadyChange }: MimicMicCheckProps) => {
  const [state, setState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const heardAtRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close().catch(() => undefined);
    contextRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    stop();
    onReadyChange(false);
    setState('requesting');
    heardAtRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      context.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      contextRef.current = context;
      setState('listening');
      const samples = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(samples);
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        const nextLevel = Math.min(100, Math.round((average / 90) * 100));
        setLevel(nextLevel);
        const now = performance.now();
        if (nextLevel >= 8) {
          heardAtRef.current ??= now;
          if (now - heardAtRef.current >= 450) {
            setState('ready');
            onReadyChange(true);
            stop();
            return;
          }
        } else {
          heardAtRef.current = null;
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch {
      stop();
      setState('error');
      onReadyChange(false);
    }
  }, [onReadyChange, stop]);

  const ready = state === 'ready';
  return (
    <div className="w-full rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${ready ? MIMIC.emerald : MIMIC.hair}` }}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: ready ? `${MIMIC.emerald}22` : `${MIMIC.magenta}18`, color: ready ? MIMIC.emerald : MIMIC.magenta }}>
          {state === 'requesting' ? <Loader2 className="h-5 w-5 animate-spin" /> : ready ? <Check className="h-5 w-5" /> : state === 'error' ? <TriangleAlert className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-black text-white">{ready ? 'Micro prêt' : state === 'listening' ? 'Parle maintenant…' : state === 'error' ? 'Micro inaccessible' : 'Test du microphone'}</div>
          <div className="text-xs" style={{ color: state === 'error' ? MIMIC.rose : MIMIC.sub }}>
            {state === 'error' ? 'Autorise le microphone puis réessaie.' : ready ? 'Ta voix sera diffusée uniquement pendant ton tour.' : 'Dis quelques mots pour vérifier le niveau.'}
          </div>
        </div>
      </div>
      {state === 'listening' && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`Niveau du microphone ${level}%`}>
          <div className="h-full rounded-full transition-[width] duration-75" style={{ width: `${level}%`, background: MIMIC_SPECTRUM, boxShadow: mglow(MIMIC.magenta, 0.35) }} />
        </div>
      )}
      <button
        type="button"
        onClick={start}
        disabled={state === 'requesting' || state === 'listening'}
        className="menu-focus mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-white disabled:opacity-60"
        style={{ background: ready ? 'rgba(255,255,255,0.06)' : MIMIC_SPECTRUM, border: `1px solid ${ready ? MIMIC.hair : 'transparent'}` }}
      >
        {ready ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {ready ? 'Retester' : state === 'listening' ? 'Écoute…' : state === 'requesting' ? 'Autorisation…' : 'Tester mon micro'}
      </button>
    </div>
  );
};
