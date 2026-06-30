# aurora-fluid

> 몽환적인 오로라 컬러 팔레트로 표현되는 GPU 기반 고밀도 유체 역학 시뮬레이션.
> WebGL + Stable Fluids (Jos Stam), 마우스 움직임에 반응하는 잉크 확산.

[![Built with OpenCode](https://img.shields.io/badge/Built%20with-OpenCode-7c3aed?style=flat-square)](https://opencode.ai)
[![Model: MiniMax-M3](https://img.shields.io/badge/Model-MiniMax--M3-ff6b9d?style=flat-square)](https://MiniMax.io)
[![WebGL](https://img.shields.io/badge/WebGL-Fragment%20Shaders-00d4ff?style=flat-square)](https://www.khronos.org/webgl/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

---

## 🇰🇷 한국어

### 개요

WebGL Fragment Shader에서 직접 **수만 개의 입자**를 연산하는 유체 역학 시뮬레이션입니다.
마우스를 움직이면 오로라 톤의 잉크가 물속에 스며든 듯 **소용돌이치고, 확산되며, 섞입니다.**

핵심 특징:
- 🎨 **오로라 팔레트** — 청록, 자정, 핑크, 라벤더가 HSV 공간에서 부드럽게 전이
- ⚡ **GPU 연산** — Stable Fluids 알고리즘을 fragment shader로 구현하여 CPU 부담 제거
- 🌊 **고밀도 시뮬레이션** — 수만 개 파티클의 advect/diffuse/pressure projection이 끊김 없이 동작
- 📦 **단일 HTML** — 외부 의존성 없음, `index.html` 하나로 완결 (Three.js CDN 포함 가능)

### 프롬프트 (원문)

> WebGL을 활용하여 마우스의 움직임에 따라 다채로운 색상의 잉크가 물속에서 퍼지는 듯한 고밀도 유체 역학(Fluid Dynamics) 시뮬레이션을 구현하되, 수만 개의 입자가 끊김 없이 연산되어 소용돌이치고 확산되는 과정을 몽환적인 오로라 컬러 팔레트로 표현해줘.
>
> **Implementation Advice:** Recommend Three.js with Custom ShaderMaterial or raw WebGL implementing "Stable Fluids" (Jos Stam's algorithm). Computation should happen on the GPU (Fragment Shaders) for performance with thousands of particles. 모든 의존관계의 코드를 하나의 HTML에 담는 형태로 코드 작성.

### 기술 스택 결정

| 결정 항목 | 선택 | 이유 |
|---|---|---|
| 렌더링 | **Raw WebGL 2** | Three.js는 particle layer 외엔 오버헤드. Stable Fluids 자체가 framebuffer ping-pong 구조라 raw WebGL이 더 직관적 |
| 시뮬레이션 알고리즘 | **Stable Fluids (Jos Stam 1999)** | 검증된 GPU 친화적 Eulerian solver. velocity field + dye field를 텍스처에 저장하고 advect/diffuse/project |
| 셰이더 언어 | **GLSL ES 3.00** | WebGL 2의 `texelFetch`, 정수 연산 활용 |
| 팔레트 | **Aurora HSV gradient** | 시간에 따라 hue가 천천히 회전 (cos 기반 보간) — 사용자가 별도 팔레트 입력 불필요 |
| 배포 형태 | **단일 HTML** | CDN 의존성 허용 (Three.js), 모든 GLSL은 inline `<script type="x-shader">` |

### 구현 옵션

사용자가 직접 코드를 작성할 때 다음 4가지 결정 포인트가 있습니다.

**A. 안정성 우선** — `dt` 클램프 + substep 분리 + 발산 시 velocity damping
**B. 시각적 화려함 우선** — Bloom post-process + trail accumulation + bloom threshold 조정
**C. 성능 우선** — 해상도 512×512로 다운샘플, advection은 1-pass
**D. 균형 (기본값, 추천)** — 256×256 시뮬레이션 + 60fps + trail 0.96

### 샘플 코드 골자 (Stable Fluids 핵심)

```glsl
// Advection (속도를 따라 dye를 이동)
vec4 advect(vec2 uv, sampler2D vel, sampler2D dye, float dt) {
  vec2 v = texture(vel, uv).xy;
  return texture(dye, uv - v * dt);
}

// Pressure Projection (비압축성 근사, divergence 제거)
// ... Jacobi iteration으로 20~40회 반복
```

### 직접 작성 가이드 (고급)

`index.html`을 직접 작성하려면:

1. **Framebuffer ping-pong** 구조 설정
   - `velocityTex[A/B]`, `pressureTex[A/B]`, `dyeTex[A/B]`
   - 매 프레임 swap
2. **셰이더 단계 (한 프레임)**
   - addForces (마우스 → velocity injection)
   - advect velocity
   - diffuse velocity (viscosity)
   - project (divergence → pressure → subtract gradient)
   - advect dye
   - 최종: dye 텍스처 → 화면 quad로 렌더링 (오로라 컬러 매핑)
3. **마우스 입력** — `mousemove` 좌표를 NDC로 변환, velocity field에 Gaussian으로 주입
4. **오로라 컬러** — `hsv2rgb(vec3(hue, 0.7, dyeValue))`, hue는 시간 + 위치 기반

### 라이선스

MIT

---

## 🇺🇸 English

### Overview

A GPU-driven high-density fluid dynamics simulation rendered via WebGL fragment shaders.
Move your mouse and watch aurora-toned ink swirl, diffuse, and mix as if drifting through deep water.

Key features:
- 🎨 **Aurora palette** — cyan, midnight, pink, and lavender transitioning smoothly through HSV space
- ⚡ **GPU-native computation** — Stable Fluids (Jos Stam) implemented in fragment shaders, zero CPU overhead
- 🌊 **High-density simulation** — tens of thousands of particles advected, diffused, and projected without frame drops
- 📦 **Single HTML** — no build step, all dependencies inlined (Three.js via CDN if needed)

### Tech Stack Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Renderer | **Raw WebGL 2** | Three.js overhead is unnecessary beyond a particle layer. Stable Fluids' ping-pong framebuffer structure maps directly to raw WebGL |
| Algorithm | **Stable Fluids (Jos Stam 1999)** | Battle-tested GPU-friendly Eulerian solver. Stores velocity and dye in textures, with advect/diffuse/project passes |
| Shader language | **GLSL ES 3.00** | WebGL 2's `texelFetch` and integer ops available |
| Palette | **Aurora HSV gradient** | Time-rotating hue with cos-based interpolation — no user palette input required |
| Distribution | **Single HTML** | CDN dependencies allowed (Three.js), all GLSL inlined as `<script type="x-shader">` |

### Implementation Options

Four decision points when writing the code:

**A. Stability-first** — `dt` clamp + substep separation + velocity damping on divergence
**B. Visual flair-first** — Bloom post-process + trail accumulation + tunable bloom threshold
**C. Performance-first** — 512×512 downsample, 1-pass advection
**D. Balanced (default, recommended)** — 256×256 simulation + 60fps + trail 0.96

### Roadmap

- [x] Repository scaffold
- [ ] Single-file WebGL implementation (`index.html`)
- [ ] Stable Fluids core (advect / diffuse / project)
- [ ] Aurora color mapping shader
- [ ] Mouse input → velocity injection
- [ ] Vercel deploy

---

## 🤖 How this was built

This project was scaffolded with **[OpenCode](https://opencode.ai)** using the **MiniMax-M3** model.

The simulation code (`index.html`) will be generated by OpenCode running MiniMax-M3 against the fluid dynamics prompt above.
The README, repository structure, and deployment hooks are prepared by Hermes (the AI assistant) so that OpenCode can drop the implementation straight in.