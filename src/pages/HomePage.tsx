import { Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';

import { demoBudgetCycle, demoBudgetData } from '../data/demoBudgetData';
import { calculateBudget } from '../domain/budget/calculateBudget';
import { formatShortDate, formatWon } from '../shared/format';

export function HomePage() {
  const navigate = useNavigate();
  const budget = calculateBudget({ ...demoBudgetData, cycle: demoBudgetCycle });

  return (
    <div className="page home-page">
      <header className="page-header page-header--home">
        <div>
          <p className="eyebrow">월급생존기</p>
          <h1>오늘은 이만큼 써도 괜찮아요</h1>
        </div>
        <span className="demo-badge">예시 데이터</span>
      </header>

      <section className="daily-budget-card" aria-labelledby="daily-budget-title">
        <p id="daily-budget-title" className="daily-budget-card__label">
          오늘 사용 가능
        </p>
        <strong className="daily-budget-card__amount">{formatWon(budget.dailyAvailableAmount)}</strong>
        <p className="daily-budget-card__caption">
          {formatShortDate(demoBudgetCycle.nextPayday)}까지 {budget.remainingDays}일 남았어요
        </p>
      </section>

      <section className="section-card quick-action-card" aria-labelledby="quick-action-title">
        <div>
          <p className="section-card__overline">빠른 기록</p>
          <h2 id="quick-action-title">방금 쓴 돈이 있나요?</h2>
          <p>지출내역에서 바로 기록할 수 있어요.</p>
        </div>
        <Button onClick={() => navigate('/expenses')}>지출 기록하기</Button>
      </section>

      <section className="section" aria-labelledby="budget-summary-title">
        <div className="section-heading">
          <h2 id="budget-summary-title">이번 월급 사용 현황</h2>
          <span>{formatWon(budget.remainingAmount)} 남음</span>
        </div>
        <div className="summary-grid">
          <SummaryItem label="월급" value={budget.incomeAmount} />
          <SummaryItem label="고정지출" value={budget.fixedExpenseAmount} />
          <SummaryItem label="저축" value={budget.savingsAmount} />
          <SummaryItem label="쓴 돈" value={budget.spentAmount} />
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{formatWon(value)}</strong>
    </div>
  );
}
