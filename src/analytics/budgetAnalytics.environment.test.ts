import { describe, expect, it, vi } from 'vitest';
import { Analytics } from '@apps-in-toss/web-framework';
import { BudgetStore } from '../app/BudgetStore';
import { LocalStorageBudgetRepository } from '../repositories/LocalStorageBudgetRepository';
import { trackBudgetEvent } from './budgetAnalytics';

describe('실제 SDK의 미지원 실행 환경', () => {
  it('토스 브릿지가 없는 브라우저에서 실제 SDK가 던져도 저장·복원은 정상 동작한다', async () => {
    vi.stubGlobal('window', {});
    const log = vi.spyOn(Analytics, 'log');
    try {
      expect(() => trackBudgetEvent('expense_added')).toThrow('웹뷰 환경이 아니에요');
      log.mockClear();
      const values = new Map<string, string>();
      const repository = new LocalStorageBudgetRepository({
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value); },
        removeItem: key => { values.delete(key); },
      });
      const store = new BudgetStore(repository, trackBudgetEvent);
      const salary = { monthlyNetAmount: 3_000_000, payday: 25 };
      const expense = { id: 'expense', amount: 12_000, category: 'food' as const, occurredOn: '2026-09-30' as const };
      await store.setup(salary);
      await store.saveExpense(expense);
      await store.saveExpense({ ...expense, amount: 15_000 });
      const reopened = new BudgetStore(repository, trackBudgetEvent);
      await reopened.initialize();
      expect(reopened.getSnapshot().data?.expenses).toEqual([{ ...expense, amount: 15_000 }]);
      await reopened.deleteExpense(expense.id);
      expect(log.mock.calls).toEqual([
        [{ log_name: 'salary_setup_completed', log_type: 'event', params: {} }],
        [{ log_name: 'expense_added', log_type: 'event', params: {} }],
        [{ log_name: 'expense_edited', log_type: 'event', params: {} }],
        [{ log_name: 'expense_deleted', log_type: 'event', params: {} }],
      ]);
      expect(reopened.getSnapshot()).toMatchObject({ saving: false, loadError: null, data: { salary, expenses: [] } });
      expect(await repository.get()).toEqual(reopened.getSnapshot().data);
    } finally {
      log.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
