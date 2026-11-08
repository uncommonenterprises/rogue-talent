import {
  formatBookingDay,
  getInclusiveDayCount,
  findFirstUnavailableDay,
  getPickedStartFormValue,
} from './bookingDates.helpers';

describe('booking calendar helpers', () => {
  it('formats a day as "Wed 25 Nov"', () => {
    const intl = { formatDate: (d, o) => new Intl.DateTimeFormat('en-GB', o).format(d) };
    expect(formatBookingDay(intl, new Date(2026, 10, 25))).toEqual('Wed 25 Nov');
  });

  it('counts the end date as a full day', () => {
    expect(getInclusiveDayCount(new Date(2026, 10, 25), new Date(2026, 10, 26))).toEqual(2);
    expect(getInclusiveDayCount(new Date(2026, 10, 25), new Date(2026, 10, 25))).toEqual(1);
    expect(getInclusiveDayCount(new Date(2026, 9, 24), new Date(2026, 10, 2))).toEqual(10);
  });

  it('finds the first unavailable day in a range', () => {
    const blocked = new Date(2026, 10, 17);
    const isUnavailable = d => d.getTime() === blocked.getTime();
    const range = [new Date(2026, 10, 9), new Date(2026, 10, 20)];
    expect(findFirstUnavailableDay(range, isUnavailable)).toEqual(blocked);
    expect(findFirstUnavailableDay([range[1], range[0]], isUnavailable)).toEqual(blocked);
    expect(
      findFirstUnavailableDay([new Date(2026, 10, 9), new Date(2026, 10, 13)], isUnavailable)
    ).toBeNull();
    expect(findFirstUnavailableDay(null, isUnavailable)).toBeNull();
  });

  it('turns a date handed over from the profile calendar into a start date with no end yet', () => {
    // Start of that day in the listing's time zone, the same value a picker click produces
    expect(getPickedStartFormValue('2026-11-24', 'Europe/London')).toEqual({
      startDate: new Date('2026-11-24T00:00:00.000Z'),
      endDate: null,
    });
    expect(
      getPickedStartFormValue('2026-11-24', 'Europe/Helsinki').startDate.toISOString()
    ).toEqual('2026-11-23T22:00:00.000Z');
    // British Summer Time
    expect(getPickedStartFormValue('2026-07-01', 'Europe/London').startDate.toISOString()).toEqual(
      '2026-06-30T23:00:00.000Z'
    );
    expect(getPickedStartFormValue('24/11/2026', 'Europe/London')).toBeNull();
    expect(getPickedStartFormValue('2026-11-24', null)).toBeNull();
  });
});
