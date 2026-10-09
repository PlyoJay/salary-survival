# 월급생존기

월급, 고정지출, 저축목표, 지출 내역을 바탕으로 다음 월급날까지 하루에 사용할 수 있는 금액을 계산하는 Apps in Toss WebView 미니앱입니다.

Phase 2 MVP는 사용자가 월급을 설정하고 실제 지출을 기록·수정·삭제할 수 있습니다. 데이터는 이 기기의 localStorage에 저장되며, 앱을 다시 실행해도 유지됩니다. 서버, 로그인, 기기 간 동기화는 제공하지 않습니다.

## 사용 흐름

1. 첫 실행 시 설정 화면에서 월 실수령액과 월급일을 입력합니다. 월 저축 금액은 선택입니다.
2. 설정 완료 후 홈에서 오늘 사용 가능한 금액을 확인합니다.
3. 설정에서 고정지출과 저축 목표를 추가·수정·삭제하고 활성 상태를 변경할 수 있습니다.
4. 지출내역에서 금액·카테고리·날짜·메모를 입력합니다. 실제 지출은 오늘 또는 과거 날짜만 기록합니다.
5. 홈과 통계는 저장된 변경을 즉시 반영합니다. 새로고침 후에도 기록이 유지됩니다.
6. 설정의 데이터 초기화는 확인 후 모든 예산 정보를 삭제하고 시작 화면으로 돌아갑니다.

금액은 원 단위의 0 이상 안전 정수, 월급은 0보다 큰 정수, 월급일·납부일은 1~31일입니다. 잘못된 입력은 저장하지 않고 설명을 표시합니다. 저장 실패 시 기존 데이터와 입력값을 유지해 다시 시도할 수 있습니다.

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

- `pnpm test`: 예산/주기 계산, 입력 검증, Repository, 상태 변경·영속화 테스트
- `pnpm run build:web`: TypeScript 검사 + Vite 웹 빌드
- `pnpm build`: 웹 빌드 후 배포용 `.ait` 번들 생성

## 앱인토스 콘솔 연결

`apps-in-toss.config.ts`의 `appName`은 실제 콘솔에서 확정된 `salary-survival-plyo`로 설정되어 있습니다. `brand.primaryColor`는 `#3182F6`, 저장 키는 사용자 데이터 호환성을 위해 기존 `salary-survival:budget:v1`을 유지합니다.

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
| `/expenses` | 지출 입력·목록·수정·삭제 |
| `/statistics` | 현재 주기의 총 변동지출, 월급 대비 비율, 카테고리별 합계 |
| `/settings` | 최초 설정, 월급 편집, 고정지출·저축 목표 관리, 데이터 초기화 |

설정 전에는 홈·지출·통계 딥링크도 `/settings`로 안내합니다.

딥링크를 등록할 때는 `intoss://{appName}/expenses`처럼 웹 라우트와 같은 경로를 사용합니다.

## 프로젝트 구조

```text
src/
├─ app/                  # 라우팅, 앱 셸, BudgetProvider/useBudget, 저장 조정자
├─ data/                 # Phase 1 참고 예시 (실제 앱에서는 사용하지 않음)
├─ domain/
│  ├─ budget/            # 예산·월급 주기 계산 순수 함수와 테스트
│  ├─ models.ts          # 기존 월급/고정지출/저축/지출 모델 유지
│  ├─ date.ts            # 날짜 검증·표현
│  └─ validation.ts      # 폼 입력과 저장 데이터 검증
├─ pages/                # 홈, 지출내역, 통계, 설정
├─ repositories/         # 저장소 인터페이스와 localStorage 구현
├─ shared/               # 표시 유틸리티, TDS 입력, 오류/성공/삭제 확인 UI
└─ styles/               # 모바일 WebView 기본 레이아웃
```

## 데이터 흐름과 저장

