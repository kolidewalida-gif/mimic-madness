// @vitest-environment jsdom

import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rnnoiseMocks = vi.hoisted(() => ({
  load: vi.fn(),
  createDenoiseState: vi.fn(),
  destroy: vi.fn(),
  processFrame: vi.fn(),
}));

vi.mock('@shiguredo/rnnoise-wasm', () => ({
  Rnnoise: { load: rnnoiseMocks.load },
}));

let addModule: ReturnType<typeof vi.fn>;

class FakeNoiseContext {
  static instances: FakeNoiseContext[] = [];

  state: AudioContextState = 'running';
  readonly source = { connect: vi.fn(), disconnect: vi.fn() };
  readonly destination = {
    stream: { getTracks: () => [] } as unknown as MediaStream,
    disconnect: vi.fn(),
  };
  readonly audioWorklet = {
    addModule: vi.fn((url: string) => addModule(url)),
  };
  createMediaStreamSource = vi.fn(() => this.source);
  createMediaStreamDestination = vi.fn(() => this.destination);
  close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });

  constructor() {
    FakeNoiseContext.instances.push(this);
  }
}

class FakeWorkletNode {
  static instances: FakeWorkletNode[] = [];

  readonly port = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();

  constructor() {
    FakeWorkletNode.instances.push(this);
  }
}

const rawStream = { getTracks: () => [] } as unknown as MediaStream;

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('RNNoise cleanup for Audio Phone sessions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    FakeNoiseContext.instances = [];
    FakeWorkletNode.instances = [];
    addModule = vi.fn().mockResolvedValue(undefined);
    rnnoiseMocks.createDenoiseState.mockReturnValue({
      destroy: rnnoiseMocks.destroy,
      processFrame: rnnoiseMocks.processFrame,
    });
    rnnoiseMocks.load.mockResolvedValue({
      createDenoiseState: rnnoiseMocks.createDenoiseState,
    });
    vi.stubGlobal('AudioContext', FakeNoiseContext as unknown as typeof AudioContext);
    vi.stubGlobal('AudioWorkletNode', FakeWorkletNode as unknown as typeof AudioWorkletNode);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ferme immédiatement le contexte si la session est annulée pendant addModule', async () => {
    const pendingModule = deferred<void>();
    addModule.mockReturnValue(pendingModule.promise);
    const controller = new AbortController();
    const { processStreamWithNoiseReduction } = await import('@/hooks/useNoiseReduction');

    const processing = processStreamWithNoiseReduction(rawStream, {
      force: true,
      signal: controller.signal,
    });
    await waitFor(() => expect(FakeNoiseContext.instances).toHaveLength(1));

    controller.abort();
    const result = await processing;
    const context = FakeNoiseContext.instances[0];

    expect(result.stream).toBe(rawStream);
    expect(context.close).toHaveBeenCalledOnce();
    expect(rnnoiseMocks.destroy).toHaveBeenCalledOnce();
    expect(context.createMediaStreamSource).not.toHaveBeenCalled();

    pendingModule.resolve();
    await Promise.resolve();
    expect(context.createMediaStreamSource).not.toHaveBeenCalled();
  });

  it('libère les ressources partielles quand addModule échoue', async () => {
    addModule.mockRejectedValue(new Error('worklet unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { processStreamWithNoiseReduction } = await import('@/hooks/useNoiseReduction');

    const result = await processStreamWithNoiseReduction(rawStream, { force: true });
    const context = FakeNoiseContext.instances[0];

    expect(result.stream).toBe(rawStream);
    expect(context.close).toHaveBeenCalledOnce();
    expect(rnnoiseMocks.destroy).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      '[NoiseReduction] Setup failed, using original stream:',
      expect.any(Error),
    );
  });

  it('rend le cleanup d’un graphe complet idempotent', async () => {
    const { processStreamWithNoiseReduction } = await import('@/hooks/useNoiseReduction');

    const result = await processStreamWithNoiseReduction(rawStream, { force: true });
    const context = FakeNoiseContext.instances[0];
    const worklet = FakeWorkletNode.instances[0];

    expect(result.stream).toBe(context.destination.stream);
    expect(worklet.port.onmessage).toBeTypeOf('function');

    result.cleanup();
    result.cleanup();

    expect(worklet.port.onmessage).toBeNull();
    expect(worklet.disconnect).toHaveBeenCalledOnce();
    expect(context.source.disconnect).toHaveBeenCalledOnce();
    expect(context.destination.disconnect).toHaveBeenCalledOnce();
    expect(rnnoiseMocks.destroy).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });
});
