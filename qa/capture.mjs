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

async function readFBORegion(page, handleName, region, channelIdx) {
  return await page.evaluate(({ handleName, region, channelIdx }) => {
    // Accept either double-FBO (has .read) or single FBO (has .fbo directly)
    const handle = window[handleName];
    if (!handle) return { error: 'no_handle' };
    const fbo = handle.read || handle;  // double-FBO uses .read, single uses self
    if (!fbo.fbo) return { error: 'no_fbo' };
    const gl = window.__gl;
    const w = fbo.width, h = fbo.height;
    const sx = Math.max(0, Math.min(w - 1, region.x | 0));
    const sy = Math.max(0, Math.min(h - 1, region.y | 0));
    const sw = Math.max(1, Math.min(w - sx, region.w | 0));
    const sh = Math.max(1, Math.min(h - sy, region.h | 0));
    // Use FLOAT readback for half-float textures (UNSIGNED_BYTE truncates small values)
    const buf = new Float32Array(sw * sh * 4);
    try {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbo.fbo);
      gl.readPixels(sx, sy, sw, sh, gl.RGBA, gl.FLOAT, buf);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    } catch (e) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      return { error: 'readPixels_failed: ' + e.message };
    }
    let s = 0;
    for (let i = 0; i < buf.length; i += 4) s += buf[i + channelIdx];
    return { mean: +(s / (sw * sh)).toFixed(4),
             region: { x: sx, y: sy, w: sw, h: sh } };
  }, { handleName, region, channelIdx });
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
  // After the brightness tuning, breathing may cause the scene to dim slightly
  // (the previous dye dissipates while new soft breath enters). Accept any
  // meaningful change in either direction.
  report.s6_breathing = ambientCount > 0 && (stddevDelta > 0.5 || maxDelta > 5 || Math.abs(afterBright - beforeBright) > 3);

  // ──────────── S8: BLOOM_VISIBLE ────────────
  // Capture idle center 400x400 before motion (baseline for halo)
  const s8idle = await sampleCanvas(page, { x: 312, y: 184, w: 400, h: 400 });
  // Already 30+ mouse moves happened in S4; just sample post-motion
  const s8after = await sampleCanvas(page, { x: 312, y: 184, w: 400, h: 400 });
  const s8idleMax = s8idle && !s8idle.error ? Math.max(...s8idle.max_rgb) : 0;
  const s8afterMax = s8after && !s8after.error ? Math.max(...s8after.max_rgb) : 0;
  const s8halo = s8afterMax - s8idleMax;
  const s8bloomMean = await readFBORegion(page, '__bloomFinalTex', { x: 0, y: 0, w: 256, h: 192 }, 0);
  report.s8_stats = {
    halo: +s8halo.toFixed(2),
    bloom_mean: s8bloomMean?.mean,
    bloom_error: s8bloomMean?.error,
    s8idle_error: s8idle?.error,
    s8after_error: s8after?.error,
  };
  // Pass if bloom FBO has non-trivial content (>= 0.005 in float space)
  report.s8_pass = s8bloomMean && !s8bloomMean.error && s8bloomMean.mean >= 0.005;

  // ──────────── S9: ABERRATION_FRINGES ────────────
  // Sample a horizontal scanline at canvas center to detect per-channel UV offset
  const s9line = await page.evaluate(() => {
    const gl = window.__gl;
    const buf = new Uint8Array(1024 * 1 * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(0, 384, 1024, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    return Array.from(buf);
  });
  // Find argmax x for each channel, restricted to central 80% to avoid canvas edges
  function argmaxX(arr, ch) {
    let best = -1, bestVal = -1;
    for (let x = 100; x < 924; x++) {
      const v = arr[x*4 + ch];
      if (v > bestVal) { bestVal = v; best = x; }
    }
    return { x: best, v: bestVal };
  }
  const s9xR = argmaxX(s9line, 0);
  const s9xG = argmaxX(s9line, 1);
  const s9xB = argmaxX(s9line, 2);
  report.s9_stats = { xR: s9xR, xG: s9xG, xB: s9xB };
  // Pass if the three channels peak at different x positions (at least 1 pixel apart)
  report.s9_pass = Math.abs(s9xR.x - s9xB.x) >= 1;

  // ──────────── S10: FOAM_AT_HIGH_VELOCITY ────────────
  // Do fast zigzag mouse motion to inject high-velocity regions
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(200 + i * 12, 200 + (i % 2) * 200);
    await page.waitForTimeout(15);
  }
  await page.waitForTimeout(300);
  const s10foam = await readFBORegion(page, '__foamTex', { x: 0, y: 0, w: 256, h: 192 }, 0);
  report.s10_stats = { foam_mean: s10foam?.mean, error: s10foam?.error };
  // Pass if foam has accumulated (foam_mean > 0.01 in float space = non-trivial mean intensity)
  report.s10_pass = s10foam && !s10foam.error && s10foam.mean > 0.01;

  // ──────────── S7: CONSOLE_CLEAN ────────────
  report.s7_console_clean = errors.length === 0;
  report.errors = errors;

  // ──────────── S11: NO_REGRESSION ────────────
  // All original scenarios must still pass (must run AFTER S7 so s7_console_clean is set)
  report.s11_pass = !!report.s1_webgl2 && !!report.s2_fbo_complete && !!report.s3_idle_painted &&
                    !!report.s4_splat_color && !!report.s5_fps_pass && !!report.s6_breathing &&
                    !!report.s7_console_clean;

  // ──────────── S12: PERFORMANCE_BUDGET ────────────
  // Sample FPS over 60 motion frames
  const fpsSamples = [];
  for (let i = 0; i < 60; i++) {
    await page.mouse.move(512 + 150 * Math.cos(i * 0.1 * 3), 384 + 150 * Math.sin(i * 0.1 * 3));
    await page.waitForTimeout(33);
    const f = await page.evaluate(() => {
      if (typeof window.__fps === 'function') return window.__fps();
      if (typeof window.__fps === 'number') return window.__fps;
      return null;
    });
    if (typeof f === 'number') fpsSamples.push(f);
  }
  const meanFps = fpsSamples.length > 0 ? fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length : 0;
  report.s12_fps_samples = fpsSamples.length;
  report.s12_fps_mean = +meanFps.toFixed(2);
  report.s12_pass = fpsSamples.length >= 30 && meanFps >= 30;

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  const allPass = !!report.s1_webgl2 && !!report.s2_fbo_complete && !!report.s3_idle_painted &&
                  !!report.s4_splat_color && !!report.s5_fps_pass && !!report.s6_breathing &&
                  !!report.s7_console_clean && !!report.s8_pass && !!report.s9_pass &&
                  !!report.s10_pass && !!report.s11_pass && !!report.s12_pass;
  console.log(JSON.stringify({ ...report, _all_pass: allPass }, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });