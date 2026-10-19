# 대장 지킴이 (튼튼 대장 지키기) — 개발 명세서 (Codex용)

> 이 문서는 현재 배포된 최종 코드(index.html / sw.js / manifest.json, 캐시 `daejang-v14`)를 그대로 읽고 정리한 것입니다. 숫자는 모두 실제 코드 값입니다.

---

## 0. 바로 붙여넣는 Codex 프롬프트

```
이 문서(CODEX_SPEC.md)를 보고 "대장 지킴이(튼튼 대장 지키기)" 게임을 그대로 만들어줘.
- 외부 라이브러리·이미지·폰트 없이 HTML5 Canvas 하나로 동작하는 단일 index.html
- PWA 파일: manifest.json, sw.js(오프라인 캐시), icon-192.png, icon-512.png
- 문서의 화면 배치, 조작, 규칙, 아이템 목록, 문구, 색상, 숫자를 정확히 지켜줘
- 한국 배는 문서의 SVG 원본을 base64 data URI로 넣어서 그려줘
- 화면 크기 규칙(7장)과 테스트 목록(10장)을 모두 통과하게 해줘
- 파일을 바꿀 때마다 sw.js 캐시 이름 숫자를 1씩 올려줘 (현재 daejang-v14 → 다음은 daejang-v14)
기존 기능을 늘릴 때도 이 문서의 규칙을 깨지 말고, 바뀐 내용은 이 문서에도 반영해줘.
```

---

## 1. 개요와 목표
- 대장암 예방 생활습관을 알리는 한국어 캐주얼 게임입니다. 떨어지는 음식과 습관을 바구니로 받습니다.
- 좋은 것(채소·과일·통곡물·운동)을 받으면 점수가 오르고, 나쁜 것(가공육·붉은 고기·기름진/단 음식·술·담배)을 받으면 점수가 깎이고 바구니가 작아집니다.
- 게임이 끝나면 근거 있는 예방 수칙 6가지를 보여줍니다.
- 휴대폰 세로 화면이 기본입니다. PC에서도 동작하며, 앱처럼 설치하는 PWA로 만듭니다.

## 2. 기술 스택
- 순수 HTML + CSS + JavaScript, 외부 의존성 0개 (CDN, 폰트, 이미지 파일 없음)
- 게임 화면은 `<canvas id="c">` 하나에 매 프레임 `requestAnimationFrame`으로 다시 그립니다.
- 그림은 모두 시스템 이모지(`fillText`)로 그리고, 예외로 한국 배만 SVG(data URI → `Image` → `drawImage`)로 그립니다.
- PWA: `manifest.json` + 서비스 워커 `sw.js` (캐시 우선)

## 3. 파일 구조
| 파일 | 내용 |
|---|---|
| index.html | 게임 전체 (HTML, CSS, JS, 배 SVG) |
| manifest.json | PWA 설정 |
| sw.js | 오프라인 캐시 서비스 워커 |
| icon-192.png, icon-512.png | 앱 아이콘 (초록 배경에 사과와 바구니 모양) |
| screenshot.png, korean-pear.png | 문서용 이미지 (배포에는 필요 없음) |

## 4. 화면 배치
좌표는 CSS 픽셀 기준입니다. W, H는 캔버스의 CSS 크기입니다.
- **상단 HUD** (`#hud`, HTML, 화면에 고정, 터치를 받지 않음 `pointer-events:none`)
  - padding 10px 14px, 굵은 18px 글씨, 배경 rgba(255,255,255,.6)
  - 왼쪽: `⭐ 점수`, 오른쪽: 하트 `'❤️'.repeat(hp)+'🤍'.repeat(5-hp)`
