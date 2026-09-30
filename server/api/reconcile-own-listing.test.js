// Own-session reconcile: Gate A amendment 30/09/2026. The model's own session must compute
// Verified from the operator's review decision, not from the user state alone.

const mockCurrentUserShow = jest.fn();
const mockReconcile = jest.fn();

jest.mock('../api-util/sdk', () => ({
  getSdk: () => ({ currentUser: { show: mockCurrentUserShow } }),
}));
jest.mock('../api-util/modelVisibility', () => {
  const actual = jest.requireActual('../api-util/modelVisibility');
  return {
    ...actual,
    reconcileModelListingVisibility: (...args) => mockReconcile(...args),
  };
});
jest.mock('../log', () => ({ error: jest.fn() }));

const reconcileOwnListing = require('./reconcile-own-listing');

const FLAG = 'REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED';
const originalFlag = process.env[FLAG];

const showResponse = ({ metadata = {}, state = 'active', stripeComplete = true } = {}) => ({
  data: {
    data: {
      id: { uuid: 'model-1' },
      attributes: { state, profile: { publicData: { userType: 'model' }, metadata } },
    },
    included: [
      {
        type: 'stripeAccount',
        attributes: {
          stripeAccountId: 'acct_1',
          stripeAccountData: { charges_enabled: stripeComplete, payouts_enabled: stripeComplete },
        },
      },
    ],
  },
});

// Minimal Express response double; resolves once the handler has sent its payload.
const run = () =>
  new Promise(resolve => {
    const res = {
      headersSent: false,
      status() {
        return this;
      },
      set() {
        return this;
      },
      send(body) {
        resolve(JSON.parse(body));
        return this;
      },
      end() {
        return this;
      },
    };
    reconcileOwnListing({ body: {} }, res);
  });

beforeEach(() => {
  mockCurrentUserShow.mockReset();
  mockReconcile.mockReset().mockResolvedValue({ reconciled: false });
  process.env[FLAG] = 'true';
});
afterAll(() => {
  if (originalFlag === undefined) {
    delete process.env[FLAG];
  } else {
    process.env[FLAG] = originalFlag;
  }
});

describe('reconcile-own-listing (flag ON)', () => {
  it('an active, Stripe-verified model with NO review decision reconciles as not Verified', async () => {
    mockCurrentUserShow.mockResolvedValue(showResponse());
    await run();
    expect(mockReconcile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'model-1', verified: false })
    );
  });

  it('a declined, Stripe-verified model reconciles as not Verified', async () => {
    mockCurrentUserShow.mockResolvedValue(
      showResponse({ metadata: { reviewDecision: 'declined' } })
    );
    await run();
    expect(mockReconcile).toHaveBeenCalledWith(expect.objectContaining({ verified: false }));
  });

  it('an approved, Stripe-verified model reconciles as Verified', async () => {
    mockCurrentUserShow.mockResolvedValue(
      showResponse({ metadata: { reviewDecision: 'approved' } })
    );
    await run();
    expect(mockReconcile).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true, stripeAccountId: 'acct_1' })
    );
  });

  it('an approved model without complete Stripe reconciles as not Verified', async () => {
    mockCurrentUserShow.mockResolvedValue(
      showResponse({ metadata: { reviewDecision: 'approved' }, stripeComplete: false })
    );
    await run();
    expect(mockReconcile).toHaveBeenCalledWith(expect.objectContaining({ verified: false }));
  });
});

describe('reconcile-own-listing (flag OFF keeps pre-amendment behaviour)', () => {
  it('active + Stripe complete reconciles as Verified without a decision', async () => {
    delete process.env[FLAG];
    mockCurrentUserShow.mockResolvedValue(showResponse());
    await run();
    expect(mockReconcile).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
  });
});
