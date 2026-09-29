import type { BudgetData } from '../domain/models';

export interface BudgetRepository {
  get(): Promise<BudgetData | null>;
  save(data: BudgetData): Promise<void>;
  clear(): Promise<void>;
}
