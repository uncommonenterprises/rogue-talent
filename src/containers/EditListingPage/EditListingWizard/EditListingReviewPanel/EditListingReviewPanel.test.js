import React from 'react';
import '@testing-library/jest-dom';

import { listingFields } from '../../../../config/configListing';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { createCurrentUser, createImage, createOwnListing } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingReviewPanel, { getAccuracyConfirmationValues } from './EditListingReviewPanel';
import { getProfileRows, getRatesRows } from './reviewSummary';

const { screen, userEvent, waitFor } = testingLibrary;
const { Money } = sdkTypes;

// Echo intl: returns the message id, with values appended so formatted values are testable.
const intl = {
  formatMessage: ({ id }, values) => (values ? `${id} ${JSON.stringify(values)}` : id),
  formatNumber: (value, options) =>
    new Intl.NumberFormat('en-GB', { ...options, style: 'currency' }).format(value),
};

const listing = createOwnListing(
  'listing-draft',
  {
    title: 'Jane D.',
    state: 'draft',
    price: new Money(45000, 'GBP'),
    publicData: {
      listingType: 'model-profile',
      location: { address: 'London, UK' },
      gender: 'female',
      height_cm: 175,
      experience_level: 'some-experience',
      modelling_categories: ['fashion', 'editorial', 'beauty', 'hair'],
      half_day_rate: 26000,
      travel_fee_policy: 'included',
      availability_radius: 'national',
      min_booking_notice: '48-hours',
    },
  },
  { images: [createImage('a'), createImage('b'), createImage('c')] }
);
const config = { currency: 'GBP', listing: { listingFields } };

describe('reviewSummary', () => {
  it('summarises the profile with short labels', () => {
    const rows = getProfileRows(listing, config, intl);
    expect(rows.map(r => r.value)).toEqual([
      'Female',
      'EditListingReviewPanel.centimetres {"value":175}',
      'Some experience',
      'EditListingReviewPanel.listMore {"items":"Fashion, Editorial","count":2}',
    ]);
  });

  it('summarises the rates, including how far you will travel', () => {
    const rows = getRatesRows(listing, config, intl);
    expect(rows.map(r => r.key)).toEqual([
      'price',
      'half_day_rate',
      'travel_fee_policy',
      'availability_radius',
      'min_booking_notice',
    ]);
    expect(rows.find(r => r.key === 'availability_radius').value).toEqual('National');
    expect(rows.find(r => r.key === 'min_booking_notice').value).toEqual('48 hours');
    // The optional hourly rate isn't set, so it isn't listed.
    expect(rows.find(r => r.key === 'hourly_rate')).toBeUndefined();
  });
});

describe('getAccuracyConfirmationValues', () => {
  it('records the confirmation time in the listing privateData', () => {
    const now = new Date('2026-09-29T12:00:00.000Z');
    expect(getAccuracyConfirmationValues(now)).toEqual({
      privateData: { accuracyConfirmedAt: '2026-09-29T12:00:00.000Z' },
    });
  });
});

describe('EditListingReviewPanel email gate', () => {
  const renderPanel = props =>
    render(
      <EditListingReviewPanel
        listing={listing}
        config={config}
        sectionLinks={{}}
        onSubmit={jest.fn()}
        submitButtonText="Submit for approval"
        errors={{}}
        {...props}
      />,
      {
        // Test messages are the keys; this one needs its placeholder for the resend link.
        messages: {
          'EditListingReviewPanel.verifyEmailToSubmit':
            'Verify your email to submit your profile. Check your inbox or {resendEmailLink}.',
        },
      }
    );

  it('offers to resend the verification email and confirms it was sent', async () => {
    const user = userEvent.setup();
    const onResendVerificationEmail = jest.fn(() => Promise.resolve());
    renderPanel({
      currentUser: createCurrentUser('model', { emailVerified: false }),
      onResendVerificationEmail,
    });

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Submit for approval' })).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: 'EditListingReviewPanel.resendEmailLink' })
    );
    expect(onResendVerificationEmail).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText('EditListingReviewPanel.resendEmailSent')).toBeInTheDocument();
    });
  });

  it('has no email notice once the email is verified', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderPanel({ currentUser: createCurrentUser('model'), onSubmit });

    expect(screen.queryByText(/Verify your email to submit/)).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit for approval' });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({
      privateData: { accuracyConfirmedAt: expect.any(String) },
    });
  });
});
