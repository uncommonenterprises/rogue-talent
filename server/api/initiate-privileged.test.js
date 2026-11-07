// SAFETY: a direct booking request (initiate-privileged) runs the shared booking gates
// (api-util/bookingGates.js), the same sequence transition-privileged runs for a booking after
// an enquiry. Both SDKs are stubs; nothing is written to any marketplace.

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

const ENV = {
  REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'configured-in-test',
  SHARETRIBE_INTEGRATION_CLIENT_ID: 'test-id',
  SHARETRIBE_INTEGRATION_CLIENT_SECRET: 'test-secret',
};
const originalEnv = Object.keys(ENV).map(k => [k, process.env[k]]);
Object.assign(process.env, ENV);

const initiatePrivileged = require('./initiate-privileged');

afterAll(() => {
  originalEnv.forEach(([k, v]) => {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  });
});

const PROVIDER_ID = 'model-1';

const customerUser = ({ userType = 'client', metadata } = {}) => ({
  id: { uuid: 'client-1' },
  attributes: { state: 'active', profile: { publicData: { userType }, metadata } },
});
const providerUser = ({ metadata = { reviewDecision: 'approved' }, privateData = {} } = {}) => ({
  data: { data: { attributes: { state: 'active', profile: { metadata, privateData } } } },
});
const listingShow = {
  data: {
    data: {
      id: { uuid: 'listing-1' },
      attributes: { state: 'published', price: { amount: 50000, currency: 'GBP' } },
      relationships: { author: { data: { id: { uuid: PROVIDER_ID } } } },
    },
  },
};

const setup = ({ customer, provider = providerUser() }) => {
  mockState.sdk = {
    listings: { show: jest.fn().mockResolvedValue(listingShow) },
    currentUser: { show: jest.fn().mockResolvedValue({ data: { data: customer } }) },
  };
  const ok = { status: 200, statusText: 'OK', data: {} };
  mockState.trustedSdk = {
    transactions: {
      initiate: jest.fn().mockResolvedValue(ok),
      initiateSpeculative: jest.fn().mockResolvedValue(ok),
    },
  };
  mockIntegrationSdk.users.show.mockResolvedValue(provider);
};

const body = ({ isSpeculative = false, location_type = 'studio' } = {}) => ({
  isSpeculative,
  orderData: {},
  bodyParams: {
    transition: 'transition/request-payment',
    processAlias: 'default-booking/release-1',
    params: { listingId: 'listing-1', protectedData: { location_type } },
  },
  queryParams: {},
});

const run = b =>
  new Promise(resolve => {
    const res = {};
    res.status = code => {
      res.statusCode = code;
      return res;
    };
    res.set = () => res;
    res.send = () => res;
    res.end = () => resolve({ ok: true, statusCode: res.statusCode });
    res.onHandleError = error => resolve({ ok: false, error });
    initiatePrivileged({ body: b }, res);
  });

const codeOf = result => result.error?.data?.errors?.[0]?.code;

describe('initiate-privileged booking gates (shared helper)', () => {
  it('allows an approved, identity-verified client booking a Verified model', async () => {
    setup({
      customer: customerUser({ metadata: { reviewDecision: 'approved', identity_verified: true } }),
    });
    expect(await run(body())).toMatchObject({ ok: true, statusCode: 200 });
    expect(mockState.trustedSdk.transactions.initiate).toHaveBeenCalledTimes(1);
  });

  it('refuses an unapproved client', async () => {
    setup({ customer: customerUser({ metadata: { identity_verified: true } }) });
    const result = await run(body());
    expect(codeOf(result)).toBe('account-approval-required');
    expect(mockState.trustedSdk.transactions.initiate).not.toHaveBeenCalled();
  });

  it('still gates a client who set their userType to "foo"', async () => {
    setup({
      customer: customerUser({ userType: 'foo', metadata: { reviewDecision: 'approved' } }),
    });
    expect(codeOf(await run(body()))).toBe('identity-verification-required');
  });

  it('refuses a model account', async () => {
    setup({
      customer: customerUser({
        userType: 'model',
        metadata: { reviewDecision: 'approved', identity_verified: true },
      }),
    });
    expect(codeOf(await run(body()))).toBe('client-account-required');
  });

  it('refuses when the model is not Verified', async () => {
    setup({
      customer: customerUser({ metadata: { reviewDecision: 'approved', identity_verified: true } }),
      provider: providerUser({ metadata: {} }),
    });
    expect(codeOf(await run(body()))).toBe('booking-not-available');
  });

  it('refuses a private residence the model opted out of', async () => {
    setup({
      customer: customerUser({ metadata: { reviewDecision: 'approved', identity_verified: true } }),
      provider: providerUser({
        privateData: { safety_boundaries: { no_private_residence: true } },
      }),
    });
    expect(codeOf(await run(body({ location_type: 'private-residence' })))).toBe(
      'booking-not-available'
    );
  });

  it('speculative: skips the client and provider gates', async () => {
    setup({ customer: customerUser({ metadata: {} }), provider: providerUser({ metadata: {} }) });
    expect(await run(body({ isSpeculative: true }))).toMatchObject({ ok: true });
    expect(mockState.trustedSdk.transactions.initiateSpeculative).toHaveBeenCalledTimes(1);
    expect(mockState.sdk.currentUser.show).not.toHaveBeenCalled();
    expect(mockIntegrationSdk.users.show).not.toHaveBeenCalled();
  });
});
