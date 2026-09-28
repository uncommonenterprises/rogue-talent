import {
  createAllOpenPlan,
  defaultAvailabilityPlanMaybe,
  DEFAULT_AVAILABILITY_TIMEZONE,
} from './availability.helpers';

// The exact "available by default" plan (RT-FB-10). Pinned as a literal so any drift in the
// shape (e.g. switching to 'availability-plan/day', or dropping a day) fails loudly.
const EXPECTED_LONDON_PLAN = {
  availabilityPlan: {
    type: 'availability-plan/time',
    timezone: 'Europe/London',
    entries: [
      { dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', seats: 1 },
      { dayOfWeek: 'mon', startTime: '00:00', endTime: '00:00', seats: 1 },
      { dayOfWeek: 'tue', startTime: '00:00', endTime: '00:00', seats: 1 },
      { dayOfWeek: 'wed', startTime: '00:00', endTime: '00:00', seats: 1 },
      { dayOfWeek: 'thu', startTime: '00:00', endTime: '00:00', seats: 1 },
      { dayOfWeek: 'fri', startTime: '00:00', endTime: '00:00', seats: 1 },
      { dayOfWeek: 'sat', startTime: '00:00', endTime: '00:00', seats: 1 },
    ],
  },
};

describe('availability.helpers default plan', () => {
  it('createAllOpenPlan builds a full-day, 1-seat, 7-day time-based plan', () => {
    expect(createAllOpenPlan('Europe/London')).toEqual(EXPECTED_LONDON_PLAN);
  });

  it('the default time zone is Europe/London', () => {
    expect(DEFAULT_AVAILABILITY_TIMEZONE).toEqual('Europe/London');
  });

  it('defaultAvailabilityPlanMaybe adds the London plan when there is no listing yet', () => {
    expect(defaultAvailabilityPlanMaybe(null)).toEqual(EXPECTED_LONDON_PLAN);
    expect(defaultAvailabilityPlanMaybe({ attributes: {} })).toEqual(EXPECTED_LONDON_PLAN);
  });

  it('defaultAvailabilityPlanMaybe never overwrites an existing plan', () => {
    const existingPlan = {
      type: 'availability-plan/time',
      timezone: 'Europe/Paris',
      entries: [],
    };
    expect(
      defaultAvailabilityPlanMaybe({ attributes: { availabilityPlan: existingPlan } })
    ).toEqual({});
  });
});

// The backfill ops script (CommonJS) can't import this ES module, so it mirrors the plan.
// These tests lock the two together and cover its "only planless model profiles" filter.
// They only import pure functions - nothing here talks to a marketplace.
describe('scripts/ops/backfill-availability-plans.js', () => {
  const backfill = require('../../../../../scripts/ops/backfill-availability-plans');

  it('builds exactly createAllOpenPlan(DEFAULT_AVAILABILITY_TIMEZONE)', () => {
    expect(backfill.DEFAULT_AVAILABILITY_TIMEZONE).toEqual(DEFAULT_AVAILABILITY_TIMEZONE);
    expect(backfill.buildDefaultAvailabilityPlan(backfill.DEFAULT_AVAILABILITY_TIMEZONE)).toEqual(
      createAllOpenPlan(DEFAULT_AVAILABILITY_TIMEZONE).availabilityPlan
    );
  });

  it('only ever targets the test marketplace', () => {
    expect(backfill.REQUIRED_MARKETPLACE_ID).toEqual('ndstealth1-test');
  });

  it('selects only live model-profile listings with no plan', () => {
    const listing = attributes => ({ attributes: { deleted: false, ...attributes } });
    const modelProfile = { publicData: { listingType: 'model-profile' } };
    const openPlan = createAllOpenPlan('Etc/UTC').availabilityPlan;
    const closedPlan = { type: 'availability-plan/time', timezone: 'Etc/UTC', entries: [] };

    expect(backfill.needsBackfill(listing({ ...modelProfile, availabilityPlan: null }))).toBe(true);
    expect(backfill.needsBackfill(listing({ ...modelProfile }))).toBe(true);
    expect(backfill.needsBackfill(listing({ ...modelProfile, availabilityPlan: openPlan }))).toBe(
      false
    );
    expect(backfill.needsBackfill(listing({ ...modelProfile, availabilityPlan: closedPlan }))).toBe(
      false
    );
    const otherType = { publicData: { listingType: 'other' }, availabilityPlan: null };
    expect(backfill.needsBackfill(listing(otherType))).toBe(false);
    const deleted = { ...modelProfile, availabilityPlan: null, deleted: true };
    expect(backfill.needsBackfill(listing(deleted))).toBe(false);
  });

  it('is a dry run unless --apply is passed', () => {
    expect(backfill.parseArgs([])).toEqual({ apply: false, confirmMarketplace: null });
    expect(backfill.parseArgs(['--apply', '--confirm-marketplace=abc-123'])).toEqual({
      apply: true,
      confirmMarketplace: 'abc-123',
    });
  });
});
