import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../config/db.js';
import { endSession, requireAuth, startSession } from '../middleware/auth.js';
import { badRequest, conflict, unauthorized } from '../utils/httpError.js';
import { requireEmail, requirePhone, requireText } from '../utils/validate.js';

const router = Router();

// Slows down guessing: 10 failed attempts per 10 minutes from one address.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Wait a few minutes and try again.' },
});

// Create a new user. The database assigns the user ID.
router.post('/register', loginLimiter, async (req, res) => {
  const userName = requireText(req.body.user_name, 'user_name', 'your name', 100);
  const phone = requirePhone(req.body.phone_number);
  const email = requireEmail(req.body.email);

  // Checked up front for a clear message. The UNIQUE constraints on USERS
  // still have the final say if two people register at the same moment.
  const taken = await query('SELECT phone_number, email FROM users WHERE phone_number = $1 OR email = $2', [
    phone,
    email,
  ]);
  if (taken.rows.some((row) => row.phone_number === phone)) {
    throw conflict('That phone number is already registered.', 'phone_number');
  }
  if (taken.rows.length > 0) throw conflict('That email is already registered.', 'email');

  const { rows } = await query(
    `INSERT INTO users (user_id, user_name, phone_number, email)
     VALUES (nextval('users_user_id_seq'), $1, $2, $3)
     RETURNING user_id, user_name, phone_number, email`,
    [userName, phone, email],
  );

  startSession(res, rows[0].user_id);
  res.status(201).json({ user: rows[0] });
});

// Log in with the user ID. The password is the user's phone number.
router.post('/login', loginLimiter, async (req, res) => {
  const userId = Number(req.body.user_id);
  const password = String(req.body.password ?? '').replace(/[\s-]/g, '');

  if (!Number.isInteger(userId) || userId <= 0) {
    throw badRequest('Enter your user ID. It is a number.', 'user_id');
  }
  if (!password) throw badRequest('Enter your password.', 'password');

  const { rows } = await query(
    `SELECT user_id, user_name, phone_number, email
       FROM users
      WHERE user_id = $1 AND phone_number = $2`,
    [userId <= 2147483647 ? userId : 0, password],
  );
  if (!rows[0]) throw unauthorized('That user ID and password do not match.');

  startSession(res, rows[0].user_id);
  res.json({ user: rows[0] });
});

router.post('/logout', (req, res) => {
  endSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
