QA harness for `index.html` — runs 7 scenarios via Playwright Chromium and emits screenshots + a JSON report.

## Scenarios

| # | Name | Pass condition |
|---|---|---|
| S1 | `WEBGL2_AVAILABLE` | `window.__gl instanceof WebGL2RenderingContext` and error overlay is not shown |
| S2 | `FBO_COMPLETENESS` | `window.__fboHealth === 'COMPLETE'` |
| S3 | `IDLE_BACKGROUND_PAINTED` | idle canvas shows deep-navy gradient (max B channel ≥ 30, B dominant, non-black) |
| S4 | `MOUSE_SPLAT_PRODUCES_COLOR` | center-region brightness rises by > 5 after a circular mouse motion |
| S5 | `STABLE_FPS` | sustained FPS ≥ 30 over 30 motion samples |
| S6 | `AUTO_BREATHING_WHEN_IDLE` | after 8 s of no input, ambient splats were emitted and brightness/stddev rose |
| S7 | `CONSOLE_CLEAN` | zero `console.error` / `pageerror` events during the run |

## How to run

```bash
# One-time setup
npm install playwright
npx playwright install chromium

# Run
qa/run.sh
# or
node qa/capture.mjs
```

> macOS users: do NOT pass `--use-gl=swiftshader` — the native GL driver works and
> SwiftShader's half-float path triggers `CONTEXT_LOST_WEBGL` after a few seconds,
> which silently breaks `gl.readPixels`. The harness omits this flag.

## Outputs (`qa/out/`)

- `idle.png` — first idle frame (deep navy gradient, no dye)
- `splat.png` — after 24 circular mouse moves (aurora ring)
- `breathing.png` — after 8 s of auto-breathing (vivid aurora clouds)
- `report.json` — full pass/fail report with per-scenario pixel statistics

## Debug hooks on `window`

The implementation exposes these for verification:

- `window.__gl` — `WebGL2RenderingContext` (or `null` on init failure)
- `window.__fboHealth` — `'COMPLETE'` or `'INCOMPLETE:<hex>'`
- `window.__fps()` — getter function, returns the EMA-smoothed FPS
- `window.__palette` — current palette vectors `{a, b, c, d}`
- `window.__stepCount` — number of simulation steps executed
- `window.__idleSince` — ms timestamp of last pointer input
- `window.__ambientSplats` — number of auto-breathing splats emitted

## Exit codes

- `0` — all 7 scenarios pass
- `1` — at least one scenario failed (see `report.json`)
- `2` — fatal harness error
