import type { BudgetData, Expense, FixedExpense, SalaryProfile, SavingsGoal } from '../domain/models';
import { assertBudgetData } from '../domain/validation';
import { getToday } from '../domain/date';
import { calculateBudget } from '../domain/budget/calculateBudget';
import { calculateBudgetCycle } from '../domain/budget/calculateBudgetCycle';
import { BudgetDataLoadError, type BudgetRepository } from '../repositories/BudgetRepository';

type Collection = 'expenses' | 'fixedExpenses' | 'savingsGoals';
type CollectionItem<K extends Collection> = BudgetData[K][number];
type LoadErrorKind = 'storage' | 'data';

export interface BudgetState {
  data: BudgetData | null;
  loading: boolean;
  saving: boolean;
  loadError: string | null;
  loadErrorKind: LoadErrorKind | null;
}

// 작은 영속화 조정자: 저장 성공 후 구독자에게 알리고, 연속 변경은 순서대로 처리합니다.
export class BudgetStore {
  private state: BudgetState = {
    data: null,
    loading: true,
    saving: false,
    loadError: null,
    loadErrorKind: null,
  };
  private listeners = new Set<() => void>();
  private initialization?: Promise<void>;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly repository: BudgetRepository) { }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(update: Partial<BudgetState>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach(listener => listener());
  }

  private validateData(data: BudgetData) {
    assertBudgetData(data);
    calculateBudget({ ...data, cycle: calculateBudgetCycle(getToday(), data.salary.payday) });
  }

  initialize = (): Promise<void> => {
    this.initialization ??= this.repository.get().then(data => {
      if (data) {
        try {
          this.validateData(data);
        } catch {
          throw new BudgetDataLoadError(
            'corrupted',
            '저장된 예산 데이터 형식이 올바르지 않아요. 다시 불러오거나 저장 데이터를 삭제하고 새로 시작해 주세요.',
          );
        }
      }
      this.publish({ data, loading: false, loadError: null, loadErrorKind: null });
    }).catch(cause => {
      const dataError = cause instanceof BudgetDataLoadError;
      this.publish({
        loading: false,
        loadError: dataError
          ? cause.message
          : '저장된 데이터를 불러오지 못했어요. 저장 공간 접근을 확인한 뒤 다시 시도해 주세요.',
        loadErrorKind: dataError ? 'data' : 'storage',
      });
    });
    return this.initialization;
  };

  retryLoad = (): Promise<void> => {
    this.initialization = undefined;
    this.publish({ loading: true, loadError: null, loadErrorKind: null });
    return this.initialize();
  };

  discardUnreadableData = async (): Promise<void> => {
    if (this.state.loadErrorKind !== 'data') {
      throw new Error('삭제할 수 없는 상태예요. 먼저 다시 불러와 주세요.');
    }

    this.publish({ saving: true });
    try {
      await this.repository.clear();
      this.initialization = Promise.resolve();
      this.publish({
        data: null,
        loading: false,
        saving: false,
        loadError: null,
        loadErrorKind: null,
      });
    } catch {
      this.publish({
        saving: false,
        loadError: '저장 데이터를 삭제하지 못했어요. 저장 공간 접근을 확인한 뒤 다시 시도해 주세요.',
        loadErrorKind: 'storage',
      });
    }
  };

  private commit(transform: (data: BudgetData | null) => BudgetData | null): Promise<void> {
    const operation = this.queue.then(async () => {
      await this.initialize();
      if (this.state.loadError) throw new Error(this.state.loadError);
      this.publish({ saving: true });
      try {
        const next = transform(this.state.data);
        if (next) {
          this.validateData(next);
          try { await this.repository.save(next); } catch {
            throw new Error('저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요. 입력한 내용은 그대로 있어요.');
          }
        } else {
          try { await this.repository.clear(); } catch {
            throw new Error('초기화하지 못했어요. 저장 공간 접근을 확인한 뒤 다시 시도해 주세요.');
          }
        }
        this.publish({ data: next });
      } finally {
        this.publish({ saving: false });
      }
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private requireData(data: BudgetData | null): BudgetData {
    if (!data) throw new Error('먼저 월급 정보를 설정해 주세요.');
    return data;
  }

  setup = (salary: SalaryProfile, monthlySavings = 0): Promise<void> => this.commit(data => {
    if (data) throw new Error('이미 설정되어 있어요. 월급 편집을 이용해 주세요.');
    if (!Number.isSafeInteger(monthlySavings) || monthlySavings < 0) {
      throw new RangeError('월 저축 금액은 0 이상의 정수로 입력해 주세요.');
    }
    return {
      salary, fixedExpenses: [], expenses: [],
      savingsGoals: monthlySavings > 0 ? [{ id: createId(), name: '월 저축', targetAmount: 0, currentAmount: 0, monthlyContributionAmount: monthlySavings, isActive: true }] : [],
    };
  });
  updateSalary = (salary: SalaryProfile) => this.commit(data => ({ ...this.requireData(data), salary }));
  reset = () => this.commit(() => null);

  private upsert<K extends Collection>(key: K, item: CollectionItem<K>) {
    return this.commit(data => {
      const current = this.requireData(data);
      const items = current[key];
      const exists = items.some(entry => entry.id === item.id);
      return { ...current, [key]: exists ? items.map(entry => entry.id === item.id ? item : entry) : [...items, item] };
    });
  }
  private remove(key: Collection, id: string) {
    return this.commit(data => {
      const current = this.requireData(data);
      return { ...current, [key]: current[key].filter(item => item.id !== id) };
    });
  }
  saveExpense = (expense: Expense) => this.upsert('expenses', expense);
  deleteExpense = (id: string) => this.remove('expenses', id);
  saveFixedExpense = (expense: FixedExpense) => this.upsert('fixedExpenses', expense);
  deleteFixedExpense = (id: string) => this.remove('fixedExpenses', id);
  saveSavingsGoal = (goal: SavingsGoal) => this.upsert('savingsGoals', goal);
  deleteSavingsGoal = (id: string) => this.remove('savingsGoals', id);
}

let fallbackSequence = 0;
export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${++fallbackSequence}-${Math.random().toString(36).slice(2)}`;
}
