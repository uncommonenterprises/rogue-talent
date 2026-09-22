import {
  ACCOUNT_STATUS_DRAFT,
  ACCOUNT_STATUS_PENDING,
  ACCOUNT_STATUS_APPROVED,
  ACCOUNT_STATUS_VERIFIED,
  ACCOUNT_STATUS_REJECTED,
  isModelUser,
  isStripeAccountComplete,
  isAccountVerified,
  isAccountSubmitted,
  getAccountStatus,
  isAccountStatusFlowEnabled,
} from './accountStatus';

// ---- Fixtures ----------------------------------------------------------------

const user = ({ state = 'pending-approval', userType = 'model', identityVerified } = {}) => ({
  attributes: {
    state,
    profile: {
      publicData: { userType },
      metadata: identityVerified === undefined ? {} : { identity_verified: identityVerified },
    },
  },
});

const stripeAccount = ({ charges, payouts } = {}) => ({
  attributes: {
    stripeAccountData: { charges_enabled: charges, payouts_enabled: payouts },
  },
});

const completeStripe = stripeAccount({ charges: true, payouts: true });
const incompleteStripe = stripeAccount({ charges: true, payouts: false });

const listing = state => ({ attributes: { state } });

// ---- Sub-signal derivations --------------------------------------------------

describe('isModelUser', () => {
  it('is true for models', () => {
    expect(isModelUser(user({ userType: 'model' }))).toBe(true);
  });
  it('is false for clients and missing data', () => {
    expect(isModelUser(user({ userType: 'client' }))).toBe(false);
    expect(isModelUser(undefined)).toBe(false);
  });
});

describe('isStripeAccountComplete', () => {
  it('requires both charges_enabled and payouts_enabled', () => {
    expect(isStripeAccountComplete(completeStripe)).toBe(true);
    expect(isStripeAccountComplete(incompleteStripe)).toBe(false);
    expect(isStripeAccountComplete(stripeAccount({ charges: false, payouts: true }))).toBe(false);
  });
  it('is false when no account / data present', () => {
    expect(isStripeAccountComplete(undefined)).toBe(false);
    expect(isStripeAccountComplete({ attributes: {} })).toBe(false);
  });
});

describe('isAccountVerified', () => {
  it('model: verified only when Stripe is complete', () => {
    expect(isAccountVerified({ currentUser: user(), stripeAccount: completeStripe })).toBe(true);
    expect(isAccountVerified({ currentUser: user(), stripeAccount: incompleteStripe })).toBe(false);
    expect(isAccountVerified({ currentUser: user() })).toBe(false);
  });
  it('model: falls back to currentUser.stripeAccount when not passed explicitly', () => {
    const cu = { ...user(), stripeAccount: completeStripe };
    expect(isAccountVerified({ currentUser: cu })).toBe(true);
  });
  it('client: verified from identity_verified metadata, ignores Stripe', () => {
    const verifiedClient = user({ userType: 'client', identityVerified: true });
    const unverifiedClient = user({ userType: 'client', identityVerified: false });
    expect(isAccountVerified({ currentUser: verifiedClient })).toBe(true);
    expect(
      isAccountVerified({ currentUser: unverifiedClient, stripeAccount: completeStripe })
    ).toBe(false);
  });
});

describe('isAccountSubmitted', () => {
  it('model: submitted when own listing is past draft', () => {
    expect(
      isAccountSubmitted({ currentUser: user(), ownListing: listing('pendingApproval') })
    ).toBe(true);
    expect(isAccountSubmitted({ currentUser: user(), ownListing: listing('published') })).toBe(
      true
    );
  });
  it('model: not submitted for a draft or missing listing', () => {
    expect(isAccountSubmitted({ currentUser: user(), ownListing: listing('draft') })).toBe(false);
    expect(isAccountSubmitted({ currentUser: user() })).toBe(false);
  });
  it('client: always false for now (no submission flag yet)', () => {
    expect(
      isAccountSubmitted({
        currentUser: user({ userType: 'client' }),
        ownListing: listing('published'),
      })
    ).toBe(false);
  });
});

