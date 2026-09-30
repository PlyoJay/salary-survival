import { describe, expect, it } from 'vitest';

import type { BudgetCalculationInput } from './calculateBudget';
import { calculateBudget, countRemainingDays } from './calculateBudget';

function createInput(overrides: Partial<BudgetCalculationInput> = {}): BudgetCalculationInput {
  return {
    salary: { monthlyNetAmount: 3_000_000, payday: 25 },
    fixedExpenses: [
      { id: 'rent', name: '월세', amount: 800_000, dueDay: 1, isActive: true },
      { id: 'unused', name: '해지한 구독', amount: 20_000, dueDay: 10, isActive: false },
    ],
    savingsGoals: [
      {
        id: 'emergency',
        name: '비상금',
        targetAmount: 5_000_000,
        currentAmount: 1_000_000,
        monthlyContributionAmount: 500_000,
        isActive: true,
      },
    ],
    expenses: [
      { id: 'lunch', amount: 15_000, category: 'food', occurredOn: '2026-09-29' },
      { id: 'coffee', amount: 5_000, category: 'food', occurredOn: '2026-09-28' },
      { id: 'old', amount: 100_000, category: 'other', occurredOn: '2026-08-24' },
    ],
    cycle: {
      startedOn: '2026-09-25',
      today: '2026-09-29',
      nextPayday: '2026-10-25',
    },
    ...overrides,
  };
}

describe('countRemainingDays', () => {
  it('오늘을 포함하고 다음 월급날을 제외해 남은 날짜를 센다', () => {
    expect(countRemainingDays('2026-09-29', '2026-10-25')).toBe(26);
    expect(countRemainingDays('2026-09-29', '2026-09-30')).toBe(1);
  });

  it('다음 월급날이 오늘과 같거나 이전이면 예외를 던진다', () => {
    expect(() => countRemainingDays('2026-09-29', '2026-09-29')).toThrow(RangeError);
    expect(() => countRemainingDays('2026-09-29', '2026-09-28')).toThrow(RangeError);
  });

  it('실제로 존재하지 않는 날짜를 거부한다', () => {
    expect(() => countRemainingDays('2026-02-30', '2026-03-25')).toThrow(RangeError);
  });
});

describe('calculateBudget', () => {
  it('주기 시작일 지출은 포함하고 이전 주기와 미래 지출은 제외한다', () => {
    const result = calculateBudget(createInput({ expenses: [
      { id: 'start', amount: 1000, category: 'other', occurredOn: '2026-09-25' },
      { id: 'before', amount: 2000, category: 'other', occurredOn: '2026-09-24' },
      { id: 'future', amount: 3000, category: 'other', occurredOn: '2026-09-30' },
    ] }));
    expect(result.spentAmount).toBe(1000);
  });
  it('월급에서 활성 고정지출, 저축액, 현재 주기의 지출을 뺀 뒤 일 예산을 계산한다', () => {
    expect(calculateBudget(createInput())).toEqual({
      incomeAmount: 3_000_000,
      fixedExpenseAmount: 800_000,
      savingsAmount: 500_000,
      spentAmount: 20_000,
      remainingAmount: 1_680_000,
      deficitAmount: 0,
      remainingDays: 26,
      dailyAvailableAmount: 64_615,
    });
  });

  it('비활성 고정지출과 저축목표는 예약 금액에서 제외한다', () => {
    const result = calculateBudget(
      createInput({
        fixedExpenses: [
          { id: 'inactive', name: '해지됨', amount: 200_000, dueDay: 1, isActive: false },
        ],
        savingsGoals: [
          {
            id: 'paused',
            name: '중지됨',
            targetAmount: 1_000_000,
            currentAmount: 0,
            monthlyContributionAmount: 300_000,
            isActive: false,
          },
        ],
        expenses: [],
      }),
    );

    expect(result.fixedExpenseAmount).toBe(0);
    expect(result.savingsAmount).toBe(0);
    expect(result.remainingAmount).toBe(3_000_000);
  });

  it('예산이 부족하면 일 사용 가능 금액은 0원이고 부족액을 반환한다', () => {
    const result = calculateBudget(
      createInput({
        salary: { monthlyNetAmount: 1_000_000, payday: 25 },
        fixedExpenses: [
          { id: 'rent', name: '월세', amount: 900_000, dueDay: 1, isActive: true },
        ],
        savingsGoals: [],
        expenses: [
          { id: 'expense', amount: 200_000, category: 'other', occurredOn: '2026-09-29' },
        ],
      }),
    );

    expect(result.remainingAmount).toBe(-100_000);
    expect(result.deficitAmount).toBe(100_000);
    expect(result.dailyAvailableAmount).toBe(0);
  });

  it('금액이 음수이거나 정수가 아니면 예외를 던진다', () => {
    expect(() =>
      calculateBudget(createInput({ salary: { monthlyNetAmount: -1, payday: 25 } })),
    ).toThrow(RangeError);
    expect(() =>
      calculateBudget(
        createInput({
          expenses: [
            { id: 'decimal', amount: 1.5, category: 'other', occurredOn: '2026-09-29' },
          ],
        }),
      ),
    ).toThrow(RangeError);
  });
});
