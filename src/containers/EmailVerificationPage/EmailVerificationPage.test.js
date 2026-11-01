import React from 'react';
import '@testing-library/jest-dom';
import { Route } from 'react-router-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { createCurrentUser, createOwnListing } from '../../util/testData';
import { LISTING_STATE_DRAFT, LISTING_STATE_PENDING_APPROVAL } from '../../util/types';

import { EmailVerificationPageComponent, getVerifiedDestination } from './EmailVerificationPage';

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

const draftListing = () =>
  createOwnListing('draft-1', { state: LISTING_STATE_DRAFT, title: 'Ava C', publicData: {} });
const pendingListing = () =>
  createOwnListing('listing-1', { state: LISTING_STATE_PENDING_APPROVAL, title: 'Ava C' });

const renderPage = props =>
  render(
    <>
      <EmailVerificationPageComponent
        isVerified
        emailVerificationInProgress={false}
        verificationError={null}
        submitVerification={() => null}
        scrollingDisabled={false}
        location={{ search: '?t=token' }}
        {...props}
      />
      <LocationProbe />
    </>
  );

describe('EmailVerificationPage - where the user lands after verifying (screen 05)', () => {
  it('sends a new client on to Your business details (screen 18)', () => {
    expect(getVerifiedDestination({ user: userWithType('client') })).toEqual({
      name: 'BusinessDetailsPage',
    });
  });

  it('sends a client who has submitted business details to Browse models, not the homepage', () => {
    expect(getVerifiedDestination({ user: submittedClient() })).toEqual({ name: 'SearchPage' });
  });

  it('sends a model with no profile yet to create one', () => {
    const destination = getVerifiedDestination({
      user: userWithType('model'),
      profileListing: null,
    });
    expect(destination).toEqual({ name: 'NewListingPage' });
  });

  it('sends a model with a draft back to that draft, not a blank new profile (finding 1)', () => {
    const destination = getVerifiedDestination({
      user: userWithType('model'),
      profileListing: draftListing(),
      config: { listing: { listingTypes: [], listingFields: [] } },
    });
    expect(destination.name).toBe('EditListingPage');
    expect(destination.params).toMatchObject({ id: 'draft-1', type: 'draft' });
  });

  it('sends a model who has submitted to their account status (flag on)', () => {
    const destination = getVerifiedDestination({
      user: userWithType('model'),
      profileListing: pendingListing(),
      flagEnabled: true,
    });
    expect(destination).toEqual({ name: 'AccountStatusPage' });
  });

  it('sends a model who has submitted to the Your profile dashboard (flag off)', () => {
    const destination = getVerifiedDestination({
      user: userWithType('model'),
      profileListing: pendingListing(),
      flagEnabled: false,
    });
    expect(destination).toEqual({ name: 'ManageListingsPage' });
  });

  it("renders a redirect to the model's draft once their listing has been looked up", () => {
    renderPage({ currentUser: userWithType('model'), profileListing: draftListing() });
    expect(screen.getByTestId('location').textContent).toMatch(/^\/l\/ava-c\/draft-1\/draft\//);
  });

  it("waits (no redirect) while a model's listing is still being looked up", () => {
    renderPage({
      currentUser: userWithType('model'),
      profileListing: null,
      profileListingReady: false,
    });
    // Still on the verify page (the MemoryRouter starts at "/"), showing the loading line.
    expect(screen.getByTestId('location').textContent).toBe('/');
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
