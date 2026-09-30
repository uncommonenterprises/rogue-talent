import React from 'react';
import '@testing-library/jest-dom';
import { Route } from 'react-router-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import {
  SCREEN_MODEL_PENDING,
  SCREEN_MODEL_APPROVED,
  SCREEN_MODEL_VERIFIED,
  SCREEN_MODEL_REJECTED,
  SCREEN_CLIENT_PENDING,
  SCREEN_CLIENT_APPROVED,
  SCREEN_CLIENT_VERIFIED,
  SCREEN_CLIENT_REJECTED,
  TRACKER_DONE,
  TRACKER_CURRENT,
  TRACKER_TODO,
  REJECTION_REASON_PRIVATE_DATA_KEY,
  getStatusView,
  getPendingTrackerSteps,
  getRejectionReason,
} from './AccountStatusPage.helpers';
import AccountStatusScreen from './AccountStatusScreens';
import { AccountStatusPageComponent } from './AccountStatusPage';

const { screen, userEvent } = testingLibrary;

// ---- Fixtures -------------------------------------------------------------------------------

const completeStripe = {
  attributes: { stripeAccountData: { charges_enabled: true, payouts_enabled: true } },
};
const incompleteStripe = {
  attributes: { stripeAccountData: { charges_enabled: true, payouts_enabled: false } },
};

const makeUser = ({
  state = 'pending-approval',
  userType = 'model',
  metadata = {},
  privateData = {},
  publicData = {},
  stripeAccount,
} = {}) => ({
  id: { uuid: 'user-1' },
  type: 'currentUser',
  attributes: {
    state,
    banned: state === 'banned',
    deleted: false,
    email: 'someone@example.com',
    emailVerified: true,
    profile: {
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane D',
      abbreviatedName: 'JD',
      publicData: { userType, ...publicData },
      metadata,
      privateData,
    },
  },
  ...(stripeAccount ? { stripeAccount } : {}),
});

const listing = state => ({
  id: { uuid: 'listing-1' },
  type: 'ownListing',
  attributes: { title: 'Jane D', state },
});

const submittedClientData = { businessDetailsSubmittedAt: '2026-09-30T10:00:00.000Z' };

// Gate A is the operator-set metadata reviewDecision (spec amendment 30/09/2026). Every user is
// 'active' from sign-up, so 'active' alone must never select an Approved screen.
const approved = { reviewDecision: 'approved' };
const declined = { reviewDecision: 'declined' };

const view = params =>
  getStatusView({ flagEnabled: true, ownListingFetched: true, ownListing: null, ...params });

// ---- Screen selection per derived state ------------------------------------------------------

describe("AccountStatusPage: flag OFF (dormant) keeps today's behaviour", () => {
  it('forwards models to Your profile and clients to Browse models, whatever their status', () => {
    const states = ['pending-approval', 'active', 'banned'];
    states.forEach(state => {
      expect(
        getStatusView({
          flagEnabled: false,
          currentUser: makeUser({ state, userType: 'model' }),
          ownListing: listing('pendingApproval'),
          ownListingFetched: true,
        })
      ).toEqual({ kind: 'redirect', name: 'ManageListingsPage' });
      expect(
        getStatusView({
          flagEnabled: false,
          currentUser: makeUser({ state, userType: 'client', privateData: submittedClientData }),
        })
      ).toEqual({ kind: 'redirect', name: 'SearchPage' });
    });
  });

  it('renders no status screen, only a redirect', () => {
    const LocationProbe = () => (
      <Route render={({ location }) => <p data-testid="location">{location.pathname}</p>} />
    );
    const prev = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    try {
      render(
        <>
          <AccountStatusPageComponent
            currentUser={makeUser({ state: 'active', userType: 'client' })}
            ownListing={null}
            ownListingFetched
            scrollingDisabled={false}
          />
          <LocationProbe />
        </>
      );
      expect(screen.getByTestId('location')).toHaveTextContent('/s');
      expect(screen.queryByText('AccountStatusPage.client.approved.title')).toBeNull();
    } finally {
      if (prev === undefined) {
        delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
      } else {
        process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = prev;
      }
    }
  });
});

