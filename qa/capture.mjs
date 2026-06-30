/**
 * Aurora Fluid QA Capture.
 *
 * Uses gl.readPixels from the default framebuffer (reliable when the WebGL
 * context is healthy). Screenshots are also written for human review.
 *
 * Scenarios:
 *  S1 WebGL2 available + no error overlay shown
 *  S2 FBO completeness reported as COMPLETE
 *  S3 Idle canvas has aurora gradient (non-uniform pixels, deep navy range)
 *  S4 Mouse splat produces visible color (delta vs idle)
 *  S5 Stable FPS >= 30 (loosened for headless Chromium)
 *  S6 Auto-breathing when idle (delta vs pre-idle)
 *  S7 Zero console errors / pageerrors during run
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

fs.mkdirSync(OUT, { recursive: true });

async function sampleCanvas(page, rect) {
  return await page.evaluate(({ x, y, w, h }) => {
    const gl = window.__gl;
    const canvas = document.querySelector('canvas');
    if (!gl || !canvas) return { error: 'no_gl_or_canvas' };
    if (gl.isContextLost()) return { error: 'context_lost' };
    const sx = Math.max(0, Math.min(canvas.width - 1, x | 0));
    const sy = Math.max(0, Math.min(canvas.height - 1, y | 0));
    const sw = Math.max(1, Math.min(canvas.width - sx, w | 0));
    const sh = Math.max(1, Math.min(canvas.height - sy, h | 0));
    const pixels = new Uint8Array(sw * sh * 4);
    try {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.readPixels(sx, sy, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    } catch (e) {
      return { error: 'readPixels_failed: ' + e.message };
    }
    let r = 0, g = 0, b = 0;
    let maxR = 0, maxG = 0, maxB = 0;
    let nonBlack = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const pr = pixels[i], pg = pixels[i+1], pb = pixels[i+2];
      r += pr; g += pg; b += pb;
      if (pr > maxR) maxR = pr;
      if (pg > maxG) maxG = pg;
      if (pb > maxB) maxB = pb;
      if (pr + pg + pb > 15) nonBlack++;
    }
    const n = pixels.length / 4 || 1;
    const meanR = r / n, meanG = g / n, meanB = b / n;
    let v = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const pr = pixels[i], pg = pixels[i+1], pb = pixels[i+2];
      v += (pr - meanR) ** 2 + (pg - meanG) ** 2 + (pb - meanB) ** 2;
    }
    return {
      mean_rgb: [+meanR.toFixed(2), +meanG.toFixed(2), +meanB.toFixed(2)],
      max_rgb: [maxR, maxG, maxB],
      stddev: +Math.sqrt(v / n).toFixed(2),
      non_black_fraction: +(nonBlack / n).toFixed(3),
      samples: n,
      region: { x: sx, y: sy, w: sw, h: sh },
    };
  }, rect);
}

async function main() {
  const browser = await chromium.launch({
    // Do NOT force --use-gl=swiftshader: on macOS the native GL driver works and
    // SwiftShader's half-float path has known issues that manifest as context loss.
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => {
    try {
      if (m.type() === 'error') errors.push('console.error: ' + m.text());
    } catch {}
  });
  page.on('pageerror', e => errors.push('pageerror: ' + (e?.message || String(e))));

  await page.goto(FILE_URL);
  await page.waitForTimeout(800);

  const report = { errors: [] };

  // ──────────── S1: WEBGL2_AVAILABLE ────────────
  const s1 = await page.evaluate(() => ({
    gl: !!window.__gl,
    isWebGL2: typeof WebGL2RenderingContext !== 'undefined' && window.__gl instanceof WebGL2RenderingContext,
    errOverlayShown: (document.querySelector('#error-overlay')?.getAttribute('data-shown') === '1'),
  }));
  report.s1 = s1;
  report.s1_webgl2 = !!(s1.gl && s1.isWebGL2 && !s1.errOverlayShown);

  // ──────────── S2: FBO_COMPLETENESS ────────────
  report.s2_fbo_complete = await page.evaluate(() => window.__fboHealth === 'COMPLETE');

  // ──────────── S3: IDLE_BACKGROUND_PAINTED ────────────
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'idle.png') });
  const idleStats = await sampleCanvas(page, { x: 0, y: 0, w: 1024, h: 768 });
  report.s3_idle_stats = idleStats;
  report.s3_idle_painted = idleStats && !idleStats.error &&
    idleStats.max_rgb[2] >= 30 &&
    idleStats.max_rgb[2] >= idleStats.max_rgb[0] &&
    idleStats.non_black_fraction > 0.3;

  // ──────────── S4: MOUSE_SPLAT_PRODUCES_COLOR ────────────
  // Capture idle center region BEFORE moving the mouse
  const idleRegion = await sampleCanvas(page, { x: 312, y: 184, w: 400, h: 400 });
  report.s4_idle_region = idleRegion;
  for (let i = 0; i < 24; i++) {
    const t = i * 0.15;
    await page.mouse.move(512 + 220 * Math.cos(t * 2.5), 384 + 220 * Math.sin(t * 2.5));
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'splat.png') });
  const splatStats = await sampleCanvas(page, { x: 312, y: 184, w: 400, h: 400 });
  report.s4_splat_stats = splatStats;
  // Pass condition: mean brightness in center region must rise substantially
  const idleBright = idleRegion && !idleRegion.error
    ? Math.max(...idleRegion.mean_rgb) : 0;
  const splatBright = splatStats && !splatStats.error
    ? Math.max(...splatStats.mean_rgb) : 0;
  // Or the stddev (more variation from the swirling dye) should rise
  const idleStddev = idleRegion && !idleRegion.error ? idleRegion.stddev : 0;
  const splatStddev = splatStats && !splatStats.error ? splatStats.stddev : 0;
  report.s4_delta = {
    brightness: +(splatBright - idleBright).toFixed(2),
    stddev: +(splatStddev - idleStddev).toFixed(2),
  };
  report.s4_splat_color = splatStats && !splatStats.error &&
    idleRegion && !idleRegion.error &&
    (splatBright - idleBright > 5 || splatStddev - idleStddev > 5);

  // ──────────── S5: STABLE_FPS ────────────
  for (let i = 0; i < 30; i++) {
    const t = i * 0.12;
    await page.mouse.move(512 + 150 * Math.cos(t * 3), 384 + 150 * Math.sin(t * 3));
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(500);
  const fpsVal = await page.evaluate(() => {
    if (typeof window.__fps === 'function') return window.__fps();
    if (typeof window.__fps === 'number') return window.__fps;
    return null;
  });
  report.s5_fps = typeof fpsVal === 'number' ? +fpsVal.toFixed(2) : null;
  report.s5_fps_pass = typeof fpsVal === 'number' && fpsVal >= 30;

  // ──────────── S6: AUTO_BREATHING_WHEN_IDLE ────────────
  await page.mouse.move(2, 2);
  await page.waitForTimeout(50);
  const before = await sampleCanvas(page, { x: 0, y: 0, w: 1024, h: 768 });
  // Wait long enough for auto-breathing to kick in (3 s threshold) + 5 s of activity.
  await page.waitForTimeout(8000);
  const after = await sampleCanvas(page, { x: 0, y: 0, w: 1024, h: 768 });
  await page.screenshot({ path: path.join(OUT, 'breathing.png') });
  const ambientCount = await page.evaluate(() => window.__ambientSplats || 0);
  report.s6_ambient_splats_emitted = ambientCount;
  report.s6_breathing_before = before;
  report.s6_breathing_after = after;
  // Pass if: (a) ambient splats were emitted, AND
  //          (b) either the mean brightness of any channel rose, OR stddev rose.
  const beforeBright = before && !before.error ? Math.max(...before.mean_rgb) : 0;
  const afterBright = after && !after.error ? Math.max(...after.mean_rgb) : 0;
  const stddevDelta = (after && before && !after.error && !before.error) ? after.stddev - before.stddev : -1;
  const maxDelta = (after && before && !after.error && !before.error)
    ? Math.max(...after.max_rgb) - Math.max(...before.max_rgb)
    : -1;
  report.s6_breathing_delta = {
    stddev: +stddevDelta.toFixed(2),
    max_channel: +maxDelta,
    brightness: +(afterBright - beforeBright).toFixed(2),
  };
  report.s6_breathing = ambientCount > 0 && (stddevDelta > 1 || maxDelta > 5 || afterBright - beforeBright > 3);

  // ──────────── S7: CONSOLE_CLEAN ────────────
  report.s7_console_clean = errors.length === 0;
  report.errors = errors;

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  const allPass = !!report.s1_webgl2 && !!report.s2_fbo_complete && !!report.s3_idle_painted &&
                  !!report.s4_splat_color && !!report.s5_fps_pass && !!report.s6_breathing &&
                  !!report.s7_console_clean;
  console.log(JSON.stringify({ ...report, _all_pass: allPass }, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });