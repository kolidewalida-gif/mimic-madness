import { useState, useEffect, useCallback } from 'react';
import { createMicrophoneAudioContext } from '@/lib/microphoneCapture';

/**
 * Real-time microphone noise reduction using RNNoise (WebAssembly).
 *
 * RNNoise is a free, open-source noise suppression library by Xiph.org.
 * Removes keyboard typing, fans, traffic, AC hum, etc. while preserving speech.
 *
 * Usage:
 *   const { processStream, isReady, isEnabled, toggle } = useNoiseReduction();
 *   const result = await processStream(rawMicStream);
 *   const cleanStream = result.stream;
 *   // ... use cleanStream in MediaRecorder ...
 *   // when done:
 *   result.cleanup();
 *
 * Notes:
 * - RNNoise expects 48kHz audio. We force AudioContext sampleRate to 48000.
 * - One frame = 480 samples = 10ms at 48kHz.
 * - A dedicated worker runs WASM, with a fixed 40ms worklet buffer.
 * - Late processing falls back to buffered microphone audio, not silence.
 */

const STORAGE_KEY = 'mimic-master:noise-reduction-enabled';

let preloadPromise: Promise<void> | null = null;
const getNoiseReductionReady = (): Promise<void> => {
  if (!preloadPromise) {
    preloadPromise = new Promise<void>((resolve, reject) => {
      if (typeof Worker === 'undefined' || typeof AudioWorkletNode === 'undefined') {
        reject(new Error('Isolation avancée indisponible dans ce navigateur.'));
        return;
      }
      const worker = new Worker(new URL('../lib/rnnoise.worker.ts', import.meta.url), { type: 'module' });
      const timeout = setTimeout(() => finish(new Error('Préparation du filtre trop longue.')), 6000);
      const finish = (error?: Error) => {
        clearTimeout(timeout); worker.terminate();
        worker.onmessage = null; worker.onerror = null;
        if (error) reject(error); else resolve();
      };
      worker.onmessage = event => {
        if (event.data.type === 'ready') finish();
        else if (event.data.type === 'error') finish(new Error('Isolation avancée indisponible.'));
      };
      worker.onerror = () => finish(new Error('Isolation avancée indisponible.'));
    }).catch(error => { preloadPromise = null; throw error; });
  }
  return preloadPromise;
};

/** Read the user preference synchronously (used outside React too) */
export const isNoiseReductionEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Native browser processing is the default. Double denoising can suppress
    // quiet/character voices; advanced isolation remains an explicit choice.
    return stored === 'true';
  } catch {
    return false;
  }
};

interface ProcessStreamResult {
  /** The processed (denoised) MediaStream */
  stream: MediaStream;
  /** Call this when done to release resources */
  cleanup: () => void;
}

const awaitWithAbort = <T,>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise;
  if (signal.aborted) {
    const error = new Error('Noise reduction setup aborted');
    error.name = 'AbortError';
    return Promise.reject(error);
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const error = new Error('Noise reduction setup aborted');
      error.name = 'AbortError';
      reject(error);
    };

    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
};

interface UseNoiseReductionResult {
  isReady: boolean;
  isEnabled: boolean;
  error: Error | null;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  /**
   * Process a MediaStream through RNNoise.
   * Returns a new stream + cleanup function.
   * If noise reduction is disabled or fails, returns the original stream
   * with a no-op cleanup.
   */
  processStream: (stream: MediaStream) => Promise<ProcessStreamResult>;
}

/**
 * Standalone (non-hook) version — works outside React.
 * Use this in places where you can't easily call a hook.
 */
