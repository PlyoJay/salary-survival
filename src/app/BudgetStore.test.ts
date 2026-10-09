import { describe, expect, it, vi } from 'vitest';
import { BudgetStore } from './BudgetStore';
import { LocalStorageBudgetRepository } from '../repositories/LocalStorageBudgetRepository';
import { BudgetDataLoadError, type BudgetRepository } from '../repositories/BudgetRepository';
import type { BudgetData, Expense } from '../domain/models';
import type { BudgetEvent, BudgetEventTracker } from '../analytics/budgetAnalytics';
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
    const clear = vi.spyOn(repository, 'clear');
    const store = new BudgetStore(repository);
    await store.initialize();
    expect(store.getSnapshot().loadErrorKind).toBe('data');
    await expect(store.setup(salary)).rejects.toThrow();
    expect(await repository.get()).toEqual(data);
    expect(clear).not.toHaveBeenCalled();
  });
  it.each([new TypeError('unexpected bug'), new Error('unexpected runtime error')])('%s를 데이터 손상으로 오판하거나 정상 데이터를 삭제하지 않는다', async cause => {
    const repository = createRepository();
    const data = { salary, fixedExpenses: [], savingsGoals: [], expenses: [] };
    await repository.save(data);
    const clear = vi.spyOn(repository, 'clear');
    const save = vi.spyOn(repository, 'save');
    const calculation = await import('../domain/budget/calculateBudget');
    const calculate = vi.spyOn(calculation, 'calculateBudget').mockImplementationOnce(() => { throw cause; });
    try {
      const store = new BudgetStore(repository);
      await store.initialize();
      expect(calculate).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot().loadError).toBeTruthy();
      expect(store.getSnapshot().loadErrorKind).toBe('storage');
      expect(store.getSnapshot().loadErrorKind).not.toBe('data');
      await expect(store.discardUnreadableData()).rejects.toThrow('삭제할 수 없는 상태');
      await expect(store.setup(salary)).rejects.toThrow();
      expect(clear).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
      expect(await repository.get()).toEqual(data);
      await store.retryLoad();
      expect(store.getSnapshot().data).toEqual(data);
      expect(store.getSnapshot().loadError).toBeNull();
    } finally {
      calculate.mockRestore();
    }
  });
  it('검증 과정에서 이미 분류된 데이터 로드 오류의 메시지를 유지한다', async () => {
    const repository = createRepository();
    await repository.save({ salary, fixedExpenses: [], savingsGoals: [], expenses: [] });
    const clear = vi.spyOn(repository, 'clear');
    const cause = new BudgetDataLoadError('unsupported-version', '분류된 데이터 로드 오류');
    const calculation = await import('../domain/budget/calculateBudget');
    const calculate = vi.spyOn(calculation, 'calculateBudget').mockImplementationOnce(() => { throw cause; });
    try {
      const store = new BudgetStore(repository);
      await store.initialize();
      expect(store.getSnapshot().loadErrorKind).toBe('data');
      expect(store.getSnapshot().loadError).toBe(cause.message);
      expect(clear).not.toHaveBeenCalled();
    } finally {
      calculate.mockRestore();
    }
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

describe('BudgetStore 저장 성공 이벤트', () => {
  const events: BudgetEvent[] = ['salary_setup_completed', 'expense_added', 'expense_edited', 'expense_deleted'];

  async function prepare(event: BudgetEvent, tracker: BudgetEventTracker) {
    const repository = createRepository();
    const store = new BudgetStore(repository, tracker);
    if (event !== 'salary_setup_completed') await store.setup(salary);
    if (event === 'expense_edited' || event === 'expense_deleted') await store.saveExpense(lunch);
    const action = () => {
      switch (event) {
        case 'salary_setup_completed': return store.setup(salary);
        case 'expense_added': return store.saveExpense(lunch);
        case 'expense_edited': return store.saveExpense({ ...lunch, amount: 20_000 });
        case 'expense_deleted': return store.deleteExpense(lunch.id);
      }
    };
    return { repository, store, action };
  }

  it('설정·추가·수정·삭제는 각각 성공 후 해당 이름만 1회 전달한다', async () => {
    const tracker = vi.fn<BudgetEventTracker>();
    const repository = createRepository();
    const store = new BudgetStore(repository, tracker);
    await store.setup(salary);
    await store.saveExpense(lunch);
    await store.saveExpense({ ...lunch, amount: 20_000 });
    await store.deleteExpense(lunch.id);
    expect(tracker.mock.calls).toEqual(events.map(event => [event]));
    expect((await repository.get())?.expenses).toEqual([]);
  });

  it.each(events)('%s는 Repository 저장 완료 전에는 발생하지 않는다', async event => {
    const tracker = vi.fn<BudgetEventTracker>();
    const { repository, store, action } = await prepare(event, tracker);
    tracker.mockClear();
    const before = store.getSnapshot().data;
    let complete!: () => void;
    const originalSave = repository.save.bind(repository);
    vi.spyOn(repository, 'save').mockImplementationOnce(data => new Promise<void>((resolve, reject) => {
      complete = () => { void originalSave(data).then(resolve, reject); };
    }));
    const operation = action();
    await vi.waitFor(() => expect(store.getSnapshot().saving).toBe(true));
    expect(tracker).not.toHaveBeenCalled();
    expect(store.getSnapshot().data).toBe(before);
    complete();
    await operation;
    expect(tracker).toHaveBeenCalledExactlyOnceWith(event);
    expect(store.getSnapshot().saving).toBe(false);
    expect(await repository.get()).toEqual(store.getSnapshot().data);
  });

  it.each(events)('%s 저장 실패는 원본을 보존하고 재시도 성공 때만 1회 발생한다', async event => {
    const tracker = vi.fn<BudgetEventTracker>();
    const { repository, store, action } = await prepare(event, tracker);
    tracker.mockClear();
    const before = store.getSnapshot().data;
    vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('quota'));
    await expect(action()).rejects.toThrow('저장하지 못했어요');
    expect(tracker).not.toHaveBeenCalled();
    expect(store.getSnapshot().data).toBe(before);
    expect(await repository.get()).toEqual(before);
    expect(store.getSnapshot().saving).toBe(false);
    await action();
    expect(tracker).toHaveBeenCalledExactlyOnceWith(event);
  });

  it.each<Partial<Expense>>([
    { amount: 20_000 }, { category: 'other' }, { occurredOn: '2026-09-29' }, { memo: '변경한 메모' },
  ])('기존 지출의 각 내용 변경은 수정으로 집계한다: %j', async change => {
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(createRepository(), tracker);
    await store.setup(salary);
    await store.saveExpense(lunch);
    tracker.mockClear();
    await store.saveExpense({ ...lunch, ...change });
    expect(tracker).toHaveBeenCalledExactlyOnceWith('expense_edited');
    expect(store.getSnapshot().data?.expenses).toEqual([{ ...lunch, ...change }]);
  });

  it('동일 내용·필드 순서 차이·빈 선택 메모는 이벤트를 발생시키지 않는다', async () => {
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(createRepository(), tracker);
    await store.setup(salary);
    await store.saveExpense(lunch);
    tracker.mockClear();
    await store.saveExpense({ occurredOn: lunch.occurredOn, category: lunch.category, amount: lunch.amount, id: lunch.id });
    await store.saveExpense({ ...lunch, memo: undefined });
    await store.saveExpense({ ...lunch, memo: '' });
    expect(tracker).not.toHaveBeenCalled();
    expect(store.getSnapshot().data?.expenses).toHaveLength(1);
  });

  it('큐에 같은 ID를 연속 저장해도 추가는 1회, 실제 변경만 수정으로 발생한다', async () => {
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(createRepository(), tracker);
    await store.setup(salary);
    tracker.mockClear();
    await Promise.all([
      store.saveExpense(lunch), store.saveExpense({ ...lunch }),
      store.saveExpense({ ...lunch, amount: 20_000 }), store.saveExpense({ ...lunch, amount: 20_000 }),
      store.saveExpense({ ...lunch, id: 'coffee' }),
    ]);
    expect(tracker.mock.calls).toEqual([['expense_added'], ['expense_edited'], ['expense_added']]);
    expect(store.getSnapshot().data?.expenses).toHaveLength(2);
  });

  it('존재하지 않는 지출과 연속 중복 삭제는 추가 삭제 이벤트를 발생시키지 않는다', async () => {
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(createRepository(), tracker);
    await store.setup(salary);
    await store.saveExpense(lunch);
    tracker.mockClear();
    await store.deleteExpense('missing');
    await Promise.all([store.deleteExpense(lunch.id), store.deleteExpense(lunch.id)]);
    expect(tracker).toHaveBeenCalledExactlyOnceWith('expense_deleted');
    expect(store.getSnapshot().data?.expenses).toEqual([]);
  });

  it('중복 설정·입력 오류·설정 전 지출 작업에는 이벤트를 발생시키지 않는다', async () => {
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(createRepository(), tracker);
    await expect(store.saveExpense(lunch)).rejects.toThrow();
    await expect(store.deleteExpense(lunch.id)).rejects.toThrow();
    await expect(store.setup({ monthlyNetAmount: 0, payday: 25 })).rejects.toThrow();
    await expect(store.setup(salary, -1)).rejects.toThrow();
    expect(tracker).not.toHaveBeenCalled();
    const setupResults = await Promise.allSettled([store.setup(salary), store.setup(salary)]);
    expect(setupResults.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(tracker).toHaveBeenCalledExactlyOnceWith('salary_setup_completed');
    tracker.mockClear();
    await expect(store.saveExpense({ ...lunch, amount: -1 })).rejects.toThrow();
    expect(tracker).not.toHaveBeenCalled();
  });

  it('월급 편집·고정지출·저축·초기화는 제외하고 명시적 초기화 후 설정은 새 설정으로 집계한다', async () => {
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(createRepository(), tracker);
    await store.setup(salary);
    tracker.mockClear();
    await store.updateSalary({ ...salary, payday: 31 });
    await store.saveFixedExpense(fixed);
    await store.saveFixedExpense({ ...fixed, isActive: false });
    await store.deleteFixedExpense(fixed.id);
    await store.saveSavingsGoal(goal);
    await store.saveSavingsGoal({ ...goal, isActive: false });
    await store.deleteSavingsGoal(goal.id);
    await store.reset();
    expect(tracker).not.toHaveBeenCalled();
    await store.setup(salary);
    expect(tracker).toHaveBeenCalledExactlyOnceWith('salary_setup_completed');
  });

  it.each([
    ['동기 예외', (): void => { throw new Error('SDK unavailable'); }],
    ['비동기 실패', (): Promise<void> => Promise.reject(new Error('network failed'))],
    ['미지원 환경의 무응답', (): void => undefined],
  ] as const)('Analytics %s가 저장 결과·화면 상태·후속 작업·복원을 바꾸지 않는다', async (_name, send) => {
    const tracker = vi.fn<BudgetEventTracker>(send);
    const repository = createRepository();
    const store = new BudgetStore(repository, tracker);
    const observed: boolean[] = [];
    store.subscribe(() => { observed.push(store.getSnapshot().saving); });
    await store.setup(salary);
    await store.saveExpense(lunch);
    await store.saveExpense({ ...lunch, memo: '수정' });
    expect(store.getSnapshot().data?.expenses).toEqual([{ ...lunch, memo: '수정' }]);
    await store.deleteExpense(lunch.id);
    expect(tracker.mock.calls).toEqual(events.map(event => [event]));
    expect(store.getSnapshot()).toMatchObject({ saving: false, loadError: null, data: { salary, expenses: [] } });
    expect(observed.at(-1)).toBe(false);
    const reopened = new BudgetStore(repository, tracker);
    await reopened.initialize();
    expect(reopened.getSnapshot().data).toEqual(store.getSnapshot().data);
    expect(tracker).toHaveBeenCalledTimes(4);
  });

  it('전송 Promise가 끝나지 않아도 저장과 상태 알림 및 다음 작업은 완료된다', async () => {
    const tracker = vi.fn<BudgetEventTracker>(() => new Promise<void>(() => {}));
    const repository = createRepository();
    const store = new BudgetStore(repository, tracker);
    const published: BudgetData[] = [];
    store.subscribe(() => {
      const snapshot = store.getSnapshot();
      if (!snapshot.saving && snapshot.data) published.push(snapshot.data);
    });
    await store.setup(salary);
    await store.saveExpense(lunch);
    expect(published.at(-1)?.expenses).toEqual([lunch]);
    await store.saveExpense({ ...lunch, amount: 20_000 });
    expect(published.at(-1)?.expenses[0]?.amount).toBe(20_000);
    await store.deleteExpense(lunch.id);
    expect(published.at(-1)?.expenses).toEqual([]);
    expect(store.getSnapshot().saving).toBe(false);
    expect(await repository.get()).toEqual(store.getSnapshot().data);
    expect(tracker.mock.calls).toEqual(events.map(event => [event]));
  });

  it.each(['version 1', 'Phase 1'] as const)('%s 기존 데이터는 동일 키에서 원문 변경 없이 복원하고 이벤트를 보내지 않는다', async format => {
    const data: BudgetData = { salary, fixedExpenses: [fixed], savingsGoals: [goal], expenses: [{ ...lunch, memo: '기존 기록' }] };
    const serialized = JSON.stringify(format === 'version 1' ? { version: 1, data } : data);
    const key = 'salary-survival:budget:v1';
    const values = new Map([[key, serialized]]);
    const storage = {
      getItem: (storageKey: string) => values.get(storageKey) ?? null,
      setItem: vi.fn((storageKey: string, value: string) => { values.set(storageKey, value); }),
      removeItem: vi.fn((storageKey: string) => { values.delete(storageKey); }),
    };
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(new LocalStorageBudgetRepository(storage), tracker);
    await Promise.all([store.initialize(), store.initialize()]);
    await store.retryLoad();
    expect(store.getSnapshot().data).toEqual(data);
    expect(values.get(key)).toBe(serialized);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(tracker).not.toHaveBeenCalled();

    const newExpense = { ...lunch, id: 'new-expense' };
    await store.saveExpense(newExpense);
    await store.saveExpense({ ...newExpense, amount: 4500 });
    await store.deleteExpense(newExpense.id);
    expect(values.size).toBe(1);
    expect(JSON.parse(values.get(key)!)).toEqual({ version: 1, data });
    expect(tracker.mock.calls).toEqual([['expense_added'], ['expense_edited'], ['expense_deleted']]);
    expect(storage.removeItem).not.toHaveBeenCalled();
    tracker.mockClear();
    const reopened = new BudgetStore(new LocalStorageBudgetRepository(storage), tracker);
    await reopened.initialize();
    expect(reopened.getSnapshot().data).toEqual(data);
    expect(tracker).not.toHaveBeenCalled();
  });

  it.each(['{broken', JSON.stringify({ version: 99, data: {} })])('손상·미지원 저장 데이터를 덮어쓰거나 이벤트를 발생시키지 않는다: %s', async serialized => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    const tracker = vi.fn<BudgetEventTracker>();
    const store = new BudgetStore(new LocalStorageBudgetRepository({ getItem: () => serialized, setItem, removeItem }), tracker);
    await store.initialize();
    await expect(store.setup(salary)).rejects.toThrow();
    await expect(store.saveExpense(lunch)).rejects.toThrow();
    expect(store.getSnapshot().loadErrorKind).toBe('data');
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(tracker).not.toHaveBeenCalled();
  });
});
