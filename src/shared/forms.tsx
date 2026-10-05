import { Button, TextField } from '@toss/tds-mobile';
import { useRef, useState, type ComponentProps } from 'react';

export function Field({ label, ...props }: ComponentProps<typeof TextField> & { label: string; }) {
  return <TextField {...props} label={label} aria-label={label} labelOption="sustain" />;
}

export function useFormAction() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const run = async (action: () => Promise<void>, success = '') => {
    if (locked.current) return false;
    locked.current = true;
    setError(''); setMessage(''); setPending(true);
    try { await action(); setMessage(success); return true; } catch (cause) {
      setError(cause instanceof Error ? cause.message : '처리하지 못했어요. 다시 시도해 주세요.');
      return false;
    } finally { locked.current = false; setPending(false); }
  };
  return { error, message, pending, run, clear: () => { setError(''); setMessage(''); } };
}

export function DeleteButton({ label, disabled, onDelete }: { label: string; disabled?: boolean; onDelete: () => Promise<boolean>; }) {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  return confirming ? <div className="delete-confirmation">
    <span>{label}을 삭제할까요?</span>{failed && <p role="alert" className="form-error">삭제하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.</p>}<Button size="small" color="danger" disabled={disabled} onClick={() => { void onDelete().then(success => { setFailed(!success); if (success) setConfirming(false); }); }}>삭제 확인</Button>
    <Button size="small" variant="weak" onClick={() => setConfirming(false)}>취소</Button>
  </div>
    : <Button size="small" variant="weak" color="danger" disabled={disabled} aria-label={`${label} 삭제`} onClick={() => { setFailed(false); setConfirming(true); }}>삭제</Button>;
}

export function FormFeedback({ error, message }: { error: string; message: string; }) {
  return <>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="form-success" role="status">{message}</p>}
  </>;
}