```text
앱 시작 → BudgetProvider → BudgetStore → BudgetRepository.get()
폼 입력 → 입력 검증 → useBudget().actions → 순차 저장 → Repository.save()
저장 성공 → 공유 상태 갱신 → 홈 calculateBudget() / 통계 재계산
초기화 확인 → Repository.clear() → 설정 전 상태
```

- UI는 localStorage를 직접 호출하지 않습니다. Provider에서 주입한 `LocalStorageBudgetRepository`가 저장을 담당합니다.
- 저장 키는 기존 `salary-survival:budget:v1`, 저장 형식은 `{ version: 1, data: BudgetData }`입니다. Phase 1의 버전 없는 유효한 데이터도 읽습니다.
- 잘못된 JSON, 필수 필드 누락, 유효하지 않은 금액·날짜·카테고리·중복 ID, 알 수 없는 버전은 로드 오류로 처리해 기존 저장 데이터를 자동으로 덮어쓰지 않습니다. 사용자가 다시 불러오거나 명시적으로 저장 데이터를 삭제한 뒤에만 새로 시작할 수 있습니다.
- 저장 공간 접근이 거부되면 로딩 오류와 재시도 버튼을 표시합니다. 저장·초기화 실패는 기존 상태를 보존합니다.
- 연속 변경을 순서대로 저장하며 저장 성공 후 화면에 반영합니다. 실패한 작업 때문에 이후 저장이 막히지 않습니다.
- 로드와 저장 전에 현재 월급 주기의 계산도 검증합니다. 합계가 안전 정수 범위를 넘는 입력은 저장하지 않고 기존 상태와 입력값을 유지하며, 이미 저장된 계산 불가능 데이터는 로드 오류로 안내합니다.
- 초기 검증의 `RangeError`만 저장 데이터 손상으로 분류합니다. 이미 분류된 데이터 로드 오류는 유지하고, 예상하지 못한 런타임 오류는 일반 로드 실패로 처리해 데이터 삭제를 유도하지 않습니다.
- 저장된 지출은 월급일이 바뀌어도 보존합니다. 현재 주기와 오늘까지의 내역만 홈·통계 계산에 포함합니다.
- 기기의 현재 날짜를 기준으로 계산하며, 앱으로 복귀하거나 날짜가 바뀌면 다시 계산합니다.
- 같은 기기에서도 브라우저·WebView·출처(origin)가 다르면 저장 공간이 다릅니다. 동시 여러 탭 편집이나 다른 기기 동기화는 지원 범위 밖입니다.
- 앱 데이터/브라우저 저장 공간을 지우면 기록이 사라집니다. 저축의 현재 모은 금액은 직접 갱신하며 자동 적립하지 않습니다.

`BudgetRepository` 인터페이스는 유지했습니다. 이후 저장소를 교체할 때 Provider에 다른 구현을 주입할 수 있습니다.

## 예산 계산 규칙

```text
남은 금액 = 월 실수령액 - 활성 고정지출 - 활성 월 저축액 - 현재 월급 주기의 지출
오늘 사용 가능 금액 = max(0, floor(남은 금액 / 남은 사용일))
```

- 남은 사용일은 오늘을 포함하고 다음 월급날은 제외합니다.
- 모든 금액은 원 단위의 0 이상 안전 정수이며, 개별 금액뿐 아니라 고정지출·저축·지출 및 전체 차감액 합계도 안전 정수 범위를 넘지 않는지 검증합니다.
- 예산이 부족하면 오늘 사용 가능 금액은 0원, 부족액은 별도 값으로 반환합니다.
- 함수 내부에서 현재 시간을 읽지 않고 기준 날짜를 인자로 받아 결과를 재현할 수 있습니다.
- `calculateBudgetCycle(today, payday)`는 이번 달 월급일 전이면 이전 달부터, 월급일 당일/이후면 이번 달부터 주기를 시작합니다.
- 29/30/31일이 없는 달에는 각 달의 마지막 날을 월급일로 사용합니다. 예: 월급일 31일, 2026년 2월 → 2월 28일, 2028년 2월 → 2월 29일.
- 활성 고정지출과 월 저축액은 납부일과 관계없이 매 주기 전체 금액을 예약합니다. 실제 월급 입금이나 저축 거래는 연동하지 않습니다.

