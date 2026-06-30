# 🌌 aurora-fluid

> WebGL 2 + Stable Fluids 기반 오로라 팔레트 유체 역학 시뮬레이션

`#version 300 es` 프래그먼트 셰이더로 속도·압력·발산을 풀-해석(Poisson)하는 **GPU 유체 시뮬레이터**입니다. Jos Stam의 Stable Fluids(1999)를 GPU로 옮기고, 4색 오로라 팔레트 + Bloom + Chromatic Aberration + Foam + 패럴랙스 깊이감까지 입혀, **단일 HTML 파일** 하나로 60fps 인터랙티브 데모를 제공합니다.

[🇰🇷 한국어 (기본)](#) · [🇺🇸 English](./README.en.md)

---

## 🎬 라이브 데모 (Live Demo)

> **👉 [https://aurora-fluid.vercel.app/](https://aurora-fluid.vercel.app/)** — 브라우저에서 바로 실행 (WebGL 2 필요)

| | |
|---|---|
| ![Demo](https://img.shields.io/badge/Live-Demo-7C3AED?style=for-the-badge&logo=vercel&logoColor=white) | [![Repo](https://img.shields.io/badge/GitHub-sigco3111%2Faurora--fluid-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sigco3111/aurora-fluid) |
| ![Status](https://img.shields.io/badge/Status-Live-22C55E?style=flat-square) | ![Stack](https://img.shields.io/badge/Stack-WebGL2%20%2B%20GLSL-5586FF?style=flat-square&logo=webgl&logoColor=white) |
| ![License](https://img.shields.io/badge/License-MIT-F1C40F?style=flat-square) | ![Deps](https://img.shields.io/badge/Dependencies-0-9CA3AF?style=flat-square) |

### 🎮 빠른 사용법
1. 위 데모 링크 클릭 → 브라우저에서 페이지 열기
2. **마우스 / 터치 이동** — 커서 위치에 유체 스플랫(splat) 발사
3. **마우스 / 터치 드래그** — 빠르고 큰 스플랫으로 난기류 생성
4. **마우스 떼기** — 시스템이 자체 난류 시뮬레이션으로 복귀 + ambient breathe

> ⚠️ **WebGL 2 미지원 브라우저**(Safari 14 이하, 일부 모바일)는 에러 오버레이가 표시되며, 펜슬·이모지·수정 안내가 함께 나옵니다.

---

## 🤖 생성 정보 (Attribution)

이 프로젝트의 코드는 아래 모델과 프롬프트를 이용해 **자동으로 생성**되었습니다.

| 항목 | 값 |
|---|---|
| **모델** | MiniMax-M3 |
| **실행 환경** | OpenCode CLI |
| **저장소** | [`sigco3111/aurora-fluid`](https://github.com/sigco3111/aurora-fluid) |
| **라이선스** | MIT |
| **의존성** | 없음 (WebGL 2 + 인라인 GLSL, 단일 HTML) |
| **배포** | Vercel (auto-alias: `aurora-fluid.vercel.app`) |

### 📝 사용된 프롬프트 (원문)

```
WebGL 2 + Stable Fluids 알고리즘으로 오로라 팔레트의 GPU 유체 역학 시뮬레이션을 구현해줘.
속도/압력/발산 모두 fragment shader로 풀-해석(Poisson)해서 풀-스크린 fluid를 만들고,
Bloom + Chromatic Aberration + Foam + 약한 패럴랙스 깊이감으로 시각 효과를 입혀줘.
마우스/터치 드래그로 splat을 발사할 수 있어야 하고, ambient breathe로 시스템이
스스로 살아있는 듯한 미세 난류를 내야 해. 모든 의존관계(셰이더 포함)를
하나의 HTML 파일에 담아서, 외부 파일 0개로 실행 가능하게 만들어줘.
```

---

## ✨ 주요 특징 (Features)

- 🌊 **Stable Fluids (Jos Stam 1999)** — 속도 advection, vorticity confinement, 압력 projection, 발산 zeroing 모두 GPU 풀 파이프라인
- 🎨 **오로라 팔레트** — `a + b·cos(2π·(c·t + d))` 4-코사인 팔레트 + 시간 hue shift
- 💧 **마우스/터치 splat** — Gaussian-falloff 색상·속도 펄스를 velocity/dye FBO에 동시 주입
- 🌬️ **Ambient breathe** — 유휴 시 시스템이 *스스로* 미세 난류를 생성 (살아있는 듯한 느낌)
- 💥 **Bloom** — 다중-패스 Kawase-style blur로 발광 누적
- 🌈 **Chromatic Aberration** — RGB 채널 분리 + 미세 옵셋으로 유리/물 통과감
- 🫧 **Foam** — 고속 영역에서 threshold-based foam texture 누적 + 감쇠
- 🪞 **Weak Parallax** — dye UV에 미세 depth offset으로 깊이감
- 🎬 **60fps 안정** — `requestAnimationFrame` + devicePixelRatio 캡 + half-float(F16) FBO
- 📦 **단일 HTML** — GLSL 16개 셰이더 + JS 인라인, 외부 의존성 0개
- 🛡️ **Error Overlay** — WebGL 컨텍스트 실패 / 셰이더 컴파일 에러 시 사용자 친화적 진단 표시
- 📱 **모바일 터치 지원** — `pointerdown` / `touchmove` 통합 처리

---

## 🚀 실행 방법 (Quick Start)

### 방법 1: 그냥 브라우저로 열기 (가장 간단)
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

> 단, 로컬 `file://` 프로토콜에서는 일부 브라우저의 WebGL 2 캔버스 메모리 정책이 까다로울 수 있어 **방법 2 권장**.

### 방법 2: 로컬 서버 (권장)
```bash
python3 -m http.server 8000
# → http://localhost:8000
```

### 방법 3: 라이브 데모 (Vercel)
별도 설치 없이 **[aurora-fluid.vercel.app](https://aurora-fluid.vercel.app/)** 에서 바로 확인 가능합니다.

---

## 🎮 조작법 (Controls)

| 입력 | 효과 |
|---|---|
| **마우스 / 터치 이동** | 커서 위치에 dye + velocity splat 동시 발사 |
| **마우스 / 터치 드래그 (지속)** | 빠른 연속 splat으로 강한 난기류 생성 |
| **마우스 떼기** | 사용자가 멈춰도 ambient breathe로 시스템이 살아있는 듯한 미세 난류 유지 |
| **창 크기 조절** | `resizeCanvas`가 자동으로 FBO 해상도 재조정 (DPR 캡 적용) |

---

## 🛠️ 기술 스택 (Tech Stack)

| 영역 | 사용 기술 | 비고 |
|---|---|---|
| **렌더링** | WebGL 2 (`#version 300 es`) | GPU 가속 유체 솔버 |
| **셰이딩 언어** | GLSL ES 3.0 | 16개 inline 셰이더 |
| **수치 해석** | Stable Fluids (Jos Stam, 1999) | advection + projection + vorticity confinement |
| **색 공간** | 4-cosine 오로라 팔레트 + Hue shift | 시간 기반 천천히 변화 |
| **포스트 프로세싱** | Bloom + Chromatic Aberration + Foam + Parallax | 다중 렌더 패스 |
| **FBO 포맷** | `RGBA16F` (half-float) | 발산 0 클램프 방지 |
| **JS 런타임** | Vanilla JS (ES2020+) | 프레임워크 없음 |
| **빌드** | 없음 | 단일 HTML, 즉시 실행 |
| **배포** | Vercel | GitHub 연동 auto-deploy |

### 🧬 셰이더 파이프라인 (16 셰이더)
```
advection (vel) → curl → vorticity → divergence →
clearPressure → pressure (Poisson) → gradientSubtract →
advection (dye) → splat → foam → bloom (Kawase 5-pass) →
final composite (palette + aberration + parallax + tonemap)
```

---

## 🔬 알고리즘 노트

이 시뮬레이션은 다음 핵심 아이디어를 결합합니다:

1. **Stable Fluids (Jos Stam, 1999)** — Semi-Lagrangian advection으로 무조건 안정적인 velocity 업데이트 + 압력 projection으로 비압축성(incompressible) 유지
2. **Vorticity Confinement** — Stam 이후 Fedkiw 등(2001)이 추가한, 소실되는 작은 소용돌이를 보존하는 항
3. **GPU 풀 파이프라인** — 모든 단계가 fragment shader로 Ping-Pong FBO에서 실행되어 CPU 부하 없음
4. **4-코사인 팔레트** — IQ(Inigo Quilez) 스타일 `a + b·cos(2π·(c·t + d))` 팔레트로 오로라의 청록-보라-핑크 톤 생성
5. **Ambient breathe** — velocity에 가우시안 노이즈를 주기적으로 더해 사용자가 멈춰도 시스템이 *살아있는* 느낌 유지

---

## 🧪 QA / 검증

`qa/` 폴더에 Playwright 기반 헤드리스 캡처 도구가 포함되어 있습니다:

```bash
node qa/capture.mjs   # 5초짜리 mp4 + 프레임을 out/ 에 저장
```

> headless 환경에선 보통 WebGL 2 컨텍스트 생성이 까다로워 CI 검증 보다는 *로컬 디자인 회귀 검토* 용도입니다.

---

## 📂 디렉토리 구조

```
aurora-fluid/
├── index.html              # ⭐ 모든 코드가 담긴 단일 파일 (GLSL 16개 + JS 인라인)
├── package.json            # qa 스크립트 정의 (의존성 0)
├── README.md               # 한국어 (이 파일)
├── README.en.md            # English
└── qa/
    ├── capture.mjs         # Playwright 헤드리스 캡처
    ├── run.sh              # QA 실행 스크립트
    └── out/                # 캡처 산출물
```

---

## 🔧 환경 / 호환성

| 환경 | 상태 |
|---|---|
| Chrome / Edge (Desktop) | ✅ 권장 (WebGL 2 + F16 지원) |
| Firefox (Desktop) | ✅ 권장 |
| Safari (macOS 14+) | ✅ WebGL 2 지원 |
| Safari (iOS 14+) | ⚠️ iOS Safari 16 이상 권장 (이전 버전 FBO 포맷 제한) |
| Mobile Chrome / Samsung Internet | ✅ 정상 작동 |
| IE / 옛 브라우저 | ❌ WebGL 2 미지원 — 에러 오버레이 표시 |

---

## 🆚 관련 프로젝트

| 프로젝트 | 차이 |
|---|---|
| [`neon-fluid`](https://github.com/sigco3111/neon-fluid) | Canvas2D + 3,000개 입자 + Spatial Hash Grid 기반. 본 프로젝트는 *오로라 톤 WebGL 시뮬레이션*으로 같은 유체 컨셉을 GPU 풀 파이프라인으로 재해석 |

---

## 📜 라이선스

MIT License — 자유롭게 사용, 수정, 배포 가능합니다.
단, 오로라 팔레트와 Stable Fluids 구현의 즐거움을 깨지 말아주세요 🙂

---

## 🙏 Credits

- **Stable Fluids 알고리즘** — Jos Stam, *SIGGRAPH 1999*
- **Vorticity Confinement** — Fedkiw, Stam, Jensen (2001)
- **오로라 팔레트** — `a + b·cos(2π·(c·t + d))` IQ 스타일
- **Bloom / Kawase blur 패턴** — 다양 (WebGL-Fluid-Simulation 커뮤니티에서 영감)
- **코드 자동 생성** — MiniMax-M3 via OpenCode CLI