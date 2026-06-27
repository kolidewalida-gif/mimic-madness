import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Frame-driven WebGL fragment shader layer.
// Renders deterministically: re-draws every React render using the current frame as a uniform.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Fluid violet ink nebula — domain-warped fbm, animated by time.
const NEBULA_FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_intensity;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for(int i=0;i<6;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;
  float t = u_time * 0.25;

  // domain warp
  vec2 q = vec2(fbm(uv + vec2(0.0, t)), fbm(uv + vec2(5.2, -t)));
  vec2 r = vec2(fbm(uv + 4.0*q + vec2(1.7,9.2) + 0.15*t),
                fbm(uv + 4.0*q + vec2(8.3,2.8) - 0.13*t));
  float f = fbm(uv + 4.0*r);

  // violet palette
  vec3 deep   = vec3(0.04, 0.01, 0.09);
  vec3 royal  = vec3(0.30, 0.08, 0.55);
  vec3 neon   = vec3(0.66, 0.33, 0.97);
  vec3 magenta= vec3(0.85, 0.27, 0.94);

  vec3 col = mix(deep, royal, smoothstep(0.0, 0.6, f));
  col = mix(col, neon, smoothstep(0.45, 0.85, f*f));
  col += magenta * pow(max(0.0, r.x*r.y), 1.8) * 0.9;

  // radial darkening keeps a focal core
  float vig = 1.0 - smoothstep(0.4, 1.1, length(uv));
  col *= 0.35 + 0.85*vig;

  // shimmering filaments
  float fil = pow(abs(sin(8.0*r.x + t*3.0)), 12.0);
  col += vec3(0.9, 0.7, 1.0) * fil * 0.35;

  gl_FragColor = vec4(col * u_intensity, 1.0);
}
`;

// Chromatic-aberration + scanline overlay (additive, very subtle)
const CHROMA_FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 c = uv - 0.5;
  float d = length(c);
  // moving streaks
  float a = atan(c.y, c.x);
  float streak = pow(0.5 + 0.5*sin(a*18.0 + u_time*1.4), 24.0);
  vec3 col = vec3(0.55, 0.30, 0.95) * streak * 0.35 * smoothstep(0.05, 0.45, d);
  // grain
  float g = hash(uv*u_res + u_time*60.0) - 0.5;
  col += vec3(g*0.06);
  // soft edge bloom
  col += vec3(0.4,0.2,0.7) * pow(d, 3.0) * 0.6;
  gl_FragColor = vec4(col * u_intensity, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, src: string, type: number) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile error: " + log);
  }
  return sh;
}
function program(gl: WebGLRenderingContext, frag: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, VERT, gl.VERTEX_SHADER));
  gl.attachShader(p, compile(gl, frag, gl.FRAGMENT_SHADER));
  gl.linkProgram(p);
  return p;
}

const ShaderCanvas: React.FC<{ frag: string; intensity?: number; w: number; h: number }> = ({
  frag,
  intensity = 1,
  w,
  h,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) return;
    const prog = program(gl, frag);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(gl.getUniformLocation(prog, "u_res"), w, h);
    gl.uniform1f(gl.getUniformLocation(prog, "u_time"), frame / fps);
    gl.uniform1f(gl.getUniformLocation(prog, "u_intensity"), intensity);
    gl.viewport(0, 0, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, [frame, fps, frag, intensity, w, h]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};

export const NebulaShader: React.FC<{ opacity?: number; intensity?: number }> = ({
  opacity = 0.55,
  intensity = 1,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen", pointerEvents: "none" }}>
      <ShaderCanvas frag={NEBULA_FRAG} intensity={intensity} w={width} h={height} />
    </AbsoluteFill>
  );
};

export const ChromaShader: React.FC<{ opacity?: number; intensity?: number }> = ({
  opacity = 0.4,
  intensity = 1,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen", pointerEvents: "none" }}>
      <ShaderCanvas frag={CHROMA_FRAG} intensity={intensity} w={width} h={height} />
    </AbsoluteFill>
  );
};