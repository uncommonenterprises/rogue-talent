// Server-side minimum-notice gate (F8 follow-up). The rule is pinned to the same cases as the
// browser's isDayInsideNoticeWindow (src/util/minimumNotice.cases.json).

const moment = require('moment-timezone');

jest.mock('../log', () => ({ error: jest.fn() }));

const {
  enforceMinimumNotice,
  isBookingStartInsideNotice,
  MIN_NOTICE_HOURS,
  BOOKING_INSIDE_NOTICE_CODE,
} = require('./minimumNoticeGate');
const { cases } = require('../../src/util/minimumNotice.cases.json');

// The start of a calendar day in a time zone: what the date picker sends as bookingStart.
const dayStart = (day, timeZone) => moment.tz(day, 'YYYY-MM-DD', timeZone).toDate();

const NOW = new Date('2026-11-01T16:20:00Z'); // Sun 1 Nov, 16:20 UK time

const listing = ({
  noticeKey = '48-hours',
  unitType = 'day',
  timeZone = 'Europe/London',
} = {}) => ({
  id: { uuid: 'listing-1' },
  attributes: {
    publicData: { unitType, ...(noticeKey ? { min_booking_notice: noticeKey } : {}) },
    availabilityPlan: timeZone ? { timezone: timeZone } : null,
  },
});

const request = day => ({
  bodyParams: { params: { bookingStart: dayStart(day, 'Europe/London') } },
  orderData: {},
});

const codeOf = e => e?.data?.errors?.[0]?.code;

describe('isBookingStartInsideNotice: same cases as the browser rule', () => {
  cases.forEach(c => {
    it(c.name, () => {
      expect(
        isBookingStartInsideNotice({
          bookingStart: dayStart(c.day, c.timeZone),
          noticeKey: c.noticeKey || undefined,
          timeZone: c.timeZone,
          now: new Date(c.now),
        })
      ).toBe(c.inside);
    });
  });

  it('judges the booking by its first day, whatever time on that day it starts', () => {
    const midday = moment.tz('2026-11-04 12:00', 'Europe/London').toDate();
    expect(
      isBookingStartInsideNotice({
        bookingStart: midday,
        noticeKey: '48-hours',
        timeZone: 'Europe/London',
        now: NOW,
      })
    ).toBe(false);
  });

  it('keeps the same notice options as the browser', () => {
    expect(MIN_NOTICE_HOURS).toEqual({
      'same-day': 0,
      '24-hours': 24,
      '48-hours': 48,
      '1-week': 168,
      '2-weeks': 336,
    });
  });
});

describe('enforceMinimumNotice (booking gate)', () => {
  it('refuses a start inside the notice with a clear code', async () => {
    const e = await enforceMinimumNotice({ listing: listing(), ...request('2026-11-03'), now: NOW })
      .then(() => null)
      .catch(err => err);
    expect(e.status).toBe(409);
    expect(codeOf(e)).toBe(BOOKING_INSIDE_NOTICE_CODE);
  });

  it('allows a start outside the notice', async () => {
    await expect(
      enforceMinimumNotice({ listing: listing(), ...request('2026-11-04'), now: NOW })
    ).resolves.toBeUndefined();
  });

  it('with no notice set, only today is refused', async () => {
    const noNotice = listing({ noticeKey: null });
    await expect(
      enforceMinimumNotice({ listing: noNotice, ...request('2026-11-02'), now: NOW })
    ).resolves.toBeUndefined();
    await expect(
      enforceMinimumNotice({ listing: noNotice, ...request('2026-11-01'), now: NOW })
    ).rejects.toMatchObject({ data: { errors: [{ code: BOOKING_INSIDE_NOTICE_CODE }] } });
  });

  it('1 week: refuses six days out, allows eight', async () => {
    const week = listing({ noticeKey: '1-week' });
    await expect(
      enforceMinimumNotice({ listing: week, ...request('2026-11-07'), now: NOW })
    ).rejects.toMatchObject({ data: { errors: [{ code: BOOKING_INSIDE_NOTICE_CODE }] } });
    await expect(
      enforceMinimumNotice({ listing: week, ...request('2026-11-09'), now: NOW })
    ).resolves.toBeUndefined();
  });

  it('time-zone edge: uses the listing time zone, not UTC', async () => {
    // 04:30 UTC on 2 Nov: still 1 Nov in New York, so 2 Nov there is tomorrow (allowed with no
    // notice); in London it is already today (refused).
    const now = new Date('2026-11-02T04:30:00Z');
    const nyStart = {
      bodyParams: { params: { bookingStart: dayStart('2026-11-02', 'America/New_York') } },
    };
    await expect(
      enforceMinimumNotice({
        listing: listing({ noticeKey: null, timeZone: 'America/New_York' }),
        ...nyStart,
        now,
      })
    ).resolves.toBeUndefined();
    await expect(
      enforceMinimumNotice({ listing: listing({ noticeKey: null }), ...request('2026-11-02'), now })
    ).rejects.toMatchObject({ data: { errors: [{ code: BOOKING_INSIDE_NOTICE_CODE }] } });
  });

  it('checks the orderData start too, so the two cannot disagree', async () => {
    await expect(
      enforceMinimumNotice({
        listing: listing(),
        bodyParams: { params: { bookingStart: dayStart('2026-11-10', 'Europe/London') } },
        orderData: { bookingStart: dayStart('2026-11-02', 'Europe/London') },
        now: NOW,
      })
    ).rejects.toMatchObject({ data: { errors: [{ code: BOOKING_INSIDE_NOTICE_CODE }] } });
  });

  it('fails safe: no listing, or no time zone, refuses (generic not available)', async () => {
    await expect(
      enforceMinimumNotice({ listing: null, ...request('2026-11-10'), now: NOW })
    ).rejects.toMatchObject({ data: { errors: [{ code: 'booking-not-available' }] } });
    await expect(
      enforceMinimumNotice({
        listing: listing({ timeZone: null }),
        ...request('2026-11-10'),
        now: NOW,
      })
    ).rejects.toMatchObject({ data: { errors: [{ code: 'booking-not-available' }] } });
  });

  it('leaves other unit types and requests without dates alone', async () => {
    await expect(
      enforceMinimumNotice({
        listing: listing({ unitType: 'item' }),
        ...request('2026-11-01'),
        now: NOW,
      })
    ).resolves.toBeUndefined();
    await expect(
      enforceMinimumNotice({
        listing: listing(),
        bodyParams: { params: {} },
        orderData: {},
        now: NOW,
      })
    ).resolves.toBeUndefined();
  });
});
