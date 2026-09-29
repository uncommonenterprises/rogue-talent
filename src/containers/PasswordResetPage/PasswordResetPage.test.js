import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { PasswordResetPageComponent } from './PasswordResetPage';

const { screen, userEvent } = testingLibrary;

const noop = () => Promise.resolve();

describe('PasswordResetPage (screen 07, state 2)', () => {
  it('shows the new password form with the hint, and enables Reset once valid', async () => {
    const user = userEvent.setup();
    render(
      <PasswordResetPageComponent
        scrollingDisabled={false}
        resetPasswordInProgress={false}
        resetPasswordError={null}
        onSubmitPassword={noop}
        location={{ search: '?t=token&e=jane.doe%40example.com' }}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'PasswordResetPage.mainHeading' })
    ).toBeInTheDocument();
    expect(screen.getByText('PasswordResetForm.passwordHint')).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: 'PasswordResetForm.submitButtonText' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('PasswordResetForm.passwordLabel'), 'a-new-password');
    expect(submit).toBeEnabled();
  });

  it('explains when the reset link is broken', () => {
    render(
      <PasswordResetPageComponent
        scrollingDisabled={false}
        resetPasswordInProgress={false}
        resetPasswordError={null}
        onSubmitPassword={noop}
        location={{ search: '' }}
      />
    );
    expect(screen.getByText(/PasswordResetPage.invalidUrlParams/)).toBeInTheDocument();
  });
});
