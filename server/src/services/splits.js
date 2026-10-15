import { badRequest } from '../utils/httpError.js';
import { formatRupees, toPaise, toRupees } from '../utils/money.js';

export const SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENTAGE'];

const percentOf = (sharePaise, totalPaise) =>
  Math.round((sharePaise / totalPaise) * 10000) / 100;

/**
 * Works out each person's share of an expense.
 *
 * participants: [{ user_id, share_amount?, split_percent? }]
 *   EQUAL       everyone listed pays the same
 *   EXACT       each person's share_amount is given and must add up to the total
 *   PERCENTAGE  each person's split_percent is given and must add up to 100
 *
 * Returns one entry per participant: { user_id, share_amount, split_percent }.
 * Any paise left over from rounding goes to the payer (or, if the payer is
 * not taking part, to the first people in the list).
 */
export function computeShares({ amount, splitType, payerId, participants }) {
  const totalPaise = toPaise(amount);

  if (!Array.isArray(participants) || participants.length === 0) {
    throw badRequest('Choose who shares this expense.', 'participants');
  }
  const ids = participants.map((p) => Number(p.user_id));
  if (new Set(ids).size !== ids.length) {
    throw badRequest('Each person can only be listed once.', 'participants');
  }

  let shares; // paise, same order as participants

  if (splitType === 'EQUAL') {
    const base = Math.floor(totalPaise / ids.length);
    shares = ids.map(() => base);
    let leftover = totalPaise - base * ids.length;
    const payerIndex = ids.indexOf(Number(payerId));
    if (payerIndex >= 0) {
      shares[payerIndex] += leftover;
      leftover = 0;
    }
    for (let i = 0; leftover > 0; i += 1, leftover -= 1) shares[i] += 1;
  } else if (splitType === 'EXACT') {
    shares = participants.map((p) => {
      const value = Number(p.share_amount);
      if (!Number.isFinite(value) || value < 0) {
        throw badRequest('Enter a share for each person.', 'participants');
      }
      return toPaise(value);
    });
    const sum = shares.reduce((a, b) => a + b, 0);
    if (sum !== totalPaise) {
      throw badRequest(
        `The shares add up to ${formatRupees(toRupees(sum))}, but the expense is ${formatRupees(amount)}.`,
        'participants',
      );
    }
  } else if (splitType === 'PERCENTAGE') {
    const percents = participants.map((p) => {
      const value = Number(p.split_percent);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw badRequest('Enter a percentage between 0 and 100 for each person.', 'participants');
      }
      return Math.round(value * 100) / 100;
    });
    const sumPercent = percents.reduce((a, b) => a + b, 0);
    if (Math.abs(sumPercent - 100) > 0.005) {
      throw badRequest(
        `The percentages add up to ${Math.round(sumPercent * 100) / 100}%. They need to total 100%.`,
        'participants',
      );
    }
    shares = percents.map((percent) => Math.round((totalPaise * percent) / 100));
    const drift = totalPaise - shares.reduce((a, b) => a + b, 0);
    if (drift !== 0) {
      const payerIndex = ids.indexOf(Number(payerId));
      const target = payerIndex >= 0 ? payerIndex : shares.indexOf(Math.max(...shares));
      shares[target] += drift;
    }
    return ids.map((userId, i) => ({
      user_id: userId,
      share_amount: toRupees(shares[i]),
      split_percent: percents[i],
    }));
  } else {
    throw badRequest('Choose how to split the expense.', 'split_type');
  }

  return ids.map((userId, i) => ({
    user_id: userId,
    share_amount: toRupees(shares[i]),
    split_percent: percentOf(shares[i], totalPaise),
  }));
}

/**
 * The rows that go into SPLITS: one per person who owes the payer.
 * The payer's own share is not stored; it is whatever is left of the amount.
 */
export function owedShares(shares, payerId) {
  const owed = shares.filter((s) => s.user_id !== Number(payerId) && s.share_amount > 0);
  if (owed.length === 0) {
    throw badRequest('Split the expense with at least one other member.', 'participants');
  }
  return owed;
}
