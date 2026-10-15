import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { query, withTransaction } from '../config/db.js';
import { memberIds, requireMembership } from '../services/access.js';
import { syncSplitStatuses } from '../services/ledger.js';
import { computeShares, owedShares, SPLIT_TYPES } from '../services/splits.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { toPaise } from '../utils/money.js';
import { requireAmount, requireId, requireOneOf, requireText } from '../utils/validate.js';

const router = Router();

// Receipts are saved in server/uploads and their address is stored in ATTACHMENT.file_url.
const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadsDir,
    filename: (req, file, done) => done(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, done) => {
    if (ALLOWED_TYPES[file.mimetype]) done(null, true);
    else done(badRequest('Choose a JPG, PNG, WebP or PDF file.', 'file'));
  },
});

// Removes an uploaded receipt from disk. Links to other sites are left alone.
async function removeStoredFile(fileUrl) {
  if (!fileUrl.startsWith('/uploads/')) return;
  await fs.rm(path.join(env.uploadsDir, path.basename(fileUrl)), { force: true });
}

async function loadExpense(db, expenseId) {
  const { rows } = await db.query(
    `SELECT e.expense_id, e.group_id, g.group_name, g.created_by AS group_created_by,
            e.description, e.amount, e.created_at,
            e.paid_by, payer.user_name AS paid_by_name,
            e.category_id, c.category_name
       FROM expenses e
       JOIN groups g ON g.group_id = e.group_id
       JOIN users payer ON payer.user_id = e.paid_by
       JOIN categories c ON c.category_id = e.category_id
      WHERE e.expense_id = $1`,
    [expenseId],
  );
  if (!rows[0]) throw notFound('That expense does not exist.');
  return rows[0];
}

// Add an expense to a group and split it between members.
router.post('/groups/:groupId/expenses', async (req, res) => {
  const groupId = requireId(req.params.groupId, 'group_id', 'a group');
  await requireMembership({ query }, groupId, req.user.user_id);

  const description = requireText(req.body.description, 'description', 'a description', 200);
  const amount = requireAmount(req.body.amount);
  const categoryId = requireId(req.body.category_id, 'category_id', 'a category');
  const paidBy = requireId(req.body.paid_by, 'paid_by', 'who paid');
  const splitType = requireOneOf(req.body.split_type, SPLIT_TYPES, 'split_type', 'how to split the expense');
  const recId = req.body.rec_id ? requireId(req.body.rec_id, 'rec_id', 'a recurring expense') : null;

  const expense = await withTransaction(async (db) => {
    const members = await memberIds(db, groupId);
    if (!members.includes(paidBy)) throw badRequest('The payer has to be a member of the group.', 'paid_by');

    const shares = computeShares({ amount, splitType, payerId: paidBy, participants: req.body.participants });
    if (shares.some((share) => !members.includes(share.user_id))) {
      throw badRequest('Everyone sharing the expense has to be a member of the group.', 'participants');
    }
    const owed = owedShares(shares, paidBy);

    const inserted = await db.query(
      `INSERT INTO expenses (expense_id, group_id, paid_by, description, category_id, amount)
       VALUES (nextval('expenses_expense_id_seq'), $1, $2, $3, $4, $5)
       RETURNING expense_id, group_id, paid_by, description, category_id, created_at, amount`,
      [groupId, paidBy, description, categoryId, amount],
    );
    const created = inserted.rows[0];

    for (const share of owed) {
      await db.query(
        `INSERT INTO splits (split_id, expense_id, user_id, split_percent, share_amount)
         VALUES (nextval('splits_split_id_seq'), $1, $2, $3, $4)`,
        [created.expense_id, share.user_id, share.split_percent, share.share_amount],
      );
    }

    // If this expense came from a recurring one, move its due date forward.
    if (recId) {
      const moved = await db.query(
        `UPDATE recurring_expenses
            SET next_due_date = (next_due_date + CASE frequency
                                   WHEN 'DAILY'   THEN INTERVAL '1 day'
                                   WHEN 'WEEKLY'  THEN INTERVAL '7 days'
                                   WHEN 'MONTHLY' THEN INTERVAL '1 month'
                                   ELSE INTERVAL '1 year'
                                 END)::date
          WHERE rec_id = $1 AND group_id = $2`,
        [recId, groupId],
      );
      if (moved.rowCount === 0) throw badRequest('That recurring expense is not in this group.', 'rec_id');
    }

    // A new debt can change which earlier splits count as paid.
    for (const share of owed) await syncSplitStatuses(db, groupId, share.user_id, paidBy);
    return created;
  });

  res.status(201).json({ expense });
});

