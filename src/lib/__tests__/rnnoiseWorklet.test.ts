// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const script = readFileSync(new URL('../../../public/rnnoise-worklet.js', import.meta.url), 'utf8');
function processor() {
  let Ctor: any;
  const messages: any[] = [];
  runInNewContext(script, {
    AudioWorkletProcessor: class { port = { onmessage: null, postMessage: (message: any) => messages.push(message) }; },
    registerProcessor: (_: string, ctor: any) => { Ctor = ctor; },
    Float32Array, Map,
  });
  const node = new Ctor();
  const render = (value = .25, length = 128) => {
    const out = new Float32Array(length);
    node.process([[new Float32Array(length).fill(value)]], [[out]]);
    return out;
  };
  return { node, messages, render };
}

describe('RNNoise real worklet PCM processing', () => {
  it('never inserts silence after the fixed startup buffer when processing is late', () => {
    const { render } = processor();
    render(.25, 1920);
    for (let i = 0; i < 100; i++) expect([...render()]).toEqual(Array(128).fill(.25));
  });
  it('caps outstanding frames even if a worker stalls indefinitely', () => {
    const { node, messages, render } = processor();
    for (let i = 0; i < 200; i++) render();
    expect(messages).toHaveLength(6);
    expect(node.pending).toBe(6);
    expect(node.frames.size).toBe(0);
  });
  it('drops stale frames, then resumes sending fresh audio without replaying backlog', () => {
    const { node, messages, render } = processor();
    render(.25, 4800);
    node.port.onmessage({ data: { type: 'frame', id: 0, data: new Float32Array(480).fill(.8) } });
    expect(node.frames.size).toBe(0);
    expect([...render(.25, 480)]).toEqual(Array(480).fill(.25));
    expect(messages.at(-1).id).toBe(10);
  });
  it('plays a timely denoised frame at its matching delayed position', () => {
    const { node, render } = processor();
    render(.25, 480);
    node.port.onmessage({ data: { type: 'frame', id: 0, data: new Float32Array(480).fill(.1) } });
    render(.25, 1440);
    const out = render(.25, 480);
    expect(out[479]).toBeCloseTo(.1);
    expect(node.frames.size).toBe(0);
    const dry = render(.25, 480);
    expect(Math.abs(dry[0] - out[479])).toBeLessThan(.002);
    expect(dry[479]).toBeCloseTo(.25);
  });
});
