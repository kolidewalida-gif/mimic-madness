/**
 * PerfHud — lightweight performance overlay to spot screens that lag.
 *
 * Toggle with Ctrl+Shift+P (or Cmd+Shift+P). Persists via localStorage so
 * QA can keep it on while navigating between screens.
 *
 * Reports:
 *  - FPS (rolling 1s average) + min over last 10s
 *  - Frame time in ms (avg / worst over last 10s)
 *  - Long tasks (>50ms) count via PerformanceObserver
 *  - JS heap usage when performance.memory is available (Chromium only)
 *  - Current route (window.location.pathname)
 *
 * Zero impact when disabled: no rAF loop, no observer.
 */
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lovable:perf-hud";

interface Sample {
  fps: number;
  frameMs: number;
}

export const PerfHud = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [stats, setStats] = useState({
    fps: 0,
    minFps: 0,
    avgMs: 0,
    worstMs: 0,
    longTasks: 0,
    heapMb: 0,
    route: typeof window !== "undefined" ? window.location.pathname : "/",
  });

  // Keyboard toggle (Ctrl/Cmd + Shift + P)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        setEnabled((v) => {
          const next = !v;
          try {
            window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sampling loop — only active when enabled
  const samplesRef = useRef<Sample[]>([]);
  const longTasksRef = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let rafId = 0;
    let frames = 0;
    let last = performance.now();
    let lastFrameAt = last;
    let worstFrameMs = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const now = performance.now();
      const frameMs = now - lastFrameAt;
      lastFrameAt = now;
      if (frameMs > worstFrameMs) worstFrameMs = frameMs;
      frames += 1;

      const elapsed = now - last;
      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        const avgMs = elapsed / frames;
        samplesRef.current.push({ fps, frameMs: worstFrameMs });
        if (samplesRef.current.length > 10) samplesRef.current.shift();

        const minFps = Math.min(...samplesRef.current.map((s) => s.fps));
        const worstMs = Math.max(...samplesRef.current.map((s) => s.frameMs));
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const heapMb = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;

        setStats({
          fps: Math.round(fps),
          minFps: Math.round(minFps),
          avgMs: Math.round(avgMs * 10) / 10,
          worstMs: Math.round(worstMs),
          longTasks: longTasksRef.current,
          heapMb,
          route: window.location.pathname,
        });

        frames = 0;
        worstFrameMs = 0;
        last = now;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    // Long-tasks observer (Chromium)
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        longTasksRef.current += list.getEntries().length;
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      observer = null;
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      samplesRef.current = [];
      longTasksRef.current = 0;
    };
  }, [enabled]);

  if (!enabled) return null;

  const fpsColor =
    stats.fps >= 55 ? "#4ade80" : stats.fps >= 40 ? "#facc15" : "#f87171";

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.78)",
        color: "#fff",
        font: "11px ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: "8px 10px",
        borderRadius: 6,
        pointerEvents: "none",
        lineHeight: 1.45,
        minWidth: 180,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      aria-hidden="true"
    >
      <div style={{ color: fpsColor, fontWeight: 700 }}>
        FPS {stats.fps} <span style={{ opacity: 0.6 }}>(min {stats.minFps})</span>
      </div>
      <div>frame {stats.avgMs}ms (worst {stats.worstMs}ms)</div>
      <div>long tasks: {stats.longTasks}</div>
      {stats.heapMb > 0 && <div>heap: {stats.heapMb} MB</div>}
      <div style={{ opacity: 0.7, marginTop: 4 }}>route: {stats.route}</div>
      <div style={{ opacity: 0.45, marginTop: 4 }}>Ctrl+Shift+P to hide</div>
    </div>
  );
};

export default PerfHud;