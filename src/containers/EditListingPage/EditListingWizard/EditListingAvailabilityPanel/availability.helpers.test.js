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
