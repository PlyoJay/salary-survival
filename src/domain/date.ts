import type { DateOnly } from './models';

export function toUtcTimestamp(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('날짜는 YYYY-MM-DD 형식이어야 해요.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError('실제로 존재하는 날짜를 입력해 주세요.');
  }
  return date.getTime();
}

export function toDateOnly(date: Date): DateOnly {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` as DateOnly;
}

// 실제 시간은 UI 경계에서만 읽고 계산 함수에는 날짜 문자열을 전달합니다.
export function getToday(): DateOnly {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` as DateOnly;
}
