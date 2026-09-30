import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import { getErrorMessages } from './ErrorMessages';

const { screen } = testingLibrary;

const apiError = code => ({ type: 'error', apiErrors: [{ code }] });

describe('CheckoutPage error messages: booking gates', () => {
  it('Gate A: an unapproved client is told to wait for approval, with a status link', () => {
    const { initiateOrderErrorMessage } = getErrorMessages(
      false,
      apiError('account-approval-required'),
      false,
      null,
      null,
      null
    );
    render(<div>{initiateOrderErrorMessage}</div>, { messages: enMessages });
    expect(
      screen.getByText(/Your account needs to be approved before you can send a booking request/)
    ).toBeInTheDocument();
    expect(screen.getByText('Check your account status').closest('a')).toHaveAttribute(
      'href',
      '/account-status'
    );
  });

  it('SAF-03: an unverified client still gets the verify-your-identity message', () => {
    const { initiateOrderErrorMessage } = getErrorMessages(
      false,
      apiError('identity-verification-required'),
      false,
      null,
      null,
      null
    );
    render(<div>{initiateOrderErrorMessage}</div>, { messages: enMessages });
    expect(screen.getByText('Verify your identity').closest('a')).toHaveAttribute(
      'href',
      '/verify-identity'
    );
  });
});
