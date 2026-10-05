import { describe, expect, it } from 'vitest';
import { isBudgetData, parseAmount, parseDay } from './validation';
describe('입력 검증', () => {
  it.each(['', ' ', '-1', '1.2', '1e3', '1,000', 'NaN', '9007199254740992'])('금액 %s를 거부한다', value => { expect(() => parseAmount(value, '금액')).toThrow(RangeError); });
  it('0원은 지출에 허용하고 월급에는 거부한다', () => { expect(parseAmount('0', '지출')).toBe(0); expect(() => parseAmount('0', '월급', true)).toThrow(); expect(parseAmount(' 3000000 ', '월급', true)).toBe(3_000_000); });
  it.each(['0', '32', '1.5', ''])('월급일 %s를 거부한다', day => { expect(() => parseDay(day, '월급일')).toThrow(); });
  it('잘못된 카테고리와 필수 필드 누락을 거부한다', () => { expect(isBudgetData({ salary: { monthlyNetAmount: 100, payday: 1 } })).toBe(false); });
});
