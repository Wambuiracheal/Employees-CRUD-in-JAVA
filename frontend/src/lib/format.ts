const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

export function formatMoney(value: number): string {
  return money.format(value);
}

/** Formats an ISO date (yyyy-MM-dd) without shifting it through the local time zone. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return date.format(new Date(y, m - 1, d));
}
