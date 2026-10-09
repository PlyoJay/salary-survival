import { describe, expect, it, vi } from 'vitest';
import { aitState } from '@apps-in-toss/devtools/mock/3x';
import { BudgetStore } from '../app/BudgetStore';
import { LocalStorageBudgetRepository } from '../repositories/LocalStorageBudgetRepository';
import { trackBudgetEvent } from './budgetAnalytics';

// Vite 개발 환경과 동일한 공식 Devtools 3.x mock으로 수집 경로 전체를 검증합니다.
vi.mock('@apps-in-toss/web-framework', async () => {
  const { Analytics } = await import('@apps-in-toss/devtools/mock/3x');
  return { Analytics };
});

describe('공식 AIT Devtools Analytics 수집', () => {
  it('저장 흐름에서 네 이벤트를 1회씩 수집하고 복원·동일 내용·중복 삭제는 제외한다', async () => {
    aitState.reset();
    const values = new Map<string, string>();
    const repository = new LocalStorageBudgetRepository({
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: key => { values.delete(key); },
    });
    const store = new BudgetStore(repository, trackBudgetEvent);
    const salary = { monthlyNetAmount: 3_000_000, payday: 25 };
    const expense = { id: 'private-id', amount: 12_000, category: 'food' as const, occurredOn: '2026-09-30' as const, memo: '개인 메모' };
    await store.setup(salary);
    await store.saveExpense(expense);
    await store.saveExpense({ ...expense });
    await store.saveExpense({ ...expense, amount: 15_000 });
    const reopened = new BudgetStore(repository, trackBudgetEvent);
    await reopened.initialize();
    expect(reopened.getSnapshot().data?.expenses).toEqual([{ ...expense, amount: 15_000 }]);
    await reopened.deleteExpense(expense.id);
    await reopened.deleteExpense(expense.id);
    expect(aitState.state.analyticsLog.map(({ type, params }) => ({ type, params }))).toEqual([
      { type: 'event', params: { log_name: 'salary_setup_completed' } },
      { type: 'event', params: { log_name: 'expense_added' } },
      { type: 'event', params: { log_name: 'expense_edited' } },
      { type: 'event', params: { log_name: 'expense_deleted' } },
    ]);
    expect(values.size).toBe(1);
    expect(JSON.parse(values.get('salary-survival:budget:v1')!)).toEqual({
      version: 1, data: { salary, expenses: [], fixedExpenses: [], savingsGoals: [] },
    });
  });
});