export const processStreamWithNoiseReduction = async (
  stream: MediaStream,
  options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<ProcessStreamResult> => {
  if ((!options.force && !isNoiseReductionEnabled()) || options.signal?.aborted || typeof Worker === 'undefined' || typeof AudioWorkletNode === 'undefined') {
    return { stream, cleanup: () => {} };
  }
  const signal = options.signal;
  let ctx: AudioContext | null = null;
  let worker: Worker | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let worklet: AudioWorkletNode | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  let setupTimer: ReturnType<typeof setTimeout> | undefined;
  let released = false;
  const cleanup = () => {
    if (released) return;
    released = true;
    signal?.removeEventListener('abort', cleanup);
    clearTimeout(setupTimer);
    worker?.terminate();
    worker = null;
    if (worklet) worklet.onprocessorerror = null;
    try { worklet?.disconnect(); } catch {}
    try { source?.disconnect(); } catch {}
    try { destination?.disconnect(); } catch {}
    destination?.stream.getTracks().forEach(track => track.stop());
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
    worklet = null; source = null; destination = null; ctx = null;
  };
  signal?.addEventListener('abort', cleanup, { once: true });
  try {
    ctx = createMicrophoneAudioContext(48000);
    // Some engines/devices ignore the requested rate. Do not feed RNNoise 44.1kHz.
    if ((ctx.sampleRate && ctx.sampleRate !== 48000) || !ctx.audioWorklet || typeof Worker === 'undefined') {
      cleanup();
      return { stream, cleanup: () => {} };
    }
    worker = new Worker(new URL('../lib/rnnoise.worker.ts', import.meta.url), { type: 'module' });
    const currentWorker = worker;
    const ready = new Promise<void>((resolve, reject) => {
      setupTimer = setTimeout(() => reject(new Error('Noise reduction initialization timed out')), 6000);
      currentWorker.onmessage = event => {
        if (event.data.type === 'ready') resolve();
        else if (event.data.type === 'error') reject(new Error('Noise reduction unavailable'));
      };
      currentWorker.onerror = () => reject(new Error('Noise reduction worker unavailable'));
    });
    await awaitWithAbort(Promise.all([ctx.audioWorklet.addModule('/rnnoise-worklet.js'), ready]), signal);
    clearTimeout(setupTimer);
    if (released || signal?.aborted) { cleanup(); return { stream, cleanup: () => {} }; }
    source = ctx.createMediaStreamSource(stream);
    worklet = new AudioWorkletNode(ctx, 'rnnoise-processor', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
      channelCount: 1, channelCountMode: 'explicit',
    });
    destination = ctx.createMediaStreamDestination();
    const currentSource = source;
    const currentWorklet = worklet;
    const currentDestination = destination;
    let bypassed = false;
    const bypass = () => {
      if (released || bypassed) return;
      bypassed = true;
      // Preserve the recorder's destination stream if a processor/worker dies.
      currentSource.disconnect();
      currentWorklet.disconnect();
      currentSource.connect(currentDestination);
      currentWorker.terminate();
    };
    currentWorklet.onprocessorerror = bypass;
    currentWorker.onerror = bypass;
    currentWorker.onmessage = null;
    currentWorker.postMessage({ type: 'connect', port: currentWorklet.port }, [currentWorklet.port]);
    currentSource.connect(currentWorklet);
    currentWorklet.connect(currentDestination);
    return { stream: currentDestination.stream, cleanup };
  } catch (err) {
    cleanup();
    if (!signal?.aborted && (err as { name?: string } | null)?.name !== 'AbortError') {
      console.warn('[NoiseReduction] Setup failed, using original stream:', err);
    }
    return { stream, cleanup: () => {} };
  }
};

export const useNoiseReduction = (): UseNoiseReductionResult => {
  const [isReady, setIsReady] = useState(false);
  const [isEnabled, setIsEnabledState] = useState<boolean>(isNoiseReductionEnabled);
  const [error, setError] = useState<Error | null>(null);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!isEnabled);
  }, [isEnabled, setEnabled]);

  // Pre-load wasm on mount
  useEffect(() => {
    let cancelled = false;
    getNoiseReductionReady()
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[NoiseReduction] Failed to load RNNoise:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const processStream = useCallback(
    async (stream: MediaStream): Promise<ProcessStreamResult> => {
      if (!isEnabled) return { stream, cleanup: () => {} };
      return processStreamWithNoiseReduction(stream, { force: true });
    },
    [isEnabled],
  );

  return {
    isReady,
    isEnabled,
    error,
    toggle,
    setEnabled,
    processStream,
  };
};
