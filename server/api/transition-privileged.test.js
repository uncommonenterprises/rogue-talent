// SAFETY: booking after an enquiry (transition/request-payment-after-inquiry) must pass the
// SAME booking gates as a direct booking request (initiate-privileged): Gate A review approval,
// SAF-03 identity + 18+, the provider-Verified gate and the SAF-14 residence boundary. Every
// other privileged transition must be unaffected.
//
// Both SDKs are stubs: the customer's Marketplace SDK (session-scoped) and the operator
// Integration SDK. Nothing is written to any marketplace.

const mockIntegrationSdk = { users: { show: jest.fn() } };
const mockState = { sdk: null, trustedSdk: null };

jest.mock('sharetribe-flex-integration-sdk', () => ({
  createInstance: () => mockIntegrationSdk,
}));
jest.mock('../log', () => ({ error: jest.fn() }));
jest.mock('../api-util/lineItems', () => ({ transactionLineItems: () => [] }));
jest.mock('../api-util/sdk', () => ({
  getSdk: () => mockState.sdk,
  getTrustedSdk: () => Promise.resolve(mockState.trustedSdk),
  fetchCommission: () => Promise.resolve({ data: { data: [] } }),
  handleError: (res, error) => res.onHandleError(error),
  serialize: data => data,
}));

// The cutover state: account-status flag ON, Stripe Identity configured, Integration creds
// present. residenceBoundary reads the Integration creds when it is loaded, so set them first.
const ENV = {
  REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'configured-in-test',
  SHARETRIBE_INTEGRATION_CLIENT_ID: 'test-id',
  SHARETRIBE_INTEGRATION_CLIENT_SECRET: 'test-secret',
};
const originalEnv = Object.keys(ENV).map(k => [k, process.env[k]]);
Object.assign(process.env, ENV);

const transitionPrivileged = require('./transition-privileged');

afterAll(() => {
  originalEnv.forEach(([k, v]) => {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  });
});

const BOOK_AFTER_ENQUIRY = 'transition/request-payment-after-inquiry';
const PROVIDER_ID = 'model-1';

// ---- fixtures -------------------------------------------------------------------------

const approvedVerifiedClient = { reviewDecision: 'approved', identity_verified: true };

const customerUser = ({ userType = 'client', metadata = approvedVerifiedClient } = {}) => ({
  id: { uuid: 'client-1' },
  attributes: { state: 'active', profile: { publicData: { userType }, metadata } },
});

const providerUser = ({ metadata = { reviewDecision: 'approved' }, privateData = {} } = {}) => ({
  data: {
    data: {
      id: { uuid: PROVIDER_ID },
      attributes: {
        state: 'active',
        profile: { publicData: { userType: 'model' }, metadata, privateData },
      },
    },
  },
});

const optedOutOfResidence = { safety_boundaries: { no_private_residence: true } };

// The transaction as the Marketplace API returns it to the customer: an enquiry on a published
// model-profile listing, with the listing and provider included.
const transactionShow = ({ protectedData = {}, listingState = 'published' } = {}) => ({
  data: {
    data: {
      id: { uuid: 'tx-1' },
      type: 'transaction',
      attributes: {
        lastTransition: 'transition/inquire',
        transitions: [{ transition: 'transition/inquire', by: 'customer' }],
        metadata: {},
        protectedData,
        payinTotal: null,
      },
      relationships: {
        listing: { data: { id: { uuid: 'listing-1' } } },
        provider: { data: { id: { uuid: PROVIDER_ID } } },
      },
    },
    included: [
      {
        id: { uuid: 'listing-1' },
        type: 'listing',
        attributes: { state: listingState, price: { amount: 50000, currency: 'GBP' } },
        relationships: {},
      },
      { id: { uuid: PROVIDER_ID }, type: 'user', attributes: {} },
    ],
  },
});

const setup = ({ customer = customerUser(), provider = providerUser(), transaction } = {}) => {
  mockState.sdk = {
    transactions: { show: jest.fn().mockResolvedValue(transaction || transactionShow()) },
    currentUser: { show: jest.fn().mockResolvedValue({ data: { data: customer } }) },
  };
  const ok = { status: 200, statusText: 'OK', data: { data: { id: { uuid: 'tx-1' } } } };
  mockState.trustedSdk = {
    transactions: {
      transition: jest.fn().mockResolvedValue(ok),
      transitionSpeculative: jest.fn().mockResolvedValue(ok),
    },
  };
  mockIntegrationSdk.users.show.mockResolvedValue(provider);
};

