import { toUtcTimestamp } from './date';
import type { BudgetData, ExpenseCategory } from './models';

export const categoryLabels: Record<ExpenseCategory, string> = {
  food: '식비', transportation: '교통', shopping: '쇼핑', leisure: '여가', health: '건강', other: '기타',
};

export function parseAmount(value: string, label: string, positive = false): number {
  if (!/^\d+$/.test(value.trim())) throw new RangeError(`${label}은 ${positive ? '0보다 큰' : '0 이상의'} 정수로 입력해 주세요.`);
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < (positive ? 1 : 0)) {
    throw new RangeError(`${label}은 ${positive ? '0보다 큰' : '0 이상의'} 안전한 정수로 입력해 주세요.`);
  }
  return amount;
}

export function parseDay(value: string, label: string): number {
  const day = parseAmount(value, label, true);
  if (day > 31) throw new RangeError(`${label}은 1~31 사이로 입력해 주세요.`);
  return day;
}

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const amount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const day = (v: unknown) => amount(v) && v >= 1 && v <= 31;
const name = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const entity = (v: unknown): v is Record<string, unknown> => record(v) && name(v.id);
const validDate = (v: unknown) => {
  if (typeof v !== 'string') return false;
  try { toUtcTimestamp(v); return true; } catch { return false; }
};
const list = (v: unknown, check: (item: unknown) => boolean): boolean =>
  Array.isArray(v) && v.every(check) && new Set(v.map(item => item.id)).size === v.length;

export function isBudgetData(value: unknown): value is BudgetData {
  if (!record(value) || !record(value.salary)) return false;
  return amount(value.salary.monthlyNetAmount) && value.salary.monthlyNetAmount > 0 && day(value.salary.payday)
    && list(value.fixedExpenses, v => entity(v) && name(v.name) && amount(v.amount) && day(v.dueDay) && typeof v.isActive === 'boolean')
    && list(value.savingsGoals, v => entity(v) && name(v.name) && amount(v.targetAmount) && amount(v.currentAmount) && amount(v.monthlyContributionAmount) && typeof v.isActive === 'boolean')
    && list(value.expenses, v => entity(v) && amount(v.amount) && typeof v.category === 'string' && Object.hasOwn(categoryLabels, v.category) && validDate(v.occurredOn) && (v.memo === undefined || typeof v.memo === 'string'));
}

export function assertBudgetData(value: unknown): asserts value is BudgetData {
  if (!isBudgetData(value)) throw new RangeError('입력한 예산 정보를 확인해 주세요. 금액, 날짜, 이름을 올바르게 입력해야 해요.');
}
