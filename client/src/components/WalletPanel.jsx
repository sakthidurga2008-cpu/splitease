import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';
import { money } from '../lib/format.js';
import SplitBar from './SplitBar.jsx';
import { Amount, Avatar } from './ui.jsx';

/**
 * The wallet: what the user gets back, what they owe, and the difference.
 * These figures are worked out from splits and payments; nothing is stored.
 */
export default function WalletPanel({ wallet }) {
  const { settings, update } = useSettings();
  const { net, owed_to_you: owed, you_owe: owe, balances } = wallet;

  const getBack = balances.filter((balance) => balance.net > 0);
  const toPay = balances.filter((balance) => balance.net < 0);

  let summary = 'You are settled up with everyone.';
  if (net > 0) summary = 'Overall, you get this much back.';
  if (net < 0) summary = 'Overall, you owe this much.';
  if (net === 0 && owed > 0) summary = 'What you owe and what you get back cancel out.';

  const tone = net > 0 ? 'is-good' : net < 0 ? 'is-bad' : '';

  return (
    <section className="wallet" aria-labelledby="wallet-title">
      <div className="wallet-top">
        <h2 id="wallet-title">Wallet</h2>
        <button
          type="button"
          className="text-button"
          onClick={() => update({ hideAmounts: !settings.hideAmounts })}
          aria-pressed={settings.hideAmounts}
        >
          {settings.hideAmounts ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
          {settings.hideAmounts ? 'Show amounts' : 'Hide amounts'}
        </button>
      </div>

      <p className={`wallet-figure ${tone}`}>
        <Amount value={net} />
      </p>
      <p className="wallet-summary">{summary}</p>

      <SplitBar
        size="l"
        label={`You get back ${money(owed)} and owe ${money(owe)}`}
        segments={[
          { key: 'owed', value: owed, tone: 'good' },
          { key: 'owe', value: owe, tone: 'bad' },
        ]}
      />

      <div className="wallet-sides">
        <div>
          <p className="wallet-side-head">
            <span className="dot dot-good" aria-hidden />
            You get back <Amount value={owed} className={owed > 0 ? 'is-good' : 'is-muted'} />
          </p>
          <ul className="wallet-people">
            {getBack.map((balance) => (
              <li key={`${balance.group_id}-${balance.other_id}`}>
                <Link to={`/groups/${balance.group_id}`}>
                  <Avatar id={balance.other_id} name={balance.other_name} size="s" />
                  <span className="wallet-who">
                    {balance.other_name}
                    <small>{balance.group_name}</small>
                  </span>
                  <Amount value={balance.net} />
                </Link>
              </li>
            ))}
            {getBack.length === 0 ? <li className="wallet-none">No one owes you right now.</li> : null}
          </ul>
        </div>

        <div>
          <p className="wallet-side-head">
            <span className="dot dot-bad" aria-hidden />
            You owe <Amount value={owe} className={owe > 0 ? 'is-bad' : 'is-muted'} />
          </p>
          <ul className="wallet-people">
            {toPay.map((balance) => (
              <li key={`${balance.group_id}-${balance.other_id}`}>
                <Link to={`/groups/${balance.group_id}`}>
                  <Avatar id={balance.other_id} name={balance.other_name} size="s" />
                  <span className="wallet-who">
                    {balance.other_name}
                    <small>{balance.group_name}</small>
                  </span>
                  <Amount value={balance.net} />
                </Link>
              </li>
            ))}
            {toPay.length === 0 ? <li className="wallet-none">You do not owe anyone.</li> : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
