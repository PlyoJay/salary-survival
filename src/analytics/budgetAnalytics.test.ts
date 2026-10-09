import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Analytics } from '@apps-in-toss/web-framework';
import { trackBudgetEvent, type BudgetEvent } from './budgetAnalytics';

vi.mock('@apps-in-toss/web-framework', () => ({ Analytics: { log: vi.fn().mockResolvedValue(undefined) } }));

describe('budgetAnalytics 개인정보 최소 전송', () => {
  beforeEach(() => { vi.mocked(Analytics.log).mockClear(); });

  it.each<BudgetEvent>([
    'salary_setup_completed', 'expense_added', 'expense_edited', 'expense_deleted',
  ])('%s는 공식 API로 이벤트 이름과 빈 params만 1회 전달한다', async event => {
    await trackBudgetEvent(event);
    expect(Analytics.log).toHaveBeenCalledExactlyOnceWith({ log_name: event, log_type: 'event', params: {} });
  });
});
