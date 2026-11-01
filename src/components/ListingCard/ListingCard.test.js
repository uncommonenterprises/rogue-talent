import React from 'react';
import '@testing-library/jest-dom';

import { getHostedConfiguration, renderWithProviders as render } from '../../util/testHelpers';
import { createUser, createListing, fakeIntl } from '../../util/testData';

import { ListingCard } from './ListingCard';

const getConfig = () => {
  const hostedConfig = getHostedConfiguration();
  return {
    ...hostedConfig,
    listingTypes: {
      listingTypes: [
        {
          id: 'free-inquiry',
          transactionProcess: {
            name: 'default-inquiry',
            alias: 'default-inquiry/release-1',
          },
          unitType: 'inquiry',
          defaultListingFields: {
            price: false,
          },
        },
      ],
    },
  };
};

describe('ListingCard', () => {
  it('matches snapshot', () => {
    // This is quite small component what comes to rendered HTML
    // For now, we rely on snapshot-testing.
    const listing = createListing('listing1', {}, { author: createUser('user1') });
    const tree = render(<ListingCard listing={listing} intl={fakeIntl} />);
    expect(tree.asFragment().firstChild).toMatchSnapshot();
  });

  it('matches snapshot without price', () => {
    const config = getConfig();
    const listing = createListing(
      'listing1',
      { publicData: { listingType: 'free-inquiry' } },
      { author: createUser('user1') }
    );
    const tree = render(<ListingCard listing={listing} intl={fakeIntl} />, { config });
    expect(tree.asFragment().firstChild).toMatchSnapshot();
  });

  describe('Verified badge (retired, B01 / open question 1)', () => {
    const verifiedAuthor = createUser('user1', {
      profile: {
        displayName: 'user1 display name',
        metadata: { id_verified: 'verified' },
      },
    });
    const verifiedListing = createListing('listing1', {}, { author: verifiedAuthor });

    const originalFlag = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    afterEach(() => {
      if (originalFlag === undefined) {
        delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
      } else {
        process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = originalFlag;
      }
    });

    it('never renders the per-card Verified badge, whatever the flow flag', () => {
      delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
      const off = render(<ListingCard listing={verifiedListing} intl={fakeIntl} />);
      expect(off.queryByText('VerifiedBadge.label')).not.toBeInTheDocument();
      off.unmount();
      process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
      const on = render(<ListingCard listing={verifiedListing} intl={fakeIntl} />);
      expect(on.queryByText('VerifiedBadge.label')).not.toBeInTheDocument();
    });
  });

  describe('search variant (B01)', () => {
    const listing = createListing(
      'listing1',
      {
        publicData: {
          location: { address: 'Manchester, UK' },
          modelling_categories: ['fashion', 'editorial', 'commercial', 'beauty'],
        },
      },
      { author: createUser('user1') }
    );

    it('shows the city only and two categories plus a count', () => {
      const { getByText, queryByText } = render(
        <ListingCard listing={listing} intl={fakeIntl} variant="search" />
      );
      expect(getByText('Manchester')).toBeInTheDocument();
      expect(queryByText('Manchester, UK')).not.toBeInTheDocument();
      expect(getByText('ListingCard.moreCategories')).toBeInTheDocument();
    });

    it('shows "free on your dates" only when asked to', () => {
      const without = render(<ListingCard listing={listing} intl={fakeIntl} variant="search" />);
      expect(without.queryByText('ListingCard.freeOnYourDates')).not.toBeInTheDocument();
      without.unmount();
      const withDates = render(
        <ListingCard listing={listing} intl={fakeIntl} variant="search" showAvailability />
      );
      expect(withDates.getByText('ListingCard.freeOnYourDates')).toBeInTheDocument();
      expect(withDates.getByText('ListingCard.free')).toBeInTheDocument();
    });
  });
});
