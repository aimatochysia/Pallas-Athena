# Pallas-Athena

A private kanban board that lives entirely in the browser. Columns hold blocks, and a block can hold more blocks. Nothing is sent to a server.

```bash
npm install
npm run dev
```

`npm test` checks the board rules and the garden scheduler and tokens. `npm run build` produces an installable offline app in `dist`.

`npm run shots` builds the app, captures it in light, dark and at phone width into `screenshots/latest`, compares each image with `screenshots/baseline`, and checks two garden rules: the canvas stays the size of the viewport however many columns there are, and an idle garden draws no frames. Add `-- --update` to replace the baseline. It needs Playwright's Chromium once: `npx playwright install chromium`.

Colours, shadows, timing and the ripple geometry live in `src/garden/tokens.js`; the stylesheet and the shader both read from it. In development, open the app with `?garden-debug` to see how many frames the garden has drawn.

The board is encrypted in IndexedDB with a key that stays on this browser. Export downloads the readable board as `pallas-athena-board.json`. Import replaces the board with that file.

Ticking a parent whose blocks inside are all ticked carries that parent into the next column. Drag a block by its grip to reorder it, move it between columns, or drop it on the groove at the bottom of a card to nest it.
