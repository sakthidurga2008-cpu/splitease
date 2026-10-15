import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react';
import { formatShortDate } from '../lib/format.js';
import { Amount, StatusBadge } from './ui.jsx';

function describe(tx, me) {
  if (tx.type === 'settlement') {
    const outgoing = tx.paid_by === me;
    return {
      icon: outgoing ? <ArrowUpRight size={17} aria-hidden /> : <ArrowDownLeft size={17} aria-hidden />,
      iconTone: outgoing ? 'plain' : 'good',
      title: outgoing ? `You paid ${tx.paid_to_name}` : `${tx.paid_by_name} paid you`,
      sub: (
        <>
          {tx.group_name}, by {tx.payment_type}
        </>
      ),
      label: outgoing ? 'paid' : 'received',
      amount: tx.amount,
      tone: outgoing ? '' : 'is-good',
    };
  }

  if (tx.paid_by === me) {
    return {
      icon: <ReceiptText size={17} aria-hidden />,
      iconTone: 'plain',
      title: tx.description,
      sub: (
        <>
          You paid <Amount value={tx.amount} /> in {tx.group_name}
        </>
      ),
      label: 'you lent',
      amount: tx.lent,
      tone: 'is-good',
    };
  }

  return {
    icon: <ReceiptText size={17} aria-hidden />,
    iconTone: 'plain',
    title: tx.description,
    sub: (
      <>
        {tx.paid_by_name} paid <Amount value={tx.amount} /> in {tx.group_name}
      </>
    ),
    label: 'your share',
    amount: tx.my_share,
    tone: tx.my_status === 'PAID' ? '' : 'is-bad',
    status: tx.my_status,
  };
}

/** Expenses and payments in one list, newest first. Each row opens its group. */
export default function TransactionList({ transactions, me }) {
  return (
    <ul className="rows">
      {transactions.map((tx) => {
        const view = describe(tx, me);
        return (
          <li key={`${tx.type}-${tx.id}`}>
            <Link to={`/groups/${tx.group_id}`} className="row row-link tx-row">
              <span className="tx-date">{formatShortDate(tx.date)}</span>
              <span className={`tx-icon tx-icon-${view.iconTone}`}>{view.icon}</span>
              <span className="row-main">
                <span className="row-title">
                  {view.title}
                  {view.status ? <StatusBadge status={view.status} /> : null}
                </span>
                <span className="row-sub">{view.sub}</span>
              </span>
              <span className={`balance ${view.tone}`}>
                <small>{view.label}</small>
                <Amount value={view.amount} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
