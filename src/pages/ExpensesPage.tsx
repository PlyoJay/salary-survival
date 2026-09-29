import { Button } from '@toss/tds-mobile';

import { demoBudgetData } from '../data/demoBudgetData';
import type { ExpenseCategory } from '../domain/models';
import { formatShortDate, formatWon } from '../shared/format';

const categoryLabels: Record<ExpenseCategory, string> = {
  food: '식비',
  transportation: '교통',
  shopping: '쇼핑',
  leisure: '여가',
  health: '건강',
  other: '기타',
};

export function ExpensesPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">지출내역</p>
          <h1>어디에 썼는지 확인해요</h1>
        </div>
      </header>

      <section className="section-card expense-entry-placeholder">
        <div>
          <h2>지출을 빠르게 기록해요</h2>
          <p>금액 입력과 저장 기능은 다음 단계에서 연결할 예정이에요.</p>
        </div>
        <Button disabled>지출 추가</Button>
      </section>

      <section className="section" aria-labelledby="expense-list-title">
        <div className="section-heading">
          <h2 id="expense-list-title">최근 내역</h2>
          <span>{demoBudgetData.expenses.length}건</span>
        </div>
        <div className="expense-list">
          {demoBudgetData.expenses.map((expense) => (
            <article className="expense-row" key={expense.id}>
              <div className="expense-row__category" aria-hidden="true">
                {categoryLabels[expense.category].slice(0, 1)}
              </div>
              <div className="expense-row__content">
                <strong>{expense.memo ?? categoryLabels[expense.category]}</strong>
                <span>
                  {categoryLabels[expense.category]} · {formatShortDate(expense.occurredOn)}
                </span>
              </div>
              <strong className="expense-row__amount">-{formatWon(expense.amount)}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
