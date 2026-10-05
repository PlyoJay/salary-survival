import { Button, Switch } from '@toss/tds-mobile';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudget } from '../app/BudgetProvider';
import { createId } from '../app/BudgetStore';
import type { FixedExpense, SavingsGoal } from '../domain/models';
import { parseAmount, parseDay } from '../domain/validation';
import { formatWon } from '../shared/format';
import { DeleteButton, Field, FormFeedback, useFormAction } from '../shared/forms';

export function SettingsPage() {
  const { data, actions, saving } = useBudget();
  const [confirmReset, setConfirmReset] = useState(false);
  const form = useFormAction();
  return <div className="page">
    <header className="page-header">
      <div>
        <p className="eyebrow">{data ? '설정' : '시작하기'}</p>
        <h1>{data ? '예산 기준을 관리해요' : '월급 정보부터 알려주세요'}</h1>{!data && <p className="page-description">월급과 월급일만 입력하면 바로 시작할 수 있어요.</p>}</div>
    </header>
    <SalaryForm key={data ? 'edit' : 'setup'} />
    {data && <>
      <FixedExpensesForm />
      <SavingsGoalsForm />
      <section className="section-card budget-form">
        <h2>데이터 관리</h2>
        <p>이 기기의 앱 저장 공간에 보관해요. 앱 데이터나 브라우저 저장 공간을 삭제하면 기록도 사라져요.</p>
        <FormFeedback {...form} />
        {confirmReset ? <div className="budget-form">
          <p>월급 설정과 모든 지출·저축 정보를 삭제할까요? 이 작업은 되돌릴 수 없어요.</p>
          <Button color="danger" disabled={saving} onClick={() => void form.run(async () => { await actions.reset(); setConfirmReset(false); }, '데이터를 초기화했어요.')}>모든 데이터 삭제</Button>
          <Button variant="weak" onClick={() => setConfirmReset(false)}>취소</Button>
        </div> : <Button variant="weak" color="danger" onClick={() => setConfirmReset(true)}>데이터 초기화</Button>}
      </section>
    </>}
  </div>;
}

function SalaryForm() {
  const { data, actions, saving } = useBudget();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(data ? String(data.salary.monthlyNetAmount) : '');
  const [payday, setPayday] = useState(data ? String(data.salary.payday) : '');
  const [savings, setSavings] = useState('');
  const form = useFormAction();
  return <form className="section-card budget-form" noValidate onSubmit={event => {
    event.preventDefault();
    void form.run(async () => {
      const salary = { monthlyNetAmount: parseAmount(amount, '월 실수령액', true), payday: parseDay(payday, '월급일') };
      if (data) await actions.updateSalary(salary);
      else { await actions.setup(salary, savings.trim() ? parseAmount(savings, '월 저축 금액') : 0); navigate('/', { replace: true }); }
    }, '월급 정보를 저장했어요.');
  }}>
    <h2>월급</h2>
    <Field variant="box" label="월 실수령액 (원)" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="예: 3000000" />
    <Field variant="box" label="월급일 (1~31일)" inputMode="numeric" value={payday} onChange={e => setPayday(e.target.value)} placeholder="예: 25" />
    <p>월급일이 없는 달에는 그 달의 마지막 날을 사용해요. 월급일 당일부터 새 예산 주기가 시작돼요.</p>
    {!data && <>
      <Field variant="box" label="월 저축 금액 (선택, 원)" inputMode="numeric" value={savings} onChange={e => setSavings(e.target.value)} placeholder="비워두면 0원" />
      <p>고정지출과 자세한 저축 목표는 시작 후 설정에서 추가할 수 있어요.</p>
    </>}
    <FormFeedback {...form} />
    <Button display="block" type="submit" disabled={saving || form.pending} loading={form.pending}>{data ? '월급 정보 저장' : '설정 완료하고 시작하기'}</Button>
  </form>;
}

