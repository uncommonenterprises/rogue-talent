import {
  COMPANY_CHECKLIST,
  MODEL_CHECKLIST,
  SOLE_TRADER_CHECKLIST,
  QUEUE_TAB_ALL,
  QUEUE_TAB_CLIENTS,
  QUEUE_TAB_DECIDED,
  QUEUE_TAB_MODELS,
  filterQueueItems,
  formatUkDate,
  getChecklistIds,
  getCompaniesHouseSearchUrl,
  getLongestWaitDays,
  getStatusChipStyle,
  getTimeAgo,
  getUserFieldOptionLabel,
  hasReviewerRole,
  isReviewBusyError,
  isReviewNoAccessError,
  toReviewError,
} from './reviewTool';

describe('reviewTool', () => {
  it('formats dates as DD/MM/YYYY in UK time', () => {
    expect(formatUkDate('2026-11-02T12:00:00Z')).toBe('02/11/2026');
    // 23:30 UTC on 30/06 is 00:30 on 01/07 in BST
    expect(formatUkDate('2026-06-30T23:30:00Z')).toBe('01/07/2026');
    expect(formatUkDate(null)).toBeNull();
    expect(formatUkDate('nonsense')).toBeNull();
  });

  it('describes how long ago', () => {
    const now = new Date('2026-11-04T15:00:00Z');
    expect(getTimeAgo('2026-11-04T14:30:00Z', now)).toEqual({ unit: 'justNow', count: 0 });
    expect(getTimeAgo('2026-11-04T12:00:00Z', now)).toEqual({ unit: 'hours', count: 3 });
    expect(getTimeAgo('2026-10-30T12:00:00Z', now)).toEqual({ unit: 'days', count: 5 });
    expect(getTimeAgo(undefined, now)).toBeNull();
  });

  it('gives the longest wait in days', () => {
    const now = new Date('2026-11-04T15:00:00Z');
    expect(
      getLongestWaitDays(
        [{ submittedAt: '2026-11-03T15:00:00Z' }, { submittedAt: '2026-10-30T15:00:00Z' }],
        now
      )
    ).toBe(5);
    expect(getLongestWaitDays([], now)).toBeNull();
  });

  it('picks the checklist for models, companies and sole traders', () => {
    expect(getChecklistIds({ kind: 'model' })).toBe(MODEL_CHECKLIST);
    expect(getChecklistIds({ kind: 'client', business: { businessType: 'limited_company' } })).toBe(
      COMPANY_CHECKLIST
    );
    expect(getChecklistIds({ kind: 'client', business: { businessType: 'sole_trader' } })).toBe(
      SOLE_TRADER_CHECKLIST
    );
    [MODEL_CHECKLIST, COMPANY_CHECKLIST, SOLE_TRADER_CHECKLIST].forEach(list =>
      expect(list).toHaveLength(5)
    );
    expect(MODEL_CHECKLIST).toContain('noNudity');
  });

  it('filters queue rows by tab; Recently decided is empty in stage 1', () => {
    const items = [{ type: 'model' }, { type: 'client' }, { type: 'model' }];
    expect(filterQueueItems(items, QUEUE_TAB_ALL)).toHaveLength(3);
    expect(filterQueueItems(items, QUEUE_TAB_MODELS)).toHaveLength(2);
    expect(filterQueueItems(items, QUEUE_TAB_CLIENTS)).toHaveLength(1);
    expect(filterQueueItems(items, QUEUE_TAB_DECIDED)).toEqual([]);
    expect(filterQueueItems(null, QUEUE_TAB_ALL)).toEqual([]);
  });

  it('builds the Companies House search link', () => {
    expect(getCompaniesHouseSearchUrl(' 01234567 ')).toBe(
      'https://find-and-update.company-information.service.gov.uk/search/companies?q=01234567'
    );
    expect(getCompaniesHouseSearchUrl('SC 12&3')).toBe(
      'https://find-and-update.company-information.service.gov.uk/search/companies?q=SC%2012%263'
    );
    expect(getCompaniesHouseSearchUrl('')).toBeNull();
  });

  it('maps status words to the rt-status chip styles (no new colours)', () => {
    expect(getStatusChipStyle('verified')).toBe('accepted');
    expect(getStatusChipStyle('in-progress')).toBe('requested');
    expect(getStatusChipStyle('not-started')).toBe('cancelled');
    expect(getStatusChipStyle('unknown')).toBe('cancelled');
  });

  it('recognises the no-access and busy responses', () => {
    const noAccess = toReviewError(Object.assign(new Error(), { error: 'not-found', status: 404 }));
    expect(noAccess).toEqual({ error: 'not-found', status: 404 });
    expect(isReviewNoAccessError(noAccess)).toBe(true);
    expect(isReviewBusyError(noAccess)).toBe(false);
    const busy = toReviewError({ error: 'busy', status: 503 });
    expect(isReviewBusyError(busy)).toBe(true);
    expect(isReviewNoAccessError(busy)).toBe(false);
    expect(toReviewError(new Error('network'))).toEqual({ error: null, status: null });
  });

  it('reads the reviewer role from metadata only', () => {
    const user = (profile = {}) => ({ attributes: { profile } });
    expect(hasReviewerRole(user({ metadata: { roles: ['reviewer'] } }))).toBe(true);
    expect(hasReviewerRole(user({ publicData: { roles: ['reviewer'] } }))).toBe(false);
    expect(hasReviewerRole(null)).toBe(false);
  });

  it('labels an enum user field option from config', () => {
    const config = {
      user: {
        userFields: [{ key: 'industry', enumOptions: [{ option: 'film-tv', label: 'Film/TV' }] }],
      },
    };
    expect(getUserFieldOptionLabel(config, 'industry', 'film-tv')).toBe('Film/TV');
    expect(getUserFieldOptionLabel(config, 'industry', 'unknown')).toBe('unknown');
    expect(getUserFieldOptionLabel(config, 'industry', null)).toBeNull();
  });
});
