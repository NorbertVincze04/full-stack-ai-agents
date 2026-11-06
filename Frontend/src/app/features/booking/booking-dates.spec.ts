import { bookableDates, formatDate, parseIsoDate, toIsoDate } from './booking-dates';

describe('booking-dates', () => {
  describe('bookableDates (FR2)', () => {
    it('should start today and span 4 weekdays when today is Friday (weekend skipped)', () => {
      expect(bookableDates(new Date(2026, 10, 6, 15, 30))).toEqual([
        '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11'
      ]);
    });

    it('should start today when today is Monday', () => {
      expect(bookableDates(new Date(2026, 10, 9))).toEqual([
        '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'
      ]);
    });

    it('should start at the next Monday when today is Saturday', () => {
      expect(bookableDates(new Date(2026, 10, 7))[0]).toBe('2026-11-09');
    });

    it('should start at the next Monday when today is Sunday', () => {
      expect(bookableDates(new Date(2026, 10, 8))).toEqual([
        '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'
      ]);
    });

    it('should never contain a Saturday or Sunday and always return 4 dates', () => {
      for (let offset = 0; offset < 21; offset++) {
        const dates = bookableDates(new Date(2026, 10, 2 + offset));
        expect(dates.length).toBe(4);
        dates.forEach(d => expect([0, 6]).not.toContain(parseIsoDate(d).getDay()));
      }
    });

    it('should cross a month boundary', () => {
      expect(bookableDates(new Date(2026, 10, 30))).toEqual([
        '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'
      ]);
    });
  });

  describe('formatDate (FR3)', () => {
    it('should format as "Mon, 9 Nov 2026"', () => {
      expect(formatDate('2026-11-09')).toBe('Mon, 9 Nov 2026');
    });

    it('should not pad the day and should handle Sunday', () => {
      expect(formatDate('2026-11-01')).toBe('Sun, 1 Nov 2026');
    });
  });

  describe('toIsoDate / parseIsoDate', () => {
    it('should round-trip a local date', () => {
      expect(toIsoDate(parseIsoDate('2026-01-05'))).toBe('2026-01-05');
    });
  });
});
