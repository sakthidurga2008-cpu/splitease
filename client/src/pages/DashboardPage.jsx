import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Plus, ReceiptText, UsersRound } from 'lucide-react';
import GroupList from '../components/GroupList.jsx';
import NewGroupDialog from '../components/NewGroupDialog.jsx';
import TransactionList from '../components/TransactionList.jsx';
import WalletPanel from '../components/WalletPanel.jsx';
import { Amount, EmptyState, ErrorBlock, LoadingBlock } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { dueLabel, firstName } from '../lib/format.js';
import { useFetch } from '../lib/useFetch.js';
import { usePageTitle } from '../lib/usePageTitle.js';

/** The page after logging in: wallet, groups and transaction history. */
export default function DashboardPage() {
  usePageTitle('Overview');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useFetch('/dashboard');
  const [creatingGroup, setCreatingGroup] = useState(false);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock error={error} onRetry={reload} />;

  const { wallet, groups, transactions, transaction_count: transactionCount, recurring_due: due } = data;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Hello, {firstName(user.user_name)}</h1>
          <p className="page-sub">Here is where things stand across your groups.</p>
        </div>
      </header>

      {due.length > 0 ? (
        <ul className="due-list" aria-label="Recurring expenses that are due">
          {due.map((item) => (
            <li key={item.rec_id}>
              <CalendarClock size={17} aria-hidden />
              <span>
                <strong>{item.description}</strong> in {item.group_name}, <Amount value={item.amount} />.{' '}
                {dueLabel(item.next_due_date)}.
              </span>
              <Link to={`/groups/${item.group_id}?tab=recurring`} className="text-button">
                Record it
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <WalletPanel wallet={wallet} />

      <div className="columns">
        <section className="panel" aria-labelledby="groups-title">
          <header className="panel-head">
            <h2 id="groups-title">Groups</h2>
            <button type="button" className="button button-quiet button-small" onClick={() => setCreatingGroup(true)}>
              <Plus size={15} aria-hidden />
              New group
            </button>
          </header>
          {groups.length === 0 ? (
            <EmptyState icon={<UsersRound size={22} aria-hidden />} title="No groups yet">
              Create a group for a trip, a flat or a project, then add the people you share costs with.
            </EmptyState>
          ) : (
            <GroupList groups={groups} />
          )}
        </section>

        <section className="panel" aria-labelledby="history-title">
          <header className="panel-head">
            <h2 id="history-title">Transaction history</h2>
            {transactionCount > transactions.length ? (
              <Link to="/activity" className="text-button">
                View all {transactionCount}
              </Link>
            ) : transactions.length > 0 ? (
              <Link to="/activity" className="text-button">
                Search and filter
              </Link>
            ) : null}
          </header>
          {transactions.length === 0 ? (
            <EmptyState icon={<ReceiptText size={22} aria-hidden />} title="Nothing here yet">
              Expenses you share and payments you make or receive will appear here.
            </EmptyState>
          ) : (
            <TransactionList transactions={transactions} me={user.user_id} />
          )}
        </section>
      </div>

      {creatingGroup ? (
        <NewGroupDialog
          me={user}
          onClose={() => setCreatingGroup(false)}
          onCreated={(group) => navigate(`/groups/${group.group_id}`)}
        />
      ) : null}
    </>
  );
}
