/**
 * RNNoise AudioWorklet processor.
 *
 * Receives raw audio samples at the AudioContext sample rate, buffers them
 * into 480-sample frames (RNNoise's frame size at 48kHz), and forwards
 * them to the main thread for denoising. The denoised samples come back
 * via port message and are output to the audio destination.
 *
 * Note: RNNoise is hard-coded to 48kHz. The AudioContext should match.
 */

const FRAME_SIZE = 480; // RNNoise frame size at 48kHz

class RnnoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Input buffer: accumulates samples until we have 480
    this.inputBuffer = new Float32Array(FRAME_SIZE);
    this.inputBufferIndex = 0;

    // Output queue: frames returned from main thread, waiting to be played
    this.outputQueue = [];
    this.outputBuffer = null;
    this.outputBufferIndex = 0;

    // Bypass mode: pass-through if denoising is disabled
    this.bypass = false;

    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'frame' && data) {
        // Denoised frame returned from main thread
        this.outputQueue.push(data);
      } else if (type === 'bypass') {
        this.bypass = Boolean(data);
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    // Bypass: just copy input to output
    if (this.bypass) {
      outputChannel.set(inputChannel);
      return true;
    }

    for (let i = 0; i < inputChannel.length; i++) {
      // Accumulate input samples into the frame buffer
      this.inputBuffer[this.inputBufferIndex++] = inputChannel[i];

      // Frame full → send to main thread for denoising
      if (this.inputBufferIndex >= FRAME_SIZE) {
        this.port.postMessage({
          type: 'frame',
          data: this.inputBuffer.slice(),
        });
        this.inputBufferIndex = 0;
      }

      // Output: pull from queue if available
      if (!this.outputBuffer || this.outputBufferIndex >= FRAME_SIZE) {
        this.outputBuffer = this.outputQueue.shift();
        this.outputBufferIndex = 0;
      }

      if (this.outputBuffer) {
        outputChannel[i] = this.outputBuffer[this.outputBufferIndex++];
      } else {
        // No denoised frame ready yet → output silence (initial latency ~10ms)
        outputChannel[i] = 0;
      }
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RnnoiseProcessor);
