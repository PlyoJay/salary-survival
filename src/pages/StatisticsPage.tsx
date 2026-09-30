import { useBudget } from '../app/BudgetProvider';
import { categoryLabels } from '../domain/validation';
import type { ExpenseCategory } from '../domain/models';
import { formatWon, formatShortDate } from '../shared/format';

export function StatisticsPage() {
  const { budget, cycle, cycleExpenses } = useBudget();
  if (!budget || !cycle) return null;
  const spendRatio = Math.round((budget.spentAmount / budget.incomeAmount) * 1000) / 10;
  const totals = cycleExpenses.reduce((result, expense) => {
    result[expense.category] += expense.amount;
    return result;
  }, { food: 0, transportation: 0, shopping: 0, leisure: 0, health: 0, other: 0 } as Record<ExpenseCategory, number>);
  return <div className="page">
    <header className="page-header">
      <div>
        <p className="eyebrow">통계</p>
        <h1>이번 월급 흐름을 봐요</h1>
        <p className="page-description">{formatShortDate(cycle.startedOn)}부터 오늘까지의 실제 지출이에요.</p>
      </div>
    </header>
    <section className="section-card" aria-labelledby="spending-rate-title">
      <p className="section-card__overline">총 변동지출</p>
      <h2 id="spending-rate-title">월급의 {spendRatio}%를 썼어요</h2>
      <p className="statistics-total">{formatWon(budget.spentAmount)}</p>
      <div className="progress-track" role="progressbar" aria-label="월급 대비 지출" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, spendRatio)} aria-valuetext={`${spendRatio}%`}>
        <div className="progress-track__value" style={{ width: `${Math.min(100, spendRatio)}%` }} />
      </div>
    </section>
    {cycleExpenses.length === 0 ? <div className="empty-state">
      <h2>이번 주기의 지출이 없어요</h2>
      <p>지출을 기록하면 카테고리별 합계를 볼 수 있어요.</p>
    </div> : <section className="section" aria-labelledby="category-total-title">
      <div className="section-heading">
        <h2 id="category-total-title">카테고리별 지출</h2>
        <span>{cycleExpenses.length}건</span>
      </div>
      <div className="settings-group">{(Object.keys(categoryLabels) as ExpenseCategory[]).map(category => <div key={category} className="setting-row">
        <span>{categoryLabels[category]}</span>
        <strong>{formatWon(totals[category])}</strong>
      </div>)}</div>
    </section>}
  </div>;
}
