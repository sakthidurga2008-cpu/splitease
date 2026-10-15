import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { money, toPaise } from '../lib/format.js';
import { Amount, Avatar, EmptyState, Field, FormError, Modal } from './ui.jsx';

/** Record a payment between the user and one other member of the group. */
export default function SettleUpDialog({ group, debts, paymentMethods, me, initialDebt, onClose, onSaved }) {
  const toast = useToast();
  // Only debts the user is part of can be settled from here.
  const mine = debts.filter((debt) => debt.from_id === me || debt.to_id === me);
  const keyOf = (debt) => `${debt.from_id}-${debt.to_id}`;

  const [selected, setSelected] = useState(() => keyOf(initialDebt ?? mine[0] ?? { from_id: 0, to_id: 0 }));
  const debt = mine.find((item) => keyOf(item) === selected);
  const [amount, setAmount] = useState(() => (debt ? String(debt.amount) : ''));
  const [paymentId, setPaymentId] = useState(
    () => paymentMethods.find((method) => method.payment_type === 'UPI')?.payment_id ?? paymentMethods[0]?.payment_id,
  );
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setError(null), [amount, paymentId]);

  const choose = (item) => {
    setSelected(keyOf(item));
    setAmount(String(item.amount));
    setError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const paise = toPaise(amount);
    if (!(paise > 0)) return setError({ field: 'amount', message: 'Enter an amount greater than zero.' });
    if (paise > toPaise(debt.amount)) {
      return setError({ field: 'amount', message: `Only ${money(debt.amount)} is owed. Enter that amount or less.` });
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/groups/${group.group_id}/settlements`, {
        paid_by: debt.from_id,
        paid_to: debt.to_id,
        amount: paise / 100,
        payment_id: paymentId,
      });
      toast.success('Payment recorded');
      onSaved();
    } catch (problem) {
      setError(problem);
      setBusy(false);
    }
  };

  if (mine.length === 0) {
    return (
      <Modal title="Settle up" description={group.group_name} onClose={onClose}>
        <EmptyState title="Nothing to settle">
          You do not owe anyone in this group, and no one owes you.
        </EmptyState>
      </Modal>
    );
  }

  return (
    <Modal
      title="Settle up"
      description={group.group_name}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="settle-form" className="button button-primary" disabled={busy}>
            {busy ? 'Recording' : 'Record payment'}
          </button>
        </>
      }
    >
      <form id="settle-form" onSubmit={submit} noValidate>
        <FormError>{error && error.field !== 'amount' ? error.message : null}</FormError>

        <fieldset className="choices">
          <legend>Which payment?</legend>
          <div className="option-list">
            {mine.map((item) => {
              const iPay = item.from_id === me;
              const otherId = iPay ? item.to_id : item.from_id;
              const otherName = iPay ? item.to_name : item.from_name;
              return (
                <label key={keyOf(item)} className={selected === keyOf(item) ? 'option is-on' : 'option'}>
                  <input type="radio" name="debt" checked={selected === keyOf(item)} onChange={() => choose(item)} />
                  <Avatar id={otherId} name={otherName} size="s" />
                  <span className="option-main">
                    {iPay ? `You pay ${otherName}` : `${otherName} paid you`}
                    <small>
                      {iPay ? 'You owe' : 'They owe you'} <Amount value={item.amount} />
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field
          label="Amount"
          error={error?.field === 'amount' ? error.message : null}
          hint="Pay part of it now and the rest stays open."
        >
          {(props) => (
            <div className="input-prefix">
              <span aria-hidden>₹</span>
              <input
                {...props}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          )}
        </Field>

        <fieldset className="choices">
          <legend>Paid with</legend>
          <div className="chips">
            {paymentMethods.map((method) => (
              <label key={method.payment_id} className={paymentId === method.payment_id ? 'chip is-on' : 'chip'}>
                <input
                  type="radio"
                  name="method"
                  checked={paymentId === method.payment_id}
                  onChange={() => setPaymentId(method.payment_id)}
                />
                {method.payment_type}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
