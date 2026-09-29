import type {
  BudgetCycle,
  DateOnly,
  Expense,
  FixedExpense,
  SalaryProfile,
  SavingsGoal,
} from '../models';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface BudgetCalculationInput {
  salary: SalaryProfile;
  fixedExpenses: FixedExpense[];
  savingsGoals: SavingsGoal[];
  expenses: Expense[];
  cycle: BudgetCycle;
}

export interface BudgetCalculationResult {
  incomeAmount: number;
  fixedExpenseAmount: number;
  savingsAmount: number;
  spentAmount: number;
  remainingAmount: number;
  deficitAmount: number;
  remainingDays: number;
  dailyAvailableAmount: number;
}

function toUtcTimestamp(value: DateOnly): number {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (match == null) {
    throw new RangeError(`날짜는 YYYY-MM-DD 형식이어야 합니다: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`유효하지 않은 날짜입니다: ${value}`);
  }

  return timestamp;
}

function assertNonNegativeInteger(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName}은 0 이상의 정수여야 합니다.`);
  }
}

function sumAmounts(items: ReadonlyArray<{ amount: number }>, fieldName: string): number {
  return items.reduce((sum, item) => {
    assertNonNegativeInteger(item.amount, fieldName);
    return sum + item.amount;
  }, 0);
}

export function countRemainingDays(today: DateOnly, nextPayday: DateOnly): number {
  const difference = (toUtcTimestamp(nextPayday) - toUtcTimestamp(today)) / MILLISECONDS_PER_DAY;

  if (!Number.isInteger(difference) || difference <= 0) {
    throw new RangeError('다음 월급날은 오늘보다 뒤여야 합니다.');
  }

  // 오늘은 포함하고 월급날은 제외합니다. 내일이 월급날이면 남은 사용일은 1일입니다.
  return difference;
}

export function calculateBudget(input: BudgetCalculationInput): BudgetCalculationResult {
  const { salary, fixedExpenses, savingsGoals, expenses, cycle } = input;
  assertNonNegativeInteger(salary.monthlyNetAmount, '월급');

  const cycleStart = toUtcTimestamp(cycle.startedOn);
  const today = toUtcTimestamp(cycle.today);

  if (cycleStart > today) {
    throw new RangeError('예산 주기 시작일은 오늘보다 뒤일 수 없습니다.');
  }

  const remainingDays = countRemainingDays(cycle.today, cycle.nextPayday);
  const activeFixedExpenses = fixedExpenses.filter((expense) => expense.isActive);
  const activeSavingsGoals = savingsGoals.filter((goal) => goal.isActive);
  const cycleExpenses = expenses.filter((expense) => {
    const occurredOn = toUtcTimestamp(expense.occurredOn);
    return occurredOn >= cycleStart && occurredOn <= today;
  });

  const fixedExpenseAmount = sumAmounts(activeFixedExpenses, '고정지출');
  const savingsAmount = activeSavingsGoals.reduce((sum, goal) => {
    assertNonNegativeInteger(goal.monthlyContributionAmount, '월 저축액');
    return sum + goal.monthlyContributionAmount;
  }, 0);
  const spentAmount = sumAmounts(cycleExpenses, '지출');
  const remainingAmount =
    salary.monthlyNetAmount - fixedExpenseAmount - savingsAmount - spentAmount;

  return {
    incomeAmount: salary.monthlyNetAmount,
    fixedExpenseAmount,
    savingsAmount,
    spentAmount,
    remainingAmount,
    deficitAmount: Math.max(0, -remainingAmount),
    remainingDays,
    dailyAvailableAmount: Math.max(0, Math.floor(remainingAmount / remainingDays)),
  };
}
