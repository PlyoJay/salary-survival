import { Button } from '@toss/tds-mobile';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ExpensesPage } from '../pages/ExpensesPage';
import { HomePage } from '../pages/HomePage';
import { SettingsPage } from '../pages/SettingsPage';
import { StatisticsPage } from '../pages/StatisticsPage';
import { AppShell } from './AppShell';
import { BudgetProvider, useBudget } from './BudgetProvider';

export function App() {
  return <BudgetProvider>
    <BudgetRoutes />
  </BudgetProvider>;
}

function BudgetRoutes() {
  const { loading, loadError, loadErrorKind, saving, actions, data } = useBudget();
  if (loading) return <div className="page empty-state" role="status">예산 정보를 불러오고 있어요…</div>;
  if (loadError) return <div className="page empty-state">
    <p role="alert">{loadError}</p>
    <Button disabled={saving} onClick={() => void actions.retryLoad()}>다시 불러오기</Button>
    {loadErrorKind === 'data' && <Button
      color="danger"
      disabled={saving}
      onClick={() => void actions.discardUnreadableData()}
    >
      저장 데이터 삭제하고 새로 시작
    </Button>}
  </div>;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={data ? <HomePage /> : <Navigate replace to="/settings" />} />
        <Route path="expenses" element={data ? <ExpensesPage /> : <Navigate replace to="/settings" />} />
        <Route path="statistics" element={data ? <StatisticsPage /> : <Navigate replace to="/settings" />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
