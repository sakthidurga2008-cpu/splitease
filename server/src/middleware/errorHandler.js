import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

// Friendly messages for the constraints named in database/01_schema.sql.
const CONSTRAINT_MESSAGES = {
  uq_users_phone: { message: 'That phone number is already registered.', field: 'phone_number' },
  uq_users_email: { message: 'That email is already registered.', field: 'email' },
  pk_user_groups: { message: 'That person is already in the group.' },
  uq_group_user: { message: 'That person is already in the group.' },
  ck_exp_amount: { message: 'Enter an amount greater than zero.', field: 'amount' },
  ck_settle_amount: { message: 'Enter an amount greater than zero.', field: 'amount' },
  ck_rec_amount: { message: 'Enter an amount greater than zero.', field: 'amount' },
  ck_settle_users: { message: 'Choose two different people.' },
  fk_exp_member: { message: 'The payer has to be a member of the group.', field: 'paid_by' },
  fk_rec_member: { message: 'The payer has to be a member of the group.', field: 'paid_by' },
  fk_settle_payer_member: { message: 'Both people have to be members of the group.' },
  fk_settle_to_member: { message: 'Both people have to be members of the group.' },
};

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'That address does not exist.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, field: error.field });
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE' ? 'Choose a file smaller than 5 MB.' : 'That file could not be uploaded.';
    return res.status(400).json({ error: message, field: 'file' });
  }

  // PostgreSQL integrity errors: unique, foreign key, check, not-null.
  if (error.code && ['23505', '23503', '23514', '23502'].includes(error.code)) {
    const known = CONSTRAINT_MESSAGES[error.constraint];
    if (known) return res.status(409).json({ error: known.message, field: known.field });
    return res.status(409).json({ error: 'That change conflicts with existing data.' });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request could not be read.' });
  }

  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server. Try again.' });
}
