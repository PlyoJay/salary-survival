import type { BudgetCycle, BudgetData } from '../domain/models';

export const demoBudgetData: BudgetData = {
  salary: { monthlyNetAmount: 3_200_000, payday: 25 },
  fixedExpenses: [
    { id: 'housing', name: '주거비', amount: 850_000, dueDay: 1, isActive: true },
    { id: 'phone', name: '통신비', amount: 65_000, dueDay: 12, isActive: true },
    { id: 'subscription', name: '구독', amount: 29_900, dueDay: 15, isActive: true },
  ],
  savingsGoals: [
    {
      id: 'emergency-fund',
      name: '비상금 만들기',
      targetAmount: 5_000_000,
      currentAmount: 1_800_000,
      monthlyContributionAmount: 500_000,
      isActive: true,
    },
  ],
  expenses: [
    { id: '1', amount: 12_000, category: 'food', occurredOn: '2026-09-29', memo: '점심' },
    { id: '2', amount: 4_500, category: 'food', occurredOn: '2026-09-29', memo: '커피' },
    {
      id: '3',
      amount: 18_000,
      category: 'transportation',
      occurredOn: '2026-09-28',
      memo: '교통카드 충전',
    },
  ],
};

export const demoBudgetCycle: BudgetCycle = {
  startedOn: '2026-09-25',
  today: '2026-09-29',
  nextPayday: '2026-10-25',
};
