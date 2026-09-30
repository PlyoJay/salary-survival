import type { BudgetData } from '../domain/models';
import type { BudgetRepository } from './BudgetRepository';
import { assertBudgetData, isBudgetData } from '../domain/validation';

const DEFAULT_STORAGE_KEY = 'salary-survival:budget:v1';
const browserStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  // 접근이 거부되더라도 생성 시점에 던지지 않고 Repository의 비동기 오류로 전달합니다.
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
};

export class LocalStorageBudgetRepository implements BudgetRepository {
  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = browserStorage,
    private readonly storageKey = DEFAULT_STORAGE_KEY,
  ) { }

  async get(): Promise<BudgetData | null> {
    const serialized = this.storage.getItem(this.storageKey);
    if (serialized == null) return null;
    try {
      const parsed: unknown = JSON.parse(serialized);
      // Phase 1의 버전 없는 데이터도 유지합니다. 알 수 없는 버전은 사용하지 않습니다.
      const envelope = parsed as { version?: unknown; data?: unknown; } | null;
      const data = envelope && typeof envelope === 'object' && 'version' in envelope
        ? envelope.version === 1 ? envelope.data : null
        : parsed;
      return isBudgetData(data) ? data : null;
    } catch {
      return null;
    }
  }

  async save(data: BudgetData): Promise<void> {
    assertBudgetData(data);
    this.storage.setItem(this.storageKey, JSON.stringify({ version: 1, data }));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.storageKey);
  }
}
