import { badRequest } from './httpError.js';

export function requireText(value, field, label, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw badRequest(`Enter ${label}.`, field);
  if (text.length > maxLength) {
    throw badRequest(`Keep ${label} under ${maxLength} characters.`, field);
  }
  return text;
}

export function requireId(value, field, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    throw badRequest(`Choose ${label}.`, field);
  }
  return id;
}

export function requireAmount(value, field = 'amount') {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw badRequest('Enter an amount greater than zero.', field);
  }
  if (amount > 9999999999.99) throw badRequest('That amount is too large.', field);
  return Math.round(amount * 100) / 100;
}

export function requirePhone(value, field = 'phone_number') {
  const digits = String(value ?? '').replace(/[\s-]/g, '');
  if (!/^\+?\d{7,15}$/.test(digits) || digits.length > 15) {
    throw badRequest('Enter a phone number with 7 to 15 digits.', field);
  }
  return digits;
}

export function requireEmail(value, field = 'email') {
  const email = String(value ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest('Enter a valid email address.', field);
  }
  if (email.length > 100) throw badRequest('Keep the email under 100 characters.', field);
  return email;
}

export function requireOneOf(value, allowed, field, label) {
  const text = String(value ?? '').toUpperCase();
  if (!allowed.includes(text)) throw badRequest(`Choose ${label}.`, field);
  return text;
}

export function requireDate(value, field, label) {
  const text = String(value ?? '');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  let valid = false;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  if (!valid) throw badRequest(`Choose ${label}.`, field);
  return text;
}
