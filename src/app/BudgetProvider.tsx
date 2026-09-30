import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { BudgetStore } from './BudgetStore';
import { LocalStorageBudgetRepository } from '../repositories/LocalStorageBudgetRepository';
import type { BudgetRepository } from '../repositories/BudgetRepository';
import { getToday } from '../domain/date';
import { calculateBudgetCycle } from '../domain/budget/calculateBudgetCycle';
import { calculateBudget } from '../domain/budget/calculateBudget';

const BudgetContext = createContext<BudgetStore | null>(null);

export function BudgetProvider({ children, repository }: { children: ReactNode; repository?: BudgetRepository; }) {
  const [store] = useState(() => new BudgetStore(repository ?? new LocalStorageBudgetRepository()));
  useEffect(() => { void store.initialize(); }, [store]);
  return <BudgetContext.Provider value={store}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const store = useContext(BudgetContext);
  if (!store) throw new Error('BudgetProvider가 필요합니다.');
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [today, setToday] = useState(getToday);
  useEffect(() => {
    const refresh = () => setToday(getToday());
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    refresh();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const cycle = useMemo(() => state.data ? calculateBudgetCycle(today, state.data.salary.payday) : null, [state.data, today]);
  const budget = useMemo(() => state.data && cycle ? calculateBudget({ ...state.data, cycle }) : null, [state.data, cycle]);
  const cycleExpenses = useMemo(() => state.data && cycle
    ? state.data.expenses.filter(expense => expense.occurredOn >= cycle.startedOn && expense.occurredOn <= today)
    : [], [state.data, cycle, today]);
  return { ...state, actions: store, today, cycle, budget, cycleExpenses };
}
