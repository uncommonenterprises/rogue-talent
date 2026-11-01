import {
  formatDay,
  formatDayTime,
  getDailyRange,
  getRequestSentAt,
  getReplyByDeadline,
} from './bookingSummary';

const intl = { formatDate: (d, o) => new Intl.DateTimeFormat('en-GB', o).format(d) };

const tx = ({ transitions = [], start } = {}) => ({
  attributes: { transitions },
  booking: start ? { attributes: { start } } : undefined,
});

describe('bookingSummary', () => {
  it('formats days and times in the listing time zone', () => {
    const d = new Date('2026-11-03T16:20:00Z');
    expect(formatDay(intl, d, 'Europe/London')).toEqual('Tue 3 Nov');
    expect(formatDayTime(intl, d, 'Europe/London')).toEqual('Tue 3 Nov, 16:20');
    // British Summer Time: 15:20 UTC is 16:20 in London
    expect(formatDayTime(intl, new Date('2026-07-01T15:20:00Z'), 'Europe/London')).toEqual(
      'Wed 1 Jul, 16:20'
    );
  });

  it('turns the exclusive end of a daily booking into the last day and a day count', () => {
    const range = getDailyRange(new Date('2026-11-25T00:00:00Z'), new Date('2026-11-27T00:00:00Z'));
    expect(range.dayCount).toEqual(2);
    expect(range.lastDay).toEqual(new Date('2026-11-26T00:00:00Z'));
    expect(getDailyRange(null, null)).toBeNull();
  });

  it('uses the payment confirmation time as the moment the request was sent', () => {
    const transaction = tx({
      transitions: [
        { transition: 'transition/request-payment', createdAt: new Date('2026-11-01T16:19:00Z') },
        { transition: 'transition/confirm-payment', createdAt: new Date('2026-11-01T16:20:00Z') },
      ],
    });
    expect(getRequestSentAt(transaction)).toEqual(new Date('2026-11-01T16:20:00Z'));
    expect(getRequestSentAt(tx())).toBeNull();
  });

  it('reply-by is 48 hours after the request when the shoot is later', () => {
    const transaction = tx({
      transitions: [
        { transition: 'transition/confirm-payment', createdAt: new Date('2026-11-01T16:20:00Z') },
      ],
      start: new Date('2026-11-25T00:00:00Z'),
    });
    expect(getReplyByDeadline(transaction)).toEqual({
      deadline: new Date('2026-11-03T16:20:00Z'),
      kind: 'window',
    });
  });

  it('reply-by is the shoot start when that comes first', () => {
    const transaction = tx({
      transitions: [
        { transition: 'transition/confirm-payment', createdAt: new Date('2026-11-01T16:20:00Z') },
      ],
      start: new Date('2026-11-02T00:00:00Z'),
    });
    expect(getReplyByDeadline(transaction)).toEqual({
      deadline: new Date('2026-11-02T00:00:00Z'),
      kind: 'shootStart',
    });
    expect(getReplyByDeadline(tx())).toBeNull();
  });
});
