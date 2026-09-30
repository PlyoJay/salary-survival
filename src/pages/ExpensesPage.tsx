import { Button } from '@toss/tds-mobile';
import { useRef, useState } from 'react';
import { useBudget } from '../app/BudgetProvider';
import { createId } from '../app/BudgetStore';
import type { DateOnly, Expense, ExpenseCategory } from '../domain/models';
import { toUtcTimestamp } from '../domain/date';
import { categoryLabels, parseAmount } from '../domain/validation';
import { formatShortDate, formatWon } from '../shared/format';
import { DeleteButton, Field, FormFeedback, useFormAction } from '../shared/forms';

export function ExpensesPage() {
  const { data, today, actions, saving } = useBudget();
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [date, setDate] = useState<string>(today);
  const [memo, setMemo] = useState('');
  const form = useFormAction();
  const formRef = useRef<HTMLFormElement>(null);
  if (!data) return null;
  const reset = () => { setEditing(null); setAmount(''); setCategory('food'); setDate(today); setMemo(''); };
  const edit = (expense: Expense) => {
    setEditing(expense.id); setAmount(String(expense.amount)); setCategory(expense.category); setDate(expense.occurredOn); setMemo(expense.memo ?? ''); form.clear();
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  };
  return <div className="page">
    <header className="page-header">
      <div>
        <p className="eyebrow">지출내역</p>
        <h1>쓴 돈을 기록해요</h1>
      </div>
    </header>
    <form ref={formRef} className="section-card budget-form" noValidate onSubmit={event => {
      event.preventDefault();
      void form.run(async () => {
        const expenseAmount = parseAmount(amount, '지출 금액');
        toUtcTimestamp(date);
        if (date > today) throw new Error('실제 지출은 오늘 또는 이전 날짜로 기록해 주세요.');
        await actions.saveExpense({ id: editing ?? createId(), amount: expenseAmount, category, occurredOn: date as DateOnly, memo: memo.trim() || undefined });
        reset();
      }, editing ? '지출을 수정했어요.' : '지출을 저장했어요. 홈에서 바뀐 예산을 확인해 보세요.');
    }}>
      <h2>{editing ? '지출 수정' : '지출 추가'}</h2>
      <Field variant="box" label="지출 금액 (원)" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="예: 12000" />
      <label className="select-field">카테고리<select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>
      <Field variant="box" label="지출 날짜" type="date" value={date} max={today} onChange={e => setDate(e.target.value)} />
      <Field variant="box" label="메모 (선택)" value={memo} maxLength={200} onChange={e => setMemo(e.target.value)} placeholder="예: 점심" />
      <FormFeedback {...form} />
      <div className="form-actions">
        <Button type="submit" display="block" disabled={saving || form.pending} loading={form.pending}>{editing ? '수정 저장' : '지출 저장'}</Button>{editing && <Button type="button" variant="weak" onClick={() => { reset(); form.clear(); }}>수정 취소</Button>}</div>
    </form>
    <section className="section" aria-labelledby="expense-list-title">
      <div className="section-heading">
        <h2 id="expense-list-title">전체 지출 내역</h2>
        <span>{data.expenses.length}건</span>
      </div>
      {data.expenses.length === 0 ? <div className="empty-state">
        <h2>아직 기록한 지출이 없어요</h2>
        <p>위에서 첫 지출을 기록해 보세요.</p>
      </div> : <div className="expense-list">
        {[...data.expenses].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)).map(expense => <article className="editable-row" key={expense.id}>
          <div className="expense-row">
            <div className="expense-row__category" aria-hidden="true">{categoryLabels[expense.category].slice(0, 1)}</div>
            <div className="expense-row__content">
              <strong>{expense.memo || categoryLabels[expense.category]}</strong>
              <span>{categoryLabels[expense.category]} · {expense.occurredOn.slice(0, 4)}년 {formatShortDate(expense.occurredOn)}</span>
            </div>
            <strong className="expense-row__amount">-{formatWon(expense.amount)}</strong>
          </div>
          <div className="row-actions">
            <Button size="small" variant="weak" disabled={saving} onClick={() => edit(expense)} aria-label={`${expense.memo || categoryLabels[expense.category]} 지출 수정`}>수정</Button>
            <DeleteButton label={`${expense.memo || categoryLabels[expense.category]} 지출`} disabled={saving} onDelete={() => form.run(async () => { await actions.deleteExpense(expense.id); if (editing === expense.id) reset(); }, '지출을 삭제했어요.')} />
          </div>
        </article>)}
      </div>}
    </section>
  </div>;
}
