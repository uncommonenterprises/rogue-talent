import React from 'react';
import '@testing-library/jest-dom';

import { createCurrentUser } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { GeneralLandingPage } from './GeneralLandingPage';

const { screen } = testingLibrary;

const authState = isAuthenticated => ({
  auth: {
    isAuthenticated,
    authScopes: [],
    authInfoLoaded: true,
    loginError: null,
    logoutError: null,
    signupError: null,
    confirmError: null,
  },
});

describe('GeneralLandingPage', () => {
  it('shows "Create your account" to logged-out visitors', () => {
    render(<GeneralLandingPage />, { initialState: authState(false) });
    expect(screen.getAllByRole('link', { name: 'Create your account' }).length).toBe(2);
  });

  it('hides "Create your account" once logged in (RT-FB-08)', () => {
    render(<GeneralLandingPage />, { initialState: authState(true) });
    expect(screen.queryByRole('link', { name: 'Create your account' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ready to go rogue?')).not.toBeInTheDocument();
    // Browsing stays available
    expect(screen.getByRole('link', { name: 'Browse talent' })).toBeInTheDocument();
  });

  it('shows "Sign in", "Join Rogue Talent" and the Join cards to logged-out visitors', () => {
    render(<GeneralLandingPage />, { initialState: authState(false) });
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join Rogue Talent' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join as talent' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join as business' })).toBeInTheDocument();
  });

  it('logged in: the nav shows the inbox and profile links instead, and no Join cards', () => {
    const model = createCurrentUser('model-user', {
      profile: { firstName: 'Jane', lastName: 'Doe', publicData: { userType: 'model' } },
    });
    render(<GeneralLandingPage />, {
      initialState: { ...authState(true), user: { currentUser: model } },
    });
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Join Rogue Talent' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.inboxRequests' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MarketingNav.yourProfile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Join as talent' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Join as business' })).not.toBeInTheDocument();
  });

  it('logged in as a client: bookings inbox and browse talent', () => {
    const client = createCurrentUser('client-user', {
      profile: { firstName: 'Sam', lastName: 'Lee', publicData: { userType: 'client' } },
    });
    render(<GeneralLandingPage />, {
      initialState: { ...authState(true), user: { currentUser: client } },
    });
    expect(screen.getByRole('link', { name: 'TopbarDesktop.inboxBookings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MarketingNav.browseTalent' })).toBeInTheDocument();
  });
});
