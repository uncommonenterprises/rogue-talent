import { types as sdkTypes } from '../../../util/sdkLoader';

import {
  DAY_FREE,
  DAY_NOTICE,
  DAY_PAST,
  DAY_TODAY,
  DAY_UNAVAILABLE,
  MONTH_ERROR,
  MONTH_IDLE,
  MONTH_LOADING,
  MONTH_READY,
  addMonths,
  getAvailabilityModel,
  getMonthFetchRange,
  getMonthGrid,
} from './availabilityCalendar.helpers';

const { UUID } = sdkTypes;
const TZ = 'Europe/London';

// Mock "today" as in the B03b mockup: Sun 1 Nov 2026, 16:20 UK time (GMT, so = UTC).
const NOW = new Date('2026-11-01T16:20:00Z');

// A daily time slot covering whole days [from, to) in UK time (GMT in November).
const slot = (id, from, to) => ({
  id: new UUID(`ts-${id}`),
  type: 'timeSlot',
  attributes: {
    start: new Date(`${from}T00:00:00Z`),
    end: new Date(`${to}T00:00:00Z`),
    seats: 1,
  },
});

// Free every day of November from the 2nd, except 9 to 11 Nov (booked) and 24 Nov (held by a
// waiting request: Sharetribe's pending booking has taken the seat, so there is no slot).
const novemberSlots = [
  slot(1, '2026-11-02', '2026-11-09'),
  slot(2, '2026-11-12', '2026-11-24'),
  slot(3, '2026-11-25', '2026-12-01'),
];

const monthly = (extra = {}) => ({
  '2026-11': { timeSlots: novemberSlots, fetchTimeSlotsInProgress: false },
  '2026-12': { timeSlots: [slot(4, '2026-12-01', '2027-01-01')], fetchTimeSlotsInProgress: false },
  ...extra,
});

const modelFor = (noticeKey, monthlyTimeSlots = monthly()) =>
  getAvailabilityModel({
    monthlyTimeSlots,
    timeZone: TZ,
    noticeKey,
    dayCountAvailableForBooking: 90,
    now: NOW,
  });

describe('availability calendar: the notice window', () => {
  it('48 hours: today, Mon 2 and Tue 3 Nov are not available, Wed 4 Nov is free', () => {
    const model = modelFor('48-hours');
    expect(model.getDayStatus('2026-10-31')).toEqual(DAY_PAST);
    expect(model.getDayStatus('2026-11-01')).toEqual(DAY_TODAY);
    expect(model.getDayStatus('2026-11-02')).toEqual(DAY_NOTICE);
    expect(model.getDayStatus('2026-11-03')).toEqual(DAY_NOTICE);
    expect(model.getDayStatus('2026-11-04')).toEqual(DAY_FREE);
  });

  it('1 week: dates up to Sun 8 Nov are inside the notice; Mon 9 Nov onwards follow the calendar', () => {
    const model = modelFor('1-week');
    expect(model.getDayStatus('2026-11-08')).toEqual(DAY_NOTICE);
    // 9 Nov is outside the notice but booked
    expect(model.getDayStatus('2026-11-09')).toEqual(DAY_UNAVAILABLE);
    expect(model.getDayStatus('2026-11-12')).toEqual(DAY_FREE);
  });

  it('same-day notice, or none set: only today is held back', () => {
    ['same-day', undefined, 'not-a-real-option'].forEach(noticeKey => {
      const model = modelFor(noticeKey);
      expect(model.getDayStatus('2026-11-01')).toEqual(DAY_TODAY);
      expect(model.getDayStatus('2026-11-02')).toEqual(DAY_FREE);
    });
  });

  it('today is never free, even when the time slots include it', () => {
    const withToday = monthly({
      '2026-11': {
        timeSlots: [slot(9, '2026-11-01', '2026-12-01')],
        fetchTimeSlotsInProgress: false,
      },
    });
    expect(modelFor(undefined, withToday).getDayStatus('2026-11-01')).toEqual(DAY_TODAY);
  });

  it("the notice is counted in the model's time zone, not the visitor's", () => {
    // 23:30 on Sun 1 Nov in New York is already Mon 2 Nov 04:30 in the UK.
    const model = getAvailabilityModel({
      monthlyTimeSlots: monthly(),
      timeZone: TZ,
      noticeKey: '24-hours',
      dayCountAvailableForBooking: 90,
      now: new Date('2026-11-02T04:30:00Z'),
    });
    expect(model.todayKey).toEqual('2026-11-02');
    expect(model.getDayStatus('2026-11-03')).toEqual(DAY_NOTICE);
    expect(model.getDayStatus('2026-11-04')).toEqual(DAY_FREE);
  });
});

