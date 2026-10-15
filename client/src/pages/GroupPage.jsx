import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Paperclip, Pencil, Plus, Repeat, UserPlus, X } from 'lucide-react';
import AddExpenseDialog from '../components/AddExpenseDialog.jsx';
import AddMemberDialog from '../components/AddMemberDialog.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import ExpenseDialog from '../components/ExpenseDialog.jsx';
import RecurringDialog from '../components/RecurringDialog.jsx';
import SettleUpDialog from '../components/SettleUpDialog.jsx';
import { Amount, Avatar, EmptyState, ErrorBlock, LoadingBlock, StatusBadge } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import {
  dueLabel,
  formatDate,
  formatShortDate,
  FREQUENCY_LABELS,
  initials,
  plural,
  SPLIT_TYPE_LABELS,
} from '../lib/format.js';
import { useFetch } from '../lib/useFetch.js';
import { usePageTitle } from '../lib/usePageTitle.js';

const TABS = ['expenses', 'payments', 'recurring', 'members'];

/** Who owes whom in the group, with the user's own debts first. */
function Balances({ debts, me, onSettle }) {
  if (debts.length === 0) {
    return (
      <p className="settled">
        <Check size={16} aria-hidden />
        Everyone in this group is settled up.
      </p>
    );
  }
  const involvesMe = (debt) => debt.from_id === me || debt.to_id === me;
  const ordered = [...debts].sort((a, b) => Number(involvesMe(b)) - Number(involvesMe(a)) || b.amount - a.amount);

  return (
    <ul className="rows">
      {ordered.map((debt) => {
        const mine = involvesMe(debt);
        const iOwe = debt.from_id === me;
        let sentence = `${debt.from_name} owes ${debt.to_name}`;
        if (iOwe) sentence = `You owe ${debt.to_name}`;
        else if (debt.to_id === me) sentence = `${debt.from_name} owes you`;
        return (
          <li key={`${debt.from_id}-${debt.to_id}`} className="row debt-row">
            <Avatar id={iOwe ? debt.to_id : debt.from_id} name={iOwe ? debt.to_name : debt.from_name} />
            <span className="row-main">
              <span className="row-title">{sentence}</span>
            </span>
            <Amount value={debt.amount} className={mine ? (iOwe ? 'debt-amount is-bad' : 'debt-amount is-good') : 'debt-amount'} />
            {mine ? (
              <button type="button" className="button button-quiet button-small" onClick={() => onSettle(debt)}>
                Settle up
              </button>
            ) : (
              <span className="debt-spacer" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ExpenseRows({ expenses, me, onOpen }) {
  return (
    <ul className="rows">
      {expenses.map((expense) => {
        const mySplit = expense.splits.find((split) => split.user_id === me);
        const lent = expense.splits
          .filter((split) => split.user_id !== expense.paid_by)
          .reduce((sum, split) => sum + split.share_amount, 0);
        const paidByMe = expense.paid_by === me;

        return (
          <li key={expense.expense_id}>
            <button type="button" className="row row-link tx-row" onClick={() => onOpen(expense.expense_id)}>
              <span className="tx-date">{formatShortDate(expense.created_at)}</span>
              <span className="row-main">
                <span className="row-title">
                  {expense.description}
                  {expense.attachment_count > 0 ? (
                    <Paperclip size={13} aria-label="Has a receipt" className="row-clip" />
                  ) : null}
                  {mySplit && !paidByMe ? <StatusBadge status={mySplit.status} /> : null}
                </span>
                <span className="row-sub">
                  {paidByMe ? 'You' : expense.paid_by_name} paid <Amount value={expense.amount} />, {expense.category_name}
                </span>
              </span>
              {paidByMe ? (
                <span className="balance is-good">
                  <small>you lent</small>
                  <Amount value={lent} />
                </span>
              ) : mySplit ? (
                <span className={mySplit.status === 'PAID' ? 'balance' : 'balance is-bad'}>
                  <small>your share</small>
                  <Amount value={mySplit.share_amount} />
                </span>
              ) : (
                <span className="balance is-muted">not involved</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const me = user.user_id;

  const { data, error, loading, reload } = useFetch(`/groups/${groupId}`);
  const meta = useFetch('/meta');
  usePageTitle(data?.group.group_name ?? 'Group');

  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'expenses';
  const [dialog, setDialog] = useState(null); // { type, ...details }
  const [renaming, setRenaming] = useState(null); // the draft name while editing

  if (loading || meta.loading) return <LoadingBlock />;
  if (error || meta.error) {
    return (
      <>
        <Link to="/groups" className="back-link">
          <ArrowLeft size={16} aria-hidden />
          All groups
        </Link>
        <ErrorBlock error={error || meta.error} onRetry={error?.status === 403 || error?.status === 404 ? null : reload} />
      </>
    );
  }

  const { group, debts, expenses, settlements, recurring } = data;
  // Put the signed-in person first; everyone else stays in joining order.
  const members = [...data.members].sort((a, b) => Number(b.user_id === me) - Number(a.user_id === me));
  const isCreator = group.created_by === me;
  const closeDialog = () => setDialog(null);
  const saved = () => {
    closeDialog();
    reload();
  };

  const act = async (work, message) => {
    try {
      await work();
      if (message) toast.success(message);
      await reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  const saveName = async (event) => {
    event.preventDefault();
    if (!renaming.trim()) return;
    await act(() => api.patch(`/groups/${groupId}`, { group_name: renaming }), 'Group renamed');
    setRenaming(null);
  };

  const removeMember = async (member) => {
    const leaving = member.user_id === me;
    try {
      await api.delete(`/groups/${groupId}/members/${member.user_id}`);
      toast.success(leaving ? 'You left the group' : `${member.user_name} removed`);
      if (leaving) navigate('/groups');
      else reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  const counts = {
    expenses: expenses.length,
    payments: settlements.length,
    recurring: recurring.length,
    members: members.length,
  };
  const labels = { expenses: 'Expenses', payments: 'Payments', recurring: 'Recurring', members: 'Members' };

  return (
    <>
      <Link to="/groups" className="back-link">
        <ArrowLeft size={16} aria-hidden />
        All groups
      </Link>

      <header className="page-head group-head">
        <span className={`group-tile group-tile-l member-${(group.group_id % 6) + 1}`} aria-hidden>
          {initials(group.group_name)}
        </span>
        <div className="group-title">
          {renaming === null ? (
            <h1>
              {group.group_name}
              {isCreator ? (
                <button
                  type="button"
                  className="icon-button icon-button-small"
                  aria-label="Rename group"
                  onClick={() => setRenaming(group.group_name)}
                >
                  <Pencil size={15} aria-hidden />
                </button>
              ) : null}
            </h1>
          ) : (
            <form className="rename" onSubmit={saveName}>
              <input
                type="text"
                aria-label="Group name"
                maxLength={100}
                autoFocus
                value={renaming}
                onChange={(event) => setRenaming(event.target.value)}
              />
              <button type="submit" className="button button-primary button-small">
                Save
              </button>
              <button type="button" className="icon-button" aria-label="Cancel" onClick={() => setRenaming(null)}>
                <X size={16} aria-hidden />
              </button>
            </form>
          )}
          <p className="page-sub">
            Created by {isCreator ? 'you' : group.created_by_name} on {formatDate(group.created_at)}.{' '}
            {plural(members.length, 'member')}, <Amount value={group.total_spent} /> spent.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="button button-quiet" onClick={() => setDialog({ type: 'settle' })}>
            Settle up
          </button>
          <button type="button" className="button button-primary" onClick={() => setDialog({ type: 'expense' })}>
            <Plus size={16} aria-hidden />
            Add expense
          </button>
        </div>
      </header>

      <section className="panel" aria-labelledby="balances-title">
        <header className="panel-head">
          <h2 id="balances-title">Balances</h2>
        </header>
        <Balances debts={debts} me={me} onSettle={(debt) => setDialog({ type: 'settle', debt })} />
      </section>

      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Group details">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`tab-${name}`}
              aria-selected={tab === name}
              aria-controls="tab-panel"
              className={tab === name ? 'tab is-on' : 'tab'}
              onClick={() => setSearchParams(name === 'expenses' ? {} : { tab: name }, { replace: true })}
            >
              {labels[name]}
              <span className="tab-count">{counts[name]}</span>
            </button>
          ))}
        </div>

        <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'expenses' ? (
            expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                action={
                  <button type="button" className="button button-primary" onClick={() => setDialog({ type: 'expense' })}>
                    Add expense
                  </button>
                }
              >
                {members.length < 2
                  ? 'Add a member first, then add the first thing you paid for together.'
                  : 'Add the first thing someone paid for, and choose how to split it.'}
              </EmptyState>
            ) : (
              <ExpenseRows expenses={expenses} me={me} onOpen={(id) => setDialog({ type: 'detail', id })} />
            )
          ) : null}

          {tab === 'payments' ? (
            settlements.length === 0 ? (
              <EmptyState title="No payments yet">
                When someone pays back what they owe, record it with Settle up and it appears here.
              </EmptyState>
            ) : (
              <ul className="rows">
                {settlements.map((payment) => {
                  const mine = payment.paid_by === me || payment.paid_to === me;
                  let sentence = `${payment.paid_by_name} paid ${payment.paid_to_name}`;
                  if (payment.paid_by === me) sentence = `You paid ${payment.paid_to_name}`;
                  else if (payment.paid_to === me) sentence = `${payment.paid_by_name} paid you`;
                  return (
                    <li key={payment.settlement_id} className="row tx-row">
                      <span className="tx-date">{formatShortDate(payment.settlement_date)}</span>
                      <span className="row-main">
                        <span className="row-title">{sentence}</span>
                        <span className="row-sub">By {payment.payment_type}</span>
                      </span>
                      <Amount value={payment.amount} className={payment.paid_to === me ? 'debt-amount is-good' : 'debt-amount'} />
                      {mine ? (
                        <ConfirmButton
                          label="Remove"
                          confirmLabel="Remove payment?"
                          onConfirm={() => act(() => api.delete(`/settlements/${payment.settlement_id}`), 'Payment removed')}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}

          {tab === 'recurring' ? (
            <>
              {recurring.length === 0 ? (
                <EmptyState icon={<Repeat size={22} aria-hidden />} title="No recurring expenses">
                  Add rent, a subscription or anything else that comes round again.
                </EmptyState>
              ) : (
                <ul className="rows">
                  {recurring.map((item) => (
                    <li key={item.rec_id} className="row recurring-row">
                      <span className="row-main">
                        <span className="row-title">{item.description}</span>
                        <span className="row-sub">
                          <Amount value={item.amount} /> {FREQUENCY_LABELS[item.frequency].toLowerCase()}, paid by{' '}
                          {item.paid_by === me ? 'you' : item.paid_by_name}. Split: {SPLIT_TYPE_LABELS[item.split_type].toLowerCase()}.
                        </span>
                      </span>
                      <span className={item.is_due ? 'badge badge-warn' : 'badge badge-plain'}>
                        {dueLabel(item.next_due_date)}
                      </span>
                      <button
                        type="button"
                        className="button button-quiet button-small"
                        onClick={() => setDialog({ type: 'expense', recurring: item })}
                      >
                        Record now
                      </button>
                      {item.paid_by === me || isCreator ? (
                        <ConfirmButton
                          label="Stop"
                          confirmLabel="Stop repeating?"
                          onConfirm={() => act(() => api.delete(`/recurring/${item.rec_id}`), 'Recurring expense stopped')}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <footer className="panel-foot">
                <span>Recording one adds it as an expense and moves its due date on.</span>
                <button type="button" className="button button-quiet button-small" onClick={() => setDialog({ type: 'recurring' })}>
                  <Plus size={15} aria-hidden />
                  Add recurring expense
                </button>
              </footer>
            </>
          ) : null}

          {tab === 'members' ? (
            <>
              <ul className="rows">
                {members.map((member) => {
                  const isMe = member.user_id === me;
                  const isGroupCreator = member.user_id === group.created_by;
                  return (
                    <li key={member.user_id} className="row member-row">
                      <Avatar id={member.user_id} name={member.user_name} />
                      <span className="row-main">
                        <span className="row-title">
                          {member.user_name}
                          {isMe ? <span className="badge badge-plain">you</span> : null}
                          {isGroupCreator ? <span className="badge badge-plain">created the group</span> : null}
                        </span>
                        <span className="row-sub">Joined {formatDate(member.joined_at)}</span>
                      </span>
                      {member.net > 0 ? (
                        <span className="balance is-good">
                          <small>gets back</small>
                          <Amount value={member.net} />
                        </span>
                      ) : member.net < 0 ? (
                        <span className="balance is-bad">
                          <small>owes</small>
                          <Amount value={member.net} />
                        </span>
                      ) : (
                        <span className="balance is-muted">settled up</span>
                      )}
                      {!isGroupCreator && (isMe || isCreator) ? (
                        <ConfirmButton
                          label={isMe ? 'Leave' : 'Remove'}
                          confirmLabel={isMe ? 'Leave group?' : 'Remove member?'}
                          onConfirm={() => removeMember(member)}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <footer className="panel-foot">
                <span>Anyone in the group can add members.</span>
                <button type="button" className="button button-quiet button-small" onClick={() => setDialog({ type: 'member' })}>
                  <UserPlus size={15} aria-hidden />
                  Add member
                </button>
              </footer>
            </>
          ) : null}
        </div>
      </section>

      {dialog?.type === 'expense' ? (
        <AddExpenseDialog
          group={group}
          members={members}
          categories={meta.data.categories}
          me={me}
          recurring={dialog.recurring}
          onClose={closeDialog}
          onSaved={() => {
            saved();
            if (dialog.recurring) setSearchParams({}, { replace: true });
          }}
        />
      ) : null}
      {dialog?.type === 'settle' ? (
        <SettleUpDialog
          group={group}
          debts={debts}
          paymentMethods={meta.data.payment_methods}
          me={me}
          initialDebt={dialog.debt}
          onClose={closeDialog}
          onSaved={saved}
        />
      ) : null}
      {dialog?.type === 'detail' ? (
        <ExpenseDialog expenseId={dialog.id} me={me} onClose={closeDialog} onChanged={reload} />
      ) : null}
      {dialog?.type === 'recurring' ? (
        <RecurringDialog group={group} members={members} me={me} onClose={closeDialog} onSaved={saved} />
      ) : null}
      {dialog?.type === 'member' ? (
        <AddMemberDialog group={group} members={members} onClose={closeDialog} onSaved={saved} />
      ) : null}
    </>
  );
}
