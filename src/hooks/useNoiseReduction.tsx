import { useState, useEffect, useRef, useCallback } from 'react';
import { Rnnoise, type DenoiseState } from '@shiguredo/rnnoise-wasm';

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
 * - Processing latency: ~10ms (one frame).
 * - Wasm is ~85KB gzipped, lazy-loaded on first use.
 */

const RNNOISE_SCALE = 32768; // 16-bit PCM range
const STORAGE_KEY = 'mimic-master:noise-reduction-enabled';

let rnnoisePromise: Promise<Rnnoise> | null = null;

const getRnnoise = (): Promise<Rnnoise> => {
  if (!rnnoisePromise) {
    rnnoisePromise = Rnnoise.load().catch((err) => {
      rnnoisePromise = null;
      throw err;
    });
  }
  return rnnoisePromise;
};

/** Read the user preference synchronously (used outside React too) */
export const isNoiseReductionEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
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
  // Respect user preference unless forced.
  if (!options.force && !isNoiseReductionEnabled()) {
    return { stream, cleanup: () => {} };
  }

  const signal = options.signal;
  let denoiseState: DenoiseState | null = null;
  let ctx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  let released = false;

  // Install teardown before the first await. AudioWorklet.addModule cannot be
  // cancelled by browsers, but closing its context immediately prevents an
  // abandoned Audio Phone session from retaining the RNNoise graph.
  const cleanup = () => {
    if (released) return;
    released = true;
    signal?.removeEventListener('abort', cleanup);

    if (workletNode) workletNode.port.onmessage = null;
    try { workletNode?.disconnect(); } catch {}
    try { source?.disconnect(); } catch {}
    try { destination?.disconnect(); } catch {}
    try { denoiseState?.destroy(); } catch {}

    workletNode = null;
    source = null;
    destination = null;
    denoiseState = null;

    const context = ctx;
    ctx = null;
    if (context && context.state !== 'closed') {
      try { void context.close().catch(() => undefined); } catch {}
    }
  };

  if (signal?.aborted) {
    return { stream, cleanup: () => {} };
  }
  signal?.addEventListener('abort', cleanup, { once: true });

  try {
    const rnnoise = await awaitWithAbort(getRnnoise(), signal);
    if (released || signal?.aborted) return { stream, cleanup: () => {} };

    const currentDenoiseState = rnnoise.createDenoiseState();
    denoiseState = currentDenoiseState;

    // Force 48kHz for RNNoise compatibility.
    const context = new AudioContext({ sampleRate: 48000 });
    ctx = context;
    await awaitWithAbort(context.audioWorklet.addModule('/rnnoise-worklet.js'), signal);
    if (released || signal?.aborted) return { stream, cleanup: () => {} };

    const currentSource = context.createMediaStreamSource(stream);
    source = currentSource;
    const currentWorkletNode = new AudioWorkletNode(context, 'rnnoise-processor');
    workletNode = currentWorkletNode;

    currentWorkletNode.port.onmessage = (event) => {
      if (event.data.type !== 'frame') return;
      const frame: Float32Array = event.data.data;

      // Convert Float32 [-1, 1] to 16-bit PCM range.
      const scaled = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        scaled[i] = frame[i] * RNNOISE_SCALE;
      }

      try {
        currentDenoiseState.processFrame(scaled);
      } catch (err) {
        console.warn('[NoiseReduction] processFrame failed:', err);
      }

      // Convert back to Float32.
      const output = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        output[i] = scaled[i] / RNNOISE_SCALE;
      }

      currentWorkletNode.port.postMessage({ type: 'frame', data: output });
    };

    const currentDestination = context.createMediaStreamDestination();
    destination = currentDestination;
    currentSource.connect(currentWorkletNode);
    currentWorkletNode.connect(currentDestination);

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
    getRnnoise()
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
