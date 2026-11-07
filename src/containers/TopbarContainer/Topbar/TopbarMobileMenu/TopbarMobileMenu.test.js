import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';
import { createCurrentUser, createOwnListing } from '../../../../util/testData';
import { LISTING_STATE_DRAFT, LISTING_STATE_PENDING_APPROVAL } from '../../../../util/types';

import { primaryActionLink } from '../TopbarDesktop/CustomLinksMenu/PriorityLinks';
import TopbarMobileMenu from './TopbarMobileMenu';

const { screen } = testingLibrary;

const config = { listing: { listingTypes: [], listingFields: [] } };
const draft = () =>
  createOwnListing('draft-1', { state: LISTING_STATE_DRAFT, title: 'Ava C', publicData: {} });
const pending = () => createOwnListing('l1', { state: LISTING_STATE_PENDING_APPROVAL });

// Run-through 01/11/2026, finding 2 (and M3).
describe('primaryActionLink: "Create your profile" vs "Your profile"', () => {
  it('invites a model with no profile to create one', () => {
    expect(primaryActionLink({ profileListing: null, config })).toMatchObject({
      name: 'NewListingPage',
      labelId: 'TopbarDesktop.createListing',
      hasProfile: false,
    });
  });

  it('says "Your profile" and links to the draft once the model has one', () => {
    const link = primaryActionLink({ profileListing: draft(), config });
    expect(link).toMatchObject({
      name: 'EditListingPage',
      labelId: 'TopbarDesktop.yourProfile',
      hasProfile: true,
    });
    expect(link.params).toMatchObject({ id: 'draft-1', type: 'draft' });
  });

  it('says "Your profile" and links to the dashboard once submitted', () => {
    expect(primaryActionLink({ profileListing: pending(), config })).toMatchObject({
      name: 'ManageListingsPage',
      labelId: 'TopbarDesktop.yourProfile',
      hasProfile: true,
    });
  });

  it('still recognises a published profile from the template flag alone', () => {
    expect(primaryActionLink({ currentUserHasListings: true, config })).toMatchObject({
      name: 'ManageListingsPage',
      labelId: 'TopbarDesktop.yourProfile',
    });
  });
});

describe('TopbarMobileMenu for a logged-in model', () => {
  const renderMenu = props =>
    render(
      <TopbarMobileMenu
        isAuthenticated
        currentUser={createCurrentUser('model-1')}
        isProvider
        isCustomer={false}
        notificationCount={0}
        customLinks={[]}
        onLogout={() => null}
        showCreateListingsLink
        inboxTab="sales"
        currentPage="LandingPage"
        {...props}
      />
    );

  it('without a profile: shows the big "Create your profile" button', () => {
    renderMenu({ primaryLink: primaryActionLink({ profileListing: null, config }) });
    expect(screen.getByRole('link', { name: 'TopbarDesktop.createListing' })).toHaveAttribute(
      'href',
      '/l/new'
    );
    expect(
      screen.getByRole('link', { name: 'TopbarMobileMenu.yourListingsLink' })
    ).toBeInTheDocument();
  });

  it('with a draft: no "Create your profile" button, "Your profile" goes to the draft', () => {
    renderMenu({ primaryLink: primaryActionLink({ profileListing: draft(), config }) });
    expect(
      screen.queryByRole('link', { name: 'TopbarDesktop.createListing' })
    ).not.toBeInTheDocument();
    const yourProfile = screen.getByRole('link', { name: 'TopbarMobileMenu.yourListingsLink' });
    expect(yourProfile.getAttribute('href')).toMatch(/^\/l\/ava-c\/draft-1\/draft\//);
  });

  it('shows "Account status" only when asked to (account-status flow on)', () => {
    const primaryLink = primaryActionLink({ profileListing: pending(), config });
    const { unmount } = renderMenu({ primaryLink, showAccountStatusLink: true });
    expect(
      screen.getByRole('link', { name: 'TopbarMobileMenu.accountStatusLink' })
    ).toHaveAttribute('href', '/account-status');
    unmount();

    renderMenu({ primaryLink, showAccountStatusLink: false });
    expect(
      screen.queryByRole('link', { name: 'TopbarMobileMenu.accountStatusLink' })
    ).not.toBeInTheDocument();
  });

  // Tester F F5 part C: Topbar passes showProfileSettingsLink={false} for models.
  it('hides "Profile settings" when told to (models), but keeps "Account settings"', () => {
    const primaryLink = primaryActionLink({ profileListing: pending(), config });
    const { unmount } = renderMenu({ primaryLink, showProfileSettingsLink: false });
    expect(
      screen.queryByRole('link', { name: 'TopbarMobileMenu.profileSettingsLink' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'TopbarMobileMenu.accountSettingsLink' })
    ).toBeInTheDocument();
    unmount();

    renderMenu({ primaryLink, showProfileSettingsLink: true });
    expect(
      screen.getByRole('link', { name: 'TopbarMobileMenu.profileSettingsLink' })
    ).toBeInTheDocument();
  });
});
