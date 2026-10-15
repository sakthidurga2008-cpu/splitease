import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UsersRound } from 'lucide-react';
import GroupList from '../components/GroupList.jsx';
import NewGroupDialog from '../components/NewGroupDialog.jsx';
import { EmptyState, ErrorBlock, LoadingBlock } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { plural } from '../lib/format.js';
import { useFetch } from '../lib/useFetch.js';
import { usePageTitle } from '../lib/usePageTitle.js';

export default function GroupsPage() {
  usePageTitle('Groups');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useFetch('/groups');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Groups</h1>
          <p className="page-sub">
            {data ? `You are in ${plural(data.groups.length, 'group')}.` : 'Everyone you share costs with.'}
          </p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setCreating(true)}>
          <Plus size={16} aria-hidden />
          New group
        </button>
      </header>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} onRetry={reload} />
      ) : data.groups.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={<UsersRound size={22} aria-hidden />}
            title="No groups yet"
            action={
              <button type="button" className="button button-primary" onClick={() => setCreating(true)}>
                New group
              </button>
            }
          >
            Create a group for a trip, a flat or a project, then add the people you share costs with.
          </EmptyState>
        </section>
      ) : (
        <section className="panel">
          <GroupList groups={data.groups} detailed />
        </section>
      )}

      {creating ? (
        <NewGroupDialog
          me={user}
          onClose={() => setCreating(false)}
          onCreated={(group) => navigate(`/groups/${group.group_id}`)}
        />
      ) : null}
    </>
  );
}