describe('availability calendar: booked and held dates', () => {
  it('booked dates and a date held by a waiting request both show as plain not available', () => {
    const model = modelFor('48-hours');
    expect(model.getDayStatus('2026-11-10')).toEqual(DAY_UNAVAILABLE); // booked
    expect(model.getDayStatus('2026-11-24')).toEqual(DAY_UNAVAILABLE); // held by a request
    expect(model.getDayStatus('2026-11-25')).toEqual(DAY_FREE);
  });

  it('dates beyond the bookable window are not available', () => {
    const model = modelFor(undefined);
    // 90 days from 1 Nov: the last day a booking can start is 29 Jan 2027
    expect(model.lastMonthId).toEqual('2027-01');
    const longer = monthly({
      '2027-01': {
        timeSlots: [slot(5, '2027-01-01', '2027-02-01')],
        fetchTimeSlotsInProgress: false,
      },
    });
    const m = modelFor(undefined, longer);
    expect(m.getDayStatus('2027-01-29')).toEqual(DAY_FREE);
    expect(m.getDayStatus('2027-01-30')).toEqual(DAY_UNAVAILABLE);
  });
});

describe('availability calendar: months', () => {
  it('lays out a month with Monday first', () => {
    // 1 Nov 2026 is a Sunday: six blanks before it
    expect(getMonthGrid('2026-11').leadingBlanks).toEqual(6);
    expect(getMonthGrid('2026-11').days).toHaveLength(30);
    // 1 Feb 2027 is a Monday: no blanks
    expect(getMonthGrid('2027-02').leadingBlanks).toEqual(0);
  });

  it('shifts month ids across years', () => {
    expect(addMonths('2026-11', 2)).toEqual('2027-01');
    expect(addMonths('2027-01', -1)).toEqual('2026-12');
  });

  it('reports month loading, error and idle states from the picker data', () => {
    const model = modelFor(undefined, {
      '2026-11': { fetchTimeSlotsInProgress: true },
      // The time slot thunk swallows request errors and stores no array: that is an error.
      '2026-12': { fetchTimeSlotsInProgress: false },
    });
    expect(model.getMonthStatus('2026-11')).toEqual(MONTH_LOADING);
    expect(model.getMonthStatus('2026-12')).toEqual(MONTH_ERROR);
    expect(model.getMonthStatus('2027-01')).toEqual(MONTH_IDLE);
    expect(model.getMonthStatus('2026-10')).toEqual(MONTH_READY);
  });

  it('lists the next free days and the next month with a free date', () => {
    const model = modelFor('48-hours');
    expect(model.getNextFreeDays()).toEqual(['2026-11-04', '2026-11-05', '2026-11-06']);
    const fullyBooked = monthly({
      '2026-11': { timeSlots: [], fetchTimeSlotsInProgress: false },
    });
    const m = modelFor('48-hours', fullyBooked);
    expect(m.getMonthFreeDays('2026-11')).toHaveLength(0);
    expect(m.findNextMonthWithFree('2026-11')).toEqual('2026-12');
    expect(m.getNextFreeDays(2)).toEqual(['2026-12-01', '2026-12-02']);
  });

  it('never skips past a month that has not loaded when listing next free days', () => {
    const gap = {
      '2026-11': { timeSlots: [], fetchTimeSlotsInProgress: false },
      '2026-12': { fetchTimeSlotsInProgress: true },
      '2027-01': {
        timeSlots: [slot(6, '2027-01-04', '2027-01-10')],
        fetchTimeSlotsInProgress: false,
      },
    };
    const model = modelFor(undefined, gap);
    expect(model.getNextFreeDays()).toEqual([]);
    expect(model.findNextMonthWithFree('2026-11')).toBeNull();
  });

  it('fetches a month the way the picker does: from now, and never past the window', () => {
    const range = getMonthFetchRange({
      monthId: '2026-11',
      timeZone: TZ,
      dayCountAvailableForBooking: 90,
      now: NOW,
    });
    expect(range.start).toEqual(NOW);
    expect(range.end.toISOString()).toEqual('2026-12-01T00:00:00.000Z');
    const last = getMonthFetchRange({
      monthId: '2027-01',
      timeZone: TZ,
      dayCountAvailableForBooking: 90,
      now: NOW,
    });
    expect(last.end.toISOString()).toEqual('2027-01-30T00:00:00.000Z');
    expect(
      getMonthFetchRange({
        monthId: '2027-03',
        timeZone: TZ,
        dayCountAvailableForBooking: 90,
        now: NOW,
      })
    ).toBeNull();
  });
});
