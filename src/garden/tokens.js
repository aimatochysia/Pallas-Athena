/**
 * Design tokens. CSS custom properties, the garden shader and the browser
 * chrome colour all read from here, so each value lives in one place.
 */

/** Geometry of the raked field, in CSS pixels. The shader is compiled from these. */
export const GARDEN = {
  /** Distance between two grooves. Tighter spacing moirés. */
  period: 36,
  /** Polynomial smooth-minimum radius where two shapes' ripples meet. */
  smoothMin: 20,
  /** Distance over which a groove fades in off the seam. */
  mask: 12,
  /** Darkening on the sand side of a seam, in place of a drop shadow. */
  crevice: 6,
  /** Corner radius of a rippled shape. */
  radius: 28,
  /** Compile-time cap on rippled shapes. */
  maxShapes: 24,
};

export const MOTION = {
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Wait after a layout change before the sand redraws, so it reads settled rectangles. */
  settleMs: 420,
};

export const THEMES = {
  light: {
    /** Browser chrome and PWA colour. */
    chrome: "#dcd9d1",
    color: {
      sand: "#dcd9d1",
      paper: "#e7e3da",
      "paper-raised": "#efebe3",
      ink: "#2c2824",
      "ink-soft": "#4e4942",
      focus: "#3e5246",
      danger: "#7a4e46",
      gold: "#8a7348",
    },
    shadow: {
      shadow: "inset 5px 6px 12px #c4bfb4, inset -4px -4px 10px #f7f4ee",
      "shadow-hover": "inset 7px 8px 16px #b7b2a7, inset -3px -3px 8px #f8f5ef",
      inset: "inset 3px 3px 7px #c9c4ba, inset -2px -2px 5px #f6f3ec",
      "inset-deep": "inset 4px 5px 10px #bdb8ae, inset -2px -2px 4px #f3efe6",
      "tool-inset": "inset 5px 6px 10px #8a857b, inset -1px -1px 3px #f6f3ec",
      "tool-inset-deep": "inset 6px 7px 13px #6e6a61, inset -1px -1px 2px #f3efe6",
    },
    /** Linear 0–1 colours the shader mixes by the light on each groove. */
    shader: {
      shade: [0.7, 0.68, 0.65],
      highlight: [1, 1, 0.98],
    },
  },
  dark: {
    chrome: "#14161b",
    color: {
      sand: "#14161b",
      paper: "#22262e",
      "paper-raised": "#2a303a",
      ink: "#e7e2d8",
      "ink-soft": "#b7b1a6",
      focus: "#c6a56a",
      danger: "#e0b2aa",
      gold: "#c6a56a",
    },
    shadow: {
      shadow: "inset 5px 6px 14px #05060a, inset -3px -3px 8px #343b4a",
      "shadow-hover": "inset 8px 9px 18px #000000, inset -2px -2px 6px #3d4554",
      inset: "inset 3px 3px 8px #05060a, inset -2px -2px 5px #323846",
      "inset-deep": "inset 4px 5px 10px #000000, inset -1px -1px 3px #3a4150",
      "tool-inset": "inset 5px 6px 10px #05060a, inset -1px -1px 3px #3a4150",
      "tool-inset-deep": "inset 6px 8px 14px #000000, inset -1px -1px 2px #323846",
    },
    shader: {
      shade: [0.07, 0.08, 0.1],
      highlight: [0.2, 0.22, 0.27],
    },
  },
};

export function themeOf(name) {
  return THEMES[name] || THEMES.light;
}

/** The custom properties for a theme, as `--name: value` pairs. */
export function cssVariables(name) {
  const theme = themeOf(name);
  const vars = { "--ease": MOTION.ease };
  for (const [key, value] of Object.entries(theme.color)) vars[`--${key}`] = value;
  for (const [key, value] of Object.entries(theme.shadow)) vars[`--${key}`] = value;
  return vars;
}

/** Write a theme's custom properties onto the root element. */
export function applyTokens(name, root = document.documentElement) {
  for (const [key, value] of Object.entries(cssVariables(name))) root.style.setProperty(key, value);
}
