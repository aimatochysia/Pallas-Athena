/**
 * Draws the garden only when something asks for it. Requests made in the same
 * frame collapse into one draw, and an idle garden schedules no frames at all.
 * `animate` keeps drawing every frame until its time runs out, for motion that
 * has to follow the clock (a re-rake wave, a settling stone).
 */
export function createScheduler(draw, {
  now = () => performance.now(),
  raf = (callback) => requestAnimationFrame(callback),
  caf = (id) => cancelAnimationFrame(id),
} = {}) {
  let frame = 0;
  let until = 0;
  let frames = 0;

  function tick() {
    frame = 0;
    frames += 1;
    draw();
    if (now() < until) frame = raf(tick);
  }

  return {
    /** Draw once on the next frame. */
    request() {
      if (!frame) frame = raf(tick);
    },
    /** Draw every frame for the next `ms` milliseconds. */
    animate(ms) {
      until = Math.max(until, now() + ms);
      if (!frame) frame = raf(tick);
    },
    cancel() {
      if (frame) caf(frame);
      frame = 0;
      until = 0;
    },
    /** Frames drawn so far, including the one being drawn. */
    get frames() {
      return frames;
    },
    /** Whether a frame is waiting to be drawn. */
    get pending() {
      return frame !== 0;
    },
  };
}
