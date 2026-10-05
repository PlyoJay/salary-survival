import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BudgetData } from '../domain/models';
import { BudgetDataLoadError } from './BudgetRepository';
import { LocalStorageBudgetRepository } from './LocalStorageBudgetRepository';

export function createStorageMock() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
}

const data: BudgetData = { salary: { monthlyNetAmount: 3_000_000, payday: 31 }, fixedExpenses: [], savingsGoals: [], expenses: [] };
describe('LocalStorageBudgetRepository', () => {
  let storage: ReturnType<typeof createStorageMock>;
  let repository: LocalStorageBudgetRepository;
  beforeEach(() => { storage = createStorageMock(); repository = new LocalStorageBudgetRepository(storage, 'test'); });
  it('저장 전에는 null을 반환한다', async () => { expect(await repository.get()).toBeNull(); });
  it('버전 정보를 포함해 저장하고 복원한다', async () => {
    await repository.save(data);
    expect(JSON.parse(storage.getItem('test')!)).toEqual({ version: 1, data });
    expect(await new LocalStorageBudgetRepository(storage, 'test').get()).toEqual(data);
  });
  it('clear가 저장된 데이터를 삭제한다', async () => { await repository.save(data); await repository.clear(); expect(await repository.get()).toBeNull(); });
  it('Phase 1 형식도 읽는다', async () => { storage.setItem('test', JSON.stringify(data)); expect(await repository.get()).toEqual(data); });
  it.each([
    '{broken',
    'null',
    '{}',
    '[]',
    JSON.stringify({ ...data, salary: { monthlyNetAmount: 0, payday: 25 } }),
    JSON.stringify({ ...data, expenses: [{ id: '1', amount: 100, category: 'food', occurredOn: '2026-02-30' }] }),
    JSON.stringify({ ...data, fixedExpenses: [{ id: 'x', name: '월세', amount: -1, dueDay: 1, isActive: true }] }),
  ])('손상되거나 잘못된 저장 데이터는 신규 사용자로 취급하지 않는다: %s', async serialized => {
    storage.setItem('test', serialized);
    await expect(repository.get()).rejects.toBeInstanceOf(BudgetDataLoadError);
  });
  it('지원하지 않는 저장 버전을 별도 오류로 거부한다', async () => {
    storage.setItem('test', JSON.stringify({ version: 99, data }));
    await expect(repository.get()).rejects.toMatchObject({
      name: 'BudgetDataLoadError',
      code: 'unsupported-version',
    });
  });
  it('중복 ID를 거부한다', async () => { const expense = { id: '1', amount: 0, category: 'food' as const, occurredOn: '2026-09-30' as const }; await expect(repository.save({ ...data, expenses: [expense, expense] })).rejects.toThrow(RangeError); });
  it('저장소 접근 실패는 호출자에게 전달한다', async () => {
    storage.getItem.mockImplementation(() => { throw new Error('denied'); });
    await expect(repository.get()).rejects.toThrow('denied');
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    await expect(repository.save(data)).rejects.toThrow('quota');
    storage.removeItem.mockImplementation(() => { throw new Error('denied'); });
    await expect(repository.clear()).rejects.toThrow('denied');
  });
});
