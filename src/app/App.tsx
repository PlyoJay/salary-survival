import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './AppShell';
import { ExpensesPage } from '../pages/ExpensesPage';
import { HomePage } from '../pages/HomePage';
import { SettingsPage } from '../pages/SettingsPage';
import { StatisticsPage } from '../pages/StatisticsPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
