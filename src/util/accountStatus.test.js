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
  getReviewDecision,
  isReviewDeclined,
  REVIEW_DECISION_METADATA_KEY,
  REVIEW_DECISION_APPROVED,
  REVIEW_DECISION_DECLINED,
} from './accountStatus';

// ---- Fixtures ----------------------------------------------------------------

const user = ({ state = 'active', userType = 'model', identityVerified, reviewDecision } = {}) => ({
  attributes: {
    state,
    profile: {
      publicData: { userType },
      metadata: {
        ...(identityVerified === undefined ? {} : { identity_verified: identityVerified }),
        ...(reviewDecision === undefined ? {} : { reviewDecision }),
      },
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
  it('client: not submitted until the business details step is submitted (a listing is ignored)', () => {
    expect(
      isAccountSubmitted({
        currentUser: user({ userType: 'client' }),
        ownListing: listing('published'),
      })
    ).toBe(false);
  });
  it('client: submitted once "Submit for approval" on business details recorded its timestamp', () => {
    const submittedClient = user({ userType: 'client' });
    submittedClient.attributes.profile.privateData = {
      businessDetailsSubmittedAt: '2026-09-30T10:00:00.000Z',
    };
    expect(isAccountSubmitted({ currentUser: submittedClient })).toBe(true);
    expect(getAccountStatus({ currentUser: submittedClient })).toBe(ACCOUNT_STATUS_PENDING);
    expect(getAccountStatus({ currentUser: user({ userType: 'client' }) })).toBe(
      ACCOUNT_STATUS_DRAFT
    );
  });
});

// ---- Review decision (Gate A, amendment 30/09/2026) ---------------------------

describe('getReviewDecision / isReviewDeclined', () => {
  it('reads the operator-set metadata key', () => {
    expect(REVIEW_DECISION_METADATA_KEY).toBe('reviewDecision');
    expect(getReviewDecision(user({ reviewDecision: 'approved' }))).toBe(REVIEW_DECISION_APPROVED);
    expect(getReviewDecision(user({ reviewDecision: 'declined' }))).toBe(REVIEW_DECISION_DECLINED);
    expect(isReviewDeclined(user({ reviewDecision: 'declined' }))).toBe(true);
    expect(isReviewDeclined(user({ reviewDecision: 'approved' }))).toBe(false);
  });
  it('treats a missing, null or unrecognised value as no decision (never approved)', () => {
    [undefined, null, '', 'Approved', 'approved ', 'yes', true, 1].forEach(value => {
      expect(getReviewDecision(user({ reviewDecision: value }))).toBe(null);
    });
    expect(getReviewDecision(undefined)).toBe(null);
  });
  it('does not read the decision from anywhere but metadata', () => {
    const u = user();
    u.attributes.profile.publicData.reviewDecision = 'approved';
    u.attributes.profile.privateData = { reviewDecision: 'approved' };
    u.attributes.profile.protectedData = { reviewDecision: 'approved' };
    expect(getReviewDecision(u)).toBe(null);
  });
});

// ---- getAccountStatus truth table (spec §4 + amendment 30/09/2026) ------------

describe('getAccountStatus', () => {
  // Build a user for one row of the table. `verified` and `submitted` are expressed per user
  // type with the real signals (model: Stripe + listing state; client: metadata + privateData).
  const row = ({ state, userType, decision, verified, submitted }) => {
    const u = user({
      state,
      userType,
      reviewDecision: decision,
      identityVerified: userType === 'client' ? verified : undefined,
    });
    if (userType === 'client' && submitted) {
      u.attributes.profile.privateData = { businessDetailsSubmittedAt: '2026-09-30T10:00:00.000Z' };
    }
    return {
      currentUser: u,
      stripeAccount:
        userType === 'model' ? (verified ? completeStripe : incompleteStripe) : undefined,
      ownListing:
        userType === 'model' ? listing(submitted ? 'pendingApproval' : 'draft') : undefined,
    };
  };

  // The spec rows, written independently of the implementation.
  const expected = ({ state, decision, verified, submitted }) => {
    if (state === 'banned') return ACCOUNT_STATUS_REJECTED;
    if (decision === 'declined') return ACCOUNT_STATUS_REJECTED;
    if (decision === 'approved')
      return verified ? ACCOUNT_STATUS_VERIFIED : ACCOUNT_STATUS_APPROVED;
    return submitted ? ACCOUNT_STATUS_PENDING : ACCOUNT_STATUS_DRAFT;
  };

  const states = ['active', 'pending-approval', 'banned', undefined];
  const userTypes = ['model', 'client'];
  const decisions = [undefined, null, 'approved', 'declined', 'Approved'];
  const bools = [true, false];

  it('matches the spec for every combination of state, type, decision, Gate B and submission', () => {
    let rows = 0;
    states.forEach(state =>
      userTypes.forEach(userType =>
        decisions.forEach(decision =>
          bools.forEach(verified =>
            bools.forEach(submitted => {
              const params = { state, userType, decision, verified, submitted };
              const normalisedDecision =
                decision === 'approved' || decision === 'declined' ? decision : null;
              expect([params, getAccountStatus(row(params))]).toEqual([
                params,
                expected({ ...params, decision: normalisedDecision }),
              ]);
              rows += 1;
            })
          )
        )
      )
    );
    expect(rows).toBe(4 * 2 * 5 * 2 * 2);
  });

  it('active + no decision → Pending approval once submitted, NOT Approved (the amendment)', () => {
    const model = row({ state: 'active', userType: 'model', verified: false, submitted: true });
    expect(getAccountStatus(model)).toBe(ACCOUNT_STATUS_PENDING);
    const client = row({ state: 'active', userType: 'client', verified: false, submitted: true });
    expect(getAccountStatus(client)).toBe(ACCOUNT_STATUS_PENDING);
  });

  it('active + no decision + Gate B done → still Pending (verification is banked)', () => {
    const model = row({ state: 'active', userType: 'model', verified: true, submitted: true });
    expect(getAccountStatus(model)).toBe(ACCOUNT_STATUS_PENDING);
    const client = row({ state: 'active', userType: 'client', verified: true, submitted: true });
    expect(getAccountStatus(client)).toBe(ACCOUNT_STATUS_PENDING);
  });

  it('active + no decision + not submitted → Draft', () => {
    expect(getAccountStatus(row({ state: 'active', userType: 'model', submitted: false }))).toBe(
      ACCOUNT_STATUS_DRAFT
    );
    expect(getAccountStatus(row({ state: 'active', userType: 'client', submitted: false }))).toBe(
      ACCOUNT_STATUS_DRAFT
    );
  });

  it('approved → Approved until Gate B, then Verified (model: Stripe; client: identity)', () => {
    const base = { state: 'active', decision: 'approved', submitted: true };
    expect(getAccountStatus(row({ ...base, userType: 'model', verified: false }))).toBe(
      ACCOUNT_STATUS_APPROVED
    );
    expect(getAccountStatus(row({ ...base, userType: 'model', verified: true }))).toBe(
      ACCOUNT_STATUS_VERIFIED
    );
    expect(getAccountStatus(row({ ...base, userType: 'client', verified: false }))).toBe(
      ACCOUNT_STATUS_APPROVED
    );
    expect(getAccountStatus(row({ ...base, userType: 'client', verified: true }))).toBe(
      ACCOUNT_STATUS_VERIFIED
    );
  });

  it('approved + Gate B lapses → drops back to Approved (live computation)', () => {
    const lapsed = row({
      state: 'active',
      userType: 'model',
      decision: 'approved',
      verified: false,
    });
    lapsed.ownListing = listing('closed');
    expect(getAccountStatus(lapsed)).toBe(ACCOUNT_STATUS_APPROVED);
  });

  it('declined → Rejected, even when verified and submitted', () => {
    const declined = row({
      state: 'active',
      userType: 'model',
      decision: 'declined',
      verified: true,
      submitted: true,
    });
    expect(getAccountStatus(declined)).toBe(ACCOUNT_STATUS_REJECTED);
  });

  it('declined then resubmitted (decision cleared) → Pending approval', () => {
    const resubmitted = row({
      state: 'active',
      userType: 'client',
      decision: null,
      submitted: true,
    });
    expect(getAccountStatus(resubmitted)).toBe(ACCOUNT_STATUS_PENDING);
  });

  it('banned → Rejected/Suspended, even when approved and verified', () => {
    const banned = row({
      state: 'banned',
      userType: 'model',
      decision: 'approved',
      verified: true,
      submitted: true,
    });
    expect(getAccountStatus(banned)).toBe(ACCOUNT_STATUS_REJECTED);
  });

  it('keeps the existing client 18+ input: an under-18 flag without identity_verified is not Verified', () => {
    const u = user({ state: 'active', userType: 'client', reviewDecision: 'approved' });
    u.attributes.profile.metadata.age_check_failed = true;
    expect(getAccountStatus({ currentUser: u })).toBe(ACCOUNT_STATUS_APPROVED);
  });

  it('is pure: the same input always gives the same output and is not mutated', () => {
    const input = row({ state: 'active', userType: 'model', decision: 'approved', verified: true });
    const snapshot = JSON.stringify(input);
    expect(getAccountStatus(input)).toBe(getAccountStatus(input));
    expect(JSON.stringify(input)).toBe(snapshot);
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