const bookingBody = ({
  transition = BOOK_AFTER_ENQUIRY,
  isSpeculative = false,
  protectedData = { location_type: 'studio' },
  listingId = 'listing-1',
  orderData = {},
} = {}) => ({
  isSpeculative,
  orderData,
  bodyParams: { id: 'tx-1', transition, params: { listingId, protectedData } },
  queryParams: {},
});

// Run the express handler and resolve with either the response or the handled error.
const run = body =>
  new Promise(resolve => {
    const res = {};
    res.status = code => {
      res.statusCode = code;
      return res;
    };
    res.set = () => res;
    res.send = payload => {
      res.payload = payload;
      return res;
    };
    res.end = () => resolve({ ok: true, statusCode: res.statusCode, payload: res.payload });
    res.onHandleError = error => resolve({ ok: false, error });
    transitionPrivileged({ body }, res);
  });

const refusedWith = code => expect.objectContaining({ data: { errors: [{ code }] } });

const expectRefused = (result, code, status) => {
  expect(result.ok).toBe(false);
  expect(result.error).toEqual(refusedWith(code));
  expect(result.error.status).toBe(status);
  expect(mockState.trustedSdk.transactions.transition).not.toHaveBeenCalled();
  expect(mockState.trustedSdk.transactions.transitionSpeculative).not.toHaveBeenCalled();
};

// ---- booking after an enquiry: refusals ------------------------------------------------

describe('request-payment-after-inquiry runs the booking gates', () => {
  it('refuses a client who is not review-approved (Gate A)', async () => {
    setup({ customer: customerUser({ metadata: { identity_verified: true } }) });
    const result = await run(bookingBody());
    expectRefused(result, 'account-approval-required', 403);
  });

  it('refuses a declined client', async () => {
    setup({
      customer: customerUser({ metadata: { reviewDecision: 'declined', identity_verified: true } }),
    });
    expectRefused(await run(bookingBody()), 'account-approval-required', 403);
  });

  it('refuses an approved client who has not passed identity / 18+', async () => {
    setup({ customer: customerUser({ metadata: { reviewDecision: 'approved' } }) });
    expectRefused(await run(bookingBody()), 'identity-verification-required', 403);
  });

  it('refuses an approved client whose 18+ check failed', async () => {
    setup({
      customer: customerUser({
        metadata: { reviewDecision: 'approved', age_check_failed: true },
      }),
    });
    expectRefused(await run(bookingBody()), 'identity-verification-required', 403);
  });

  it('refuses when the model (provider) is not Verified', async () => {
    setup({ provider: providerUser({ metadata: {} }) });
    const result = await run(bookingBody());
    expectRefused(result, 'booking-not-available', 409);
    // The provider was resolved from the transaction, not the request body.
    expect(mockIntegrationSdk.users.show).toHaveBeenCalledWith({ id: PROVIDER_ID });
  });

  it('refuses when the listing is no longer published', async () => {
    setup({ transaction: transactionShow({ listingState: 'closed' }) });
    expectRefused(await run(bookingBody()), 'booking-not-available', 409);
  });

  it('refuses a private-residence booking when the model opted out (silent, generic)', async () => {
    setup({ provider: providerUser({ privateData: optedOutOfResidence }) });
    const result = await run(
      bookingBody({ protectedData: { location_type: 'private-residence' } })
    );
    expectRefused(result, 'booking-not-available', 409);
    // The residence gate runs first, so no client lookup happens.
    expect(mockState.sdk.currentUser.show).not.toHaveBeenCalled();
  });

  it('refuses a private-residence location saved at the enquiry step and omitted now', async () => {
    setup({
      provider: providerUser({ privateData: optedOutOfResidence }),
      transaction: transactionShow({ protectedData: { location_type: 'private-residence' } }),
    });
    expectRefused(await run(bookingBody({ protectedData: {} })), 'booking-not-available', 409);
  });

  it('ignores a listingId in the request body when choosing who to gate', async () => {
    // The body points at another listing; the gate still checks the transaction's provider.
    setup({ provider: providerUser({ metadata: {} }) });
    const result = await run(bookingBody({ listingId: 'some-verified-models-listing' }));
    expectRefused(result, 'booking-not-available', 409);
    expect(mockIntegrationSdk.users.show).toHaveBeenCalledWith({ id: PROVIDER_ID });
  });

  it('fails CLOSED when the client lookup errors', async () => {
    setup();
    mockState.sdk.currentUser.show.mockRejectedValue(new Error('api down'));
    expectRefused(await run(bookingBody()), 'identity-verification-required', 403);
  });

  it('fails CLOSED when the provider lookup errors', async () => {
    setup();
    mockIntegrationSdk.users.show.mockRejectedValue(new Error('integration down'));
    expectRefused(await run(bookingBody()), 'booking-not-available', 409);
  });
});

