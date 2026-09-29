import React from 'react';
import '@testing-library/jest-dom';

// The Topbar is not part of the model onboarding shell (it has its own top bar), but the
// legacy layout still imports it; stub it like EditListingPage.test.js does.
jest.mock('../TopbarContainer/TopbarContainer', () => {
  // eslint-disable-next-line react/display-name
  return () => <div data-testid="topbar" />;
});

import { types as sdkTypes } from '../../util/sdkLoader';
import { LISTING_PAGE_PARAM_TYPE_DRAFT, LISTING_PAGE_PARAM_TYPE_EDIT } from '../../util/urlHelpers';
import { createCurrentUser, createImage, createOwnListing } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { EditListingPageComponent } from './EditListingPage';
import { PHOTOS, REVIEW } from './EditListingWizard/EditListingWizardTab';

const { screen, userEvent, waitFor } = testingLibrary;
const { Money, LatLng } = sdkTypes;
const noop = () => null;

// Sign-up journey stage 2: the model onboarding wizard (screens 08 to 13). The default test
// configuration's 'rent-bicycles' type uses the same process + unit as model-profile
// (default-booking, day), so it gets the same About you -> Your profile -> Your rates ->
// Your portfolio -> Review & submit flow.
const bookingListingTypeData = {
  listingType: 'rent-bicycles',
  transactionProcessAlias: 'default-booking/release-1',
  unitType: 'day',
};

const completeDraft = (imageCount = 3) =>
  createOwnListing(
    'listing-draft',
    {
      title: 'Jane D.',
      description: 'Lorem ipsum',
      state: 'draft',
      geolocation: new LatLng(51.5072, -0.1276),
      price: new Money(45000, 'GBP'),
      publicData: {
        ...bookingListingTypeData,
        location: { address: 'London, UK' },
      },
    },
    { images: Array.from({ length: imageCount }, (_, i) => createImage(`image-${i}`)) }
  );

const pageProps = ({ listing, tab, currentUser, ...overrides }) => ({
  params: {
    id: listing.id.uuid,
    slug: 'jane-d',
    type: LISTING_PAGE_PARAM_TYPE_DRAFT,
    tab,
  },
  currentUser: currentUser || createCurrentUser('model-user'),
  fetchInProgress: false,
  getAccountLinkInProgress: false,
  getOwnListing: () => listing,
  location: { search: '' },
  history: { push: noop, replace: noop },
  onFetchExceptions: noop,
  onAddAvailabilityException: noop,
  onDeleteAvailabilityException: noop,
  onCreateListingDraft: noop,
  onPublishListingDraft: noop,
  onUpdateListing: () => Promise.resolve({ data: { data: listing } }),
  onUpdateProfile: noop,
  onImageUpload: noop,
  onRemoveListingImage: noop,
  onManageDisableScrolling: noop,
  onPayoutDetailsChange: noop,
  onPayoutDetailsSubmit: noop,
  onGetStripeConnectAccountLink: noop,
  onResendVerificationEmail: () => Promise.resolve(),
  sendVerificationEmailInProgress: false,
  page: {
    uploadedImages: {},
    uploadedImagesOrder: [],
    removedImageIds: [],
    monthlyExceptionQueries: {},
    weeklyExceptionQueries: {},
    allExceptions: [],
    payoutDetailsSaved: false,
    payoutDetailsSaveInProgress: false,
  },
  scrollingDisabled: false,
  ...overrides,
});

const FLAG = 'REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED';

