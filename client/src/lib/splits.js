import { toPaise } from './format.js';

/**
 * Works out the preview of an expense split, the same way the server does.
 * Everything is in paise.
 *
 * Returns { shares: Map(userId -> paise), unassigned } where `unassigned` is
 * how much is still left to hand out (negative when too much was assigned).
 * For percentages, `unassignedPercent` is also returned.
 */
export function previewSplit({ amount, splitType, payerId, memberIds, included, exact, percent }) {
  const total = toPaise(amount);
  const shares = new Map(memberIds.map((id) => [id, 0]));

  if (splitType === 'EQUAL') {
    const ids = memberIds.filter((id) => included.has(id));
    if (ids.length > 0 && total > 0) {
      const base = Math.floor(total / ids.length);
      let leftover = total - base * ids.length;
      ids.forEach((id) => shares.set(id, base));
      if (ids.includes(payerId)) {
        shares.set(payerId, base + leftover);
        leftover = 0;
      }
      for (let i = 0; leftover > 0; i += 1, leftover -= 1) shares.set(ids[i], shares.get(ids[i]) + 1);
    }
    return { shares, unassigned: ids.length > 0 ? 0 : total };
  }

  if (splitType === 'EXACT') {
    let assigned = 0;
    for (const id of memberIds) {
      const value = Math.max(0, toPaise(exact[id]));
      shares.set(id, value);
      assigned += value;
    }
    return { shares, unassigned: total - assigned };
  }

  // PERCENTAGE
  let assignedPercent = 0;
  for (const id of memberIds) {
    const value = Math.max(0, Math.round((Number(percent[id]) || 0) * 100) / 100);
    shares.set(id, Math.round((total * value) / 100));
    assignedPercent += value;
  }
  const unassignedPercent = Math.round((100 - assignedPercent) * 100) / 100;
  return { shares, unassigned: Math.round((total * unassignedPercent) / 100), unassignedPercent };
}
