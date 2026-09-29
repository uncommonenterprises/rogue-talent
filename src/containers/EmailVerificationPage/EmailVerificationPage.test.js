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

const userWithType = (userType, attributes = {}, privateData = {}) => {
  const user = createCurrentUser('user-1');
  return {
    ...user,
    attributes: {
      ...user.attributes,
      emailVerified: true,
      pendingEmail: null,
      ...attributes,
      profile: { ...user.attributes.profile, publicData: { userType }, privateData },
    },
  };
};

// A client who has already submitted "Your business details" (screen 18).
const submittedClient = () =>
  userWithType('client', {}, { businessDetailsSubmittedAt: '2026-09-30T10:00:00.000Z' });

// Renders the current router location so the redirect target can be asserted.
const LocationProbe = () => (
  <Route render={({ location }) => <p data-testid="location">{location.pathname}</p>} />
);

describe('EmailVerificationPage - where the user lands after verifying (screen 05)', () => {
  it('sends a new client on to Your business details (screen 18)', () => {
    expect(getVerifiedDestinationRouteName(userWithType('client'))).toBe('BusinessDetailsPage');
  });

  it('sends a client who has submitted business details to Browse models, not the homepage', () => {
    expect(getVerifiedDestinationRouteName(submittedClient())).toBe('SearchPage');
  });

  it('sends models to the profile wizard', () => {
    expect(getVerifiedDestinationRouteName(userWithType('model'))).toBe('NewListingPage');
  });

  it('redirects a verified client with business details submitted to the search page', () => {
    render(
      <>
        <EmailVerificationPageComponent
          currentUser={submittedClient()}
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
