import {
  getModelCity,
  getModelFirstName,
  getMinNoticeHours,
  isInsideMinimumNotice,
  isDayInsideNoticeWindow,
} from './modelProfile';

describe('modelProfile helpers', () => {
  describe('getModelCity', () => {
    it('returns the city part of a city-level address', () => {
      expect(getModelCity({ location: { address: 'Manchester, UK' } })).toEqual('Manchester');
      expect(getModelCity({ location: { address: 'London' } })).toEqual('London');
    });
    it('returns null when there is no address', () => {
      expect(getModelCity({})).toBeNull();
      expect(getModelCity(undefined)).toBeNull();
      expect(getModelCity({ location: { address: ' ' } })).toBeNull();
    });
  });

  describe('getModelFirstName', () => {
    it('uses the first word of the display name', () => {
      const author = { attributes: { profile: { displayName: 'Ava C' } } };
      expect(getModelFirstName(author, 'Ava C.')).toEqual('Ava');
    });
    it('falls back to the listing title', () => {
      expect(getModelFirstName(null, 'Lucykins')).toEqual('Lucykins');
      expect(getModelFirstName(null, '')).toEqual('');
    });
  });

  describe('getMinNoticeHours', () => {
    it('maps the notice options to hours', () => {
      expect(getMinNoticeHours('same-day')).toEqual(0);
      expect(getMinNoticeHours('48-hours')).toEqual(48);
      expect(getMinNoticeHours('2-weeks')).toEqual(336);
      expect(getMinNoticeHours('unknown')).toBeNull();
      expect(getMinNoticeHours(undefined)).toBeNull();
    });
  });

  describe('isInsideMinimumNotice', () => {
    const now = new Date('2026-11-01T16:00:00Z');
    it('is true when the start day begins inside the notice window', () => {
      const startDate = new Date('2026-11-03T00:00:00Z'); // 32 hours away
      expect(isInsideMinimumNotice({ startDate, noticeKey: '48-hours', now })).toBe(true);
    });
    it('is false when the start day is outside the notice window', () => {
      const startDate = new Date('2026-11-04T00:00:00Z'); // 56 hours away
      expect(isInsideMinimumNotice({ startDate, noticeKey: '48-hours', now })).toBe(false);
    });
    it('is false for same-day notice, unknown notice or no date', () => {
      const startDate = new Date('2026-11-01T00:00:00Z');
      expect(isInsideMinimumNotice({ startDate, noticeKey: 'same-day', now })).toBe(false);
      expect(isInsideMinimumNotice({ startDate, noticeKey: undefined, now })).toBe(false);
      expect(isInsideMinimumNotice({ startDate: null, noticeKey: '48-hours', now })).toBe(false);
    });
  });

  describe('isDayInsideNoticeWindow (enforced notice, shared by calendar and picker)', () => {
    const now = new Date('2026-11-01T16:20:00Z'); // Sun 1 Nov, 16:20 UK time
    const tz = 'Europe/London';
    const day = key => new Date(`${key}T00:00:00Z`); // start of day in the UK (GMT)
    it('holds back today and earlier days whatever the notice', () => {
      expect(isDayInsideNoticeWindow({ dayStart: day('2026-11-01'), timeZone: tz, now })).toBe(
        true
      );
      expect(
        isDayInsideNoticeWindow({
          dayStart: day('2026-10-30'),
          noticeKey: 'same-day',
          timeZone: tz,
          now,
        })
      ).toBe(true);
    });
    it('holds back days that start inside the notice, and frees the rest', () => {
      const check = (key, noticeKey) =>
        isDayInsideNoticeWindow({ dayStart: day(key), noticeKey, timeZone: tz, now });
      expect(check('2026-11-02', '48-hours')).toBe(true);
      expect(check('2026-11-03', '48-hours')).toBe(true);
      expect(check('2026-11-04', '48-hours')).toBe(false);
      expect(check('2026-11-02', 'same-day')).toBe(false);
      expect(check('2026-11-02', undefined)).toBe(false);
    });
    it('is false for a missing day', () => {
      expect(isDayInsideNoticeWindow({ dayStart: null, timeZone: tz, now })).toBe(false);
    });
  });
});