- **조작 띠 경계** `CZ = H*0.75`. 화면 아래 25%가 조작 띠입니다.
- **바구니 Y**: `py = CZ - 45`로 고정 (화면 높이의 약 70%). 손가락 위치와 상관없이 움직이지 않습니다.
- **조작 띠** (캔버스에 그림)
  - 채우기: 평소 `rgba(46,125,50,.15)`, 터치 중일 때 `rgba(46,125,50,.28)`
  - 위쪽 경계선: `rgba(46,125,50,.5)`, 두께 3px
  - 큰 글씨: `'👈  여기를 터치해서 움직이세요  👉'` (이모지와 글자 사이 공백 2칸), bold 17px sans-serif, 색 #2e7d32, 띠의 가운데 (`W/2, CZ+(H-CZ)/2`)
  - 작은 글씨: `'좌우로 드래그'`, 13px sans-serif, 색 rgba(46,125,50,.7), 큰 글씨보다 24px 아래
- 그리는 순서: 떨어지는 아이템 → 조작 띠 → 바구니 → 바구니 속 아이템 → 점수 팝업
- 모든 글씨는 `textAlign='center'`, `textBaseline='middle'`로 그립니다.

## 5. 조작
- **조작 띠 드래그 / 아무 곳 터치**: 캔버스의 `touchstart`/`touchmove` (`{passive:false}`, `preventDefault()`)에서 `p.x = touch.clientX`로 정합니다. 바구니는 손가락의 X만 따라가고, 띠뿐 아니라 화면 어디를 터치해도 됩니다. `tY`는 띠 강조 표시에만 씁니다 (`touchend`/`touchcancel`에서 손가락이 모두 떨어지면 null).
- **키보드**: ←/→를 누르고 있으면 매 프레임 8px씩 움직입니다 (`keydown`/`keyup`으로 `keys` 상태 저장).
- **마우스**: 캔버스 `mousemove`에서 `p.x = clientX`
- 바구니 X 범위: `35 ≤ p.x ≤ W-35`
- 막는 동작: `contextmenu`, `gesturestart/gesturechange/gestureend`, `dblclick`, 손가락 두 개 이상 `touchmove` (모두 preventDefault)
- 게임이 진행 중(`run`)이 아닐 때 터치는 무시합니다.

## 6. 게임 규칙
- **시작값** (`reset`): `p={x:W/2,w:70}`, score=0, hp=5, next=30, sp=1, items/stack/pops는 빈 배열
- **프레임 시간**: `dt = min(50, 지난 프레임부터의 ms)`. 이동은 모두 `*dt/16`으로 계산합니다.
- **아이템 생성**: 누적 시간이 `max(350, 800 - score*4)` ms를 넘을 때마다 1개 생성
  - 좋은 것 60% (`Math.random()<.6`), 나쁜 것 40%. 같은 종류 안에서는 균등하게 무작위
  - x = `40 + random*(W-80)`, y = -45
  - 낙하 속도 v = `(2 + random*2) * sp` (16ms당 px)
- **속도 증가**: 점수가 next(30, 60, 90…) 이상이 되는 순간 `next += 30`, `sp += 0.15` (퀴즈 없음)
- **아이템 크기**: 이모지는 `66px serif`, 한국 배 그림은 80×80px (이모지 66px과 같은 크기로 보이게)
- **충돌 판정**: `py-45 < o.y < py+25` 이고 `|o.x - p.x| < p.w*bs()/2 + 27`
- **바구니 크기 배율** `bs() = 0.4 + 0.12*hp` → hp 5/4/3/2/1 = 100% / 88% / 76% / 64% / 52%. 바구니 그림 `56*bs()` px, 판정 폭도 같은 배율로 줄어듭니다.
- **좋은 것을 받으면**: score += 5, 바구니에 쌓고, 초록 '+5' 팝업
- **나쁜 것을 받으면**: `score = max(0, score-5)`, hp -= 1, 빨간 '-5 바구니 축소!' 팝업
- **게임 오버**: hp ≤ 0, 즉 나쁜 것을 5번째 받은 순간
- **놓친 아이템**: `o.y > CZ + 10`이 되면 조작 띠 안으로 들어가자마자 사라집니다 (벌점 없음).

