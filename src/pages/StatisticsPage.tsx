import { demoBudgetCycle, demoBudgetData } from '../data/demoBudgetData';
import { calculateBudget } from '../domain/budget/calculateBudget';
import { formatWon } from '../shared/format';

export function StatisticsPage() {
  const budget = calculateBudget({ ...demoBudgetData, cycle: demoBudgetCycle });
  const spendRatio = Math.min(100, Math.round((budget.spentAmount / budget.incomeAmount) * 100));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">통계</p>
          <h1>이번 월급 흐름을 봐요</h1>
        </div>
      </header>

      <section className="section-card" aria-labelledby="spending-rate-title">
        <div className="section-heading section-heading--stacked">
          <div>
            <p className="section-card__overline">변동지출</p>
            <h2 id="spending-rate-title">월급의 {spendRatio}%를 썼어요</h2>
          </div>
          <strong>{formatWon(budget.spentAmount)}</strong>
        </div>
        <div className="progress-track" aria-label={`월급 대비 지출 ${spendRatio}%`}>
          <div className="progress-track__value" style={{ width: `${spendRatio}%` }} />
        </div>
      </section>

      <div className="empty-state">
        <span aria-hidden="true">···</span>
        <h2>상세 통계는 준비 중이에요</h2>
        <p>Phase 1에서는 계산 결과를 보여주는 기본 화면만 구성했어요.</p>
      </div>
    </div>
  );
}
