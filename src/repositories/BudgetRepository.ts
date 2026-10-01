import type { BudgetData } from '../domain/models';

export type BudgetDataLoadErrorCode = 'corrupted' | 'unsupported-version';

export class BudgetDataLoadError extends Error {
  constructor(
    public readonly code: BudgetDataLoadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BudgetDataLoadError';
  }
}

export interface BudgetRepository {
  get(): Promise<BudgetData | null>;
  save(data: BudgetData): Promise<void>;
  clear(): Promise<void>;
}