### 바구니에 쌓기
- 받은 좋은 아이템 중 마지막 6개만 저장 (`stack.push`, 6개 넘으면 `shift`)
- k = bs(). 이모지는 `22*k` px, 배 그림은 `27*k` px
- i번째 위치: x = `p.x + ((i%3)-1)*18*k`, y = `py - 14*k - floor(i/3)*14*k` (한 줄에 3개, 2줄)

### 점수 팝업
- 문구와 색: '+5' = #2e7d32 / '-5 바구니 축소!' = #d32f2f
- 글꼴 bold 28px sans-serif, 받은 위치에서 시작
- 16ms마다 1.2px 위로 올라가고, 투명도가 0.02씩 줄어 0이 되면 사라집니다 (약 0.8초).

## 7. 아이템 목록과 근거
근거 출처: 세계암연구기금(WCRF/AICR), 국제암연구소(IARC).

**좋은 것 (18, 코드 순서 그대로)**
`🥦 🥕 🍎 🍌 🍠 🌾 🥬 🍅 🍇 🍓 🥒 🌽 🍐(한국 배 그림) 🥝 🍊 🏃 🩺 🏥`
- 통곡물(🌾)과 식이섬유: 대장암 위험을 낮춘다는 근거가 꽤 있음 (probable)
- 채소·과일: 식이섬유 공급원, 간접 근거
- 운동(🏃): 대장암 위험을 낮춘다는 근거가 확실함
- 건강검진·대장내시경(🩺) 및 국가 암검진·분변잠혈검사(🏥): 선종(용종) 조기 발견·절제 및 조기 진단으로 대장암 예방 및 사망률 감소 근거 확실함 (획득 시 +5점 및 잃은 하트 1개 즉시 회복, 낙하 시 파란 테두리 후광과 `건강검진`/`국가암검진` 이름표 표시)

**나쁜 것 (15, 코드 순서 그대로)**
`🌭 🥓 🥩 🍺 🚬 🍟 🍔 🍕 🍩 🧁 🍷 🥃 🍖 🥤 🍰`
- 가공육 🌭🥓: IARC 1군 발암물질
- 붉은 고기 🥩🍖: IARC 2A군
- 술 🍺🍷🥃: 1군, 근거 확실
- 담배 🚬: 대장암 위험 증가
- 기름진 음식·단 음식·단 음료 🍟🍔🍕🍩🧁🍰🥤: 비만을 통한 간접 위험

**제외한 아이템과 이유** (근거가 약하거나 일관되지 않아 v10에서 뺌)
- 💧 물: 수분 섭취와 대장암 예방의 관련 근거가 부족함
- 🧄 마늘, 🥜 견과류, 🍵 녹차: 연구 결과가 엇갈리거나 제한적임
- 🍗 치킨: 가금류는 붉은 고기·가공육과 달리 위험 증가 근거가 없음

**이모지 호환성**: 오래된 Android에서 빈 네모로 보일 수 있는 최신 이모지(🫐, 🫘 등)는 쓰지 않습니다.

