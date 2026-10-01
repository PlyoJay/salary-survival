import type { BudgetData } from '../domain/models';
import { assertBudgetData, isBudgetData } from '../domain/validation';
import { BudgetDataLoadError, type BudgetRepository } from './BudgetRepository';

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

    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      throw new BudgetDataLoadError(
        'corrupted',
        '저장된 예산 데이터가 손상되어 읽을 수 없어요. 다시 불러오거나 저장 데이터를 삭제하고 새로 시작해 주세요.',
      );
    }

    const envelope = parsed as { version?: unknown; data?: unknown; } | null;
    if (envelope && typeof envelope === 'object' && 'version' in envelope) {
      if (envelope.version !== 1) {
        throw new BudgetDataLoadError(
          'unsupported-version',
          '현재 앱 버전에서 읽을 수 없는 저장 데이터예요. 앱을 업데이트한 뒤 다시 시도하거나 저장 데이터를 삭제하고 새로 시작해 주세요.',
        );
      }
      parsed = envelope.data;
    }

    if (!isBudgetData(parsed)) {
      throw new BudgetDataLoadError(
        'corrupted',
        '저장된 예산 데이터 형식이 올바르지 않아요. 다시 불러오거나 저장 데이터를 삭제하고 새로 시작해 주세요.',
      );
    }

    return parsed;
  }

  async save(data: BudgetData): Promise<void> {
    assertBudgetData(data);
    this.storage.setItem(this.storageKey, JSON.stringify({ version: 1, data }));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.storageKey);
  }
}
