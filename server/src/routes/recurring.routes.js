import { Router } from 'express';
import { query } from '../config/db.js';
import { memberIds, requireMembership } from '../services/access.js';
import { SPLIT_TYPES } from '../services/splits.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { requireAmount, requireDate, requireId, requireOneOf, requireText } from '../utils/validate.js';

const router = Router();
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

// Set up an expense that repeats. It becomes a real expense each time someone records it.
router.post('/groups/:groupId/recurring', async (req, res) => {
  const groupId = requireId(req.params.groupId, 'group_id', 'a group');
  await requireMembership({ query }, groupId, req.user.user_id);

  const description = requireText(req.body.description, 'description', 'a description', 200);
  const amount = requireAmount(req.body.amount);
  const paidBy = requireId(req.body.paid_by, 'paid_by', 'who pays');
  const frequency = requireOneOf(req.body.frequency, FREQUENCIES, 'frequency', 'how often it repeats');
  const splitType = requireOneOf(req.body.split_type, SPLIT_TYPES, 'split_type', 'how to split it');
  if (splitType !== 'EQUAL') {
    throw badRequest('Recurring expenses currently support equal splits only.', 'split_type');
  }
  const nextDueDate = requireDate(req.body.next_due_date, 'next_due_date', 'the next due date');

  const members = await memberIds({ query }, groupId);
  if (!members.includes(paidBy)) throw badRequest('The payer has to be a member of the group.', 'paid_by');

  const { rows } = await query(
    `INSERT INTO recurring_expenses
            (rec_id, group_id, paid_by, description, amount, frequency, next_due_date, split_type)
     VALUES (nextval('recurring_expenses_rec_id_seq'), $1, $2, $3, $4, $5, $6, $7)
     RETURNING rec_id, group_id, paid_by, description, amount, frequency, next_due_date, split_type`,
    [groupId, paidBy, description, amount, frequency, nextDueDate, splitType],
  );
  res.status(201).json({ recurring: rows[0] });
});

// Stop a recurring expense. Expenses already recorded from it stay.
router.delete('/recurring/:recId', async (req, res) => {
  const recId = requireId(req.params.recId, 'rec_id', 'a recurring expense');
  const { rows } = await query(
    `SELECT r.rec_id, r.group_id, r.paid_by, g.created_by
       FROM recurring_expenses r
       JOIN groups g ON g.group_id = r.group_id
      WHERE r.rec_id = $1`,
    [recId],
  );
  const recurring = rows[0];
  if (!recurring) throw notFound('That recurring expense does not exist.');
  await requireMembership({ query }, recurring.group_id, req.user.user_id);
  if (recurring.paid_by !== req.user.user_id && recurring.created_by !== req.user.user_id) {
    throw forbidden('Only the payer or the person who created the group can stop this.');
  }

  await query('DELETE FROM recurring_expenses WHERE rec_id = $1', [recId]);
  res.json({ ok: true });
});

export default router;