function FixedExpensesForm() {
  const { data, actions, saving } = useBudget();
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [active, setActive] = useState(true);
  const form = useFormAction();
  const ref = useRef<HTMLFormElement>(null);
  if (!data) return null;
  const reset = () => { setEditing(null); setName(''); setAmount(''); setDueDay('1'); setActive(true); };
  const edit = (expense: FixedExpense) => {
    setEditing(expense); setName(expense.name); setAmount(String(expense.amount)); setDueDay(String(expense.dueDay)); setActive(expense.isActive); form.clear();
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ref.current?.querySelector('input')?.focus({ preventScroll: true });
  };
  return <section className="section" aria-labelledby="fixed-title">
    <div className="section-heading">
      <h2 id="fixed-title">고정지출</h2>
      <span>{data.fixedExpenses.length}개</span>
    </div>
    <div className="settings-group">{data.fixedExpenses.length === 0 && <p className="settings-note">등록한 고정지출이 없어요. 월세나 구독료를 추가해 보세요.</p>}{data.fixedExpenses.map(expense => <article className="managed-item" key={expense.id}>
      <div className="managed-item__heading">
        <div>
          <strong>{expense.name}</strong>
          <p>{formatWon(expense.amount)} · 매월 {expense.dueDay}일 · {expense.isActive ? '예산에 반영' : '비활성'}</p>
        </div>
        <Switch aria-label={`${expense.name} 활성`} checked={expense.isActive} disabled={saving} onChange={(_, checked) => void form.run(() => actions.saveFixedExpense({ ...expense, isActive: checked }), '활성 상태를 변경했어요.')} />
      </div>
      <div className="row-actions">
        <Button size="small" variant="weak" disabled={saving} aria-label={`${expense.name} 고정지출 수정`} onClick={() => edit(expense)}>수정</Button>
        <DeleteButton label={`${expense.name} 고정지출`} disabled={saving} onDelete={() => form.run(async () => { await actions.deleteFixedExpense(expense.id); if (editing?.id === expense.id) reset(); }, '고정지출을 삭제했어요.')} />
      </div>
    </article>)}</div>
    <form ref={ref} className="section-card budget-form" noValidate onSubmit={event => {
      event.preventDefault(); void form.run(async () => {
        if (!name.trim()) throw new Error('고정지출 이름을 입력해 주세요.');
        await actions.saveFixedExpense({ id: editing?.id ?? createId(), name: name.trim(), amount: parseAmount(amount, '고정지출 금액'), dueDay: parseDay(dueDay, '납부일'), isActive: active }); reset();
      }, editing ? '고정지출을 수정했어요.' : '고정지출을 추가했어요.');
    }}>
      <h2>{editing ? '고정지출 수정' : '고정지출 추가'}</h2>
      <Field variant="box" label="고정지출 이름" value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="예: 월세" />
      <Field variant="box" label="고정지출 금액 (원)" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
      <Field variant="box" label="납부일 (1~31일)" inputMode="numeric" value={dueDay} onChange={e => setDueDay(e.target.value)} />
      <div className="toggle-field">
        <span>예산에 반영</span>
        <Switch aria-label="고정지출 예산에 반영" checked={active} onChange={(_, checked) => setActive(checked)} />
      </div>
      <p>활성 고정지출은 납부일과 관계없이 매 주기 전체 금액을 미리 빼 두어요.</p>
      <FormFeedback {...form} />
      <Button type="submit" display="block" disabled={saving || form.pending} loading={form.pending}>{editing ? '고정지출 수정 저장' : '고정지출 추가 저장'}</Button>{editing && <Button type="button" variant="weak" onClick={() => { reset(); form.clear(); }}>수정 취소</Button>}</form>
  </section>;
}

