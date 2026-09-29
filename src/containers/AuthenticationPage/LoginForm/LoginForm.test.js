import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';
import { fakeIntl } from '../../../util/testData';

import LoginForm from './LoginForm';

const { screen, userEvent } = testingLibrary;

const noop = () => null;

describe('LoginForm', () => {
  it('enables Log in button when required fields are filled', async () => {
    const user = userEvent.setup();
    render(<LoginForm intl={fakeIntl} onSubmit={noop} />);

    // Test that sign up button is disabled at first
    expect(screen.getByRole('button', { name: 'LoginForm.logIn' })).toBeDisabled();

    // Type the values to the sign up form
    await user.type(
      screen.getByRole('textbox', { name: 'LoginForm.emailLabel' }),
      'joe@example.com'
    );
    await user.type(screen.getByLabelText('LoginForm.passwordLabel'), 'secret-password');

    // Test that sign up button is enabled after typing the values
    expect(screen.getByRole('button', { name: 'LoginForm.logIn' })).toBeEnabled();
  });

  it('shows "Forgot your password?" under the password field, linking to recovery', () => {
    render(<LoginForm intl={fakeIntl} onSubmit={noop} />);

    const recoveryLink = screen.getByRole('link', { name: 'LoginForm.forgotPassword' });
    expect(recoveryLink).toHaveAttribute('href', '/recover-password');

    // It sits between the password field and the Log in button
    const password = screen.getByLabelText('LoginForm.passwordLabel');
    const button = screen.getByRole('button', { name: 'LoginForm.logIn' });
    expect(password.compareDocumentPosition(recoveryLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(recoveryLink.compareDocumentPosition(button)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
