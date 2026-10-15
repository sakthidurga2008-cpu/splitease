// Money is calculated in whole paise so that splits never drift by a rounding error.

export const toPaise = (rupees) => Math.round(Number(rupees) * 100);
export const toRupees = (paise) => Math.round(paise) / 100;

export function formatRupees(rupees) {
  return '₹' + Number(rupees).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
