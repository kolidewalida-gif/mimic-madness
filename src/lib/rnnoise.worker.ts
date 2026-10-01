import { Rnnoise } from '@shiguredo/rnnoise-wasm';

// WASM inference stays off React's/UI/video thread. Frames travel directly
// between this worker and the AudioWorklet, never through the main thread.
void Rnnoise.load().then(rnnoise => {
  const state = rnnoise.createDenoiseState();
  self.onmessage = (event: MessageEvent<{ type: string; port: MessagePort }>) => {
    if (event.data.type !== 'connect') return;
    const port = event.data.port;
    port.onmessage = (message: MessageEvent<{ type: string; id: number; data: Float32Array }>) => {
      if (message.data.type !== 'frame') return;
      const { id, data } = message.data;
      const pcm = new Float32Array(data.length);
      for (let i = 0; i < pcm.length; i++) pcm[i] = data[i] * 32768;
      try {
        state.processFrame(pcm);
        for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 32768;
      } catch { /* Return original audio rather than a silent gap. */ }
      port.postMessage({ type: 'frame', id, data }, [data.buffer]);
    };
    port.start();
  };
  self.postMessage({ type: 'ready' });
}).catch(() => self.postMessage({ type: 'error' }));
