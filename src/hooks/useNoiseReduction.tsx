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
  options: { force?: boolean } = {}
): Promise<ProcessStreamResult> => {
  // Respect user preference unless forced
  if (!options.force && !isNoiseReductionEnabled()) {
    return { stream, cleanup: () => {} };
  }

  try {
    const rnnoise = await getRnnoise();
    const denoiseState = rnnoise.createDenoiseState();

    // Force 48kHz for RNNoise compatibility
    const ctx = new AudioContext({ sampleRate: 48000 });
    await ctx.audioWorklet.addModule('/rnnoise-worklet.js');

    const source = ctx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(ctx, 'rnnoise-processor');

    workletNode.port.onmessage = (event) => {
      if (event.data.type !== 'frame') return;
      const frame: Float32Array = event.data.data;

      // Convert Float32 [-1, 1] to 16-bit PCM range
      const scaled = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        scaled[i] = frame[i] * RNNOISE_SCALE;
      }

      try {
        denoiseState.processFrame(scaled);
      } catch (err) {
        console.warn('[NoiseReduction] processFrame failed:', err);
      }

      // Convert back to Float32
      const output = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        output[i] = scaled[i] / RNNOISE_SCALE;
      }

      workletNode.port.postMessage({ type: 'frame', data: output });
    };

    const destination = ctx.createMediaStreamDestination();
    source.connect(workletNode);
    workletNode.connect(destination);

    const cleanup = () => {
      try { workletNode.disconnect(); } catch {}
      try { source.disconnect(); } catch {}
      try { destination.disconnect(); } catch {}
      try { denoiseState.destroy(); } catch {}
      try { ctx.close().catch(() => {}); } catch {}
    };

    return { stream: destination.stream, cleanup };
  } catch (err) {
    console.warn('[NoiseReduction] Setup failed, using original stream:', err);
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
