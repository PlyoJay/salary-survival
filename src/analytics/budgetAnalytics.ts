import { Analytics } from '@apps-in-toss/web-framework';

export type BudgetEvent =
  | 'salary_setup_completed'
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted';

export type BudgetEventTracker = (event: BudgetEvent) => void | Promise<void>;

// 업무 데이터는 받지 않습니다. anonymous_key는 공식 SDK가 자동 포함합니다.
// 전송의 실행과 실패 격리는 BudgetStore에서 저장 작업과 분리합니다.
export const trackBudgetEvent: BudgetEventTracker = event => Analytics.log({
  log_name: event,
  log_type: 'event',
  params: {},
});
