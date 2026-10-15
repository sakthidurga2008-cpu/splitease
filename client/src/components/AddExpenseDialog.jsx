import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Paperclip, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { money, toPaise } from '../lib/format.js';
import { previewSplit } from '../lib/splits.js';
import SplitBar from './SplitBar.jsx';
import { Avatar, Field, FormError, Modal, Segmented } from './ui.jsx';

const SPLIT_OPTIONS = [
  { value: 'EQUAL', label: 'Equally' },
  { value: 'EXACT', label: 'Exact amounts' },
  { value: 'PERCENTAGE', label: 'Percentages' },
];

/**
 * Add an expense and decide how it is shared.
 * `recurring` pre-fills the form when an expense is being recorded from a recurring one.
 */
export default function AddExpenseDialog({ group, members, categories, me, recurring, onClose, onSaved }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const memberIds = useMemo(() => members.map((member) => member.user_id), [members]);

  const [description, setDescription] = useState(recurring?.description ?? '');
  const [amount, setAmount] = useState(recurring ? String(recurring.amount) : '');
  const [categoryId, setCategoryId] = useState(categories[0]?.category_id ?? null);
  const [paidBy, setPaidBy] = useState(recurring?.paid_by ?? me);
  const [splitType, setSplitType] = useState(recurring?.split_type ?? 'EQUAL');
  const [included, setIncluded] = useState(() => new Set(memberIds));
  const [exact, setExact] = useState({});
  const [percent, setPercent] = useState({});
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // A message about the form goes away as soon as the form is edited.
  useEffect(() => setError(null), [description, amount, paidBy, splitType, included, exact, percent]);

  const total = toPaise(amount);
  const preview = previewSplit({ amount, splitType, payerId: paidBy, memberIds, included, exact, percent });

  const toggleIncluded = (id) =>
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The line under the list that says whether the shares add up yet.
  let tally = null;
  if (total > 0 && splitType === 'EXACT') {
    if (preview.unassigned === 0) tally = { tone: 'good', text: 'The shares add up to the full amount.' };
    else if (preview.unassigned > 0) tally = { tone: 'warn', text: `${money(preview.unassigned / 100)} left to assign.` };
    else tally = { tone: 'bad', text: `${money(-preview.unassigned / 100)} more than the expense.` };
  }
  if (total > 0 && splitType === 'PERCENTAGE') {
    if (preview.unassignedPercent === 0) tally = { tone: 'good', text: 'The percentages add up to 100%.' };
    else if (preview.unassignedPercent > 0) tally = { tone: 'warn', text: `${preview.unassignedPercent}% left to assign.` };
    else tally = { tone: 'bad', text: `${-preview.unassignedPercent}% over 100%.` };
  }

  const buildParticipants = () => {
    if (splitType === 'EQUAL') return memberIds.filter((id) => included.has(id)).map((id) => ({ user_id: id }));
    if (splitType === 'EXACT') {
      return memberIds
        .filter((id) => toPaise(exact[id]) > 0)
        .map((id) => ({ user_id: id, share_amount: toPaise(exact[id]) / 100 }));
    }
    return memberIds
      .filter((id) => Number(percent[id]) > 0)
      .map((id) => ({ user_id: id, split_percent: Number(percent[id]) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!description.trim()) return setError({ field: 'description', message: 'Enter what the expense was for.' });
    if (!(total > 0)) return setError({ field: 'amount', message: 'Enter an amount greater than zero.' });

    const participants = buildParticipants();
    if (!participants.some((person) => person.user_id !== paidBy)) {
      return setError({ field: 'participants', message: 'Split the expense with at least one other member.' });
    }
    if (splitType === 'PERCENTAGE' && preview.unassignedPercent !== 0) {
      return setError({ field: 'participants', message: 'The percentages need to add up to 100% first.' });
    }
    if (splitType === 'EXACT' && preview.unassigned !== 0) {
      return setError({ field: 'participants', message: 'The shares need to add up to the full amount first.' });
    }

    setBusy(true);
    setError(null);
    try {
      const { expense } = await api.post(`/groups/${group.group_id}/expenses`, {
        description,
        amount: total / 100,
        category_id: categoryId,
        paid_by: paidBy,
        split_type: splitType,
        participants,
        rec_id: recurring?.rec_id,
      });

      if (file) {
        const form = new FormData();
        form.append('file', file);
        try {
          await api.post(`/expenses/${expense.expense_id}/attachments`, form);
        } catch (problem) {
          toast.error(`Expense added, but the receipt was not attached. ${problem.message}`);
          onSaved();
          return;
        }
      }
      toast.success('Expense added');
      onSaved();
    } catch (problem) {
      setError(problem);
      setBusy(false);
    }
  };

  const fieldError = (name) => (error?.field === name ? error.message : null);
  const generalError = error && !['description', 'amount', 'participants'].includes(error.field) ? error.message : null;

  return (
    <Modal
      title={recurring ? 'Record recurring expense' : 'Add expense'}
      description={group.group_name}
      onClose={onClose}
      width="l"
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="expense-form" className="button button-primary" disabled={busy}>
            {busy ? 'Adding' : 'Add expense'}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} noValidate>
        <FormError>{generalError}</FormError>

        <div className="form-grid">
          <Field label="Description" error={fieldError('description')} className="span-2">
            {(props) => (
              <input
                {...props}
                type="text"
                maxLength={200}
                autoFocus
                placeholder="Dinner, cab, groceries"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            )}
          </Field>

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
          <legend>Category</legend>
          <div className="chips">
            {categories.map((category) => (
              <label key={category.category_id} className={categoryId === category.category_id ? 'chip is-on' : 'chip'}>
                <input
                  type="radio"
                  name="category"
                  checked={categoryId === category.category_id}
                  onChange={() => setCategoryId(category.category_id)}
                />
                {category.category_name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="choices">
          <legend>Split</legend>
          <Segmented label="How to split" value={splitType} onChange={setSplitType} options={SPLIT_OPTIONS} />

          <SplitBar
            label="How the expense is divided"
            segments={members.map((member, index) => ({
              key: member.user_id,
              value: preview.shares.get(member.user_id),
              tone: `member-${(member.user_id % 6) + 1}`,
              title: member.user_name,
            }))}
          />

          <ul className="share-list">
            {members.map((member) => {
              const id = member.user_id;
              const share = preview.shares.get(id) / 100;
              const name = id === me ? 'You' : member.user_name;
              return (
                <li key={id} className={splitType === 'EQUAL' && !included.has(id) ? 'is-off' : ''}>
                  {splitType === 'EQUAL' ? (
                    <label className="share-person">
                      <input type="checkbox" checked={included.has(id)} onChange={() => toggleIncluded(id)} />
                      <Avatar id={id} name={member.user_name} size="s" />
                      <span>{name}</span>
                      {id === paidBy ? <small>payer</small> : null}
                    </label>
                  ) : (
                    <span className="share-person">
                      <Avatar id={id} name={member.user_name} size="s" />
                      <span>{name}</span>
                      {id === paidBy ? <small>payer</small> : null}
                    </span>
                  )}

                  {splitType === 'EXACT' ? (
                    <div className="input-prefix input-small">
                      <span aria-hidden>₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        aria-label={`Share for ${member.user_name}`}
                        value={exact[id] ?? ''}
                        onChange={(event) => setExact((current) => ({ ...current, [id]: event.target.value }))}
                      />
                    </div>
                  ) : null}

                  {splitType === 'PERCENTAGE' ? (
                    <div className="input-suffix input-small">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0"
                        aria-label={`Percentage for ${member.user_name}`}
                        value={percent[id] ?? ''}
                        onChange={(event) => setPercent((current) => ({ ...current, [id]: event.target.value }))}
                      />
                      <span aria-hidden>%</span>
                    </div>
                  ) : null}

                  {splitType !== 'EXACT' ? <span className="share-amount amount">{money(share)}</span> : null}
                </li>
              );
            })}
          </ul>

          {tally ? (
            <p className={`tally tally-${tally.tone}`}>
              {tally.tone === 'good' ? <Check size={15} aria-hidden /> : null}
              {tally.text}
            </p>
          ) : null}
          {fieldError('participants') ? (
            <p className="field-error" role="alert">
              {fieldError('participants')}
            </p>
          ) : null}
        </fieldset>

        <div className="attach">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(event) => setFile(event.target.files[0] || null)}
          />
          {file ? (
            <span className="attach-file">
              <Paperclip size={15} aria-hidden />
              {file.name}
              <button
                type="button"
                className="icon-button icon-button-small"
                aria-label="Remove receipt"
                onClick={() => {
                  setFile(null);
                  fileInput.current.value = '';
                }}
              >
                <X size={14} aria-hidden />
              </button>
            </span>
          ) : (
            <button type="button" className="text-button" onClick={() => fileInput.current.click()}>
              <Paperclip size={15} aria-hidden />
              Attach a receipt
            </button>
          )}
          <span className="field-hint">JPG, PNG or PDF, up to 5 MB.</span>
        </div>
      </form>
    </Modal>
  );
}
