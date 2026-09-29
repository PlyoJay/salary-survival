const wonFormatter = new Intl.NumberFormat('ko-KR');

export function formatWon(amount: number): string {
  return `${wonFormatter.format(amount)}원`;
}

export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}월 ${day}일`;
}
