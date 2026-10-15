import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { unauthorized } from '../utils/httpError.js';

const COOKIE_NAME = 'splitease_session';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function startSession(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: SEVEN_DAYS,
  });
}

export function endSession(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: env.isProduction });
}

/** Lets the request through only if it carries a valid login cookie. */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw unauthorized();

  let userId;
  try {
    userId = Number(jwt.verify(token, env.jwtSecret).sub);
  } catch {
    throw unauthorized('Your session has expired. Log in again.');
  }

  const { rows } = await query(
    'SELECT user_id, user_name, phone_number, email FROM users WHERE user_id = $1',
    [userId],
  );
  if (!rows[0]) {
    endSession(res);
    throw unauthorized();
  }
  req.user = rows[0];
  next();
}
