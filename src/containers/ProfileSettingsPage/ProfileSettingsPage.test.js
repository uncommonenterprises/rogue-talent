import React, { act } from 'react';
import '@testing-library/jest-dom';

import { createCurrentUser, fakeIntl } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { ProfileSettingsPageComponent } from './ProfileSettingsPage';

const { screen } = testingLibrary;

const noop = () => null;

describe('ProfileSettingsPage', () => {
  it('Check that there is a link to ProfilePage', async () => {
    const props = {
      authInProgress: false,
      currentUser: createCurrentUser('userId'),
      history: { push: noop },
      isAuthenticated: false,
      location: { search: '' },
      onChange: noop,
      onImageUpload: noop,
      onLogout: noop,
      onManageDisableScrolling: noop,
      onUpdateProfile: noop,
      params: { displayName: 'my-shop' },
      scrollingDisabled: false,
      updateInProgress: false,
      uploadInProgress: false,
      sendVerificationEmailInProgress: false,
      onResendVerificationEmail: noop,
      intl: fakeIntl,
    };

    await act(async () => {
      render(<ProfileSettingsPageComponent {...props} />);
    });

    const viewProfileLink = 'ProfileSettingsPage.viewProfileLink';
    expect(screen.getByText(viewProfileLink)).toBeInTheDocument();
  });

  // Tester F F5 part C: models have no Profile settings page.
  const userOfType = userType =>
    createCurrentUser('userId', {
      profile: {
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Jane D.',
        publicData: { userType },
        privateData: { safety_boundaries: { no_private_residence: true } },
      },
    });
  const pageProps = currentUser => ({
    currentUser,
    onImageUpload: noop,
    onUpdateProfile: noop,
    scrollingDisabled: false,
    updateInProgress: false,
    uploadInProgress: false,
    intl: fakeIntl,
  });

  it('redirects a model instead of showing the page (old links and bookmarks)', async () => {
    await act(async () => {
      render(<ProfileSettingsPageComponent {...pageProps(userOfType('model'))} />);
    });
    expect(screen.queryByText('ProfileSettingsPage.heading')).not.toBeInTheDocument();
    expect(screen.queryByText('ProfileSettingsForm.yourName')).not.toBeInTheDocument();
  });

  it('keeps the page for clients, without the models-only safety control', async () => {
    await act(async () => {
      render(<ProfileSettingsPageComponent {...pageProps(userOfType('client'))} />);
    });
    expect(screen.getByText('ProfileSettingsPage.heading')).toBeInTheDocument();
    expect(screen.getByText('ProfileSettingsForm.yourName')).toBeInTheDocument();
    expect(
      screen.queryByText('SafetySettingsForm.noPrivateResidenceLabel')
    ).not.toBeInTheDocument();
  });
});
