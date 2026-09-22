// Account-status Step 2 — reconcile core tests.
//
// Covers: the Verified predicate, the idempotent transition decision, the fail-safe
// reconcile (env-gated + never-throws), the Connect account→user mapping, and the
// end-to-end reconcileFromConnectEvent path. The Integration SDK is mocked.

const mockSdk = {
  listings: {
    query: jest.fn(),
    approve: jest.fn(),
    open: jest.fn(),
    close: jest.fn(),
  },
  users: {
    show: jest.fn(),
  },
};

jest.mock('sharetribe-flex-integration-sdk', () => ({
  createInstance: () => mockSdk,
}));
jest.mock('../log', () => ({ error: jest.fn() }));

// Creds must be present before the first getIntegrationSdk() call (lazy + cached).
beforeAll(() => {
  process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
  process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
});

const {
  computeModelVerified,
  decideTransition,
  reconcileModelListingVisibility,
  reconcileFromConnectEvent,
  resolveUserIdFromConnectEvent,
} = require('./modelVisibility');

const modelListing = state => ({
  data: {
    data: [
      {
        id: { uuid: 'listing-1' },
        attributes: { state, publicData: { listingType: 'model-profile' } },
      },
    ],
  },
});

beforeEach(() => {
  mockSdk.listings.query.mockReset();
  mockSdk.listings.approve.mockReset().mockResolvedValue({});
  mockSdk.listings.open.mockReset().mockResolvedValue({});
  mockSdk.listings.close.mockReset().mockResolvedValue({});
  mockSdk.users.show.mockReset();
});

// ---- computeModelVerified ----------------------------------------------------

describe('computeModelVerified', () => {
  it('is true only when active AND both Stripe flags are true', () => {
    expect(
      computeModelVerified({
        userState: 'active',
        stripeAccountData: { charges_enabled: true, payouts_enabled: true },
      })
    ).toBe(true);
  });
  it('is false when either Stripe flag is missing', () => {
    expect(
      computeModelVerified({
        userState: 'active',
        stripeAccountData: { charges_enabled: true, payouts_enabled: false },
      })
    ).toBe(false);
  });
  it('is false when the user is not active (Gate A not passed)', () => {
    expect(
      computeModelVerified({
        userState: 'pending-approval',
        stripeAccountData: { charges_enabled: true, payouts_enabled: true },
      })
    ).toBe(false);
  });
  it('is false with missing inputs', () => {
    expect(computeModelVerified()).toBe(false);
    expect(computeModelVerified({ userState: 'active' })).toBe(false);
  });
});

// ---- decideTransition (idempotent) -------------------------------------------

describe('decideTransition', () => {
  it('verified: pendingApproval → approve, closed → open, else no-op', () => {
    expect(decideTransition('pendingApproval', true)).toBe('approve');
    expect(decideTransition('closed', true)).toBe('open');
    expect(decideTransition('published', true)).toBe(null);
    expect(decideTransition('draft', true)).toBe(null);
  });
  it('not verified: published → close, else no-op', () => {
    expect(decideTransition('published', false)).toBe('close');
    expect(decideTransition('pendingApproval', false)).toBe(null);
    expect(decideTransition('closed', false)).toBe(null);
    expect(decideTransition('draft', false)).toBe(null);
  });
});

// ---- reconcileModelListingVisibility -----------------------------------------

describe('reconcileModelListingVisibility', () => {
  it('publishes a pendingApproval listing when Verified (approve)', async () => {
    mockSdk.listings.query.mockResolvedValue(modelListing('pendingApproval'));
    const result = await reconcileModelListingVisibility({ userId: 'u1', verified: true });
    expect(mockSdk.listings.approve).toHaveBeenCalledWith({ id: 'listing-1' });
    expect(result).toMatchObject({ reconciled: true, action: 'approve', to: 'published' });
  });

  it('reopens a closed listing when re-Verified (open)', async () => {
    mockSdk.listings.query.mockResolvedValue(modelListing('closed'));
    const result = await reconcileModelListingVisibility({ userId: 'u1', verified: true });
    expect(mockSdk.listings.open).toHaveBeenCalledWith({ id: 'listing-1' });
    expect(result).toMatchObject({ reconciled: true, action: 'open' });
  });

  it('hides a published listing on the live-lapse (close)', async () => {
    mockSdk.listings.query.mockResolvedValue(modelListing('published'));
    const result = await reconcileModelListingVisibility({ userId: 'u1', verified: false });
    expect(mockSdk.listings.close).toHaveBeenCalledWith({ id: 'listing-1' });
    expect(result).toMatchObject({ reconciled: true, action: 'close', to: 'closed' });
  });

  it('is idempotent: no write when already in the correct state', async () => {
    mockSdk.listings.query.mockResolvedValue(modelListing('published'));
    const result = await reconcileModelListingVisibility({ userId: 'u1', verified: true });
    expect(mockSdk.listings.approve).not.toHaveBeenCalled();
    expect(mockSdk.listings.open).not.toHaveBeenCalled();
    expect(mockSdk.listings.close).not.toHaveBeenCalled();
    expect(result).toMatchObject({ reconciled: false, action: null });
  });

  it('never publishes a still-not-verified pendingApproval listing', async () => {
    mockSdk.listings.query.mockResolvedValue(modelListing('pendingApproval'));
    const result = await reconcileModelListingVisibility({ userId: 'u1', verified: false });
    expect(mockSdk.listings.approve).not.toHaveBeenCalled();
    expect(result.reconciled).toBe(false);
  });

  it('skips when the model has no listing', async () => {
    mockSdk.listings.query.mockResolvedValue({ data: { data: [] } });
    const result = await reconcileModelListingVisibility({ userId: 'u1', verified: true });
    expect(result).toMatchObject({ skipped: true, why: 'no-listing' });
  });

  it('skips when no userId is provided', async () => {
    const result = await reconcileModelListingVisibility({ verified: true });
    expect(result).toMatchObject({ skipped: true, why: 'no-user-id' });
    expect(mockSdk.listings.query).not.toHaveBeenCalled();
  });

  it('is fail-safe: a query error resolves (never throws) with why=error', async () => {
    mockSdk.listings.query.mockRejectedValue(new Error('integration down'));
    const result = await reconcileModelListingVisibility({ userId: 'u1', verified: true });
    expect(result).toMatchObject({ reconciled: false, why: 'error' });
  });
});