describe('AccountStatusPage: flag ON, screen per derived state (models)', () => {
  it('waits for the own listing before deciding (never flashes Draft for a submitted model)', () => {
    expect(
      getStatusView({
        flagEnabled: true,
        currentUser: makeUser(),
        ownListing: null,
        ownListingFetched: false,
      })
    ).toEqual({ kind: 'loading' });
  });

  it('Draft (not submitted) goes back to Your profile to finish', () => {
    expect(view({ currentUser: makeUser(), ownListing: listing('draft') })).toEqual({
      kind: 'redirect',
      name: 'ManageListingsPage',
    });
  });

  it('14 Pending approval, with verification banked or not', () => {
    const pending = view({ currentUser: makeUser(), ownListing: listing('pendingApproval') });
    expect(pending).toMatchObject({
      kind: 'screen',
      screen: SCREEN_MODEL_PENDING,
      verified: false,
    });

    const banked = view({
      currentUser: makeUser({ stripeAccount: completeStripe }),
      ownListing: listing('pendingApproval'),
    });
    expect(banked).toMatchObject({ screen: SCREEN_MODEL_PENDING, verified: true });
  });

  it('14 Pending approval for an active model with no review decision (not Approved)', () => {
    expect(
      view({
        currentUser: makeUser({ state: 'active', stripeAccount: completeStripe }),
        ownListing: listing('pendingApproval'),
      })
    ).toMatchObject({ screen: SCREEN_MODEL_PENDING, verified: true });
  });

  it('15 Approved (review decision approved, Stripe incomplete)', () => {
    expect(
      view({
        currentUser: makeUser({
          state: 'active',
          metadata: approved,
          stripeAccount: incompleteStripe,
        }),
        ownListing: listing('pendingApproval'),
      })
    ).toMatchObject({ screen: SCREEN_MODEL_APPROVED });
  });

  it('16 Verified (review decision approved and Stripe complete)', () => {
    expect(
      view({
        currentUser: makeUser({
          state: 'active',
          metadata: approved,
          stripeAccount: completeStripe,
        }),
        ownListing: listing('published'),
      })
    ).toMatchObject({ screen: SCREEN_MODEL_VERIFIED });
  });

  it('17 Not approved (model): declined at review, or suspended', () => {
    expect(
      view({
        currentUser: makeUser({
          state: 'active',
          metadata: declined,
          stripeAccount: completeStripe,
        }),
        ownListing: listing('pendingApproval'),
      })
    ).toMatchObject({ screen: SCREEN_MODEL_REJECTED });
    expect(view({ currentUser: makeUser({ state: 'banned' }) })).toMatchObject({
      screen: SCREEN_MODEL_REJECTED,
    });
  });

  it('back to 14 Pending once a declined model resubmits (decision cleared)', () => {
    expect(
      view({
        currentUser: makeUser({ state: 'active', metadata: { reviewDecision: null } }),
        ownListing: listing('pendingApproval'),
      })
    ).toMatchObject({ screen: SCREEN_MODEL_PENDING });
  });
});

