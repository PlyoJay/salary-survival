import { describe, expect, it, vi } from 'vitest';
import { BudgetStore } from './BudgetStore';
import { LocalStorageBudgetRepository } from '../repositories/LocalStorageBudgetRepository';
import { BudgetDataLoadError, type BudgetRepository } from '../repositories/BudgetRepository';
import type { BudgetData } from '../domain/models';
import { calculateBudget } from '../domain/budget/calculateBudget';
import { calculateBudgetCycle } from '../domain/budget/calculateBudgetCycle';

function createRepository() {
  const values = new Map<string, string>();
  return new LocalStorageBudgetRepository({
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
  });
}
const salary = { monthlyNetAmount: 3_000_000, payday: 25 };
const lunch = { id: 'lunch', amount: 12_000, category: 'food' as const, occurredOn: '2026-09-30' as const };
const fixed = { id: 'rent', name: '월세', amount: 800_000, dueDay: 1, isActive: true };
const goal = { id: 'savings', name: '비상금', targetAmount: 5_000_000, currentAmount: 0, monthlyContributionAmount: 500_000, isActive: true };

describe('BudgetStore 실제 데이터 흐름', () => {
  it('첫 실행 → 설정 → 지출 → 계산 → 다시 실행 → 데이터 유지', async () => {
    const repository = createRepository();
    const store = new BudgetStore(repository);
    await store.initialize();
    expect(store.getSnapshot().data).toBeNull();
    await store.setup(salary, 500_000);
    await store.saveFixedExpense(fixed);
    const before = calculateBudget({ ...store.getSnapshot().data!, cycle: calculateBudgetCycle('2026-09-30', 25) });
    await store.saveExpense(lunch);
    const after = calculateBudget({ ...store.getSnapshot().data!, cycle: calculateBudgetCycle('2026-09-30', 25) });
    expect(after.spentAmount).toBe(12_000);
    expect(after.remainingAmount).toBe(before.remainingAmount - 12_000);
    expect(after.dailyAvailableAmount).toBeLessThan(before.dailyAvailableAmount);
    const reopened = new BudgetStore(repository);
    await reopened.initialize();
    expect(reopened.getSnapshot().data).toEqual(store.getSnapshot().data);
  });
  it('월급 변경과 모든 컬렉션의 추가·수정·삭제·비활성을 저장한다', async () => {
    const store = new BudgetStore(createRepository());
    await store.setup(salary);
    await store.updateSalary({ monthlyNetAmount: 4_000_000, payday: 31 });
    await store.saveExpense(lunch);
    await store.saveExpense({ ...lunch, amount: 20_000 });
    await store.saveFixedExpense(fixed);
    await store.saveFixedExpense({ ...fixed, isActive: false });
    await store.saveSavingsGoal(goal);
    await store.saveSavingsGoal({ ...goal, isActive: false });
    const data = store.getSnapshot().data!;
    expect(data.salary.payday).toBe(31);
    expect(data.expenses).toHaveLength(1);
    expect(data.expenses[0]?.amount).toBe(20_000);
    const budget = calculateBudget({ ...data, cycle: calculateBudgetCycle('2026-09-30', 31) });
    expect(budget.fixedExpenseAmount).toBe(0);
    expect(budget.savingsAmount).toBe(0);
    await store.deleteExpense(lunch.id);
    await store.deleteFixedExpense(fixed.id);
    await store.deleteSavingsGoal(goal.id);
    expect(store.getSnapshot().data).toEqual({ salary: { monthlyNetAmount: 4_000_000, payday: 31 }, fixedExpenses: [], savingsGoals: [], expenses: [] });
  });
  it('연속 변경을 직렬 저장해서 지출을 잃지 않는다', async () => {
    const store = new BudgetStore(createRepository());
    await store.setup(salary);
    await Promise.all([store.saveExpense(lunch), store.saveExpense({ ...lunch, id: 'coffee', amount: 4500 }), store.saveFixedExpense(fixed)]);
    expect(store.getSnapshot().data?.expenses).toHaveLength(2);
    expect(store.getSnapshot().data?.fixedExpenses).toHaveLength(1);
  });
  it('저장 실패 시 기존 상태를 유지하고 다음 저장은 성공할 수 있다', async () => {
    const repository = createRepository();
    const store = new BudgetStore(repository);
    await store.setup(salary);
    const before = store.getSnapshot().data;
    const spy = vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('quota'));
    await expect(store.saveExpense(lunch)).rejects.toThrow('저장하지 못했어요');
    expect(store.getSnapshot().data).toBe(before);
    expect(store.getSnapshot().saving).toBe(false);
    await store.saveExpense(lunch);
    expect(spy).toHaveBeenCalledTimes(2);
    expect((await repository.get())?.expenses).toEqual([lunch]);
  });
  it('초기화 후 다시 실행해도 설정 전 상태다', async () => {
    const repository = createRepository();
    const store = new BudgetStore(repository);
    await store.setup(salary);
    await store.reset();
    const reopened = new BudgetStore(repository);
    await reopened.initialize();
    expect(reopened.getSnapshot().data).toBeNull();
  });
  it('삭제 실패 시 상태를 보존한다', async () => {
    const repository = createRepository();
    const store = new BudgetStore(repository);
    await store.setup(salary);
    vi.spyOn(repository, 'clear').mockRejectedValue(new Error('denied'));
    await expect(store.reset()).rejects.toThrow('초기화하지 못했어요');
    expect(store.getSnapshot().data?.salary).toEqual(salary);
  });
  it('로드 실패 시 덮어쓰지 않으며 재시도로 복구한다', async () => {
    const get = vi.fn<BudgetRepository['get']>().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(null);
    const repository = { get, save: vi.fn(), clear: vi.fn() };
    const store = new BudgetStore(repository);
    await store.initialize();
    expect(store.getSnapshot().loadError).toBeTruthy();
    expect(store.getSnapshot().loadErrorKind).toBe('storage');
    await expect(store.setup(salary)).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
    await store.retryLoad();
    await store.setup(salary);
    expect(store.getSnapshot().loadError).toBeNull();
  });
  it('손상 저장 데이터는 자동 덮어쓰지 않고 명시적 삭제 후에만 새로 시작한다', async () => {
    const save = vi.fn<BudgetRepository['save']>();
    const clear = vi.fn<BudgetRepository['clear']>().mockResolvedValue(undefined);
    const repository: BudgetRepository = {
      get: vi.fn().mockRejectedValue(new BudgetDataLoadError('corrupted', '저장 데이터가 손상됐어요.')),
      save,
      clear,
    };
    const store = new BudgetStore(repository);
    await store.initialize();

    expect(store.getSnapshot().data).toBeNull();
    expect(store.getSnapshot().loadErrorKind).toBe('data');
    await expect(store.setup(salary)).rejects.toThrow('저장 데이터가 손상됐어요.');
    expect(save).not.toHaveBeenCalled();

    await store.discardUnreadableData();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().loadError).toBeNull();

    await store.setup(salary);
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().data?.salary).toEqual(salary);
  });
  it('StrictMode에서도 로딩은 한 번이고 변경을 구독자에게 알린다', async () => {
    const repository = createRepository();
    const get = vi.spyOn(repository, 'get');
    const store = new BudgetStore(repository);
    await Promise.all([store.initialize(), store.initialize()]);
    expect(get).toHaveBeenCalledTimes(1);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.setup(salary);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    await store.saveExpense(lunch);
    expect(listener).not.toHaveBeenCalled();
  });
  it('잘못된 값은 Repository에 저장하지 않는다', async () => {
    const repository = createRepository();
    const save = vi.spyOn(repository, 'save');
    const store = new BudgetStore(repository);
    await expect(store.setup({ monthlyNetAmount: 0, payday: 32 })).rejects.toThrow();
    await expect(store.setup(salary, -100)).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
    expect(store.getSnapshot().data).toBeNull();
  });
  it('설정 전에 지출을 저장하지 않는다', async () => {
    const store = new BudgetStore(createRepository());
    await expect(store.saveExpense(lunch)).rejects.toThrow('먼저 월급');
  });
  it('저장 완료 전에는 기존 데이터를 보여준다', async () => {
    let complete!: () => void;
    const repository = createRepository();
    const store = new BudgetStore(repository);
    await store.setup(salary);
    const before = store.getSnapshot().data;
    vi.spyOn(repository, 'save').mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
    const save = store.saveExpense(lunch);
    await vi.waitFor(() => expect(store.getSnapshot().saving).toBe(true));
    expect(store.getSnapshot().data).toBe(before);
    complete(); await save;
    expect(store.getSnapshot().data?.expenses).toEqual([lunch]);
  });
  it('로드한 모델도 검증한다', async () => {
    const store = new BudgetStore({ get: async () => ({} as BudgetData), save: async () => {}, clear: async () => {} });
    await store.initialize();
    expect(store.getSnapshot().loadError).toBeTruthy();
    expect(store.getSnapshot().loadErrorKind).toBe('data');
  });
  it('합계 오버플로 입력은 저장하지 않고 기존 데이터와 이후 저장을 보존한다', async () => {
    const repository = createRepository();
    const store = new BudgetStore(repository);
    await store.setup(salary);
    await store.saveFixedExpense({ ...fixed, amount: Number.MAX_SAFE_INTEGER });
    const before = store.getSnapshot().data;
    const save = vi.spyOn(repository, 'save');
    await expect(store.saveSavingsGoal({ ...goal, monthlyContributionAmount: 1 })).rejects.toThrow(RangeError);
    expect(save).not.toHaveBeenCalled();
    expect(store.getSnapshot().data).toBe(before);
    expect(await repository.get()).toEqual(before);
    expect(store.getSnapshot().saving).toBe(false);
    await store.saveFixedExpense({ ...fixed, amount: 100 });
    expect(store.getSnapshot().data?.fixedExpenses[0]?.amount).toBe(100);
  });
  it('합계 오버플로 저장 데이터는 계산 화면 대신 로드 오류로 안내하고 덮어쓰지 않는다', async () => {
    const repository = createRepository();
    const data = { salary, fixedExpenses: [{ ...fixed, amount: Number.MAX_SAFE_INTEGER }], savingsGoals: [{ ...goal, monthlyContributionAmount: 1 }], expenses: [] };
    await repository.save(data);
    const store = new BudgetStore(repository);
    await store.initialize();
    expect(store.getSnapshot().loadErrorKind).toBe('data');
    await expect(store.setup(salary)).rejects.toThrow();
    expect(await repository.get()).toEqual(data);
  });
  it('읽을 수 없는 데이터의 삭제 실패는 오류 상태와 원본을 유지하고 재시도할 수 있다', async () => {
    const values = new Map([['test', '{broken']]);
    const removeItem = vi.fn((key: string) => { values.delete(key); }).mockImplementationOnce(() => { throw new Error('denied'); });
    const store = new BudgetStore(new LocalStorageBudgetRepository({
      getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem,
    }, 'test'));
    await store.initialize();
    await store.discardUnreadableData();
    expect(values.get('test')).toBe('{broken');
    expect(store.getSnapshot().loadError).toContain('삭제하지 못했어요');
    expect(store.getSnapshot().saving).toBe(false);
    await expect(store.setup(salary)).rejects.toThrow();
    await store.retryLoad();
    await store.discardUnreadableData();
    expect(values.has('test')).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ data: null, loadError: null, loadErrorKind: null, loading: false });
    await store.setup(salary);
    expect(store.getSnapshot().data?.salary).toEqual(salary);
  });
  it('지원하지 않는 버전도 자동 덮어쓰기 없이 다시 불러오기로 정상 데이터를 복원한다', async () => {
    const get = vi.fn<BudgetRepository['get']>()
      .mockRejectedValueOnce(new BudgetDataLoadError('unsupported-version', '지원하지 않는 버전'))
      .mockResolvedValue({ salary, fixedExpenses: [], savingsGoals: [], expenses: [] });
    const save = vi.fn();
    const store = new BudgetStore({ get, save, clear: vi.fn() });
    await store.initialize();
    await expect(store.setup(salary)).rejects.toThrow('지원하지 않는 버전');
    expect(save).not.toHaveBeenCalled();
    await store.retryLoad();
    expect(store.getSnapshot().data?.salary).toEqual(salary);
    expect(store.getSnapshot().loadError).toBeNull();
  });
});