## 8. 한국 배(신고배) 그림
- 🍐 이모지는 서양배라서, 같은 키 `'🍐'`를 쓰되 그림으로 대신 그립니다.
- 그리는 함수: `di(e,cx,cy,sz)` → `e==='🍐'`이고 그림이 불러와졌으면(`PEAR.ok`) `drawImage`, 아니면 `fillText`로 이모지를 그립니다. 그림을 못 불러와도 🍐 이모지로 대신 나옵니다.
- 생김새: 동글고 약간 납작한 사과 모양, 황금빛 갈색 그라데이션(#f7d58a → #d9a04a → #a8692a), 갈색 테두리 #8a5420, 밝은 점 14개(#fbe9c0, 투명도 .85), 흰 반사광, 짧은 갈색 꼭지 #6b3e17, 초록 잎 #5cb85c (테두리 #3d8b3d)
- 코드에서는 아래 SVG를 **base64** data URI로 넣습니다 (`data:image/svg+xml;base64,...`). 퍼센트 인코딩은 `#` 문자 때문에 그림이 깨지므로 쓰지 마세요.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#f7d58a"/><stop offset=".55" stop-color="#d9a04a"/><stop offset="1" stop-color="#a8692a"/></radialGradient></defs><path d="M50 26C30 22 10 34 10 58C10 80 28 94 50 94C72 94 90 80 90 58C90 34 70 22 50 26Z" fill="url(#g)" stroke="#8a5420" stroke-width="2"/><g fill="#fbe9c0" opacity=".85"><circle cx="30" cy="50" r="1.6"/><circle cx="42" cy="40" r="1.4"/><circle cx="58" cy="44" r="1.5"/><circle cx="70" cy="56" r="1.6"/><circle cx="25" cy="66" r="1.4"/><circle cx="40" cy="62" r="1.5"/><circle cx="55" cy="70" r="1.6"/><circle cx="72" cy="74" r="1.4"/><circle cx="35" cy="80" r="1.5"/><circle cx="62" cy="84" r="1.3"/><circle cx="80" cy="64" r="1.3"/><circle cx="48" cy="52" r="1.2"/><circle cx="20" cy="56" r="1.2"/><circle cx="66" cy="34" r="1.2"/></g><ellipse cx="34" cy="44" rx="9" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 34 44)"/><path d="M50 30Q49 18 54 10" stroke="#6b3e17" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M54 16Q68 4 82 12Q70 24 54 16Z" fill="#5cb85c" stroke="#3d8b3d" stroke-width="1.5"/><path d="M56 15Q68 11 78 12" stroke="#3d8b3d" stroke-width="1" fill="none"/></svg>
```

## 9. 화면 문구 (그대로 사용)
**시작 화면** (`#start`, 반투명 검정 배경 위 흰 카드)
- 제목: `🌿 튼튼 대장 지키기`
- `바구니 🧺를 좌우로 움직여<br>건강한 음식과 습관을 받으세요!`
- `🥦🥬🍅🍎🍇🌾🍐🏃 등 채소·과일·통곡물·운동은 +5점<br>🌭🥓🥩🍔🍟🍩🍺🥃🚬🥤 등 가공육·기름진 음식·단 음식·술·담배는 -5점 & 바구니가 작아져요`
- `⌨️ ←/→ 키 · 📱 터치/마우스로 이동`
- 버튼: `시작하기`

**게임 오버 화면** (`#over`)
- 제목: `게임 종료!`, 그 아래 `점수: N` (22px)
- 소제목: `대장암 예방 수칙`
- 수칙 6가지 (그대로):
  1. 🥦 채소·과일·통곡물로 식이섬유 충분히
  2. 🥩 붉은 고기는 적당히, 가공육은 줄이기
  3. 🏃 규칙적인 신체활동 (주 150분 이상)
  4. 🚭 금연, 🍺 절주
  5. ⚖️ 적정 체중 유지
  6. 🩺 만 50세 이상: 매년 분변잠혈검사(국가 암검진), 이상 시 대장내시경
- 버튼: `다시 하기` (바로 새 게임 시작)

## 10. 색상과 테마
- 배경: `linear-gradient(#a8e6cf, #dcedc1)` (민트 → 연두)
- 기본 초록(제목, 테마 색): #2e7d32 / 소제목: #c2185b
- 버튼: 배경 #ff8a65, 흰 글씨, 굵게, 18px, padding 12px 22px, 모서리 12px
- 카드: 흰색, 모서리 20px, padding 24px, 최대 너비 440px, 너비 92%, 최대 높이 90vh, 그림자 `0 8px 30px rgba(0,0,0,.3)`
- 안내 화면 배경: rgba(0,0,0,.45)
- 글꼴: `system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`

## 11. 화면 크기 규칙 (v11)
- viewport 메타: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`
- CSS
  - `html,body{width:100%;height:100%;overflow:hidden;position:fixed;inset:0;text-size-adjust:100%}`
  - body: `touch-action:none; overscroll-behavior:none; user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent`
  - canvas: `position:fixed; left:0; top:0; width:100%; height:100%; touch-action:none` (크기는 CSS가 정합니다)
- 크기 함수 `rs()`
  - `c.getBoundingClientRect()`로 CSS 크기 w, h를 잽니다. 0이면 `documentElement.clientWidth/Height`를 씁니다. `innerWidth`나 `visualViewport`는 쓰지 않습니다.
  - `DPR = min(devicePixelRatio, 3)`
  - 크기와 DPR이 그대로면 아무것도 하지 않습니다 (크기가 계속 바뀌는 고리 방지).
  - 바뀌었으면 `c.width=round(w*DPR)`, `c.height=round(h*DPR)` 후 매번 `ctx.setTransform(DPR,0,0,DPR,0,0)`로 다시 설정합니다 (`scale()` 누적 금지).
  - 바구니 X를 새 범위 안으로 옮깁니다.
- `resize` 이벤트는 requestAnimationFrame으로 한 번에 묶어 처리하고, `orientationchange` 후에는 250ms 뒤에 `rs()`를 부릅니다.
- `p`(바구니)는 `rs()`보다 먼저 `let W,H,DPR,p;`로 선언합니다 (선언 전에 쓰면 오류가 납니다).

## 12. PWA
- **manifest.json**
  - name "대장 지킴이 - 튼튼 대장 지키기", short_name "대장 지킴이"
  - start_url "./index.html", scope "./"
  - display "standalone", orientation "portrait"
  - background_color #dcedc1, theme_color #2e7d32, lang ko
  - icons: icon-192.png(192×192), icon-512.png(512×512), purpose "any maskable"
- **index.html head**: `<link rel="icon" href="icon-192.png">`, `<link rel="manifest">`, `<meta name="theme-color" content="#2e7d32">`, `<link rel="apple-touch-icon" href="icon-192.png">`. 페이지 load 후 `navigator.serviceWorker.register("sw.js")`
- **sw.js**
  - 캐시 이름 `C='daejang-vN'` (현재 v12)
  - 캐시할 파일 `['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png']`
  - install: 위 파일을 캐시에 넣고 `skipWaiting()`
  - activate: 이름이 다른 캐시를 지우고 `clients.claim()`
  - fetch: 캐시에 있으면 캐시에서, 없으면 네트워크에서
- **규칙**: 파일을 하나라도 바꾸면 캐시 이름 숫자를 반드시 1 올립니다. 안 올리면 설치된 앱이 옛 버전을 계속 보여줍니다. 이미 설치한 사람은 앱을 한두 번 껐다 켜야 새 버전이 나옵니다.

## 12-1. v12 고도화 기능 (1등 앱 업그레이드)
- **콤보 및 하트 회복 시스템**:
  - 좋은 아이템을 연속으로 받을 때마다 `combo`가 1씩 증가하며, 2콤보 이상일 때 바구니 아래에 `🔥 N COMBO` 배지를 표시합니다.
  - **10콤보 달성(`combo % 10 === 0`)**: 잃은 하트가 있으면(`hp < 5`) 하트를 1개 회복(`hp++`)하고 바구니 크기도 함께 회복되며 `'💚 10콤보! 하트 회복!'` 팝업이 뜹니다.
  - 나쁜 아이템을 받으면 `combo = 0`으로 초기화됩니다.
- **대장 건강·발암 도감 (`#dex`)**:
  - 세계암연구기금(WCRF)과 국제암연구소(IARC) 근거를 바탕으로 좋은 습관 16종과 피할 습관 15종 각각의 과학적 근거 등급 및 상세 설명, 누적 수집 횟수를 확인할 수 있습니다.
- **Web Audio API 효과음 및 진동 피드백**:
  - 외부 음원 파일 없이 `AudioContext` 합성음으로 좋은 아이템 획득(콤보에 따라 음정 상승), 나쁜 아이템 획득(경고음 + 모바일 진동), 레벨업/10콤보 달성(팡파르), 게임 오버 사운드를 재생합니다.
  - 상단 HUD의 `🔊/🔇` 버튼(`#btn-snd`)으로 소리를 켜고 끌 수 있으며, `⏸️` 버튼(`#btn-pause`) 또는 `Escape` 키로 일시정지할 수 있습니다.
- **시각 연출 및 기록 저장 (`localStorage`)**:
  - 배경 구름·언덕 애니메이션, 아이템 후광, 획득 시 파티클 폭발(`parts`), 바구니 탄성 애니메이션(`bScale`), 나쁜 아이템 충돌 시 화면 흔들림(`shake`) 및 붉은 플래시(`badFlash`), 조작 띠 내 실시간 바구니 위치 트랙 표시기를 그립니다.
  - `localStorage`(`daejang_save_v12`)에 최고 점수(`best`), 최고 콤보(`maxCombo`), 도감 수집 현황(`dex`)을 영구 저장하며, 게임 종료 시 점수 등급 칭호(`🌱 새싹 대장 지킴이` ~ `👑 전설의 대장 수호신`)와 결과 공유(`navigator.share` 및 클립보드 복사)를 지원합니다.

## 13. 배포
- **GitHub Pages**: 저장소 `wonjulifestory/daejang-jikimi`, `main` 브랜치 루트 → https://wonjulifestory.github.io/daejang-jikimi/
  - `git push origin main`을 하면 1분쯤 뒤 자동으로 반영됩니다.
  - 상태 확인: `gh api repos/wonjulifestory/daejang-jikimi/pages/builds/latest`
- **Cloudflare Pages**: 프로젝트 `colon-prev` → https://colon-prev.pages.dev/
  - 앱 파일 5개(index.html, manifest.json, sw.js, icon-192.png, icon-512.png)만 빈 폴더에 복사한 뒤, wrangler가 설치된 폴더에서 실행합니다.
    ```
    cd /workspace/wrangler3
    CLOUDFLARE_ACCOUNT_ID=<계정 ID> ./node_modules/.bin/wrangler pages deploy <폴더> --project-name colon-prev --branch main --commit-dirty=true
    ```
  - API 토큰은 환경변수 `CLOUDFLARE_API_TOKEN`으로만 넘기고, 문서나 코드에 절대 적지 않습니다.
- **확인**: 두 주소의 `/sw.js`가 새 캐시 이름으로 시작하는지 봅니다. Cloudflare는 `/index.html`을 `/`로 넘기므로 `curl -L`로 확인합니다.

## 14. 테스트 목록
- [ ] JS 문법 검사 (`<script>` 내용을 꺼내 `node --check`), `node --check sw.js`, manifest JSON 검사
- [ ] 로컬 HTTP 서버 + 헤드리스 Chrome(puppeteer-core)에서 콘솔 오류, 페이지 오류, 실패한 요청이 0개
- [ ] 휴대폰 화면(390×760, DPR 3, 터치)에서 조작 띠를 드래그하면 바구니 X가 따라가고 페이지가 스크롤되지 않음
- [ ] ←/→ 키와 마우스로 바구니가 움직임
- [ ] 좋은 것을 받으면 +5점, 바구니에 쌓임(최대 6개), 초록 '+5' 팝업
- [ ] 나쁜 것을 받으면 -5점(0 아래로 안 내려감), 하트 1개 감소, 바구니 88%→76%→64%→52%, 빨간 팝업
- [ ] 나쁜 것을 5번째 받으면 게임 오버, 수칙 6개 표시, '다시 하기'로 다시 시작
- [ ] 30점마다 속도가 빨라지고 퀴즈 화면은 나오지 않음
- [ ] 600번 생성했을 때 31종이 모두 나오고 제외한 💧🧄🥜🍵🍗는 한 번도 안 나옴
- [ ] 한국 배 그림이 불러와지고(`PEAR.ok`) 떨어질 때와 바구니 속 모두 그림으로 나옴
- [ ] 휴대폰(DPR 3)과 PC(1280×800, DPR 1·2)에서 30초 동안 캔버스 CSS 크기가 화면 크기와 같고, 실제 픽셀 크기 = CSS 크기 × DPR로 변하지 않음. 화면 회전 후에도 맞게 바뀜
- [ ] 서비스 워커 등록, 캐시 이름이 올라갔는지 확인
