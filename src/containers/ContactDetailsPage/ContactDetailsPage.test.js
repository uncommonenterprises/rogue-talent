import React, { act } from 'react';
import '@testing-library/jest-dom';

import { createCurrentUser, fakeIntl } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { ContactDetailsPageComponent } from './ContactDetailsPage';

const { screen, userEvent } = testingLibrary;

const noop = () => null;

describe('ContactDetailsPageComponent', () => {
  it('Check that newPassword input shows error and submit is enabled if form is filled', async () => {
    const user = userEvent.setup();
    render(
      <ContactDetailsPageComponent
        params={{ displayName: 'my-shop' }}
        history={{ push: noop }}
        location={{ search: '' }}
        scrollingDisabled={false}
        authInProgress={false}
        currentUser={createCurrentUser('user1')}
        isAuthenticated={false}
        onChange={noop}
        onLogout={noop}
        onManageDisableScrolling={noop}
        sendVerificationEmailInProgress={false}
        onResendVerificationEmail={noop}
        onSubmitContactDetails={noop}
        saveContactDetailsInProgress={false}
        contactDetailsChanged={false}
        intl={fakeIntl}
      />
    );

    const emailLabel = 'ContactDetailsForm.emailLabel';
    const emailInput = screen.getByText(emailLabel);
    expect(emailInput).toBeInTheDocument();

    // Save button is disabled
    expect(screen.getByRole('button', { name: 'ContactDetailsForm.saveChanges' })).toBeDisabled();

    const phoneLabel = 'ContactDetailsForm.phoneLabel';
    const phoneInput = screen.getByText(phoneLabel);

    await user.type(phoneInput, '+358555555555');
    phoneInput.blur();

    // Save button is enabled
    expect(screen.getByRole('button', { name: 'ContactDetailsForm.saveChanges' })).toBeEnabled();
  });

  // Tester F F5 part C: models edit their name here (they have no Profile settings page).
  const userOfType = userType =>
    createCurrentUser('user1', {
      profile: {
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Jane D.',
        publicData: { userType },
        protectedData: {},
      },
    });
  const pageProps = (currentUser, onSaveName = noop) => ({
    params: {},
    history: { push: noop },
    location: { search: '' },
    scrollingDisabled: false,
    currentUser,
    onChange: noop,
    sendVerificationEmailInProgress: false,
    onResendVerificationEmail: noop,
    onSubmitContactDetails: noop,
    saveContactDetailsInProgress: false,
    contactDetailsChanged: false,
    onSaveName,
    intl: fakeIntl,
  });

  it('shows models a "Your name" section that saves the trimmed name', async () => {
    const user = userEvent.setup();
    const onSaveName = jest.fn(() => Promise.resolve());
    render(<ContactDetailsPageComponent {...pageProps(userOfType('model'), onSaveName)} />);

    expect(screen.getByText('ContactNameForm.heading')).toBeInTheDocument();
    const saveName = screen.getByRole('button', { name: 'ContactNameForm.saveName' });
    expect(saveName).toBeDisabled();

    const lastName = screen.getByLabelText('ContactNameForm.lastNameLabel');
    await user.clear(lastName);
    await user.type(lastName, '  Smith ');
    await user.click(saveName);

    expect(onSaveName).toHaveBeenCalledWith({ firstName: 'Jane', lastName: 'Smith' });
  });

  it("leaves clients' contact details as they were (no name section)", () => {
    render(<ContactDetailsPageComponent {...pageProps(userOfType('client'))} />);
    expect(screen.queryByText('ContactNameForm.heading')).not.toBeInTheDocument();
    expect(screen.getByText('ContactDetailsForm.emailLabel')).toBeInTheDocument();
  });
});
