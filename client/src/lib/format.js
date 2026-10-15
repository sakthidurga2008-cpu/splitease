const wholeRupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const withPaise = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 12000 -> "₹12,000", 333.34 -> "₹333.34". Always positive; the caller adds any sign or wording. */
export function money(value) {
  const amount = Math.abs(Math.round((Number(value) || 0) * 100) / 100);
  return '₹' + (Number.isInteger(amount) ? wholeRupees.format(amount) : withPaise.format(amount));
}

export const toPaise = (value) => Math.round((Number(value) || 0) * 100);

function parts(isoDate) {
  const [year, month, day] = String(isoDate).slice(0, 10).split('-').map(Number);
  return { year, month, day };
}

export function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-08-15" -> "15 Aug 2026" */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const { year, month, day } = parts(isoDate);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** "2026-08-15" -> "15 Aug", with the year added when it is not this year. */
export function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const { year, month, day } = parts(isoDate);
  const thisYear = new Date().getFullYear();
  return `${day} ${MONTHS[month - 1]}${year === thisYear ? '' : ` ${year}`}`;
}

/** Whole days from today to the date. Negative when the date has passed. */
export function daysFromToday(isoDate) {
  const a = parts(isoDate);
  const b = parts(todayISO());
  return Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86400000);
}

export function dueLabel(isoDate) {
  const days = daysFromToday(isoDate);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due ${formatShortDate(isoDate)}`;
  return `Was due ${formatShortDate(isoDate)}`;
}

export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

export function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase();
export const FREQUENCY_LABELS = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly' };
export const SPLIT_TYPE_LABELS = { EQUAL: 'Equally', EXACT: 'Exact amounts', PERCENTAGE: 'Percentages' };
export const statusLabel = (status) => sentenceCase(String(status || ''));

/** The readable name of a receipt from its address. */
export function fileNameFromUrl(url) {
  const last = String(url).split('/').pop() || 'Receipt';
  // Uploaded files are stored under a random name, so show something friendlier.
  if (/^[0-9a-f-]{36}\./i.test(last)) return `Receipt.${last.split('.').pop()}`;
  return decodeURIComponent(last);
}
