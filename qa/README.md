QA harness for `index.html` — runs 12 scenarios via Playwright Chromium and emits screenshots + a JSON report.

## Scenarios

| # | Name | Pass condition |
|---|---|---|
| S1 | `WEBGL2_AVAILABLE` | `window.__gl instanceof WebGL2RenderingContext` and error overlay is not shown |
| S2 | `FBO_COMPLETENESS` | `window.__fboHealth === 'COMPLETE'` (probes velocity, dye, pressure, divergence, curl, foam) |
| S3 | `IDLE_BACKGROUND_PAINTED` | idle canvas shows deep-navy gradient (max B channel ≥ 30, B dominant, non-black) |
| S4 | `MOUSE_SPLAT_PRODUCES_COLOR` | center-region brightness rises by > 5 after a circular mouse motion |
| S5 | `STABLE_FPS` | sustained FPS ≥ 30 over 30 motion samples |
| S6 | `AUTO_BREATHING_WHEN_IDLE` | after 8 s of no input, ambient splats were emitted and brightness/stddev rose |
| S7 | `CONSOLE_CLEAN` | zero `console.error` / `pageerror` events during the run |
| S8 | `BLOOM_VISIBLE` | `window.__bloomFinalTex` R-channel mean (FLOAT) ≥ 0.005 — bloom FBO has non-trivial content |
| S9 | `ABERRATION_FRINGES` | at a high-contrast dye edge, R and B channels peak at different x positions on a horizontal scanline (chromatic UV offset) |
| S10 | `FOAM_AT_HIGH_VELOCITY` | after fast zigzag motion, `window.__foamTex` R-channel mean (FLOAT) > 0.01 — foam accumulated from velocity magnitude |
| S11 | `NO_REGRESSION` | all original S1–S7 scenarios still pass |
| S12 | `PERFORMANCE_BUDGET` | mean FPS ≥ 30 over 60 motion samples (≥ 30 valid samples required) |

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
- `splat.png` — after 24 circular mouse moves (aurora ring with bloom halo and chromatic aberration)
- `breathing.png` — after 8 s of auto-breathing (vivid aurora clouds with foam cores)
- `report.json` — full pass/fail report with per-scenario pixel statistics

## Debug hooks on `window`

The implementation exposes these for verification:

- `window.__gl` — `WebGL2RenderingContext` (or `null` on init failure)
- `window.__fboHealth` — `'COMPLETE'` or `'INCOMPLETE:<name>:<hex>'`
- `window.__fps()` — getter function, returns the EMA-smoothed FPS
- `window.__palette` — current palette vectors `{a, b, c, d}`
- `window.__stepCount` — number of simulation steps executed
- `window.__idleSince` — ms timestamp of last pointer input
- `window.__ambientSplats` — number of auto-breathing splats emitted
- `window.__getFoamMean()` — reads `foam.read` FBO as UNSIGNED_BYTE, returns mean R (0..255)
- `window.__getBloomMean()` — reads `bloomFinalTex` FBO as UNSIGNED_BYTE, returns mean R (0..255)
- `window.__foamTex` — double-FBO with `.read.fbo`, `.read.width`, `.read.height`
- `window.__bloomFinalTex` — final bloom FBO (single, with `.fbo`, `.width`, `.height`)
- `window.__velocityTex` — velocity double-FBO (for diagnostic reads)
- `window.__dyeTex` — dye double-FBO (for diagnostic reads)
- `window.__config` — full `config` object (exposes BLOOM_*, FOAM_*, ABERRATION, PARALLAX_STRENGTH)

The harness's `readFBORegion` helper uses `gl.FLOAT` readback (more accurate than UNSIGNED_BYTE
for half-float textures) and accepts both single FBOs (`window.__bloomFinalTex`) and
double-FBOs (`window.__foamTex.read`).

## Exit codes

- `0` — all 12 scenarios pass
- `1` — at least one scenario failed (see `report.json`)
- `2` — fatal harness error
