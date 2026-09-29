import type { BudgetData } from '../domain/models';
import type { BudgetRepository } from './BudgetRepository';

const DEFAULT_STORAGE_KEY = 'salary-survival:budget:v1';

export class LocalStorageBudgetRepository implements BudgetRepository {
  constructor(
    private readonly storage: Storage,
    private readonly storageKey = DEFAULT_STORAGE_KEY,
  ) {}

  async get(): Promise<BudgetData | null> {
    const serialized = this.storage.getItem(this.storageKey);
    return serialized == null ? null : (JSON.parse(serialized) as BudgetData);
  }

  async save(data: BudgetData): Promise<void> {
    this.storage.setItem(this.storageKey, JSON.stringify(data));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.storageKey);
  }
}
