import { Router } from 'express';
import { query, withTransaction } from '../config/db.js';
import { requireMembership } from '../services/access.js';
import { listGroupsForUser } from '../services/groups.js';
import { balancesForUser, debtsInGroup } from '../services/ledger.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { toPaise } from '../utils/money.js';
import { requireId, requireText } from '../utils/validate.js';

const router = Router();

// All groups the logged-in user belongs to.
router.get('/groups', async (req, res) => {
  const balances = await balancesForUser({ query }, req.user.user_id);
  const groups = await listGroupsForUser({ query }, req.user.user_id, balances);
  res.json({ groups });
});

// Create a group. The creator becomes its first member.
router.post('/groups', async (req, res) => {
  const groupName = requireText(req.body.group_name, 'group_name', 'a group name', 100);
  const extraIds = Array.isArray(req.body.member_ids) ? req.body.member_ids : [];
  const memberIds = [...new Set(extraIds.map((id) => requireId(id, 'member_ids', 'valid members')))].filter(
    (id) => id !== req.user.user_id,
  );

  const group = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO groups (group_id, group_name, created_by)
       VALUES (nextval('groups_group_id_seq'), $1, $2)
       RETURNING group_id, group_name, created_by, created_at`,
      [groupName, req.user.user_id],
    );
    const created = rows[0];

    await db.query('INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)', [
      req.user.user_id,
      created.group_id,
    ]);
    for (const memberId of memberIds) {
      const found = await db.query('SELECT 1 FROM users WHERE user_id = $1', [memberId]);
      if (!found.rows[0]) throw badRequest('One of those people is not registered.', 'member_ids');
      await db.query('INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)', [memberId, created.group_id]);
    }
    return created;
  });

  res.status(201).json({ group });
});

// Everything shown on a group's page.
router.get('/groups/:groupId', async (req, res) => {
  const groupId = requireId(req.params.groupId, 'group_id', 'a group');
  const group = await requireMembership({ query }, groupId, req.user.user_id);

  const [creator, members, expenses, settlements, recurring, debts] = await Promise.all([
    query('SELECT user_name FROM users WHERE user_id = $1', [group.created_by]),
    query(
      `SELECT u.user_id, u.user_name, ug.joined_at
         FROM user_groups ug
         JOIN users u ON u.user_id = ug.user_id
        WHERE ug.group_id = $1
        ORDER BY ug.joined_at, u.user_id`,
      [groupId],
    ),
    query(
      `SELECT e.expense_id, e.description, e.amount, e.created_at,
              e.paid_by, payer.user_name AS paid_by_name,
              e.category_id, c.category_name,
              (SELECT COUNT(*) FROM attachment a WHERE a.expense_id = e.expense_id) AS attachment_count,
              COALESCE(
                (SELECT json_agg(json_build_object(
                          'split_id', s.split_id,
                          'user_id', s.user_id,
                          'user_name', su.user_name,
                          'split_percent', s.split_percent,
                          'share_amount', s.share_amount,
                          'status', s.status
                        ) ORDER BY s.split_id)
                   FROM splits s
                   JOIN users su ON su.user_id = s.user_id
                  WHERE s.expense_id = e.expense_id),
                '[]'::json
              ) AS splits
         FROM expenses e
         JOIN users payer ON payer.user_id = e.paid_by
         JOIN categories c ON c.category_id = e.category_id
        WHERE e.group_id = $1
        ORDER BY e.created_at DESC, e.expense_id DESC`,
      [groupId],
    ),
    query(
      `SELECT st.settlement_id, st.amount, st.settlement_date,
              st.paid_by, pb.user_name AS paid_by_name,
              st.paid_to, pt.user_name AS paid_to_name,
              st.payment_id, pm.payment_type
         FROM settlements st
         JOIN users pb ON pb.user_id = st.paid_by
         JOIN users pt ON pt.user_id = st.paid_to
         JOIN payment_method pm ON pm.payment_id = st.payment_id
        WHERE st.group_id = $1
        ORDER BY st.settlement_date DESC, st.settlement_id DESC`,
      [groupId],
    ),
    query(
      `SELECT r.rec_id, r.description, r.amount, r.frequency, r.next_due_date, r.split_type,
              r.paid_by, u.user_name AS paid_by_name,
              (r.next_due_date <= CURRENT_DATE) AS is_due
         FROM recurring_expenses r
         JOIN users u ON u.user_id = r.paid_by
        WHERE r.group_id = $1
        ORDER BY r.next_due_date, r.rec_id`,
      [groupId],
    ),
    debtsInGroup({ query }, groupId),
  ]);

  // Each member's overall position in the group: positive means they get money back.
  const net = new Map();
  for (const debt of debts) {
    net.set(debt.to_id, (net.get(debt.to_id) || 0) + toPaise(debt.amount));
    net.set(debt.from_id, (net.get(debt.from_id) || 0) - toPaise(debt.amount));
  }
  const nameOf = new Map(members.rows.map((m) => [m.user_id, m.user_name]));

  res.json({
    group: {
      group_id: group.group_id,
      group_name: group.group_name,
      created_by: group.created_by,
      created_by_name: creator.rows[0]?.user_name,
      created_at: group.created_at,
      total_spent: expenses.rows.reduce((sum, e) => sum + toPaise(e.amount), 0) / 100,
    },
    members: members.rows.map((m) => ({ ...m, net: (net.get(m.user_id) || 0) / 100 })),
    debts: debts.map((d) => ({
      ...d,
      from_name: nameOf.get(d.from_id) || 'Former member',
      to_name: nameOf.get(d.to_id) || 'Former member',
    })),
    expenses: expenses.rows,
    settlements: settlements.rows,
    recurring: recurring.rows,
  });
});

// Rename a group. Only the person who created it can.
router.patch('/groups/:groupId', async (req, res) => {
  const groupId = requireId(req.params.groupId, 'group_id', 'a group');
  const group = await requireMembership({ query }, groupId, req.user.user_id);
  if (group.created_by !== req.user.user_id) {
    throw forbidden('Only the person who created the group can rename it.');
  }
  const groupName = requireText(req.body.group_name, 'group_name', 'a group name', 100);
  const { rows } = await query(
    'UPDATE groups SET group_name = $2 WHERE group_id = $1 RETURNING group_id, group_name',
    [groupId, groupName],
  );
  res.json({ group: rows[0] });
});

// Add a registered user to the group.
router.post('/groups/:groupId/members', async (req, res) => {
  const groupId = requireId(req.params.groupId, 'group_id', 'a group');
  await requireMembership({ query }, groupId, req.user.user_id);
  const userId = requireId(req.body.user_id, 'user_id', 'a person to add');

  const found = await query('SELECT user_id, user_name FROM users WHERE user_id = $1', [userId]);
  if (!found.rows[0]) throw notFound('That person is not registered.');

  await query('INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)', [userId, groupId]);
  res.status(201).json({ member: found.rows[0] });
});

// Leave a group, or (as its creator) remove someone from it.
router.delete('/groups/:groupId/members/:userId', async (req, res) => {
  const groupId = requireId(req.params.groupId, 'group_id', 'a group');
  const userId = requireId(req.params.userId, 'user_id', 'a member');
  const group = await requireMembership({ query }, groupId, req.user.user_id);

  const isSelf = userId === req.user.user_id;
  if (!isSelf && group.created_by !== req.user.user_id) {
    throw forbidden('Only the person who created the group can remove members.');
  }
  if (userId === group.created_by) {
    throw conflict('The person who created the group cannot leave it.');
  }

  // Expenses, splits, payments and recurring expenses all point at the member,
  // so a member with any history in the group has to stay.
  const { rows } = await query(
    `SELECT EXISTS (SELECT 1 FROM expenses WHERE group_id = $1 AND paid_by = $2)
         OR EXISTS (SELECT 1 FROM splits s JOIN expenses e ON e.expense_id = s.expense_id
                     WHERE e.group_id = $1 AND s.user_id = $2)
         OR EXISTS (SELECT 1 FROM settlements WHERE group_id = $1 AND (paid_by = $2 OR paid_to = $2))
         OR EXISTS (SELECT 1 FROM recurring_expenses WHERE group_id = $1 AND paid_by = $2) AS has_history`,
    [groupId, userId],
  );
  if (rows[0].has_history) {
    throw conflict(
      isSelf
        ? 'You have expenses or payments in this group, so you cannot leave it.'
        : 'This member has expenses or payments in the group, so they cannot be removed.',
    );
  }

  const removed = await query('DELETE FROM user_groups WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  if (removed.rowCount === 0) throw notFound('That person is not in the group.');
  res.json({ ok: true });
});

export default router;
