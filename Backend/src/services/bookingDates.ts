const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const BOOKABLE_DAYS = 4;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function format(utc: Date): string {
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

// True only for real calendar dates in YYYY-MM-DD form.
export function isValidDateString(value: string): boolean {
  const m = DATE_PATTERN.exec(value);
  if (!m) {
    return false;
  }
  const utc = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return format(utc) === value;
}

// Server-local calendar date as YYYY-MM-DD.
export function toDateString(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The 4 weekdays starting today (if a weekday) or at the next weekday.
export function bookableDates(now: Date): string[] {
  const day = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dates: string[] = [];
  while (dates.length < BOOKABLE_DAYS) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      dates.push(format(day));
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}
