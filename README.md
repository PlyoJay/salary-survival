# 월급생존기

월급, 고정지출, 저축목표, 지출 내역을 바탕으로 다음 월급날까지 하루에 사용할 수 있는 금액을 계산하는 Apps in Toss WebView 미니앱입니다.

현재 범위는 Phase 1입니다. 화면은 예시 데이터로 구조와 계산 결과를 보여주며, 지출 입력·설정 편집 같은 실제 CRUD는 아직 제공하지 않습니다.

## 기술 기준

2026-09-29 기준 공식 문서를 확인해 아래 버전을 고정했습니다.

- React 18 + TypeScript + Vite 6
- `@apps-in-toss/web-framework` 3.6.0
- `@apps-in-toss/devtools` 3.6.0
- `@toss/tds-mobile` / `@toss/tds-mobile-ait` 2.5.1
- Vitest 5
- Node.js 24 이상, pnpm 11

SDK 3.x 규격에 따라 설정 파일은 `apps-in-toss.config.ts`, 번들 출력 설정은 `webBundleDir`, 최종 번들은 `ait build`로 생성합니다. SDK 3.x는 별도 샌드박스 앱 대신 AIT Devtools를 이용해 브라우저에서 개발합니다.

## 시작하기

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:5173`을 엽니다. 우측 하단에 AIT Devtools가 표시되면 SDK 3.x 브라우저 테스트 환경이 정상적으로 연결된 상태입니다.

## 검증 명령

```bash
pnpm test
pnpm run build:web
pnpm build
```

- `pnpm test`: 예산 계산 순수 함수 단위 테스트
- `pnpm run build:web`: TypeScript 검사 + Vite 웹 빌드
- `pnpm build`: 웹 빌드 후 배포용 `.ait` 번들 생성

## 앱인토스 콘솔 연결

`apps-in-toss.config.ts`의 `appName`은 현재 `salary-survival`로 설정되어 있습니다. 콘솔에서 앱을 만든 뒤 실제 콘솔 `appName`과 동일하게 변경해야 합니다.

1. 앱인토스 콘솔에서 미니앱을 생성합니다.
2. `apps-in-toss.config.ts`의 `appName`과 `brand.primaryColor`를 콘솔 값에 맞춥니다.
3. `pnpm build`로 `.ait` 파일을 생성합니다.
4. 콘솔의 앱 출시 메뉴에 번들을 업로드합니다.
5. 콘솔이 제공하는 QR 코드로 실제 토스 앱에서 최종 검증합니다.

> 공식 문서상 SDK 3.x에는 구형 전용 샌드박스 앱이 제공되지 않습니다. 로컬 개발은 AIT Devtools, 실제 토스 앱 최종 검증은 콘솔 업로드 후 QR 테스트를 사용합니다.

## 라우트

| 경로 | 화면 |
| --- | --- |
| `/` | 오늘 사용 가능 금액과 예산 요약 |
| `/expenses` | 지출내역 기본 화면 |
| `/statistics` | 통계 기본 화면 |
| `/settings` | 월급·고정지출·저축목표 설정 요약 |

딥링크를 등록할 때는 `intoss://{appName}/expenses`처럼 웹 라우트와 같은 경로를 사용합니다.

## 프로젝트 구조

```text
src/
├─ app/                  # 라우팅과 공통 앱 셸
├─ data/                 # Phase 1 화면용 예시 데이터
├─ domain/
│  ├─ budget/            # 외부 상태가 없는 예산 계산 순수 함수와 테스트
│  └─ models.ts          # 월급/고정지출/저축/지출 모델
├─ pages/                # 홈, 지출내역, 통계, 설정
├─ repositories/         # 저장소 인터페이스와 localStorage 구현
├─ shared/               # 표시용 공통 유틸리티
└─ styles/               # 모바일 WebView 기본 레이아웃
```

`BudgetRepository`에 UI가 의존하도록 설계했고, 현재 로컬 구현은 `LocalStorageBudgetRepository`입니다. 이후 API/DB 저장소가 필요하면 같은 인터페이스를 구현해 교체합니다.

## 예산 계산 규칙

```text
남은 금액 = 월 실수령액 - 활성 고정지출 - 활성 월 저축액 - 현재 월급 주기의 지출
오늘 사용 가능 금액 = max(0, floor(남은 금액 / 남은 사용일))
```

- 남은 사용일은 오늘을 포함하고 다음 월급날은 제외합니다.
- 모든 금액은 원 단위의 0 이상 안전 정수입니다.
- 예산이 부족하면 오늘 사용 가능 금액은 0원, 부족액은 별도 값으로 반환합니다.
- 함수 내부에서 현재 시간을 읽지 않고 기준 날짜를 인자로 받아 결과를 재현할 수 있습니다.

## 공식 자료

- [Apps in Toss SDK 3.x 마이그레이션](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x)
- [Apps in Toss WebView 연동 가이드](https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview)
- [Apps in Toss 테스트앱 안내](https://developers-apps-in-toss.toss.im/development/test/sandbox)
- [TDS Mobile 시작하기](https://tossmini-docs.toss.im/tds-mobile/start/)
- [공식 create-ait-app](https://github.com/toss/create-ait-app)

## Phase 1 범위 제한

의도적으로 포함하지 않은 항목은 `TODO.md`에서 관리합니다. 실제 지출 등록, 설정 편집, 데이터 마이그레이션, 서버 동기화, 인증, 분석 SDK는 Phase 2 이후 결정 전까지 구현하지 않습니다.