## Phase 2 최종 검증 결과 (2026-10-01 전체 흐름, 2026-10-05 오류 분류 재검증)

- `pnpm test`: 5개 파일, 84개 테스트 통과 (2026-10-05). 기존 테스트 유지, 월말/연도/윤년/29·30·31일, version 1/Phase 1 복원, 손상 JSON/미지원 버전 보호, 저장 실패·연속 변경·재실행 복원 포함. 고정지출·월 저축·현재 주기 지출·전체 차감액 합계 오버플로, 안전 정수 상한, 오버플로 입력의 저장 차단, 삭제 실패 후 원본 보존·재시도도 확인했습니다. 예상하지 못한 TypeError/일반 Error의 손상 오판·삭제 차단과 재시도 복구, 이미 분류된 데이터 로드 오류 메시지 유지 회귀 테스트를 추가했습니다.
- `pnpm run build:web`: TypeScript 검사와 Vite 빌드 성공.
- `pnpm build`: `salary-survival.ait` 생성 성공.
- 브라우저에서 최초 설정 → 홈 → 지출 추가/수정/삭제 → 홈 금액 변경, 고정지출·저축 목표 추가/비활성/재활성 → 홈 반영, 새로고침 후 예산·지출 복원과 카테고리 통계를 확인했습니다. 실제 Toss WebView 검증은 별도입니다.
- 검증용 저장 데이터로 손상 JSON·미지원 버전·합계 오버플로의 오류 화면, version 1/Phase 1 복원, 삭제 전 위험 안내·취소, 재시도, 명시적 삭제 후 `/settings` 진입과 재설정, 삭제 실패 시 오류 유지와 재시도를 브라우저에서 확인했습니다.
- 입력 라벨, 오류 `role="alert"`, 성공 `role="status"`, 통계 progressbar의 ARIA를 검토했습니다. 정상 진입·사용·새로고침 및 복구 시나리오에서 콘솔 오류/경고 없음. 개발 중 HMR로 발생한 일시적 Context 오류는 전체 페이지 로드 후 재현되지 않았습니다.
- TDS/SDK를 포함한 JS 청크는 1,319.43KB (gzip 422.98KB, 2026-10-05 빌드)이며 Vite의 크기 경고가 남아 있습니다. 실제 WebView의 초기 로딩 성능과 코드 분할은 출시 전 확인합니다.
- 최종 상태: **Phase 2 main 병합 가능**. 이번 검증에서는 PR 생성과 main 병합을 수행하지 않았습니다.

## 최신 main 출시 전 준비 기록 (2026-10-06)

`main`의 `d8d5224`에서 작업 시작 시 working tree clean을 확인하고, `pnpm test` 84개 테스트와 `pnpm run build:web`, `pnpm build`를 다시 실행해 모두 통과했습니다. `salary-survival.ait` 생성 완료이며 앱 설정·구현 코드·SDK 버전은 변경하지 않았습니다.

콘솔의 실제 appName/브랜드 색상, 기기·OS·Toss 앱 버전과 QR은 아직 미확인입니다. 실제 WebView 테스트는 미검증으로 남겼습니다. [검증 기록과 기기별 체크리스트](docs/toss-webview-verification.md)에 현재 설정, 번들 식별 정보, 주요 기능 후보, 출시 전 테스트 링크 절차와 결과표를 정리했습니다. 코드·빌드 준비는 완료했으며 출시 검토 판단은 실기기 확인 후 진행합니다.

## 콘솔 appName 반영 검증 (2026-10-07)

현재 `appName`은 콘솔에서 확정한 `salary-survival-plyo`입니다. `brand.primaryColor` (`#3182F6`), `webBundleDir` (`dist`), SDK 버전, 라우팅, 저장 키 (`salary-survival:budget:v1`)는 이번 작업에서 변경하지 않았습니다.

