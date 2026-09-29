import React from 'react';
import '@testing-library/jest-dom';

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
});