describe('EditListingPage model onboarding (sign-up journey stage 2)', () => {
  const originalFlag = process.env[FLAG];

  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    if (typeof originalFlag === 'undefined') {
      delete process.env[FLAG];
    } else {
      process.env[FLAG] = originalFlag;
    }
  });

  it('uses the onboarding shell: brand, Save & exit and a 4-step stepper', async () => {
    const listing = completeDraft();
    render(<EditListingPageComponent {...pageProps({ listing, tab: PHOTOS })} />);

    await waitFor(() => {
      expect(screen.getByText('EditListingWizard.shell.brand')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'EditListingWizard.shell.saveAndExit' })).toBeVisible();
    // The site topbar is replaced by the shell's own top bar.
    expect(screen.queryByTestId('topbar')).not.toBeInTheDocument();

    const steps = screen.getByRole('list', { name: 'EditListingWizard.shell.stepsLabel' });
    expect(steps.querySelectorAll('li')).toHaveLength(4);
    expect(screen.getByText('EditListingWizard.shell.stepOf')).toBeInTheDocument();
    // The review step is the "all 4 complete" state, not a fifth step.
    expect(screen.queryByText('EditListingWizard.tabLabelReview')).not.toBeInTheDocument();
  });

  it('adds "Review & submit" after the portfolio step and publishes from it', async () => {
    process.env[FLAG] = 'true';
    const user = userEvent.setup();
    const listing = completeDraft();
    const onUpdateListing = jest.fn(() => Promise.resolve({ data: { data: listing } }));
    const onPublishListingDraft = jest.fn();

    render(
      <EditListingPageComponent
        {...pageProps({ listing, tab: REVIEW, onUpdateListing, onPublishListingDraft })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('EditListingReviewPanel.title')).toBeInTheDocument();
    });
    expect(screen.getByText('EditListingWizard.shell.stepsComplete')).toBeInTheDocument();
    // Each summary section has an Edit link back to its step.
    expect(
      screen.getAllByRole('link', { name: 'EditListingReviewPanel.editSection' })
    ).toHaveLength(4);
    // Back goes to the previous step (Your portfolio).
    expect(screen.getByRole('link', { name: 'EditListingWizard.shell.back' })).toHaveAttribute(
      'href',
      '/l/jane-d/listing-draft/draft/photos'
    );

    const submit = screen.getByRole('button', { name: 'EditListingWizard.submitForApproval' });
    // Nothing is submitted until the accuracy / image-ownership box is ticked.
    expect(submit).toBeDisabled();
    await user.click(
      screen.getByRole('checkbox', { name: 'EditListingReviewPanel.confirmationLabel' })
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => {
      expect(onPublishListingDraft).toHaveBeenCalledWith(listing.id);
    });
    // The confirmation is saved (with a timestamp) to the listing's privateData first.
    expect(onUpdateListing).toHaveBeenCalledTimes(1);
    const [tab, values] = onUpdateListing.mock.calls[0];
    expect(tab).toEqual(REVIEW);
    expect(values.id).toEqual(listing.id);
    expect(values.privateData.accuracyConfirmedAt).toEqual(
      new Date(values.privateData.accuracyConfirmedAt).toISOString()
    );
  });

  it('flag off: keeps the RT-01 Stripe gate (payout modal) instead of publishing', async () => {
    delete process.env[FLAG];
    const user = userEvent.setup();
    const listing = completeDraft();
    const onPublishListingDraft = jest.fn();

    render(
      <EditListingPageComponent {...pageProps({ listing, tab: REVIEW, onPublishListingDraft })} />,
      { withPortals: true }
    );

    const submit = await screen.findByRole('button', {
      name: 'EditListingWizard.default-booking.new.saveReview',
    });
    await user.click(
      screen.getByRole('checkbox', { name: 'EditListingReviewPanel.confirmationLabel' })
    );
    await user.click(submit);

    await waitFor(() => {
      expect(
        screen.getByText('EditListingWizard.payoutModalTitlePayoutPreferences')
      ).toBeInTheDocument();
    });
    expect(onPublishListingDraft).not.toHaveBeenCalled();
  });

  it('disables "Submit" until the email address is verified, with a resend link', async () => {
    process.env[FLAG] = 'true';
    const user = userEvent.setup();
    const listing = completeDraft();
    const onResendVerificationEmail = jest.fn(() => Promise.resolve());
    const unverified = createCurrentUser('model-user', { emailVerified: false });

    render(
      <EditListingPageComponent
        {...pageProps({
          listing,
          tab: REVIEW,
          currentUser: unverified,
          onResendVerificationEmail,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('EditListingReviewPanel.verifyEmailToSubmit')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('checkbox', { name: 'EditListingReviewPanel.confirmationLabel' })
    );
    expect(
      screen.getByRole('button', { name: 'EditListingWizard.submitForApproval' })
    ).toBeDisabled();
  });

  it('does not open "Review & submit" with fewer than 3 photos', async () => {
    const listing = completeDraft(2);
    render(<EditListingPageComponent {...pageProps({ listing, tab: REVIEW })} />);

    // The review step isn't active yet, so the wizard redirects instead of rendering it.
    await waitFor(() => {
      expect(screen.queryByText('EditListingReviewPanel.title')).not.toBeInTheDocument();
    });
  });

  it('edit mode keeps the standard layout and has no review step', async () => {
    const listing = createOwnListing('listing-published', {
      title: 'Jane D.',
      description: 'Lorem ipsum',
      price: new Money(45000, 'GBP'),
      publicData: { ...bookingListingTypeData, location: { address: 'London, UK' } },
    });
    const props = pageProps({ listing, tab: PHOTOS });
    render(
      <EditListingPageComponent
        {...props}
        params={{ ...props.params, type: LISTING_PAGE_PARAM_TYPE_EDIT }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('topbar')).toBeInTheDocument();
    });
    expect(screen.getByText('EditListingWizard.tabLabelAvailability')).toBeInTheDocument();
    expect(screen.queryByText('EditListingWizard.tabLabelReview')).not.toBeInTheDocument();
    expect(screen.queryByText('EditListingWizard.shell.saveAndExit')).not.toBeInTheDocument();
  });
});