// ---- booking after an enquiry: success -------------------------------------------------

describe('request-payment-after-inquiry for a fully approved client and Verified model', () => {
  it('goes through to the trusted transition', async () => {
    setup();
    const result = await run(bookingBody());
    expect(result).toMatchObject({ ok: true, statusCode: 200 });
    expect(mockState.trustedSdk.transactions.transition).toHaveBeenCalledTimes(1);
    const [body] = mockState.trustedSdk.transactions.transition.mock.calls[0];
    expect(body).toMatchObject({
      id: 'tx-1',
      transition: BOOK_AFTER_ENQUIRY,
      params: { lineItems: [], protectedData: { location_type: 'studio' } },
    });
    // listingId is still stripped from the transition params, as before.
    expect(body.params.listingId).toBeUndefined();
  });

  it('allows a private-residence booking when the model has not opted out', async () => {
    setup();
    const result = await run(
      bookingBody({ protectedData: { location_type: 'private-residence' } })
    );
    expect(result).toMatchObject({ ok: true, statusCode: 200 });
  });
});

// ---- the client gate ignores a self-set userType ---------------------------------------

describe('a client who rewrites their own publicData.userType is still gated', () => {
  it.each(['model', 'foo'])('userType %p, not approved: refused', async userType => {
    setup({ customer: customerUser({ userType, metadata: { identity_verified: true } }) });
    const result = await run(bookingBody());
    expectRefused(
      result,
      userType === 'model' ? 'client-account-required' : 'account-approval-required',
      403
    );
  });

  it.each(['model', 'foo'])(
    'userType %p, approved but not identity-verified: refused',
    async userType => {
      setup({ customer: customerUser({ userType, metadata: { reviewDecision: 'approved' } }) });
      const result = await run(bookingBody());
      expectRefused(
        result,
        userType === 'model' ? 'client-account-required' : 'identity-verification-required',
        403
      );
    }
  );

  it('a model account is refused even when approved and identity-verified', async () => {
    setup({ customer: customerUser({ userType: 'model' }) });
    expectRefused(await run(bookingBody()), 'client-account-required', 403);
  });
});

// ---- speculative (price preview) calls -------------------------------------------------

describe('speculative booking-after-enquiry behaves as in initiate-privileged', () => {
  it('skips the client and provider gates (no lookups) and previews the price', async () => {
    setup({
      customer: customerUser({ metadata: {} }),
      provider: providerUser({ metadata: {} }),
    });
    const result = await run(bookingBody({ isSpeculative: true }));
    expect(result).toMatchObject({ ok: true, statusCode: 200 });
    expect(mockState.trustedSdk.transactions.transitionSpeculative).toHaveBeenCalledTimes(1);
    expect(mockState.trustedSdk.transactions.transition).not.toHaveBeenCalled();
    expect(mockState.sdk.currentUser.show).not.toHaveBeenCalled();
    expect(mockIntegrationSdk.users.show).not.toHaveBeenCalled();
  });

  it('still enforces the residence boundary on a speculative call', async () => {
    setup({ provider: providerUser({ privateData: optedOutOfResidence }) });
    const result = await run(
      bookingBody({ isSpeculative: true, protectedData: { location_type: 'private-residence' } })
    );
    expectRefused(result, 'booking-not-available', 409);
  });
});

// ---- non-booking privileged transitions are unaffected ---------------------------------

describe('non-booking privileged transitions are unaffected', () => {
  it('a provider transition runs no booking gate, even for unapproved parties', async () => {
    setup({
      customer: customerUser({ metadata: {} }),
      provider: providerUser({ metadata: {}, privateData: optedOutOfResidence }),
    });
    const result = await run(
      bookingBody({
        transition: 'transition/accept',
        protectedData: { location_type: 'private-residence' },
      })
    );
    expect(result).toMatchObject({ ok: true, statusCode: 200 });
    expect(mockState.trustedSdk.transactions.transition).toHaveBeenCalledTimes(1);
    expect(mockState.sdk.currentUser.show).not.toHaveBeenCalled();
    expect(mockIntegrationSdk.users.show).not.toHaveBeenCalled();
  });

  it('a negotiation offer transition runs no booking gate', async () => {
    setup({ customer: customerUser({ metadata: {} }), provider: providerUser({ metadata: {} }) });
    const result = await run(
      bookingBody({
        transition: 'transition/make-offer-after-inquiry',
        orderData: { offerInSubunits: 10000, actor: 'provider' },
      })
    );
    expect(result).toMatchObject({ ok: true, statusCode: 200 });
    expect(mockState.sdk.currentUser.show).not.toHaveBeenCalled();
    expect(mockIntegrationSdk.users.show).not.toHaveBeenCalled();
  });
});
