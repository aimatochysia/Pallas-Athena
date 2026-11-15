/**
 * Reads what the garden has to draw from the DOM. Rectangles are in viewport
 * CSS pixels, the same space as the fixed canvas, so scrolling only changes
 * the numbers and never the size of the canvas.
 */

/** Every element marked `data-ripple` inside `root`, as center and size. */
export function readShapes(root) {
  if (!root) return [];
  return [...root.querySelectorAll("[data-ripple]")].map((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width, h: rect.height };
  });
}

/** Pack shapes into the `vec4` uniform array the shader reads, capped at `max`. */
export function packBounds(shapes, max) {
  const bounds = new Float32Array(max * 4);
  const count = Math.min(shapes.length, max);
  for (let i = 0; i < count; i += 1) {
    const { x, y, w, h } = shapes[i];
    bounds.set([x, y, w, h], i * 4);
  }
  return { bounds, count };
}
