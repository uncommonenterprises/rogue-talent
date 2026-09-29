import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import EmailVerifiedBanner from './EmailVerifiedBanner';

const { screen, userEvent } = testingLibrary;

describe('EmailVerifiedBanner', () => {
  it('announces the verification and has a real Dismiss button', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    render(<EmailVerifiedBanner onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toHaveTextContent('EmailVerifiedBanner.message');

    const dismiss = screen.getByRole('button', { name: 'EmailVerifiedBanner.dismiss' });
    expect(dismiss).toHaveAttribute('type', 'button');
    await user.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