describe('AccountStatusPage: flag ON, screen per derived state (clients)', () => {
  it('Draft (business details not submitted) goes to Your business details', () => {
    expect(view({ currentUser: makeUser({ userType: 'client' }) })).toEqual({
      kind: 'redirect',
      name: 'BusinessDetailsPage',
    });
  });

  it('19 Pending approval once business details are submitted, with or without banked ID', () => {
    expect(
      view({ currentUser: makeUser({ userType: 'client', privateData: submittedClientData }) })
    ).toMatchObject({ screen: SCREEN_CLIENT_PENDING, verified: false });
    expect(
      view({
        currentUser: makeUser({
          userType: 'client',
          privateData: submittedClientData,
          metadata: { identity_verified: true },
        }),
      })
    ).toMatchObject({ screen: SCREEN_CLIENT_PENDING, verified: true });
  });

  it('19 Pending for an active, submitted client with no review decision (not Approved)', () => {
    expect(
      view({
        currentUser: makeUser({
          userType: 'client',
          state: 'active',
          privateData: submittedClientData,
        }),
      })
    ).toMatchObject({ screen: SCREEN_CLIENT_PENDING });
  });

  it('20 Approved and 21 Verified', () => {
    expect(
      view({
        currentUser: makeUser({
          userType: 'client',
          state: 'active',
          metadata: approved,
          privateData: submittedClientData,
        }),
      })
    ).toMatchObject({ screen: SCREEN_CLIENT_APPROVED });
    expect(
      view({
        currentUser: makeUser({
          userType: 'client',
          state: 'active',
          metadata: { ...approved, identity_verified: true },
          privateData: submittedClientData,
        }),
      })
    ).toMatchObject({ screen: SCREEN_CLIENT_VERIFIED });
  });

  it('17 Not approved (client variant): declined at review, or suspended', () => {
    expect(
      view({
        currentUser: makeUser({
          userType: 'client',
          state: 'active',
          metadata: declined,
          privateData: submittedClientData,
        }),
      })
    ).toMatchObject({ screen: SCREEN_CLIENT_REJECTED });
    expect(view({ currentUser: makeUser({ userType: 'client', state: 'banned' }) })).toMatchObject({
      screen: SCREEN_CLIENT_REJECTED,
    });
  });
});

describe('AccountStatusPage: progress tracker (14 / 19)', () => {
  it('Submitted done, review in progress, verify to do, live to do', () => {
    expect(getPendingTrackerSteps({ role: 'model', verified: false }).map(s => s.state)).toEqual([
      TRACKER_DONE,
      TRACKER_CURRENT,
      TRACKER_TODO,
      TRACKER_TODO,
    ]);
  });

  it('verified while waiting: step 3 shows as done while review is still in progress', () => {
    expect(getPendingTrackerSteps({ role: 'client', verified: true }).map(s => s.state)).toEqual([
      TRACKER_DONE,
      TRACKER_CURRENT,
      TRACKER_DONE,
      TRACKER_TODO,
    ]);
  });

  it('renders the tracker and hides the verify-now callout once verification is banked', () => {
    const { unmount } = render(
      <AccountStatusScreen
        role="model"
        status="pending-approval"
        verified={false}
        currentUser={makeUser()}
        ownListing={listing('pendingApproval')}
      />
    );
    expect(screen.getByText('AccountStatusPage.tracker.model.review')).toBeInTheDocument();
    expect(screen.getByText('AccountStatusPage.tracker.inProgress')).toBeInTheDocument();
    expect(screen.getByText('AccountStatusPage.model.pending.verifyNowTitle')).toBeInTheDocument();
    expect(screen.getByText('AccountStatusPage.manageCalendar')).toBeInTheDocument();
    unmount();

    render(
      <AccountStatusScreen
        role="model"
        status="pending-approval"
        verified
        currentUser={makeUser({ stripeAccount: completeStripe })}
        ownListing={listing('pendingApproval')}
      />
    );
    expect(screen.queryByText('AccountStatusPage.model.pending.verifyNowTitle')).toBeNull();
  });
});

