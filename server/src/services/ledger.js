import { toPaise } from '../utils/money.js';

// The schema has no balance or wallet column, so every balance is worked out
// from three tables:
//   SPLITS       a member owes the person who paid the expense
//   EXPENSES     tells us who that payer is, and in which group
//   SETTLEMENTS  a payment from one member to another reduces the debt

/**
 * What the given user is owed by, or owes to, each other person in each group.
 * net > 0: the other person owes the user. net < 0: the user owes them.
 */
export async function balancesForUser(db, userId) {
  const { rows } = await db.query(
    `WITH ledger AS (
       SELECT e.group_id, s.user_id AS other_id, s.share_amount AS amount
         FROM splits s
         JOIN expenses e ON e.expense_id = s.expense_id
        WHERE e.paid_by = $1 AND s.user_id <> $1
       UNION ALL
       SELECT e.group_id, e.paid_by, -s.share_amount
         FROM splits s
         JOIN expenses e ON e.expense_id = s.expense_id
        WHERE s.user_id = $1 AND e.paid_by <> $1
       UNION ALL
       SELECT group_id, paid_to, amount FROM settlements WHERE paid_by = $1
       UNION ALL
       SELECT group_id, paid_by, -amount FROM settlements WHERE paid_to = $1
     )
     SELECT l.group_id, g.group_name, l.other_id, u.user_name AS other_name,
            SUM(l.amount) AS net
       FROM ledger l
       JOIN groups g ON g.group_id = l.group_id
       JOIN users u ON u.user_id = l.other_id
      GROUP BY l.group_id, g.group_name, l.other_id, u.user_name
     HAVING SUM(l.amount) <> 0
      ORDER BY ABS(SUM(l.amount)) DESC`,
    [userId],
  );
  return rows;
}

/** Totals for the wallet: what the user gets back, what they owe, and the net. */
export function summariseWallet(balances) {
  let owedPaise = 0;
  let owePaise = 0;
  for (const row of balances) {
    const paise = toPaise(row.net);
    if (paise > 0) owedPaise += paise;
    else owePaise -= paise;
  }
  return {
    owed_to_you: owedPaise / 100,
    you_owe: owePaise / 100,
    net: (owedPaise - owePaise) / 100,
  };
}

/**
 * Every unsettled pair in a group, as "from owes to".
 * Returns [{ from_id, to_id, amount }] with amount > 0.
 */
export async function debtsInGroup(db, groupId) {
  const { rows } = await db.query(
    `WITH flows AS (
       SELECT s.user_id AS debtor, e.paid_by AS creditor, s.share_amount AS amount
         FROM splits s
         JOIN expenses e ON e.expense_id = s.expense_id
        WHERE e.group_id = $1 AND s.user_id <> e.paid_by
       UNION ALL
       -- A payment from A to B cancels debt, which is the same as B owing A.
       SELECT paid_to, paid_by, amount FROM settlements WHERE group_id = $1
     )
     SELECT LEAST(debtor, creditor) AS a,
            GREATEST(debtor, creditor) AS b,
            SUM(CASE WHEN debtor < creditor THEN amount ELSE -amount END) AS a_owes_b
       FROM flows
      GROUP BY 1, 2
     HAVING SUM(CASE WHEN debtor < creditor THEN amount ELSE -amount END) <> 0`,
    [groupId],
  );
  return rows.map((row) =>
    row.a_owes_b > 0
      ? { from_id: row.a, to_id: row.b, amount: row.a_owes_b }
      : { from_id: row.b, to_id: row.a, amount: -row.a_owes_b },
  );
}

/** How much `fromId` currently owes `toId` in a group (0 if nothing). */
export async function debtBetween(db, groupId, fromId, toId) {
  const debts = await debtsInGroup(db, groupId);
  const match = debts.find((d) => d.from_id === fromId && d.to_id === toId);
  return match ? match.amount : 0;
}

/**
 * Keeps SPLITS.status in step with the money that has actually moved between
 * two members of a group.
 *
 * The amount one member has paid the other (plus anything the other owes them
 * back) is applied to their splits oldest first:
 *   fully covered     -> PAID
 *   partly covered    -> PARTIALLY PAID
 *   not covered       -> PENDING
 */
export async function syncSplitStatuses(db, groupId, userA, userB) {
  if (userA === userB) return;

  const loadSplits = async (debtor, creditor) => {
    const { rows } = await db.query(
      `SELECT s.split_id, s.share_amount, s.status
         FROM splits s
         JOIN expenses e ON e.expense_id = s.expense_id
        WHERE e.group_id = $1 AND s.user_id = $2 AND e.paid_by = $3
        ORDER BY e.created_at, e.expense_id, s.split_id`,
      [groupId, debtor, creditor],
    );
    return rows;
  };
  const loadPaid = async (from, to) => {
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM settlements
        WHERE group_id = $1 AND paid_by = $2 AND paid_to = $3`,
      [groupId, from, to],
    );
    return toPaise(rows[0].total);
  };

  const splitsA = await loadSplits(userA, userB); // A owes B
  const splitsB = await loadSplits(userB, userA); // B owes A
  const paidAtoB = await loadPaid(userA, userB);
  const paidBtoA = await loadPaid(userB, userA);

  const gross = (splits) => splits.reduce((sum, s) => sum + toPaise(s.share_amount), 0);
  const grossA = gross(splitsA);
  const grossB = gross(splitsB);
  const clamp = (value, max) => Math.max(0, Math.min(value, max));

  const apply = async (splits, credit) => {
    let remaining = credit;
    for (const split of splits) {
      const share = toPaise(split.share_amount);
      let status = 'PENDING';
      if (share === 0 || remaining >= share) status = 'PAID';
      else if (remaining > 0) status = 'PARTIALLY PAID';
      remaining = Math.max(0, remaining - share);
      if (status !== split.status) {
        await db.query('UPDATE splits SET status = $1 WHERE split_id = $2', [status, split.split_id]);
      }
    }
  };

  await apply(splitsA, clamp(paidAtoB - paidBtoA + grossB, grossA));
  await apply(splitsB, clamp(paidBtoA - paidAtoB + grossA, grossB));
}

/**
 * Runs syncSplitStatuses for every pair of members that share an expense.
 * Returns the splits whose status changed: [{ split_id, from, to }].
 */
export async function syncAllSplitStatuses(db) {
  const before = await db.query('SELECT split_id, status FROM splits');

  const pairs = await db.query(
    `SELECT DISTINCT e.group_id,
            LEAST(s.user_id, e.paid_by) AS a,
            GREATEST(s.user_id, e.paid_by) AS b
       FROM splits s
       JOIN expenses e ON e.expense_id = s.expense_id
      WHERE s.user_id <> e.paid_by`,
  );
  for (const pair of pairs.rows) await syncSplitStatuses(db, pair.group_id, pair.a, pair.b);

  const after = await db.query('SELECT split_id, status FROM splits ORDER BY split_id');
  const previous = new Map(before.rows.map((row) => [row.split_id, row.status]));
  return after.rows
    .filter((row) => previous.get(row.split_id) !== row.status)
    .map((row) => ({ split_id: row.split_id, from: previous.get(row.split_id), to: row.status }));
}
