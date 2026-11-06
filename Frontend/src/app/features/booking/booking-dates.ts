export const BOOKABLE_DAYS = 4;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Local calendar date as YYYY-MM-DD.
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// The 4 weekdays starting today (if a weekday) or at the next weekday; the server re-checks.
export function bookableDates(now: Date): string[] {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dates: string[] = [];
  while (dates.length < BOOKABLE_DAYS) {
    if (day.getDay() !== 0 && day.getDay() !== 6) {
      dates.push(toIsoDate(day));
    }
    day.setDate(day.getDate() + 1);
  }
  return dates;
}

// e.g. "Mon, 9 Nov 2026"
export function formatDate(iso: string): string {
  const date = parseIsoDate(iso);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