// ---- getAccountStatus truth table (spec §4) ----------------------------------

describe('getAccountStatus', () => {
  it('banned → rejected (regardless of everything else)', () => {
    expect(getAccountStatus({ currentUser: user({ state: 'banned' }) })).toBe(
      ACCOUNT_STATUS_REJECTED
    );
    expect(
      getAccountStatus({
        currentUser: user({ state: 'banned' }),
        stripeAccount: completeStripe,
        ownListing: listing('published'),
      })
    ).toBe(ACCOUNT_STATUS_REJECTED);
  });

  it('active + verified → verified (model)', () => {
    expect(
      getAccountStatus({ currentUser: user({ state: 'active' }), stripeAccount: completeStripe })
    ).toBe(ACCOUNT_STATUS_VERIFIED);
  });

  it('active + not verified → approved (model)', () => {
    expect(
      getAccountStatus({ currentUser: user({ state: 'active' }), stripeAccount: incompleteStripe })
    ).toBe(ACCOUNT_STATUS_APPROVED);
    expect(getAccountStatus({ currentUser: user({ state: 'active' }) })).toBe(
      ACCOUNT_STATUS_APPROVED
    );
  });

  it('active + verified → verified (client via identity metadata)', () => {
    expect(
      getAccountStatus({
        currentUser: user({ state: 'active', userType: 'client', identityVerified: true }),
      })
    ).toBe(ACCOUNT_STATUS_VERIFIED);
  });

  it('active + not verified → approved (client)', () => {
    expect(
      getAccountStatus({
        currentUser: user({ state: 'active', userType: 'client', identityVerified: false }),
      })
    ).toBe(ACCOUNT_STATUS_APPROVED);
  });

  it('pending-approval + submitted → pending-approval (regardless of verified)', () => {
    expect(
      getAccountStatus({
        currentUser: user({ state: 'pending-approval' }),
        ownListing: listing('pendingApproval'),
      })
    ).toBe(ACCOUNT_STATUS_PENDING);
    // Verified-while-waiting (Gate B banked) still reads Pending until Gate A completes.
    expect(
      getAccountStatus({
        currentUser: user({ state: 'pending-approval' }),
        stripeAccount: completeStripe,
        ownListing: listing('published'),
      })
    ).toBe(ACCOUNT_STATUS_PENDING);
  });

  it('pending-approval + not submitted → draft', () => {
    expect(
      getAccountStatus({
        currentUser: user({ state: 'pending-approval' }),
        ownListing: listing('draft'),
      })
    ).toBe(ACCOUNT_STATUS_DRAFT);
    expect(getAccountStatus({ currentUser: user({ state: 'pending-approval' }) })).toBe(
      ACCOUNT_STATUS_DRAFT
    );
  });

  it('undefined / empty input → draft (safe default)', () => {
    expect(getAccountStatus()).toBe(ACCOUNT_STATUS_DRAFT);
    expect(getAccountStatus({})).toBe(ACCOUNT_STATUS_DRAFT);
  });
});

// ---- Step-2 feature flag (default OFF = today's behaviour) --------------------

describe('isAccountStatusFlowEnabled', () => {
  const original = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    } else {
      process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = original;
    }
  });

  it('defaults OFF when the env var is unset (preserves RT-01 behaviour)', () => {
    delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    expect(isAccountStatusFlowEnabled()).toBe(false);
  });

  it('is OFF for any value other than the exact string "true"', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'false';
    expect(isAccountStatusFlowEnabled()).toBe(false);
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = '1';
    expect(isAccountStatusFlowEnabled()).toBe(false);
  });

  it('is ON only when set to "true"', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
    expect(isAccountStatusFlowEnabled()).toBe(true);
  });
});