// ---- Connect event mapping + end-to-end --------------------------------------

describe('resolveUserIdFromConnectEvent', () => {
  it('reads a user id from known metadata keys', () => {
    expect(
      resolveUserIdFromConnectEvent({ data: { object: { metadata: { 'sharetribe-user-id': 'u9' } } } })
    ).toBe('u9');
    expect(
      resolveUserIdFromConnectEvent({ data: { object: { metadata: { user_id: 'u7' } } } })
    ).toBe('u7');
  });
  it('returns null when no known key is present', () => {
    expect(resolveUserIdFromConnectEvent({ data: { object: { metadata: {} } } })).toBe(null);
    expect(resolveUserIdFromConnectEvent({})).toBe(null);
  });
});

describe('reconcileFromConnectEvent', () => {
  it('skips when the account cannot be mapped to a user', async () => {
    const result = await reconcileFromConnectEvent({
      account: 'acct_1',
      data: { object: { metadata: {}, charges_enabled: true, payouts_enabled: true } },
    });
    expect(result).toMatchObject({ skipped: true, why: 'no-user-mapping' });
  });

  it('reconciles to Verified using the event flags + user state (active model)', async () => {
    mockSdk.users.show.mockResolvedValue({
      data: { data: { attributes: { state: 'active', profile: { publicData: { userType: 'model' } } } } },
    });
    mockSdk.listings.query.mockResolvedValue(modelListing('pendingApproval'));
    const result = await reconcileFromConnectEvent({
      account: 'acct_1',
      data: {
        object: { metadata: { 'sharetribe-user-id': 'u1' }, charges_enabled: true, payouts_enabled: true },
      },
    });
    expect(mockSdk.listings.approve).toHaveBeenCalledWith({ id: 'listing-1' });
    expect(result).toMatchObject({ reconciled: true, action: 'approve' });
  });

  it('hides a published listing when the event shows Stripe lapsed', async () => {
    mockSdk.users.show.mockResolvedValue({
      data: { data: { attributes: { state: 'active', profile: { publicData: { userType: 'model' } } } } },
    });
    mockSdk.listings.query.mockResolvedValue(modelListing('published'));
    const result = await reconcileFromConnectEvent({
      account: 'acct_1',
      data: {
        object: { metadata: { 'sharetribe-user-id': 'u1' }, charges_enabled: false, payouts_enabled: false },
      },
    });
    expect(mockSdk.listings.close).toHaveBeenCalledWith({ id: 'listing-1' });
    expect(result).toMatchObject({ reconciled: true, action: 'close' });
  });

  it('skips a non-model user', async () => {
    mockSdk.users.show.mockResolvedValue({
      data: { data: { attributes: { state: 'active', profile: { publicData: { userType: 'client' } } } } },
    });
    const result = await reconcileFromConnectEvent({
      account: 'acct_1',
      data: { object: { metadata: { user_id: 'c1' }, charges_enabled: true, payouts_enabled: true } },
    });
    expect(result).toMatchObject({ skipped: true, why: 'not-a-model' });
  });
});

// ---- fail-safe: reconcile inactive without Integration creds ------------------

describe('reconcile when Integration creds are absent', () => {
  it('is inactive + fail-safe (never throws, never writes)', async () => {
    await jest.isolateModulesAsync(async () => {
      delete process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
      delete process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
      const mv = require('./modelVisibility');
      expect(mv.isConfigured()).toBe(false);
      const result = await mv.reconcileModelListingVisibility({ userId: 'u1', verified: true });
      expect(result).toMatchObject({ skipped: true, why: 'not-configured' });
    });
    // Restore for any later tests.
    process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
    process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
  });
});
