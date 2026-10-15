import test from 'node:test';
import assert from 'node:assert/strict';
import { computeShares, owedShares } from '../src/services/splits.js';

const people = (...ids) => ids.map((user_id) => ({ user_id }));

test('equal split matches the assignment sample (12000 between two)', () => {
  const shares = computeShares({ amount: 12000, splitType: 'EQUAL', payerId: 1, participants: people(1, 2) });
  assert.deepEqual(owedShares(shares, 1), [{ user_id: 2, share_amount: 6000, split_percent: 50 }]);
});

test('equal split gives leftover paise to the payer', () => {
  const shares = computeShares({ amount: 100, splitType: 'EQUAL', payerId: 1, participants: people(1, 2, 3) });
  assert.deepEqual(shares.map((s) => s.share_amount), [33.34, 33.33, 33.33]);
  assert.equal(shares.reduce((sum, s) => sum + Math.round(s.share_amount * 100), 0), 10000);
});

test('equal split still adds up when the payer is not taking part', () => {
  const shares = computeShares({ amount: 100, splitType: 'EQUAL', payerId: 9, participants: people(2, 3, 4) });
  assert.deepEqual(shares.map((s) => s.share_amount), [33.34, 33.33, 33.33]);
  assert.equal(owedShares(shares, 9).length, 3);
});

test('exact split has to add up to the amount', () => {
  const participants = [
    { user_id: 1, share_amount: 700 },
    { user_id: 2, share_amount: 500 },
  ];
  const shares = computeShares({ amount: 1200, splitType: 'EXACT', payerId: 1, participants });
  assert.deepEqual(shares[1], { user_id: 2, share_amount: 500, split_percent: 41.67 });
  assert.throws(
    () => computeShares({ amount: 1500, splitType: 'EXACT', payerId: 1, participants }),
    /add up to ₹1,200, but the expense is ₹1,500/,
  );
});

test('percentage split has to total 100', () => {
  const participants = [
    { user_id: 4, split_percent: 60 },
    { user_id: 5, split_percent: 40 },
  ];
  const shares = computeShares({ amount: 1000, splitType: 'PERCENTAGE', payerId: 4, participants });
  assert.deepEqual(owedShares(shares, 4), [{ user_id: 5, share_amount: 400, split_percent: 40 }]);
  assert.throws(
    () => computeShares({ amount: 1000, splitType: 'PERCENTAGE', payerId: 4, participants: [{ user_id: 4, split_percent: 60 }, { user_id: 5, split_percent: 30 }] }),
    /add up to 90%/,
  );
});

test('percentage split keeps the total exact after rounding', () => {
  const participants = [
    { user_id: 1, split_percent: 33.33 },
    { user_id: 2, split_percent: 33.33 },
    { user_id: 3, split_percent: 33.34 },
  ];
  const shares = computeShares({ amount: 100.01, splitType: 'PERCENTAGE', payerId: 1, participants });
  assert.equal(shares.reduce((sum, s) => sum + Math.round(s.share_amount * 100), 0), 10001);
});

test('an expense needs at least one person other than the payer', () => {
  const shares = computeShares({ amount: 500, splitType: 'EQUAL', payerId: 1, participants: people(1) });
  assert.throws(() => owedShares(shares, 1), /at least one other member/);
});

test('the same person cannot be listed twice', () => {
  assert.throws(
    () => computeShares({ amount: 500, splitType: 'EQUAL', payerId: 1, participants: people(2, 2) }),
    /only be listed once/,
  );
});
