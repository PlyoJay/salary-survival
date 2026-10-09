# 상단 여백 분석 및 진단 (2026-10-09, Asia/Seoul)

## 확인한 원인과 수정 범위

- 기존 첫 문구의 상단 간격은 `.page`의 `24px + env(safe-area-inset-top)`에 `.page-header`의 `4px`가 더해진 `28px + CSS Safe Area`였다. 네 화면이 같은 규칙을 사용한다.
- `body`의 margin은 0이며 `.app-shell`, `.app-content`에는 상단 padding이 없다. 폭 600px 이상에서는 기존 데스크톱 프레임의 body 상하 padding 24px가 추가된다. 이 규칙은 유지한다.
- 설치된 SDK 3.6.0의 기본 내비게이션은 `transparentBackground: false`, `withTitle: true`이다. 설정을 변경하지 않는다.
- TDS AIT 2.5.1은 SDK 값을 `--toss-safe-area-top`으로 제공한다. 제공자 자체는 페이지 전체에 상단 padding을 추가하지 않으며 앱도 이 변수를 상단 padding에 사용하지 않는다.
- 설치된 AIT Devtools 3.6.0의 `dist/panel/index.js`는 native nav bar가 WebView viewport 밖에 있어 콘텐츠가 `top=0`부터 시작한다는 설명(devtools#275)을 포함한다. iPhone 15 Pro의 CSS env top=0이라는 기존 실측 설명도 있으나, 이번 사용자의 기기에서 측정한 결과가 아니다. Devtools 모형과 SDK top 값을 실제 헤더 경계의 증거로 대체하지 않는다.
- 사용자 실기기의 CSS Safe Area 값과 native WebView 경계는 현재 미측정이다. 따라서 중복 Safe Area는 확정되지 않았으며 `env(safe-area-inset-top)`을 유지한다.
- 최소 수정: `.page`의 고정 간격을 24px → 12px, `.page-header` 상단 간격을 4px → 0으로 변경한다. 첫 문구는 기존보다 16 CSS px 위에 온다. 나머지 padding, 카드, 헤더 아래 간격, 하단 내비게이션, Analytics, 저장 구조는 유지한다.
- `.budget-form`의 `scroll-margin-top`은 프로그램 스크롤 위치의 여유이며 초기 레이아웃 여백이 아니다. 변경하지 않는다. 로딩/오류와 본문 내부 `.empty-state`의 기존 레이아웃도 유지한다.

## 실기기 진단 방법

1. 토스 앱 테스트 화면에 연결된 WebView 검사 도구가 제공되는 환경에서 해당 WebView의 콘솔을 연다. 브라우저 로컬 모형의 측정값을 실기기 값으로 기록하지 않는다. 디버깅 연결이 제공되지 않으면 아래 실기기 측정은 미검증으로 남긴다.
2. 키보드를 닫고 화면 최상단으로 스크롤한다. 홈(`/`), 지출내역(`/expenses`), 통계(`/statistics`), 설정(`/settings`)에서 각각 실행한다.
3. 같은 폴더의 `top-spacing-diagnostics.js` 전체를 콘솔에서 실행한다. 앱 번들에는 포함되지 않는다. 보이지 않는 측정 요소를 잠깐 추가하고 즉시 제거하며, 예산 데이터 조회·저장·Analytics·네트워크 전송은 하지 않는다.
4. JSON의 `cssSafeAreaTop`이 CSS `env()`의 실제 계산값이다. `elements`는 body부터 첫 문구까지의 상단 좌표, padding, margin을 보여 준다. `tdsSdkSafeAreaTopSnapshot`은 제공자가 읽었던 SDK 값이다. CSS env 값이나 이미 확보된 여백과 동일한 값이라고 가정하지 않는다.
5. `scrollY=0`, `visualOffsetTop=0`, `scale=1` 조건에서 비교한다. 첫 문구의 페이지 기준 위치는 수정 전 `28 + cssSafeAreaTop`, 수정 후 `12 + cssSafeAreaTop`이 예상된다. 데스크톱 body padding이나 부모 padding은 별도 좌표로 확인한다.
6. 같은 시점의 실기기 화면/네이티브 검사 도구에서 토스 헤더 하단과 WebView 상단 경계를 대조한다. DOM 좌표는 WebView 내부 CSS px이며 물리 화면 좌표가 아니다. 이미지의 물리 px와 CSS px를 혼용하지 않는다. 네이티브 헤더는 DOM에서 조회되지 않는다.

## 중복 여부 판단

| 측정 결과 | 판단과 대응 |
| --- | --- |
| CSS env top=0 | CSS Safe Area가 추가하는 여백은 0이다. 이를 제거해도 개선되지 않는다. 고정 간격 축소만 적용한다. |
| CSS env top>0, WebView가 시스템 UI 뒤까지 확장 | 콘텐츠 보호에 필요한 값일 수 있다. env를 유지한다. |
| CSS env top>0, 같은 보호 영역이 native WebView 경계/부모 레이아웃으로 이미 확보된 사실을 실측 확인 | 동일 영역의 중복만 환경에 맞춰 제거하는 후속 변경을 검토한다. SDK top이 양수라는 사실만으로는 이 판단을 하지 않는다. |
| 실기기 연결/경계 확인 불가 | 중복 여부는 미확정이다. env를 0으로 강제하거나 헤더 높이를 임의로 빼지 않는다. |

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| `pnpm test` | 8개 파일, 116개 테스트 통과 |
| `pnpm exec tsc -b` | TypeScript 검사 통과. 처음 실행은 샌드박스 EPERM으로 실패했고 권한 승인 후 재실행 통과 |
| `pnpm build` | TypeScript + Vite 프로덕션 빌드 + AIT 생성 성공 |
| `node --check docs/top-spacing-diagnostics.js` | 진단 스크립트 문법 검사 통과 |
| `git diff --check` | 통과 |
| 진단 스크립트 번들 포함 여부 | `dist` 검색에서 진단 스크립트 식별 문자열 없음 |
| 토스 실기기 env / native 경계 측정 | 미검증. 연결된 실기기 검사 세션 없음 |

프로덕션 `dist`를 별도 로컬 출처 `http://localhost:5187`에서 실행했다. 브라우저 viewport 390×844에서 가상 월급 3,000,000원, 월급일 25일을 입력해 첫 설정 → 홈 → 지출내역 → 통계 → 설정의 화면 전환을 확인했다. 기존 사용자 데이터에 접근하지 않았다.

| 화면 | `.page` top | page padding-top | header padding-top | 첫 문구 top | 하단 내비게이션 top / height |
| --- | --- | --- | --- | --- | --- |
| 홈 | 0 | 12px | 0px | 12px | 779px / 65px |
| 지출내역 | 0 | 12px | 0px | 12px | 779px / 65px |
| 통계 | 0 | 12px | 0px | 12px | 779px / 65px |
| 설정 | 0 | 12px | 0px | 12px | 779px / 65px |

각 화면의 body/root/shell/content 상단 padding은 0px이었다. CSS 식과 page 계산값을 대조하면 이 로컬 브라우저의 CSS Safe Area top은 0px이다. 토스 실기기 측정값으로 취급하지 않는다. 홈 카드의 기존 padding 28px, 모서리 24px, 내비게이션의 fixed 배치를 확인했으며, 로컬 홈 캡처는 `.verification/top-spacing-home-390.png`에 보관했다. 기존 Vite의 500KB 초과 JS 청크 경고는 유지된다.

새 번들: `salary-survival-plyo.ait`, 443,933 bytes, 생성 시각 2026-10-09 20:03:55 (Asia/Seoul).

SHA-256: `24C32A6731E7D98B78415E2BFCEE5FB69776EBA5957B0E702EFD232EDE7EA909`

빌드 로그 deploymentId: `01a12055-7a38-7151-ae2e-ef7e13c1fa82`. 이 값은 토스 콘솔 업로드나 출시의 증거가 아니다. 토스 콘솔 업로드와 출시는 수행하지 않았다.

공식 참고: [Safe Area](https://developers-apps-in-toss.toss.im/documentation/common/screen/safe-area), [기본 내비게이션](https://developers-apps-in-toss.toss.im/documentation/common/navigationbar).
