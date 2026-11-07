// Review queue amber marker: more than 1 working day, weekends (UK time) excluded.
// Dates: 02/11/2026 is a Monday; UK is on GMT (UTC+0) in November.

const { isUkWeekend, workingMsBetween, isOverdue, WORKING_DAY_MS } = require('./workingDays');

const HOUR = 60 * 60 * 1000;

describe('isUkWeekend', () => {
  it('reads the weekday in UK time', () => {
    expect(isUkWeekend(new Date('2026-11-06T23:59:00Z'))).toBe(false); // Fri
    expect(isUkWeekend(new Date('2026-11-07T00:00:00Z'))).toBe(true); // Sat
    expect(isUkWeekend(new Date('2026-11-08T23:59:00Z'))).toBe(true); // Sun
    expect(isUkWeekend(new Date('2026-11-09T00:00:00Z'))).toBe(false); // Mon
  });

  it('uses UK midnight in summer time (BST), not UTC midnight', () => {
    // Fri 03/07/2026 23:30 UTC = Sat 00:30 BST
    expect(isUkWeekend(new Date('2026-07-03T23:30:00Z'))).toBe(true);
    // Sun 05/07/2026 23:30 UTC = Mon 00:30 BST
    expect(isUkWeekend(new Date('2026-07-05T23:30:00Z'))).toBe(false);
  });
});

describe('workingMsBetween', () => {
  it('counts weekday time only', () => {
    // Fri 10:00 -> Mon 10:00 = 14h Friday + 10h Monday
    expect(workingMsBetween('2026-11-06T10:00:00Z', '2026-11-09T10:00:00Z')).toBe(24 * HOUR);
  });

  it('is zero for a span inside a weekend, and for invalid or reversed input', () => {
    expect(workingMsBetween('2026-11-07T09:00:00Z', '2026-11-08T21:00:00Z')).toBe(0);
    expect(workingMsBetween('2026-11-09T10:00:00Z', '2026-11-06T10:00:00Z')).toBe(0);
    expect(workingMsBetween('not a date', '2026-11-06T10:00:00Z')).toBe(0);
    expect(workingMsBetween(null, '2026-11-06T10:00:00Z')).toBe(0);
  });

  it('handles minutes that are not on the hour', () => {
    expect(workingMsBetween('2026-11-02T10:15:00Z', '2026-11-02T12:45:00Z')).toBe(2.5 * HOUR);
  });

  it('stops counting just past the cap', () => {
    const ms = workingMsBetween('2026-10-01T00:00:00Z', '2026-11-30T00:00:00Z', {
      capMs: WORKING_DAY_MS,
    });
    expect(ms).toBeGreaterThan(WORKING_DAY_MS);
    expect(ms).toBeLessThanOrEqual(WORKING_DAY_MS + HOUR);
  });
});

describe('isOverdue (amber after 1 working day)', () => {
  it('Monday submission turns amber after Tuesday at the same time', () => {
    const submitted = '2026-11-02T10:00:00Z';
    expect(isOverdue(submitted, new Date('2026-11-03T09:59:00Z'))).toBe(false);
    expect(isOverdue(submitted, new Date('2026-11-03T10:00:00Z'))).toBe(false); // exactly 1 day
    expect(isOverdue(submitted, new Date('2026-11-03T10:01:00Z'))).toBe(true);
  });

  it('Friday evening submission is not amber over the weekend', () => {
    const submitted = '2026-11-06T18:00:00Z'; // Fri 18:00, 6h counted on Friday
    expect(isOverdue(submitted, new Date('2026-11-07T12:00:00Z'))).toBe(false); // Sat
    expect(isOverdue(submitted, new Date('2026-11-08T23:00:00Z'))).toBe(false); // Sun
    expect(isOverdue(submitted, new Date('2026-11-09T17:59:00Z'))).toBe(false); // Mon, 23h59
    expect(isOverdue(submitted, new Date('2026-11-09T18:01:00Z'))).toBe(true);
  });

  it('weekend submission starts the clock on Monday', () => {
    const submitted = '2026-11-07T11:00:00Z'; // Sat
    expect(isOverdue(submitted, new Date('2026-11-09T23:59:00Z'))).toBe(false);
    expect(isOverdue(submitted, new Date('2026-11-10T00:01:00Z'))).toBe(true);
  });

  it('matches the R01 example (Wednesday 04/11/2026, mid-afternoon)', () => {
    const now = new Date('2026-11-04T15:00:00Z');
    expect(isOverdue('2026-10-30T12:00:00Z', now)).toBe(true); // Chloe, Fri
    expect(isOverdue('2026-11-02T12:00:00Z', now)).toBe(true); // Imogen, Mon
    expect(isOverdue('2026-11-03T16:00:00Z', now)).toBe(false); // Daniel, yesterday
    expect(isOverdue('2026-11-04T12:00:00Z', now)).toBe(false); // Amara, today
  });

  it('is false for a missing or invalid date', () => {
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue('nonsense')).toBe(false);
  });
});
