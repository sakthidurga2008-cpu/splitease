import { Router } from 'express';
import { query } from '../config/db.js';
import { notFound } from '../utils/httpError.js';
import { requireEmail, requirePhone, requireText } from '../utils/validate.js';

const router = Router();

// The logged-in user's profile, with a few counts for the profile page.
router.get('/me', async (req, res) => {
  const { rows } = await query(
    `SELECT (SELECT COUNT(*) FROM user_groups WHERE user_id = $1) AS group_count,
            (SELECT COUNT(*) FROM expenses WHERE paid_by = $1) AS expenses_paid,
            (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE paid_by = $1) AS total_paid,
            (SELECT COUNT(*) FROM settlements WHERE paid_by = $1 OR paid_to = $1) AS settlement_count,
            (SELECT MIN(joined_at) FROM user_groups WHERE user_id = $1) AS first_joined`,
    [req.user.user_id],
  );
  res.json({ user: req.user, stats: rows[0] });
});

// Update name, phone number or email. The phone number is also the password.
router.patch('/me', async (req, res) => {
  const userName = requireText(req.body.user_name, 'user_name', 'your name', 100);
  const phone = requirePhone(req.body.phone_number);
  const email = requireEmail(req.body.email);

  const { rows } = await query(
    `UPDATE users
        SET user_name = $2, phone_number = $3, email = $4
      WHERE user_id = $1
      RETURNING user_id, user_name, phone_number, email`,
    [req.user.user_id, userName, phone, email],
  );
  res.json({ user: rows[0] });
});

// Find one person to add to a group, by their exact user ID, phone number or email.
// Only the name and ID come back; phone numbers are never sent to other users.
router.get('/lookup', async (req, res) => {
  const term = String(req.query.q ?? '').trim().replace(/[\s-]/g, '');
  if (!term) throw notFound('Enter a user ID, phone number or email.');

  const { rows } = await query(
    `SELECT user_id, user_name
       FROM users
      WHERE user_id::text = $1 OR phone_number = $1 OR LOWER(email) = LOWER($1)
      ORDER BY (phone_number = $1) DESC
      LIMIT 1`,
    [term],
  );
  if (!rows[0]) throw notFound('No one is registered with that user ID, phone number or email.');
  res.json({ user: rows[0] });
});

export default router;
