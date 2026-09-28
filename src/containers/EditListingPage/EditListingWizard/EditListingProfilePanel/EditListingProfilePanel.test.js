import { types as sdkTypes } from '../../../../util/sdkLoader';

import { getProfileListingValues } from './EditListingProfilePanel';

const { LatLng } = sdkTypes;

const config = {
  listing: {
    listingTypes: [
      {
        listingType: 'model-profile',
        transactionType: {
          process: 'default-booking',
          alias: 'default-booking/release-1',
          unitType: 'day',
        },
      },
    ],
  },
};

const formValues = {
  title: '  Lucy S.  ',
  address: 'London, UK',
  origin: new LatLng(51.5072, -0.1276),
};

describe('EditListingProfilePanel getProfileListingValues', () => {
  it('creates the draft payload with the available-by-default plan (RT-FB-10)', () => {
    expect(getProfileListingValues(formValues, null, config)).toEqual({
      title: 'Lucy S.',
      geolocation: new LatLng(51.5072, -0.1276),
      availabilityPlan: {
        type: 'availability-plan/time',
        timezone: 'Europe/London',
        entries: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(dayOfWeek => ({
          dayOfWeek,
          startTime: '00:00',
          endTime: '00:00',
          seats: 1,
        })),
      },
      publicData: {
        listingType: 'model-profile',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
        location: { address: 'London, UK' },
      },
    });
  });

  it('does not touch the availability plan of a listing that already has one', () => {
    const listing = {
      id: { uuid: 'listing-1' },
      attributes: {
        availabilityPlan: { type: 'availability-plan/time', timezone: 'Etc/UTC', entries: [] },
        publicData: {
          listingType: 'model-profile',
          transactionProcessAlias: 'default-booking/release-1',
          unitType: 'day',
        },
      },
    };
    const values = getProfileListingValues(formValues, listing, config);
    expect(values).not.toHaveProperty('availabilityPlan');
    expect(values.title).toEqual('Lucy S.');
  });
});