describe('AccountStatusPage: 17 reviewer note', () => {
  it('reads the operator-set private data key (visible to the user and operator only)', () => {
    expect(REJECTION_REASON_PRIVATE_DATA_KEY).toEqual('rejectionReason');
    expect(
      getRejectionReason(makeUser({ privateData: { rejectionReason: '  Blurry photos.  ' } }))
    ).toEqual('Blurry photos.');
  });

  it('never reads the note from metadata (publicly readable)', () => {
    expect(getRejectionReason(makeUser({ metadata: { rejectionReason: 'Blurry photos.' } }))).toBe(
      null
    );
  });

  it('falls back when no note was left (missing, empty, whitespace or not text)', () => {
    [{}, { rejectionReason: '' }, { rejectionReason: '   ' }, { rejectionReason: 42 }].forEach(
      privateData => {
        expect(getRejectionReason(makeUser({ privateData }))).toBeNull();
      }
    );
  });

  it('shows the note when there is one, and the fallback line when there is not', () => {
    const { unmount } = render(
      <AccountStatusScreen
        role="client"
        status="rejected"
        verified={false}
        currentUser={makeUser({ userType: 'client', state: 'banned' })}
        rejectionReason="We couldn't match the company number."
      />,
      { messages: enMessages }
    );
    expect(screen.getByText('"We couldn\'t match the company number."')).toBeInTheDocument();
    expect(screen.getByText("Your business wasn't approved this time")).toBeInTheDocument();
    expect(screen.getByText('Contact us').closest('a')).toHaveAttribute(
      'href',
      'mailto:support@roguetalent.co'
    );
    unmount();

    render(
      <AccountStatusScreen
        role="model"
        status="rejected"
        verified={false}
        currentUser={makeUser({ state: 'banned' })}
        rejectionReason={null}
      />,
      { messages: enMessages }
    );
    expect(
      screen.getByText(
        "We didn't include a specific note this time. If anything's unclear, contact us and we'll talk you through it."
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Or email us at support@roguetalent.co')).toBeInTheDocument();
  });
});

describe('AccountStatusPage: 17 resubmit for approval (amendment 30/09/2026)', () => {
  const prevFlag = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
  beforeEach(() => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
  });
  afterEach(() => {
    if (prevFlag === undefined) {
      delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    } else {
      process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = prevFlag;
    }
  });

  const renderPage = (currentUser, props = {}) =>
    render(
      <AccountStatusPageComponent
        currentUser={currentUser}
        ownListing={listing('pendingApproval')}
        ownListingFetched
        scrollingDisabled={false}
        {...props}
      />,
      { messages: enMessages }
    );

  it('a declined model can resubmit from screen 17; the edit link stays the primary action', async () => {
    const onResubmit = jest.fn(() => Promise.resolve());
    renderPage(makeUser({ state: 'active', metadata: declined }), { onResubmit });
    expect(screen.getByText('Edit your profile').closest('a')).toBeInTheDocument();
    expect(
      screen.getByText("Made your changes? Resubmit and we'll review your profile again.")
    ).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Resubmit for approval' }));
    expect(onResubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a retry message when the resubmission failed', () => {
    renderPage(makeUser({ state: 'active', metadata: declined }), {
      onResubmit: jest.fn(() => Promise.resolve()),
      resubmitError: { type: 'error', status: 500 },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't resubmit your profile. Please try again, or contact us."
    );
  });

  it('disables the button while the resubmission is in flight', () => {
    renderPage(makeUser({ state: 'active', metadata: declined }), {
      onResubmit: jest.fn(() => Promise.resolve()),
      resubmitInProgress: true,
    });
    expect(screen.getByRole('button', { name: 'Resubmitting…' })).toBeDisabled();
  });

  it('no resubmit button for a suspended (banned) model: that is not a review decline', () => {
    renderPage(makeUser({ state: 'banned' }), { onResubmit: jest.fn() });
    expect(screen.getByText("Your profile wasn't approved this time")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resubmit for approval' })).toBeNull();
  });

  it('no resubmit button for a declined client: they resubmit by updating business details', () => {
    renderPage(
      makeUser({
        userType: 'client',
        state: 'active',
        metadata: declined,
        privateData: submittedClientData,
      }),
      { onResubmit: jest.fn() }
    );
    expect(screen.getByRole('link', { name: 'Update your business details' })).toHaveAttribute(
      'href',
      '/business-details'
    );
    expect(screen.queryByRole('button', { name: 'Resubmit for approval' })).toBeNull();
  });
});

describe('AccountStatusPage: flag ON renders the status home', () => {
  it('shows the status card for the derived state', () => {
    const prev = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
    try {
      render(
        <AccountStatusPageComponent
          currentUser={makeUser({
            state: 'active',
            userType: 'client',
            metadata: approved,
            publicData: { company_name: 'Northside Studio' },
          })}
          ownListing={null}
          ownListingFetched
          scrollingDisabled={false}
        />
      );
      expect(screen.getByText('AccountStatusPage.client.approved.title')).toBeInTheDocument();
      expect(screen.getByText('AccountStatusPage.verifyWithStripe').closest('a')).toHaveAttribute(
        'href',
        '/verify-identity'
      );
    } finally {
      if (prev === undefined) {
        delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
      } else {
        process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = prev;
      }
    }
  });
});
