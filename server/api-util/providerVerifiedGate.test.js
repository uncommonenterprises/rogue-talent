// Account-status Step 2 — provider-Verified booking gate tests.

const mockSdk = {
  users: { show: jest.fn() },
};

jest.mock('sharetribe-flex-integration-sdk', () => ({
  createInstance: () => mockSdk,
}));
jest.mock('../log', () => ({ error: jest.fn() }));

const listing = (state, authorId = 'provider-1') => ({
  attributes: { state },
  relationships: { author: { data: { id: { uuid: authorId } } } },
});

const providerUser = (state, userType = 'model') => ({
  data: { data: { attributes: { state, profile: { publicData: { userType } } } } },
});

beforeEach(() => {
  mockSdk.users.show.mockReset();
});

describe('enforceProviderVerified (configured)', () => {
  let enforceProviderVerified;

  beforeAll(() => {
    process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
    process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
    ({ enforceProviderVerified } = require('./providerVerifiedGate'));
  });

  it('allows a booking when the provider is active + listing published', async () => {
    mockSdk.users.show.mockResolvedValue(providerUser('active'));
    await expect(
      enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
    ).resolves.toBeUndefined();
  });

  it('blocks when the provider user is not active', async () => {
    mockSdk.users.show.mockResolvedValue(providerUser('pending-approval'));
    await expect(
      enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
    ).rejects.toMatchObject({ status: 409, data: { errors: [{ code: 'booking-not-available' }] } });
  });

  it('blocks when the listing is not published (defensive)', async () => {
    await expect(
      enforceProviderVerified({ listing: listing('closed'), isSpeculative: false })
    ).rejects.toMatchObject({ status: 409, data: { errors: [{ code: 'booking-not-available' }] } });
    expect(mockSdk.users.show).not.toHaveBeenCalled();
  });

  it('always allows speculative (price preview) calls', async () => {
    await expect(
      enforceProviderVerified({ listing: listing('published'), isSpeculative: true })
    ).resolves.toBeUndefined();
    expect(mockSdk.users.show).not.toHaveBeenCalled();
  });

  it('does not gate a non-model author', async () => {
    mockSdk.users.show.mockResolvedValue(providerUser('pending-approval', 'client'));
    await expect(
      enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
    ).resolves.toBeUndefined();
  });

  it('fails CLOSED when the provider lookup errors (with creds present)', async () => {
    mockSdk.users.show.mockRejectedValue(new Error('integration down'));
    await expect(
      enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
    ).rejects.toMatchObject({ status: 409, data: { errors: [{ code: 'booking-not-available' }] } });
  });
});

describe('enforceProviderVerified: Gate A review decision (amendment 30/09/2026)', () => {
  const FLAG = 'REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED';
  const original = process.env[FLAG];
  let enforceProviderVerified;

  const providerWith = (metadata, state = 'active') => ({
    data: {
      data: { attributes: { state, profile: { publicData: { userType: 'model' }, metadata } } },
    },
  });
  const blocked = { status: 409, data: { errors: [{ code: 'booking-not-available' }] } };

  beforeAll(() => {
    process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
    process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
    ({ enforceProviderVerified } = require('./providerVerifiedGate'));
  });
  afterEach(() => {
    if (original === undefined) {
      delete process.env[FLAG];
    } else {
      process.env[FLAG] = original;
    }
  });

  describe('flag ON', () => {
    beforeEach(() => {
      process.env[FLAG] = 'true';
    });

    it('blocks an active provider with a published listing but NO review decision', async () => {
      mockSdk.users.show.mockResolvedValue(providerWith({}));
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).rejects.toMatchObject(blocked);
    });

    it('blocks a declined provider, even with a published listing', async () => {
      mockSdk.users.show.mockResolvedValue(providerWith({ reviewDecision: 'declined' }));
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).rejects.toMatchObject(blocked);
    });

    it('blocks an unrecognised decision value (a typo is never approved)', async () => {
      mockSdk.users.show.mockResolvedValue(providerWith({ reviewDecision: 'Approved' }));
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).rejects.toMatchObject(blocked);
    });

    it('blocks an approved provider who is banned', async () => {
      mockSdk.users.show.mockResolvedValue(providerWith({ reviewDecision: 'approved' }, 'banned'));
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).rejects.toMatchObject(blocked);
    });

    it('allows an approved, active provider with a published listing', async () => {
      mockSdk.users.show.mockResolvedValue(providerWith({ reviewDecision: 'approved' }));
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).resolves.toBeUndefined();
    });

    it('still fails CLOSED when the provider lookup errors', async () => {
      mockSdk.users.show.mockRejectedValue(new Error('integration down'));
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).rejects.toMatchObject(blocked);
    });

    it('still allows speculative (price preview) calls', async () => {
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: true })
      ).resolves.toBeUndefined();
      expect(mockSdk.users.show).not.toHaveBeenCalled();
    });
  });

  describe('flag OFF (unchanged behaviour)', () => {
    it('allows an active provider with no review decision', async () => {
      delete process.env[FLAG];
      mockSdk.users.show.mockResolvedValue(providerWith({}));
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).resolves.toBeUndefined();
    });
  });
});

describe('enforceProviderVerified (unconfigured)', () => {
  it('fails OPEN (resolves) when Integration creds are absent', async () => {
    await jest.isolateModulesAsync(async () => {
      delete process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
      delete process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
      const { enforceProviderVerified } = require('./providerVerifiedGate');
      await expect(
        enforceProviderVerified({ listing: listing('published'), isSpeculative: false })
      ).resolves.toBeUndefined();
    });
    process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
    process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
  });
});
