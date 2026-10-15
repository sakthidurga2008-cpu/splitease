import { Router } from 'express';
import { query, withTransaction } from '../config/db.js';
import { memberIds, requireMembership } from '../services/access.js';
import { debtBetween, syncSplitStatuses } from '../services/ledger.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { formatRupees, toPaise } from '../utils/money.js';
import { requireAmount, requireId } from '../utils/validate.js';

const router = Router();

// Record a payment from one group member to another.
router.post('/groups/:groupId/settlements', async (req, res) => {
  const groupId = requireId(req.params.groupId, 'group_id', 'a group');
  await requireMembership({ query }, groupId, req.user.user_id);

  const paidBy = requireId(req.body.paid_by, 'paid_by', 'who paid');
  const paidTo = requireId(req.body.paid_to, 'paid_to', 'who was paid');
  const amount = requireAmount(req.body.amount);
  const paymentId = requireId(req.body.payment_id, 'payment_id', 'a payment method');

  if (paidBy === paidTo) throw badRequest('Choose two different people.', 'paid_to');
  if (paidBy !== req.user.user_id && paidTo !== req.user.user_id) {
    throw forbidden('You can only record payments you made or received.');
  }

  const settlement = await withTransaction(async (db) => {
    const members = await memberIds(db, groupId);
    if (!members.includes(paidBy) || !members.includes(paidTo)) {
      throw badRequest('Both people have to be members of the group.', 'paid_to');
    }

    const method = await db.query('SELECT 1 FROM payment_method WHERE payment_id = $1', [paymentId]);
    if (!method.rows[0]) throw badRequest('Choose a payment method.', 'payment_id');

    const owed = await debtBetween(db, groupId, paidBy, paidTo);
    if (owed <= 0) throw badRequest('There is nothing to settle between these two people.', 'amount');
    if (toPaise(amount) > toPaise(owed)) {
      throw badRequest(`Only ${formatRupees(owed)} is owed. Enter that amount or less.`, 'amount');
    }

    const { rows } = await db.query(
      `INSERT INTO settlements (settlement_id, group_id, paid_by, paid_to, amount, payment_id)
       VALUES (nextval('settlements_settlement_id_seq'), $1, $2, $3, $4, $5)
       RETURNING settlement_id, group_id, paid_by, paid_to, amount, settlement_date, payment_id`,
      [groupId, paidBy, paidTo, amount, paymentId],
    );

    await syncSplitStatuses(db, groupId, paidBy, paidTo);
    return rows[0];
  });

  res.status(201).json({ settlement });
});

// Undo a payment that was recorded by mistake.
router.delete('/settlements/:settlementId', async (req, res) => {
  const settlementId = requireId(req.params.settlementId, 'settlement_id', 'a payment');
  const { rows } = await query(
    'SELECT settlement_id, group_id, paid_by, paid_to FROM settlements WHERE settlement_id = $1',
    [settlementId],
  );
  const settlement = rows[0];
  if (!settlement) throw notFound('That payment does not exist.');
  if (settlement.paid_by !== req.user.user_id && settlement.paid_to !== req.user.user_id) {
    throw forbidden('Only the two people involved can remove this payment.');
  }

  await withTransaction(async (db) => {
    await db.query('DELETE FROM settlements WHERE settlement_id = $1', [settlementId]);
    await syncSplitStatuses(db, settlement.group_id, settlement.paid_by, settlement.paid_to);
  });
  res.json({ ok: true });
});

export default router;
