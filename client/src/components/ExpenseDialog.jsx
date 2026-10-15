import { useRef, useState } from 'react';
import { ExternalLink, Paperclip, Trash2, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { fileNameFromUrl, formatDate } from '../lib/format.js';
import { useFetch } from '../lib/useFetch.js';
import SplitBar from './SplitBar.jsx';
import { Amount, Avatar, ErrorBlock, LoadingBlock, Modal, StatusBadge } from './ui.jsx';

/** One expense in full: who paid, each person's share and its status, and any receipts. */
export default function ExpenseDialog({ expenseId, me, onClose, onChanged }) {
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(`/expenses/${expenseId}`);
  const fileInput = useRef(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading || error) {
    return (
      <Modal title="Expense" onClose={onClose}>
        {loading ? <LoadingBlock /> : <ErrorBlock error={error} onRetry={reload} />}
      </Modal>
    );
  }

  const { expense, splits, attachments } = data;
  const nameOf = (id, name) => (id === me ? 'You' : name);

  // Everyone's part of the bill, the payer's own share first.
  const shares = [
    { key: 'payer', user_id: expense.paid_by, user_name: expense.paid_by_name, amount: expense.payer_share, payer: true },
    ...splits
      .filter((split) => split.user_id !== expense.paid_by)
      .map((split) => ({
        key: split.split_id,
        user_id: split.user_id,
        user_name: split.user_name,
        amount: split.share_amount,
        percent: split.split_percent,
        status: split.status,
      })),
  ].filter((share) => share.amount > 0 || !share.payer);

  const upload = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      await api.post(`/expenses/${expenseId}/attachments`, form);
      toast.success('Receipt attached');
      await reload();
      onChanged();
    } catch (problem) {
      toast.error(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const removeAttachment = async (attachment) => {
    try {
      await api.delete(`/attachments/${attachment.attachment_id}`);
      toast.success('Receipt removed');
      await reload();
      onChanged();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  const deleteExpense = async () => {
    setBusy(true);
    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success('Expense deleted');
      onChanged();
      onClose();
    } catch (problem) {
      toast.error(problem.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={expense.description} description={`${expense.group_name}, ${formatDate(expense.created_at)}`} onClose={onClose}>
      <div className="expense-head">
        <p className="expense-total">
          <Amount value={expense.amount} />
        </p>
        <p className="expense-meta">
          Paid by {expense.paid_by === me ? 'you' : expense.paid_by_name}
          <span className="badge badge-plain">{expense.category_name}</span>
        </p>
      </div>

      <SplitBar
        label="How the expense is divided"
        segments={shares.map((share) => ({
          key: share.key,
          value: share.amount,
          tone: `member-${(share.user_id % 6) + 1}`,
          title: share.user_name,
        }))}
      />

      <ul className="share-list share-list-read">
        {shares.map((share) => (
          <li key={share.key}>
            <span className="share-person">
              <Avatar id={share.user_id} name={share.user_name} size="s" />
              <span>{nameOf(share.user_id, share.user_name)}</span>
              {share.payer ? <small>payer</small> : null}
            </span>
            {share.status ? <StatusBadge status={share.status} /> : null}
            <Amount value={share.amount} className="share-amount" />
          </li>
        ))}
      </ul>

      <section className="receipts">
        <div className="receipts-head">
          <h3>Receipts</h3>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={upload}
          />
          <button type="button" className="text-button" disabled={busy} onClick={() => fileInput.current.click()}>
            <Paperclip size={15} aria-hidden />
            Attach a receipt
          </button>
        </div>
        {attachments.length === 0 ? (
          <p className="field-hint">No receipts attached.</p>
        ) : (
          <ul className="receipt-list">
            {attachments.map((attachment) => (
              <li key={attachment.attachment_id}>
                <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                  <Paperclip size={15} aria-hidden />
                  <span>{fileNameFromUrl(attachment.file_url)}</span>
                  <ExternalLink size={13} aria-hidden />
                </a>
                <small>
                  {nameOf(attachment.uploaded_by, attachment.uploaded_by_name)}, {formatDate(attachment.uploaded_at)}
                </small>
                {attachment.uploaded_by === me || expense.paid_by === me ? (
                  <button
                    type="button"
                    className="icon-button icon-button-small"
                    aria-label={`Remove ${fileNameFromUrl(attachment.file_url)}`}
                    onClick={() => removeAttachment(attachment)}
                  >
                    <X size={14} aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {expense.can_delete ? (
        <div className="danger-zone">
          {confirmingDelete ? (
            <>
              <p>Delete this expense and its splits? Balances in the group will change.</p>
              <div className="danger-actions">
                <button type="button" className="button button-quiet" onClick={() => setConfirmingDelete(false)}>
                  Keep it
                </button>
                <button type="button" className="button button-danger" disabled={busy} onClick={deleteExpense}>
                  Delete expense
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="text-button text-button-danger" onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={15} aria-hidden />
              Delete expense
            </button>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
