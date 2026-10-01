/** 48kHz / 480-sample RNNoise frames. Fixed 40ms buffer, never an expanding queue. */
const FRAME_SIZE = 480;
const DELAY = FRAME_SIZE * 4;

class RnnoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputBuffer = new Float32Array(FRAME_SIZE);
    this.dry = new Float32Array(DELAY);
    this.samples = 0;
    this.inputIndex = 0;
    this.pending = 0;
    this.frames = new Map();
    this.wet = 0;
    this.lastWet = 0;
    this.bypass = false;
    this.port.onmessage = ({ data: message }) => {
      if (message.type === 'bypass') this.bypass = Boolean(message.data);
      if (message.type !== 'frame') return;
      this.pending = Math.max(0, this.pending - 1);
      const firstUnplayed = Math.floor(Math.max(0, this.samples - DELAY) / FRAME_SIZE);
      if (message.id >= firstUnplayed && message.data?.length === FRAME_SIZE && this.frames.size < 8) {
        this.frames.set(message.id, message.data);
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!output) return true;
    for (let i = 0; i < output.length; i++) {
      const sample = input?.[i] || 0;
      const ringIndex = this.samples % DELAY;
      const dry = this.dry[ringIndex];
      this.dry[ringIndex] = sample;
      this.inputBuffer[this.inputIndex++] = sample;
      if (this.inputIndex === FRAME_SIZE) {
        // Backpressure caps worker messages and memory even under CPU load.
        if (!this.bypass && this.pending < 6) {
          const data = this.inputBuffer.slice();
          this.port.postMessage({ type: 'frame', id: Math.floor(this.samples / FRAME_SIZE), data }, [data.buffer]);
          this.pending++;
        }
        this.inputIndex = 0;
      }
      const playSample = this.samples - DELAY;
      const id = Math.floor(playSample / FRAME_SIZE);
      const offset = playSample % FRAME_SIZE;
      const frame = playSample >= 0 ? this.frames.get(id) : undefined;
      const target = frame && !this.bypass ? 1 : 0;
      // Crossfade to aligned dry audio on underruns, never insert silence.
      this.wet += Math.max(-1 / 240, Math.min(1 / 240, target - this.wet));
      if (frame) this.lastWet = frame[offset];
      output[i] = dry + (this.lastWet - dry) * this.wet;
      if (offset === FRAME_SIZE - 1) this.frames.delete(id);
      this.samples++;
    }
    return true;
  }
}
registerProcessor('rnnoise-processor', RnnoiseProcessor);
