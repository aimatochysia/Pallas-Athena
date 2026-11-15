import { useEffect, useRef, useState } from "react";
import { createField } from "../garden/field.js";
import { readShapes } from "../garden/scene.js";
import { createScheduler } from "../garden/scheduler.js";
import { MOTION } from "../garden/tokens.js";

const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).has("garden-debug");

export function Sand({ boardRef, theme, signature, hold, reduce }) {
  const canvasRef = useRef(null);
  const schedulerRef = useRef(null);
  const themeRef = useRef(theme);
  const previous = useRef(null);
  const [stats, setStats] = useState(null);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = createField(canvas);
    if (!field) {
      document.body.classList.add("no-gl");
      return undefined;
    }
    const scheduler = createScheduler(() => {
      const started = performance.now();
      field.draw(readShapes(boardRef.current), themeRef.current);
      canvas.dataset.frames = String(scheduler.frames);
      if (debug) setStats({ frames: scheduler.frames, ms: performance.now() - started });
    });
    schedulerRef.current = scheduler;
    canvas.dataset.frames = "0";
    document.fonts?.ready.then(() => scheduler.request());
    return () => {
      scheduler.cancel();
      schedulerRef.current = null;
    };
  }, [boardRef]);

  // Layout and theme changes wait for the layout animation to settle, then draw once.
  useEffect(() => {
    const scheduler = schedulerRef.current;
    if (hold || !scheduler) return undefined;
    const layoutChanged = previous.current !== null && previous.current !== signature;
    previous.current = signature;
    const delay = layoutChanged && !reduce ? MOTION.settleMs : 0;
    const timer = setTimeout(() => scheduler.request(), delay);
    return () => clearTimeout(timer);
  }, [signature, hold, reduce, theme]);

  useEffect(() => {
    if (hold) return undefined;
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => schedulerRef.current?.request(), reduce ? 0 : MOTION.settleMs);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [hold, reduce]);

  // The canvas is fixed to the viewport, so any scroll moves the shapes under it.
  useEffect(() => {
    const onScroll = () => schedulerRef.current?.request();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="sand" aria-hidden="true" />
      {debug && stats && (
        <output className="garden-debug">
          {stats.frames} frames · last draw call {stats.ms.toFixed(1)} ms
        </output>
      )}
    </>
  );
}