// One expense with its splits and receipts.
router.get('/expenses/:expenseId', async (req, res) => {
  const expenseId = requireId(req.params.expenseId, 'expense_id', 'an expense');
  const expense = await loadExpense({ query }, expenseId);
  await requireMembership({ query }, expense.group_id, req.user.user_id);

  const [splits, attachments] = await Promise.all([
    query(
      `SELECT s.split_id, s.user_id, u.user_name, s.split_percent, s.share_amount, s.status
         FROM splits s
         JOIN users u ON u.user_id = s.user_id
        WHERE s.expense_id = $1
        ORDER BY s.split_id`,
      [expenseId],
    ),
    query(
      `SELECT a.attachment_id, a.file_url, a.uploaded_at, a.uploaded_by, u.user_name AS uploaded_by_name
         FROM attachment a
         JOIN users u ON u.user_id = a.uploaded_by
        WHERE a.expense_id = $1
        ORDER BY a.attachment_id`,
      [expenseId],
    ),
  ]);

  const owedPaise = splits.rows
    .filter((s) => s.user_id !== expense.paid_by)
    .reduce((sum, s) => sum + toPaise(s.share_amount), 0);

  res.json({
    expense: {
      ...expense,
      payer_share: Math.max(0, toPaise(expense.amount) - owedPaise) / 100,
      can_delete: expense.paid_by === req.user.user_id || expense.group_created_by === req.user.user_id,
    },
    splits: splits.rows,
    attachments: attachments.rows,
  });
});

// Delete an expense along with its splits and receipts.
router.delete('/expenses/:expenseId', async (req, res) => {
  const expenseId = requireId(req.params.expenseId, 'expense_id', 'an expense');
  const expense = await loadExpense({ query }, expenseId);
  await requireMembership({ query }, expense.group_id, req.user.user_id);
  if (expense.paid_by !== req.user.user_id && expense.group_created_by !== req.user.user_id) {
    throw forbidden('Only the payer or the person who created the group can delete this expense.');
  }

  const files = await withTransaction(async (db) => {
    // Settlements are recorded against the running debt between two members,
    // not against one particular expense. Once a payment exists between the
    // payer and one of this expense's debtors, deleting this expense would
    // leave the payment behind and turn it into a reverse debt.
    const settled = await db.query(
      `SELECT 1
         FROM settlements st
        WHERE st.group_id = $1
          AND ((st.paid_by = $2 AND st.paid_to IN (
                SELECT s.user_id FROM splits s WHERE s.expense_id = $3
              ))
            OR (st.paid_to = $2 AND st.paid_by IN (
                SELECT s.user_id FROM splits s WHERE s.expense_id = $3
              )))
        LIMIT 1`,
      [expense.group_id, expense.paid_by, expenseId],
    );
    if (settled.rows[0]) {
      throw badRequest(
        'This expense cannot be deleted because a payment has already been recorded between its members.',
        'expense_id',
      );
    }
    const removedFiles = await db.query('DELETE FROM attachment WHERE expense_id = $1 RETURNING file_url', [expenseId]);
    const removedSplits = await db.query('DELETE FROM splits WHERE expense_id = $1 RETURNING user_id', [expenseId]);
    await db.query('DELETE FROM expenses WHERE expense_id = $1', [expenseId]);
    for (const split of removedSplits.rows) {
      await syncSplitStatuses(db, expense.group_id, split.user_id, expense.paid_by);
    }
    return removedFiles.rows;
  });

  await Promise.all(files.map((file) => removeStoredFile(file.file_url)));
  res.json({ ok: true });
});

// Attach a receipt (image or PDF) to an expense.
router.post('/expenses/:expenseId/attachments', upload.single('file'), async (req, res) => {
  try {
    const expenseId = requireId(req.params.expenseId, 'expense_id', 'an expense');
    const expense = await loadExpense({ query }, expenseId);
    await requireMembership({ query }, expense.group_id, req.user.user_id);
    if (!req.file) throw badRequest('Choose a file to attach.', 'file');

    const { rows } = await query(
      `INSERT INTO attachment (attachment_id, expense_id, file_url, uploaded_by)
       VALUES (nextval('attachment_attachment_id_seq'), $1, $2, $3)
       RETURNING attachment_id, expense_id, file_url, uploaded_by, uploaded_at`,
      [expenseId, `/uploads/${req.file.filename}`, req.user.user_id],
    );
    res.status(201).json({ attachment: rows[0] });
  } catch (error) {
    // Do not keep a file that never made it into the database.
    if (req.file) await fs.rm(req.file.path, { force: true });
    throw error;
  }
});

// Remove a receipt. Allowed for whoever uploaded it or whoever paid the expense.
router.delete('/attachments/:attachmentId', async (req, res) => {
  const attachmentId = requireId(req.params.attachmentId, 'attachment_id', 'a receipt');
  const { rows } = await query(
    `SELECT a.attachment_id, a.file_url, a.uploaded_by, e.paid_by, e.group_id
       FROM attachment a
       JOIN expenses e ON e.expense_id = a.expense_id
      WHERE a.attachment_id = $1`,
    [attachmentId],
  );
  const attachment = rows[0];
  if (!attachment) throw notFound('That receipt does not exist.');
  await requireMembership({ query }, attachment.group_id, req.user.user_id);
  if (attachment.uploaded_by !== req.user.user_id && attachment.paid_by !== req.user.user_id) {
    throw forbidden('Only the uploader or the payer can remove this receipt.');
  }

  await query('DELETE FROM attachment WHERE attachment_id = $1', [attachmentId]);
  await removeStoredFile(attachment.file_url);
  res.json({ ok: true });
});

export default router;
