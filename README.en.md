# 🌌 aurora-fluid

> GPU-driven aurora-palette Stable Fluids simulation in a single HTML file

A **GPU fluid simulator** that solves velocity, pressure, and divergence entirely in fragment shaders (`#version 300 es`). It ports Jos Stam's Stable Fluids (1999) onto the GPU and dresses it with a 4-color aurora palette, bloom, chromatic aberration, foam, and subtle parallax — all in a single self-contained HTML file running at 60fps.

[🇰🇷 한국어 (기본)](./README.md) · [🇺🇸 English](#)

---

## 🎬 Live Demo

> **👉 [https://aurora-fluid.vercel.app/](https://aurora-fluid.vercel.app/)** — Run directly in your browser (WebGL 2 required)

| | |
|---|---|
| ![Demo](https://img.shields.io/badge/Live-Demo-7C3AED?style=for-the-badge&logo=vercel&logoColor=white) | [![Repo](https://img.shields.io/badge/GitHub-sigco3111%2Faurora--fluid-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sigco3111/aurora-fluid) |
| ![Status](https://img.shields.io/badge/Status-Live-22C55E?style=flat-square) | ![Stack](https://img.shields.io/badge/Stack-WebGL2%20%2B%20GLSL-5586FF?style=flat-square&logo=webgl&logoColor=white) |
| ![License](https://img.shields.io/badge/License-MIT-F1C40F?style=flat-square) | ![Deps](https://img.shields.io/badge/Dependencies-0-9CA3AF?style=flat-square) |

### 🎮 Quick start
1. Click the demo link above → page opens in your browser
2. **Move mouse / touch** — emit a fluid splat at the cursor position
3. **Drag** — continuous splats generate strong turbulence
4. **Release** — the system keeps itself alive via ambient breathe

> ⚠️ Browsers without WebGL 2 (Safari 14 and below, some mobile) show a friendly error overlay.

---

## 🤖 Attribution

This project's code was **automatically generated** using the model and prompt below.

| Field | Value |
|---|---|
| **Model** | MiniMax-M3 |
| **Runtime** | OpenCode CLI |
| **Repository** | [`sigco3111/aurora-fluid`](https://github.com/sigco3111/aurora-fluid) |
| **License** | MIT |
| **Dependencies** | None (WebGL 2 + inline GLSL, single HTML) |
| **Deployment** | Vercel (auto-alias: `aurora-fluid.vercel.app`) |

### 📝 Prompt used (verbatim)

```
WebGL 2 + Stable Fluids algorithm — implement an aurora-palette GPU fluid
dynamics simulation. Solve velocity/pressure/divergence entirely in fragment
shaders (full Poisson solve) for a full-screen fluid, then layer visual effects
on top: Bloom + Chromatic Aberration + Foam + weak Parallax depth.
Mouse/touch drag should emit splats, and ambient breathe should keep the
system subtly alive even when idle. Pack everything (including all shaders)
into a single HTML file with zero external dependencies.
```

---

## ✨ Features

- 🌊 **Stable Fluids (Jos Stam, 1999)** — velocity advection, vorticity confinement, pressure projection, divergence zeroing — all on GPU
- 🎨 **Aurora palette** — 4-cosine `a + b·cos(2π·(c·t + d))` palette with time-based hue shift
- 💧 **Mouse / touch splat** — Gaussian falloff color + velocity pulse injected into velocity/dye FBOs
- 🌬️ **Ambient breathe** — when idle, the system emits subtle turbulence on its own (feels alive)
- 💥 **Bloom** — multi-pass Kawase-style blur for additive glow
- 🌈 **Chromatic aberration** — per-channel offset for a glassy / through-water feel
- 🫧 **Foam** — threshold-based foam texture accumulation + decay in high-speed regions
- 🪞 **Weak parallax** — small depth offset on dye UVs for added dimensionality
- 🎬 **Stable 60fps** — `requestAnimationFrame` + capped devicePixelRatio + half-float (F16) FBOs
- 📦 **Single HTML** — 16 GLSL shaders + JS all inlined, zero external dependencies
- 🛡️ **Error overlay** — friendly diagnostics for context loss / shader compile failures
- 📱 **Mobile touch** — unified `pointerdown` / `touchmove` handling

---

## 🚀 Quick Start

### Option 1: Just open in browser (simplest)
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

> Local `file://` can be picky with WebGL 2 FBO memory in some browsers — Option 2 is recommended.

### Option 2: Local server (recommended)
```bash
python3 -m http.server 8000
# → http://localhost:8000
```

### Option 3: Live demo (Vercel)
No install required — open **[aurora-fluid.vercel.app](https://aurora-fluid.vercel.app/)** directly.

---

## 🎮 Controls

| Input | Effect |
|---|---|
| **Mouse / touch move** | Emit dye + velocity splat at cursor position |
| **Mouse / touch drag (continuous)** | Rapid splats create strong turbulence |
| **Release** | Even when idle, ambient breathe keeps the system alive |
| **Resize window** | `resizeCanvas` automatically reallocates FBOs (with DPR cap) |

---

## 🛠️ Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| **Rendering** | WebGL 2 (`#version 300 es`) | GPU-accelerated fluid solver |
| **Shading language** | GLSL ES 3.0 | 16 inline shaders |
| **Numerical method** | Stable Fluids (Jos Stam, 1999) | advection + projection + vorticity confinement |
| **Color space** | 4-cosine aurora palette + hue shift | Slowly evolves over time |
| **Post-processing** | Bloom + Chromatic Aberration + Foam + Parallax | Multi-pass render pipeline |
| **FBO format** | `RGBA16F` (half-float) | Prevents divergence clamp artifacts |
| **JS runtime** | Vanilla JS (ES2020+) | No framework |
| **Build** | None | Single HTML, instant run |
| **Deployment** | Vercel | GitHub auto-deploy |

### 🧬 Shader pipeline (16 shaders)
```
advection (vel) → curl → vorticity → divergence →
clearPressure → pressure (Poisson) → gradientSubtract →
advection (dye) → splat → foam → bloom (Kawase 5-pass) →
final composite (palette + aberration + parallax + tonemap)
```

---

## 🔬 Algorithmic notes

This simulation combines the following core ideas:

1. **Stable Fluids (Jos Stam, 1999)** — Semi-Lagrangian advection for unconditionally stable velocity updates + pressure projection for incompressibility
2. **Vorticity confinement** — A term added by Fedkiw et al. (2001) after Stam, preserving the small vortices that numerical diffusion would otherwise erase
3. **GPU full pipeline** — Every step runs as fragment shaders on Ping-Pong FBOs, no CPU hot loop
4. **4-cosine aurora palette** — IQ(Inigo Quilez)-style `a + b·cos(2π·(c·t + d))` palette producing cyan-violet-pink tones
5. **Ambient breathe** — Gaussian noise periodically added to velocity so the system feels alive even when the user is idle

---

## 🧪 QA

The `qa/` folder ships a Playwright-based headless capture tool:

```bash
node qa/capture.mjs   # writes 5-second mp4 + frames to out/
```

> Headless WebGL 2 contexts can be finicky, so this is more for local design regression checks than CI gates.

---

## 📂 Project layout

```
aurora-fluid/
├── index.html              # ⭐ All code (16 GLSL + JS) in a single file
├── package.json            # QA script only (0 runtime deps)
├── README.md               # 한국어 (default)
├── README.en.md            # English (this file)
└── qa/
    ├── capture.mjs         # Playwright headless capture
    ├── run.sh              # QA runner
    └── out/                # capture output
```

---

## 🔧 Compatibility

| Environment | Status |
|---|---|
| Chrome / Edge (Desktop) | ✅ Recommended (WebGL 2 + F16) |
| Firefox (Desktop) | ✅ Recommended |
| Safari (macOS 14+) | ✅ WebGL 2 supported |
| Safari (iOS 14+) | ⚠️ iOS 16+ recommended (older FBO format limits) |
| Mobile Chrome / Samsung Internet | ✅ Works |
| IE / legacy browsers | ❌ No WebGL 2 — error overlay shown |

---

## 🆚 Related projects

| Project | Notes |
|---|---|
| [`neon-fluid`](https://github.com/sigco3111/neon-fluid) | Canvas2D + 3,000 particles + Spatial Hash Grid. Same fluid concept reinterpreted as a *GPU full-pipeline* simulation under the aurora palette |

---

## 📜 License

MIT — free to use, modify, and distribute. Just don't ruin the aurora palette fun 🙂

---

## 🙏 Credits

- **Stable Fluids algorithm** — Jos Stam, *SIGGRAPH 1999*
- **Vorticity confinement** — Fedkiw, Stam, Jensen (2001)
- **Aurora palette** — `a + b·cos(2π·(c·t + d))`, IQ style
- **Bloom / Kawase blur patterns** — Various (inspired by the WebGL-Fluid-Simulation community)
- **Code generation** — MiniMax-M3 via OpenCode CLI