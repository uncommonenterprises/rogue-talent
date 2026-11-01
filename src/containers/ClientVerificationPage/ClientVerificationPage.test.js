import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { createCurrentUser } from '../../util/testData';

import { ClientVerificationPageComponent } from './ClientVerificationPage';

const { screen } = testingLibrary;

// A client with the server-written Stripe Identity flag and an optional operator review decision.
const client = ({ identityVerified = false, reviewDecision } = {}) => {
  const user = createCurrentUser('client-1');
  return {
    ...user,
    attributes: {
      ...user.attributes,
      profile: {
        ...user.attributes.profile,
        publicData: { userType: 'client' },
        metadata: {
          ...(identityVerified ? { identity_verified: true } : {}),
          ...(reviewDecision ? { reviewDecision } : {}),
        },
      },
    },
  };
};

const renderPage = currentUser =>
  render(
    <ClientVerificationPageComponent
      scrollingDisabled={false}
      currentUser={currentUser}
      createSessionInProgress={false}
      createSessionError={null}
      alreadyVerified={false}
      onCreateSession={() => null}
      onRefreshUser={() => null}
    />
  );

// Run-through 01/11/2026, findings 5 and 6.
describe('ClientVerificationPage (/verify-identity)', () => {
  const originalFlag = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
  afterEach(() => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = originalFlag;
  });

  it('before verifying: explains the check and offers the Stripe button', () => {
    renderPage(client());
    expect(
      screen.getByRole('heading', { level: 1, name: 'ClientVerificationPage.heading' })
    ).toBeInTheDocument();
    expect(screen.getByText('ClientVerificationPage.pointStripe')).toBeInTheDocument();
    expect(screen.getByText('ClientVerificationPage.pointPrivacy')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ClientVerificationPage.verifyButton' })
    ).toBeInTheDocument();
  });

  it('verified but not yet approved: no "you can now book", points to account status', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
    renderPage(client({ identityVerified: true }));
    expect(screen.getByText('ClientVerificationPage.verifiedNotApprovedBody')).toBeInTheDocument();
    expect(screen.queryByText('ClientVerificationPage.verifiedBody')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'ClientVerificationPage.accountStatusLink' })
    ).toHaveAttribute('href', '/account-status');
    expect(
      screen.queryByRole('link', { name: 'ClientVerificationPage.browseModels' })
    ).not.toBeInTheDocument();
  });

  it('verified and approved (account status Verified): ready to book', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
    renderPage(client({ identityVerified: true, reviewDecision: 'approved' }));
    expect(screen.getByText('ClientVerificationPage.verifiedBody')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'ClientVerificationPage.browseModels' })
    ).toHaveAttribute('href', '/s');
  });

  it('verified but declined at review: never claims a review is still coming', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
    renderPage(client({ identityVerified: true, reviewDecision: 'declined' }));
    expect(screen.getByText('ClientVerificationPage.verifiedDeclinedBody')).toBeInTheDocument();
    expect(
      screen.queryByText('ClientVerificationPage.verifiedNotApprovedBody')
    ).not.toBeInTheDocument();
  });

  it('with the account-status flow off: verified means ready to book, as before', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'false';
    renderPage(client({ identityVerified: true }));
    expect(screen.getByText('ClientVerificationPage.verifiedBody')).toBeInTheDocument();
  });
});
