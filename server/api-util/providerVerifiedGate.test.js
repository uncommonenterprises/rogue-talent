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
