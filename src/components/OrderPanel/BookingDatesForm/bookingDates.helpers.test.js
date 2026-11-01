import {
  formatBookingDay,
  getInclusiveDayCount,
  findFirstUnavailableDay,
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
});
