import React from 'react';
import '@testing-library/jest-dom';
import { Route } from 'react-router-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { createCurrentUser } from '../../util/testData';

import {
  EmailVerificationPageComponent,
  getVerifiedDestinationRouteName,
} from './EmailVerificationPage';

const { screen } = testingLibrary;

const userWithType = (userType, attributes = {}) => {
  const user = createCurrentUser('user-1');
  return {
    ...user,
    attributes: {
      ...user.attributes,
      emailVerified: true,
      pendingEmail: null,
      ...attributes,
      profile: { ...user.attributes.profile, publicData: { userType } },
    },
  };
};

// Renders the current router location so the redirect target can be asserted.
const LocationProbe = () => (
  <Route render={({ location }) => <p data-testid="location">{location.pathname}</p>} />
);

describe('EmailVerificationPage - where the user lands after verifying (screen 05)', () => {
  it('sends clients to Browse models (SearchPage), not the marketing homepage', () => {
    expect(getVerifiedDestinationRouteName(userWithType('client'))).toBe('SearchPage');
  });

  it('sends models to the profile wizard', () => {
    expect(getVerifiedDestinationRouteName(userWithType('model'))).toBe('NewListingPage');
  });

  it('redirects a verified client to the search page', () => {
    render(
      <>
        <EmailVerificationPageComponent
          currentUser={userWithType('client')}
          isVerified
          emailVerificationInProgress={false}
          verificationError={null}
          submitVerification={() => null}
          scrollingDisabled={false}
          location={{ search: '?t=token' }}
        />
        <LocationProbe />
      </>
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/s');
  });
});