function SavingsGoalsForm() {
  const { data, actions, saving } = useBudget();
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [monthly, setMonthly] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [active, setActive] = useState(true);
  const form = useFormAction();
  const ref = useRef<HTMLFormElement>(null);
  if (!data) return null;
  const reset = () => { setEditing(null); setName(''); setMonthly(''); setTarget(''); setCurrent(''); setActive(true); };
  const edit = (goal: SavingsGoal) => {
    setEditing(goal); setName(goal.name); setMonthly(String(goal.monthlyContributionAmount)); setTarget(String(goal.targetAmount)); setCurrent(String(goal.currentAmount)); setActive(goal.isActive); form.clear();
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ref.current?.querySelector('input')?.focus({ preventScroll: true });
  };
  return <section className="section" aria-labelledby="savings-title">
    <div className="section-heading">
      <h2 id="savings-title">저축 목표</h2>
      <span>{data.savingsGoals.length}개</span>
    </div>
    <div className="settings-group">{data.savingsGoals.length === 0 && <p className="settings-note">등록한 저축 목표가 없어요. 매달 모을 금액을 정해 보세요.</p>}{data.savingsGoals.map(goal => <article className="managed-item" key={goal.id}>
      <div className="managed-item__heading">
        <div>
          <strong>{goal.name}</strong>
          <p>매월 {formatWon(goal.monthlyContributionAmount)} · {goal.isActive ? '예산에 반영' : '비활성'}</p>
          <p>모은 돈 {formatWon(goal.currentAmount)}{goal.targetAmount > 0 && ` / 목표 ${formatWon(goal.targetAmount)}`}</p>
        </div>
        <Switch aria-label={`${goal.name} 활성`} checked={goal.isActive} disabled={saving} onChange={(_, checked) => void form.run(() => actions.saveSavingsGoal({ ...goal, isActive: checked }), '활성 상태를 변경했어요.')} />
      </div>
      <div className="row-actions">
        <Button size="small" variant="weak" disabled={saving} aria-label={`${goal.name} 저축 목표 수정`} onClick={() => edit(goal)}>수정</Button>
        <DeleteButton label={`${goal.name} 저축 목표`} disabled={saving} onDelete={() => form.run(async () => { await actions.deleteSavingsGoal(goal.id); if (editing?.id === goal.id) reset(); }, '저축 목표를 삭제했어요.')} />
      </div>
    </article>)}</div>
    <form ref={ref} className="section-card budget-form" noValidate onSubmit={event => {
      event.preventDefault(); void form.run(async () => {
        if (!name.trim()) throw new Error('저축 목표 이름을 입력해 주세요.');
        await actions.saveSavingsGoal({ id: editing?.id ?? createId(), name: name.trim(), monthlyContributionAmount: parseAmount(monthly, '월 저축 금액'), targetAmount: target.trim() ? parseAmount(target, '목표 금액') : 0, currentAmount: current.trim() ? parseAmount(current, '모은 금액') : 0, isActive: active }); reset();
      }, editing ? '저축 목표를 수정했어요.' : '저축 목표를 추가했어요.');
    }}>
      <h2>{editing ? '저축 목표 수정' : '저축 목표 추가'}</h2>
      <Field variant="box" label="저축 목표 이름" value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="예: 비상금" />
      <Field variant="box" label="월 저축 금액 (원)" inputMode="numeric" value={monthly} onChange={e => setMonthly(e.target.value)} />
      <Field variant="box" label="목표 금액 (선택, 원)" inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} placeholder="비워두면 목표 없음" />
      <Field variant="box" label="현재 모은 금액 (선택, 원)" inputMode="numeric" value={current} onChange={e => setCurrent(e.target.value)} placeholder="비워두면 0원" />
      <div className="toggle-field">
        <span>예산에 반영</span>
        <Switch aria-label="저축 예산에 반영" checked={active} onChange={(_, checked) => setActive(checked)} />
      </div>
      <p>활성 목표의 월 저축 금액을 예산에서 미리 빼 두어요. 모은 금액은 직접 갱신할 수 있어요.</p>
      <FormFeedback {...form} />
      <Button type="submit" display="block" disabled={saving || form.pending} loading={form.pending}>{editing ? '저축 목표 수정 저장' : '저축 목표 추가 저장'}</Button>{editing && <Button type="button" variant="weak" onClick={() => { reset(); form.clear(); }}>수정 취소</Button>}</form>
  </section>;
}
