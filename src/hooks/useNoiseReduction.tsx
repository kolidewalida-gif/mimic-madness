import { useState, useEffect, useRef, useCallback } from 'react';
import { Rnnoise, type DenoiseState } from '@shiguredo/rnnoise-wasm';

/**
 * Real-time microphone noise reduction using RNNoise (WebAssembly).
 *
 * RNNoise is a free, open-source noise suppression library by Xiph.org.
 * It uses a small recurrent neural network to remove background noise
 * (keyboard typing, fans, traffic, etc.) while preserving speech.
 *
 * Usage:
 *   const { processStream, isReady, isEnabled, toggle } = useNoiseReduction();
 *   const cleanStream = await processStream(rawMicStream);
 *
 * Notes:
 * - RNNoise expects 48kHz audio. We force AudioContext sampleRate to 48000.
 * - One frame = 480 samples = 10ms at 48kHz.
 * - Processing latency: ~10ms (one frame).
 * - The wasm file is ~85KB gzipped, lazy-loaded on first use.
 *
 * VAD (voice activity detection) is also exposed: each frame returns a
 * 0..1 confidence score for whether speech is present.
 */

const RNNOISE_SCALE = 32768; // 16-bit PCM range — RNNoise expects this scaling
const STORAGE_KEY = 'mimic-master:noise-reduction-enabled';

let rnnoisePromise: Promise<Rnnoise> | null = null;

/** Lazy-load the wasm module (singleton) */
const getRnnoise = (): Promise<Rnnoise> => {
  if (!rnnoisePromise) {
    rnnoisePromise = Rnnoise.load().catch((err) => {
      rnnoisePromise = null; // allow retry on failure
      throw err;
    });
  }
  return rnnoisePromise;
};

interface ProcessStreamOptions {
  /** If false, return the original stream unchanged. Default: true */
  enabled?: boolean;
}

interface UseNoiseReductionResult {
  /** True once RNNoise wasm is loaded and ready to process audio */
  isReady: boolean;
  /** True if noise reduction is currently active (user-controlled) */
  isEnabled: boolean;
  /** Last error encountered (e.g. wasm load failure) */
  error: Error | null;
  /** Voice activity detection: 0..1 confidence for the latest frame */
  vad: number;
  /** Toggle noise reduction on/off */
  toggle: () => void;
  /** Set noise reduction state explicitly */
  setEnabled: (enabled: boolean) => void;
  /**
   * Process a MediaStream through RNNoise.
   * Returns a new MediaStream with the cleaned audio track.
   * The original stream is left untouched.
   */
  processStream: (
    stream: MediaStream,
    options?: ProcessStreamOptions
  ) => Promise<MediaStream>;
}

export const useNoiseReduction = (): UseNoiseReductionResult => {
  const [isReady, setIsReady] = useState(false);
  const [isEnabled, setIsEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<Error | null>(null);
  const [vad, setVad] = useState(0);

  const denoiseStateRef = useRef<DenoiseState | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Persist enabled state
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* ignore */
    }
    // Send bypass message to worklet if active
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'bypass', data: !enabled });
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!isEnabled);
  }, [isEnabled, setEnabled]);

  // Pre-load wasm on mount (non-blocking)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (denoiseStateRef.current) {
        try {
          denoiseStateRef.current.destroy();
        } catch {
          /* ignore */
        }
        denoiseStateRef.current = null;
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (destinationRef.current) {
        destinationRef.current.disconnect();
        destinationRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const processStream = useCallback(
    async (
      stream: MediaStream,
      options: ProcessStreamOptions = {}
    ): Promise<MediaStream> => {
      const enabled = options.enabled ?? isEnabled;

      // If user disabled, return original stream
      if (!enabled) return stream;

      try {
        const rnnoise = await getRnnoise();
        const denoiseState = rnnoise.createDenoiseState();
        denoiseStateRef.current = denoiseState;

        // Force 48kHz sample rate for RNNoise compatibility
        const ctx = new AudioContext({ sampleRate: 48000 });
        audioCtxRef.current = ctx;

        // Load worklet
        await ctx.audioWorklet.addModule('/rnnoise-worklet.js');

        const source = ctx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        const workletNode = new AudioWorkletNode(ctx, 'rnnoise-processor');
        workletNodeRef.current = workletNode;

        // Frame processing: receive raw frame from worklet, denoise, send back
        workletNode.port.onmessage = (event) => {
          if (event.data.type !== 'frame') return;
          const frame: Float32Array = event.data.data;

          // Convert Float32 [-1, 1] to 16-bit PCM range expected by RNNoise
          const scaled = new Float32Array(frame.length);
          for (let i = 0; i < frame.length; i++) {
            scaled[i] = frame[i] * RNNOISE_SCALE;
          }

          let voiceProb = 0;
          try {
            voiceProb = denoiseState.processFrame(scaled);
          } catch (err) {
            console.warn('[NoiseReduction] processFrame failed:', err);
          }

          // Convert back to Float32 [-1, 1]
          const output = new Float32Array(frame.length);
          for (let i = 0; i < frame.length; i++) {
            output[i] = scaled[i] / RNNOISE_SCALE;
          }

          workletNode.port.postMessage({ type: 'frame', data: output });
          setVad(voiceProb);
        };

        const destination = ctx.createMediaStreamDestination();
        destinationRef.current = destination;

        source.connect(workletNode);
        workletNode.connect(destination);

        // Send initial bypass state (in case user disabled before stream attached)
        workletNode.port.postMessage({ type: 'bypass', data: !enabled });

        return destination.stream;
      } catch (err) {
        console.warn('[NoiseReduction] Failed to set up stream, falling back to original:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        return stream;
      }
    },
    [isEnabled],
  );

  return {
    isReady,
    isEnabled,
    error,
    vad,
    toggle,
    setEnabled,
    processStream,
  };
};
