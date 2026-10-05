import { toDateOnly, toUtcTimestamp } from '../date';
import type { BudgetCycle, DateOnly } from '../models';

export function calculateBudgetCycle(today: DateOnly, payday: number): BudgetCycle {
  if (!Number.isInteger(payday) || payday < 1 || payday > 31) {
    throw new RangeError('월급일은 1~31 사이의 정수여야 해요.');
  }
  const date = new Date(toUtcTimestamp(today));
  const paydayInMonth = (offset: number): DateOnly => {
    const lastDay = new Date(date.getTime());
    lastDay.setUTCDate(1);
    lastDay.setUTCMonth(lastDay.getUTCMonth() + offset + 1);
    lastDay.setUTCDate(0);
    const day = Math.min(payday, lastDay.getUTCDate());
    lastDay.setUTCDate(day);
    return toDateOnly(lastDay);
  };
  const thisPayday = paydayInMonth(0);
  return today < thisPayday
    ? { startedOn: paydayInMonth(-1), today, nextPayday: thisPayday }
    : { startedOn: thisPayday, today, nextPayday: paydayInMonth(1) };
}
