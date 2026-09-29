import { demoBudgetData } from '../data/demoBudgetData';
import { formatWon } from '../shared/format';

export function SettingsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">설정</p>
          <h1>예산 기준을 관리해요</h1>
        </div>
      </header>

      <section className="settings-group" aria-labelledby="budget-settings-title">
        <h2 id="budget-settings-title">예산 정보</h2>
        <SettingRow label="월급" value={formatWon(demoBudgetData.salary.monthlyNetAmount)} />
        <SettingRow label="월급날" value={`매월 ${demoBudgetData.salary.payday}일`} />
        <SettingRow label="고정지출" value={`${demoBudgetData.fixedExpenses.length}개`} />
        <SettingRow label="저축목표" value={`${demoBudgetData.savingsGoals.length}개`} />
      </section>

      <section className="settings-group" aria-labelledby="storage-settings-title">
        <h2 id="storage-settings-title">데이터</h2>
        <SettingRow label="현재 저장 방식" value="브라우저 로컬" />
        <p className="settings-note">
          저장소 인터페이스를 분리해 두어 이후 API나 데이터베이스로 교체할 수 있어요.
        </p>
      </section>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
