// RT-FB-03 / SAF-38 - 18+ check against a verified date of birth.
//
// Boundary cases: exactly 18 today, 18 tomorrow, 29 February birthdays, the UK-midnight
// (BST) boundary, and every fail-closed path (missing / malformed / impossible / future DOB).

const {
  evaluateDobAge,
  isAdultDob,
  computeAgeOnDate,
  normaliseDob,
  getUkDateParts,
  AGE_STATUS_ADULT,
  AGE_STATUS_UNDER_18,
  AGE_STATUS_DOB_UNAVAILABLE,
} = require('./ageCheck');

// Midday UTC is the same calendar date in London all year round.
const at = isoDate => ({ now: new Date(`${isoDate}T12:00:00Z`) });
const dob = (year, month, day) => ({ year, month, day });

describe('evaluateDobAge - 18th birthday boundary', () => {
  it('is adult on the exact 18th birthday', () => {
    expect(evaluateDobAge(dob(2008, 9, 28), at('2026-09-28'))).toBe(AGE_STATUS_ADULT);
  });

  it('is under 18 the day before the 18th birthday (turns 18 tomorrow)', () => {
    expect(evaluateDobAge(dob(2008, 9, 29), at('2026-09-28'))).toBe(AGE_STATUS_UNDER_18);
  });

  it('is under 18 when the birthday month has not arrived yet', () => {
    expect(evaluateDobAge(dob(2008, 12, 1), at('2026-09-28'))).toBe(AGE_STATUS_UNDER_18);
  });

  it('is adult well over 18', () => {
    expect(evaluateDobAge(dob(1990, 1, 1), at('2026-09-28'))).toBe(AGE_STATUS_ADULT);
  });

  it('is under 18 for a child', () => {
    expect(evaluateDobAge(dob(2015, 6, 15), at('2026-09-28'))).toBe(AGE_STATUS_UNDER_18);
  });
});

describe('evaluateDobAge - 29 February birthdays', () => {
  it('is still 17 on 28 February of a non-leap 18th year', () => {
    expect(evaluateDobAge(dob(2008, 2, 29), at('2026-02-28'))).toBe(AGE_STATUS_UNDER_18);
  });

  it('turns 18 on 1 March of a non-leap 18th year', () => {
    expect(evaluateDobAge(dob(2008, 2, 29), at('2026-03-01'))).toBe(AGE_STATUS_ADULT);
  });

  it('a 28 February birthday is adult on 28 February (not confused with the leap rule)', () => {
    expect(evaluateDobAge(dob(2008, 2, 28), at('2026-02-28'))).toBe(AGE_STATUS_ADULT);
  });

  it('evaluated ON a leap day: 29/02 birthday counts that day', () => {
    // Born 29/02/2004 -> 24 on 29/02/2028 (a leap year).
    expect(computeAgeOnDate(dob(2004, 2, 29), { year: 2028, month: 2, day: 29 })).toBe(24);
    expect(computeAgeOnDate(dob(2004, 2, 29), { year: 2028, month: 2, day: 28 })).toBe(23);
  });

  it('someone born on 01/03 is not yet 18 on a leap day 29/02', () => {
    // Born 01/03/2010, today 29/02/2028 -> still 17.
    expect(evaluateDobAge(dob(2010, 3, 1), at('2028-02-29'))).toBe(AGE_STATUS_UNDER_18);
  });
});

describe('evaluateDobAge - UK calendar date, not the server timezone', () => {
  it('uses the London date during BST (23:30 UTC is already the next day in the UK)', () => {
    const now = new Date('2026-09-27T23:30:00Z'); // 00:30 on 28/09 in London (BST)
    expect(getUkDateParts(now)).toEqual({ year: 2026, month: 9, day: 28 });
    expect(evaluateDobAge(dob(2008, 9, 28), { now })).toBe(AGE_STATUS_ADULT);
  });

  it('uses the London date during GMT', () => {
    const now = new Date('2026-12-31T23:30:00Z'); // 23:30 on 31/12 in London (GMT)
    expect(getUkDateParts(now)).toEqual({ year: 2026, month: 12, day: 31 });
    expect(evaluateDobAge(dob(2009, 1, 1), { now })).toBe(AGE_STATUS_UNDER_18);
  });
});

describe('evaluateDobAge - fails CLOSED on missing / bad data', () => {
  const now = at('2026-09-28');
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty object', {}],
    ['missing year', { day: 1, month: 1, year: null }],
    ['missing day', { day: null, month: 1, year: 1990 }],
    ['string parts', { day: '1', month: '1', year: '1990' }],
    ['month 13', dob(1990, 13, 1)],
    ['day 0', dob(1990, 1, 0)],
    ['31 February', dob(1990, 2, 31)],
    ['29 February in a non-leap year', dob(2007, 2, 29)],
    ['implausible year', dob(1850, 1, 1)],
    ['[redacted] string', '[redacted]'],
  ])('%s -> dob-unavailable (never adult)', (_label, value) => {
    expect(evaluateDobAge(value, now)).toBe(AGE_STATUS_DOB_UNAVAILABLE);
    expect(isAdultDob(value, now)).toBe(false);
  });

  it('a future DOB is bad data -> dob-unavailable (not adult)', () => {
    expect(evaluateDobAge(dob(2030, 1, 1), now)).toBe(AGE_STATUS_DOB_UNAVAILABLE);
  });
});

describe('normaliseDob / isAdultDob', () => {
  it('accepts a real 29 February in a leap year', () => {
    expect(normaliseDob(dob(2004, 2, 29))).toEqual({ year: 2004, month: 2, day: 29 });
  });
  it('isAdultDob is true only for adult', () => {
    expect(isAdultDob(dob(2000, 1, 1), at('2026-09-28'))).toBe(true);
    expect(isAdultDob(dob(2010, 1, 1), at('2026-09-28'))).toBe(false);
  });
});
