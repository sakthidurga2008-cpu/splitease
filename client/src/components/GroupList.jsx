import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { firstName, initials, plural } from '../lib/format.js';
import { Amount } from './ui.jsx';

function memberLine(names) {
  const first = names.slice(0, 3).map(firstName);
  const more = names.length - first.length;
  return more > 0 ? `${first.join(', ')} and ${more} more` : first.join(', ');
}

export function GroupBalance({ value }) {
  if (value > 0) {
    return (
      <span className="balance is-good">
        <small>you get back</small>
        <Amount value={value} />
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="balance is-bad">
        <small>you owe</small>
        <Amount value={value} />
      </span>
    );
  }
  return <span className="balance is-muted">settled up</span>;
}

/** The user's groups, one per row, each linking to its own page. */
export default function GroupList({ groups, detailed = false }) {
  return (
    <ul className="rows">
      {groups.map((group) => (
        <li key={group.group_id}>
          <Link to={`/groups/${group.group_id}`} className="row row-link group-row">
            <span className={`group-tile member-${(group.group_id % 6) + 1}`} aria-hidden>
              {initials(group.group_name)}
            </span>
            <span className="row-main">
              <span className="row-title">{group.group_name}</span>
              <span className="row-sub">
                {memberLine(group.member_names)}
                {detailed ? (
                  <>
                    . {plural(group.expense_count, 'expense')}, <Amount value={group.total_spent} /> spent
                  </>
                ) : null}
              </span>
            </span>
            <GroupBalance value={group.my_balance} />
            <ChevronRight size={16} aria-hidden className="row-chevron" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
