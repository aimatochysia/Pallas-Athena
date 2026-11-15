import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createScheduler } from "../src/garden/scheduler.js";
import { packBounds } from "../src/garden/scene.js";
import { GARDEN, THEMES, cssVariables } from "../src/garden/tokens.js";

function fakeClock() {
  let time = 0;
  let next = 1;
  const queue = new Map();
  return {
    now: () => time,
    raf: (callback) => {
      const id = next;
      next += 1;
      queue.set(id, callback);
      return id;
    },
    caf: (id) => queue.delete(id),
    /** Run one animation frame, `ms` after the last. */
    step(ms = 16) {
      time += ms;
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((callback) => callback(time));
    },
    get waiting() {
      return queue.size;
    },
  };
}

test("an idle garden schedules no frames", () => {
  const clock = fakeClock();
  let draws = 0;
  const scheduler = createScheduler(() => { draws += 1; }, clock);
  clock.step();
  clock.step();
  assert.equal(draws, 0);
  assert.equal(clock.waiting, 0);
  assert.equal(scheduler.pending, false);
});

test("requests in one frame collapse into a single draw", () => {
  const clock = fakeClock();
  let draws = 0;
  const scheduler = createScheduler(() => { draws += 1; }, clock);
  scheduler.request();
  scheduler.request();
  scheduler.request();
  clock.step();
  clock.step();
  assert.equal(draws, 1);
  assert.equal(scheduler.frames, 1);
  assert.equal(clock.waiting, 0);
});

test("animate draws every frame until its time runs out, then stops", () => {
  const clock = fakeClock();
  let draws = 0;
  const scheduler = createScheduler(() => { draws += 1; }, clock);
  scheduler.animate(100);
  for (let i = 0; i < 12; i += 1) clock.step(16);
  // Frames at 16, 32, 48, 64, 80, 96 keep going; the frame at 112 is the last.
  assert.equal(draws, 7);
  assert.equal(clock.waiting, 0);
});

test("cancel drops a waiting frame", () => {
  const clock = fakeClock();
  let draws = 0;
  const scheduler = createScheduler(() => { draws += 1; }, clock);
  scheduler.animate(1000);
  scheduler.cancel();
  clock.step();
  assert.equal(draws, 0);
  assert.equal(scheduler.pending, false);
});

test("packBounds keeps the shader's layout and its cap", () => {
  const shapes = Array.from({ length: GARDEN.maxShapes + 3 }, (_, i) => ({ x: i, y: i + 1, w: 10, h: 20 }));
  const { bounds, count } = packBounds(shapes, GARDEN.maxShapes);
  assert.equal(count, GARDEN.maxShapes);
  assert.equal(bounds.length, GARDEN.maxShapes * 4);
  assert.deepEqual([...bounds.slice(4, 8)], [1, 2, 10, 20]);
});

test("both themes define the same tokens", () => {
  assert.deepEqual(Object.keys(cssVariables("dark")).sort(), Object.keys(cssVariables("light")).sort());
  assert.deepEqual(Object.keys(THEMES.dark.shader).sort(), Object.keys(THEMES.light.shader).sort());
});

test("every custom property the stylesheet reads is defined", async () => {
  const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
  const defined = new Set([
    ...Object.keys(cssVariables("light")),
    ...[...css.matchAll(/(--[a-z-]+)\s*:/g)].map((match) => match[1]),
  ]);
  const used = new Set([...css.matchAll(/var\((--[a-z-]+)/g)].map((match) => match[1]));
  for (const name of used) assert.ok(defined.has(name), `${name} is read but never defined`);
});

test("the first-paint background matches each theme's sand", async () => {
  const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
  const light = css.match(/:root \{[^}]*background: (#[0-9a-f]{6})/);
  const dark = css.match(/:root\[data-theme="dark"\] \{[^}]*background: (#[0-9a-f]{6})/);
  assert.equal(light?.[1], THEMES.light.color.sand);
  assert.equal(dark?.[1], THEMES.dark.color.sand);
});
