import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { todayISO, toPaise } from '../lib/format.js';
import { Field, FormError, Modal, Segmented } from './ui.jsx';

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];
const SPLITS = [{ value: 'EQUAL', label: 'Equally' }];

/** Set up an expense that comes round again: rent, a subscription, a weekly shop. */
export default function RecurringDialog({ group, members, me, onClose, onSaved }) {
  const toast = useToast();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(me);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [nextDue, setNextDue] = useState(todayISO());
  const [splitType, setSplitType] = useState('EQUAL');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const fieldError = (name) => (error?.field === name ? error.message : null);
  useEffect(() => setError(null), [description, amount, paidBy, nextDue]);

  const submit = async (event) => {
    event.preventDefault();
    if (!description.trim()) return setError({ field: 'description', message: 'Enter what the expense is for.' });
    if (!(toPaise(amount) > 0)) return setError({ field: 'amount', message: 'Enter an amount greater than zero.' });
    if (!nextDue) return setError({ field: 'next_due_date', message: 'Choose the next due date.' });
    setBusy(true);
    setError(null);
    try {
      await api.post(`/groups/${group.group_id}/recurring`, {
        description,
        amount: toPaise(amount) / 100,
        paid_by: paidBy,
        frequency,
        next_due_date: nextDue,
        split_type: splitType,
      });
      toast.success('Recurring expense added');
      onSaved();
    } catch (problem) {
      setError(problem);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add recurring expense"
      description="It shows up as due on its date. Record it then to split it."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="recurring-form" className="button button-primary" disabled={busy}>
            {busy ? 'Adding' : 'Add recurring expense'}
          </button>
        </>
      }
    >
      <form id="recurring-form" onSubmit={submit} noValidate>
        <FormError>
          {error && !['description', 'amount', 'next_due_date'].includes(error.field) ? error.message : null}
        </FormError>

        <Field label="Description" error={fieldError('description')}>
          {(props) => (
            <input
              {...props}
              type="text"
              maxLength={200}
              autoFocus
              placeholder="Rent, wifi, weekly groceries"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
        </Field>

        <div className="form-grid">
          <Field label="Amount" error={fieldError('amount')}>
            {(props) => (
              <div className="input-prefix">
                <span aria-hidden>₹</span>
                <input
                  {...props}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            )}
          </Field>

          <Field label="Paid by">
            {(props) => (
              <select {...props} value={paidBy} onChange={(event) => setPaidBy(Number(event.target.value))}>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_id === me ? 'You' : member.user_name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <fieldset className="choices">
          <legend>Repeats</legend>
          <Segmented label="How often" value={frequency} onChange={setFrequency} options={FREQUENCIES} />
        </fieldset>

        <Field label="Next due date" error={fieldError('next_due_date')}>
          {(props) => <input {...props} type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} />}
        </Field>

        <fieldset className="choices">
          <legend>Split</legend>
          <Segmented label="How to split" value={splitType} onChange={setSplitType} options={SPLITS} />
        </fieldset>
      </form>
    </Modal>
  );
}