`pnpm test` (5개 파일, 84개 테스트), `pnpm run build:web`, `pnpm build`를 순서대로 실행해 모두 성공했습니다. 새 번들은 `salary-survival-plyo.ait`이며 생성·수정 시각은 2026-10-07 21:15:40 (Asia/Seoul)입니다. 기존 `salary-survival.ait`와 이전 검증 기록은 보존했습니다. Vite의 500KB 초과 청크 경고는 유지되며, 이번 작업에서 별도 브랜치 생성이나 main 병합은 수행하지 않았습니다.

## 사용자 행동 이벤트 (2026-10-08)

공식 SDK 3.6.0의 `Analytics.log({ log_name, log_type: 'event', params: {} })`를 사용합니다. 별도 분석 SDK나 의존성을 추가하지 않았습니다.

| 이벤트 | 발생 기준 |
| --- | --- |
| `salary_setup_completed` | 현재 저장 데이터가 없는 상태에서 월급 최초 설정 저장 성공 |
| `expense_added` | 신규 지출 1건 저장 성공 |
| `expense_edited` | 기존 지출의 금액·카테고리·날짜·메모가 실제로 변경되고 저장 성공 |
| `expense_deleted` | 존재하는 지출 삭제 저장 성공 |

`BudgetStore`의 순차 저장 큐에서 기존 데이터를 기준으로 판정합니다. 저장 성공과 상태 갱신 이후 SDK를 기다리지 않고 이벤트를 1회 호출하며, 동기 예외와 비동기 거절은 격리합니다. 전송 실패·지연이 저장 결과나 화면 상태에 영향을 주지 않으며, 앱 측 전송 재시도는 없습니다. 저장 실패·동일 내용 저장·없는 지출 삭제·초기 데이터 복원·월급 편집·고정지출/저축 변경·데이터 초기화에는 이벤트를 보내지 않습니다. 사용자가 명시적으로 초기화한 뒤 재설정하면 새 최초 설정으로 집계합니다.

이벤트의 앱 전달 파라미터는 항상 빈 객체입니다. 금액·이름·메모·지출 ID·사용자 ID를 전달하지 않습니다. 다만 **`anonymous_key`는 공식 SDK가 자동 포함하는 사용자 식별키**입니다. 앱에서 별도 식별키를 조회하거나 전달하지 않습니다.

기존 저장 키 `salary-survival:budget:v1`, `{ version: 1, data }` 형식, Repository와 데이터 모델, UI는 유지했습니다. 기존 84개를 포함한 8개 파일의 116개 테스트, TypeScript 검사, 프로덕션 웹 빌드와 AIT 생성이 통과했습니다. 실제 토스 앱 종료 후 재실행 및 출시 후 서버 집계는 사용자의 콘솔 업로드·테스트·배포 단계에서 확인해야 합니다. 이번 작업에서는 업로드와 출시를 수행하지 않았습니다.

생성 번들: `salary-survival-plyo.ait` (2026-10-08 23:07:47, Asia/Seoul). [검증 결과·번들 식별 정보·콘솔 설정 절차](docs/analytics-verification.md)를 참고해 주세요.

## 공식 자료

- [Apps in Toss SDK 3.x 마이그레이션](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x)
- [Apps in Toss WebView 연동 가이드](https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview)
- [Apps in Toss 테스트앱 안내](https://developers-apps-in-toss.toss.im/development/test/sandbox)
- [TDS Mobile 시작하기](https://tossmini-docs.toss.im/tds-mobile/start/)
- [공식 create-ait-app](https://github.com/toss/create-ait-app)

## 범위와 남은 확인

출시 전 실제 토스 WebView의 키보드·Safe Area·저장 유지 검증과 범위 밖 기능은 `TODO.md`에서 관리합니다. 서버 API, DB, 로그인, 동기화, 결제, 알림, 별도 외부 분석 SDK, 외부 차트 라이브러리는 이번 MVP에 포함하지 않았습니다. 사용자 행동 분석은 기존 공식 Toss SDK를 이용합니다.
