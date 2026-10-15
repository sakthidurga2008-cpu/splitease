import { useEffect, useState } from 'react';
import { ReceiptText, Search } from 'lucide-react';
import TransactionList from '../components/TransactionList.jsx';
import { EmptyState, ErrorBlock, LoadingBlock, Segmented } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { plural } from '../lib/format.js';
import { useFetch } from '../lib/useFetch.js';
import { usePageTitle } from '../lib/usePageTitle.js';

const PAGE_SIZE = 25;
const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'settlement', label: 'Payments' },
];

/** The full transaction history, with filters and search. */
export default function ActivityPage() {
  usePageTitle('Activity');
  const { user } = useAuth();
  const groups = useFetch('/groups');

  const [type, setType] = useState('all');
  const [groupId, setGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // the search text, applied after a short pause
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: null });

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const buildPath = (offset) => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
    if (type !== 'all') params.set('type', type);
    if (groupId) params.set('group_id', groupId);
    if (query) params.set('q', query);
    return `/transactions?${params}`;
  };

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    api
      .get(buildPath(0))
      .then((data) => current && setState({ items: data.transactions, total: data.total, loading: false, error: null }))
      .catch((error) => current && setState({ items: [], total: 0, loading: false, error }));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, groupId, query]);

  const loadMore = async () => {
    try {
      const data = await api.get(buildPath(state.items.length));
      setState((previous) => ({ ...previous, items: [...previous.items, ...data.transactions], total: data.total }));
    } catch (error) {
      setState((previous) => ({ ...previous, error }));
    }
  };

  const filtered = type !== 'all' || groupId || query;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p className="page-sub">Every expense you share and every payment you made or received.</p>
        </div>
      </header>

      <div className="filters">
        <Segmented label="Show" value={type} onChange={setType} options={TYPES} />
        <select aria-label="Group" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="">All groups</option>
          {(groups.data?.groups ?? []).map((group) => (
            <option key={group.group_id} value={group.group_id}>
              {group.group_name}
            </option>
          ))}
        </select>
        <div className="search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            aria-label="Search transactions"
            placeholder="Search by description, person or group"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <section className="panel">
        {state.loading ? (
          <LoadingBlock />
        ) : state.error ? (
          <ErrorBlock error={state.error} />
        ) : state.items.length === 0 ? (
          <EmptyState icon={<ReceiptText size={22} aria-hidden />} title={filtered ? 'No matches' : 'Nothing here yet'}>
            {filtered
              ? 'Try a different search, or clear the filters.'
              : 'Expenses you share and payments you make or receive will appear here.'}
          </EmptyState>
        ) : (
          <>
            <TransactionList transactions={state.items} me={user.user_id} />
            <footer className="panel-foot">
              <span>
                Showing {state.items.length} of {plural(state.total, 'transaction')}
              </span>
              {state.items.length < state.total ? (
                <button type="button" className="button button-quiet button-small" onClick={loadMore}>
                  Show more
                </button>
              ) : null}
            </footer>
          </>
        )}
      </section>
    </>
  );
}
