import React from 'react';
import '@testing-library/jest-dom';

import { fakeIntl, createOwnListing } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingAvailabilityPanel from './EditListingAvailabilityPanel';
import { createAllOpenPlan } from './availability.helpers';

const { waitFor } = testingLibrary;

const noop = () => null;

describe('EditListingAvailabilityPanel', () => {
  // RT-FB-10 follow-up: a listing without a plan gets the available-by-default baseline in
  // Europe/London (same as profile-draft creation), never the model's browser time zone.
  it('saves a Europe/London baseline plan for a listing that has none', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    const listing = createOwnListing('listing-no-plan', {
      availabilityPlan: null,
      publicData: {
        listingType: 'rent-bicycles',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
      },
    });

    render(
      <EditListingAvailabilityPanel
        listing={listing}
        allExceptions={[]}
        monthlyExceptionQueries={{}}
        onFetchExceptions={() => Promise.resolve()}
        onAddAvailabilityException={noop}
        onDeleteAvailabilityException={noop}
        onSubmit={onSubmit}
        onManageDisableScrolling={noop}
        disabled={false}
        ready={false}
        updateInProgress={false}
        errors={{}}
        config={{ localization: { firstDayOfWeek: 1 }, listing: { listingFields: [] } }}
        updatePageTitle={() => null}
        intl={fakeIntl}
      />
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(createAllOpenPlan('Europe/London'));
  });

  it('does not overwrite an existing plan', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    const listing = createOwnListing('listing-with-plan', {
      publicData: {
        listingType: 'rent-bicycles',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
      },
    });

    render(
      <EditListingAvailabilityPanel
        listing={listing}
        allExceptions={[]}
        monthlyExceptionQueries={{}}
        onFetchExceptions={() => Promise.resolve()}
        onAddAvailabilityException={noop}
        onDeleteAvailabilityException={noop}
        onSubmit={onSubmit}
        onManageDisableScrolling={noop}
        disabled={false}
        ready={false}
        updateInProgress={false}
        errors={{}}
        config={{ localization: { firstDayOfWeek: 1 }, listing: { listingFields: [] } }}
        updatePageTitle={() => null}
        intl={fakeIntl}
      />
    );

    // Give effects a chance to run, then confirm nothing was saved.
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
