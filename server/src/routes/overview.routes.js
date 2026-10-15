import { Router } from 'express';
import { query } from '../config/db.js';
import { listGroupsForUser } from '../services/groups.js';
import { balancesForUser, summariseWallet } from '../services/ledger.js';
import { listTransactions } from '../services/transactions.js';

const router = Router();

// The dashboard in one request: wallet, groups, recent history, recurring expenses that are due.
router.get('/dashboard', async (req, res) => {
  const userId = req.user.user_id;
  const balances = await balancesForUser({ query }, userId);

  const [groups, history, recurring] = await Promise.all([
    listGroupsForUser({ query }, userId, balances),
    listTransactions({ query }, userId, { limit: 8 }),
    query(
      `SELECT r.rec_id, r.group_id, g.group_name, r.description, r.amount, r.frequency,
              r.next_due_date, r.paid_by, u.user_name AS paid_by_name
         FROM recurring_expenses r
         JOIN groups g ON g.group_id = r.group_id
         JOIN users u ON u.user_id = r.paid_by
         JOIN user_groups mine ON mine.group_id = r.group_id AND mine.user_id = $1
        WHERE r.next_due_date <= CURRENT_DATE
        ORDER BY r.next_due_date, r.rec_id`,
      [userId],
    ),
  ]);

  res.json({
    wallet: { ...summariseWallet(balances), balances },
    groups,
    transactions: history.transactions,
    transaction_count: history.total,
    recurring_due: recurring.rows,
  });
});

// Full transaction history with filters.
router.get('/transactions', async (req, res) => {
  const type = ['expense', 'settlement'].includes(req.query.type) ? req.query.type : null;
  const groupId = Number.isInteger(Number(req.query.group_id)) && Number(req.query.group_id) > 0
    ? Number(req.query.group_id)
    : null;
  const search = String(req.query.q ?? '').trim().slice(0, 100) || null;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const history = await listTransactions({ query }, req.user.user_id, { type, groupId, search, limit, offset });
  res.json(history);
});

// The lookup tables used in forms.
router.get('/meta', async (req, res) => {
  const [categories, paymentMethods] = await Promise.all([
    query('SELECT category_id, category_name FROM categories ORDER BY category_id'),
    query('SELECT payment_id, payment_type FROM payment_method ORDER BY payment_id'),
  ]);
  res.json({ categories: categories.rows, payment_methods: paymentMethods.rows });
});

export default router;
