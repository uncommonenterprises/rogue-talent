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

  describe('Verified badge (account-status lifecycle §9)', () => {
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

    it('renders the Verified badge for a verified model when the flow flag is OFF (today)', () => {
      delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
      const { queryByText } = render(<ListingCard listing={verifiedListing} intl={fakeIntl} />);
      expect(queryByText('VerifiedBadge.label')).toBeInTheDocument();
    });

    it('does NOT render the Verified badge when the flow flag is ON (Verified-only visibility)', () => {
      process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
      const { queryByText } = render(<ListingCard listing={verifiedListing} intl={fakeIntl} />);
      expect(queryByText('VerifiedBadge.label')).not.toBeInTheDocument();
    });
  });
});
