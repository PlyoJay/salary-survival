export type EntityId = string;
export type DateOnly = `${number}-${number}-${number}`;

export interface SalaryProfile {
  monthlyNetAmount: number;
  payday: number;
}

export interface FixedExpense {
  id: EntityId;
  name: string;
  amount: number;
  dueDay: number;
  isActive: boolean;
}

export interface SavingsGoal {
  id: EntityId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContributionAmount: number;
  isActive: boolean;
}

export type ExpenseCategory =
  | 'food'
  | 'transportation'
  | 'shopping'
  | 'leisure'
  | 'health'
  | 'other';

export interface Expense {
  id: EntityId;
  amount: number;
  category: ExpenseCategory;
  occurredOn: DateOnly;
  memo?: string;
}

export interface BudgetCycle {
  startedOn: DateOnly;
  today: DateOnly;
  nextPayday: DateOnly;
}

export interface BudgetData {
  salary: SalaryProfile;
  fixedExpenses: FixedExpense[];
  savingsGoals: SavingsGoal[];
  expenses: Expense[];
}
