// Screenshots of the built app plus the garden's performance gates.
//
//   npm run shots             build, capture into screenshots/latest, compare with the baseline
//   npm run shots -- --update also overwrite screenshots/baseline
//
// Needs Playwright's Chromium once: npx playwright install chromium

import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { preview } from "vite";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const latestDir = join(root, "screenshots", "latest");
const baselineDir = join(root, "screenshots", "baseline");
const update = process.argv.includes("--update");

const SHOTS = [
  { name: "light", width: 1440, height: 900, theme: "light" },
  { name: "dark", width: 1440, height: 900, theme: "dark" },
  { name: "phone", width: 390, height: 844, theme: "light" },
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function framesOf(page) {
  return page.evaluate(() => Number(document.querySelector("canvas.sand")?.dataset.frames ?? -1));
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  // Wait for the garden's first draw, then for the layout settle delay to pass.
  await page.waitForFunction(() => Number(document.querySelector("canvas.sand")?.dataset.frames ?? 0) > 0, null, { timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(900);
}

// Share of pixels whose colour differs by more than a small tolerance, computed in the page.
async function diffShare(page, a, b) {
  return page.evaluate(async ([left, right]) => {
    const load = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const [x, y] = await Promise.all([load(left), load(right)]);
    if (x.width !== y.width || x.height !== y.height) return 1;
    const read = (img) => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, img.width, img.height).data;
    };
    const p = read(x);
    const q = read(y);
    let changed = 0;
    for (let i = 0; i < p.length; i += 4) {
      const delta = Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]);
      if (delta > 24) changed += 1;
    }
    return changed / (p.length / 4);
  }, [a, b]);
}

const server = await preview({ root, logLevel: "silent", preview: { port: 4317, strictPort: false } });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const failures = [];

try {
  await mkdir(latestDir, { recursive: true });
  if (update) await mkdir(baselineDir, { recursive: true });

  for (const shot of SHOTS) {
    const context = await browser.newContext({ viewport: { width: shot.width, height: shot.height }, deviceScaleFactor: 1 });
    await context.addInitScript((theme) => {
      try { localStorage.setItem("pallas-athena-theme", theme); } catch {}
    }, shot.theme);
    const page = await context.newPage();
    await page.goto(url);
    await settle(page);
    const file = join(latestDir, `${shot.name}.png`);
    const png = await page.screenshot({ path: file });
    if (update) await writeFile(join(baselineDir, `${shot.name}.png`), png);
    const baseline = join(baselineDir, `${shot.name}.png`);
    if (!update && await exists(baseline)) {
      const toUri = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`;
      const share = await diffShare(page, toUri(png), toUri(await readFile(baseline)));
      console.log(`${shot.name}: ${(share * 100).toFixed(2)}% of pixels differ from the baseline`);
    } else {
      console.log(`${shot.name}: saved`);
    }
    await context.close();
  }

  // Gate: the canvas is the size of the viewport, whatever the number of columns.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(url);
  await settle(page);
  for (let i = 0; i < 8; i += 1) await page.click(".add-column");
  await page.waitForTimeout(900);
  const size = await page.evaluate(() => {
    const canvas = document.querySelector("canvas.sand");
    const dpr = window.devicePixelRatio;
    return {
      width: canvas.width,
      height: canvas.height,
      maxWidth: window.innerWidth * dpr,
      maxHeight: window.innerHeight * dpr,
      board: document.querySelector(".board").scrollWidth,
    };
  });
  const sizeOk = size.width > 0 && size.width <= size.maxWidth && size.height > 0 && size.height <= size.maxHeight;
  console.log(`canvas with 11 columns: ${size.width}x${size.height} for a ${size.board}px board ${sizeOk ? "ok" : "FAIL"}`);
  if (!sizeOk) failures.push("canvas size");

  // Gate: an idle garden draws nothing.
  const before = await framesOf(page);
  await page.waitForTimeout(1500);
  const after = await framesOf(page);
  const idleOk = before >= 0 && after === before;
  console.log(`frames drawn while idle for 1.5s: ${after - before} ${idleOk ? "ok" : "FAIL"}`);
  if (!idleOk) failures.push("idle frames");
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (failures.length) {
  console.error(`Failed: ${failures.join(", ")}`);
  process.exit(1);
}
