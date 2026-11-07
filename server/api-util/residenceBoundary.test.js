// SAF-14 residence boundary: the provider + location-type resolution used by both booking
// routes (initiate-privileged and, for a booking after an enquiry, transition-privileged).
// The Integration SDK is a stub; nothing is written.

const mockIntegrationSdk = { users: { show: jest.fn() } };

jest.mock('sharetribe-flex-integration-sdk', () => ({
  createInstance: () => mockIntegrationSdk,
}));
jest.mock('../log', () => ({ error: jest.fn() }));

const ENV_KEYS = ['SHARETRIBE_INTEGRATION_CLIENT_ID', 'SHARETRIBE_INTEGRATION_CLIENT_SECRET'];
const originalEnv = ENV_KEYS.map(k => [k, process.env[k]]);

// residenceBoundary reads the Integration credentials when it is loaded.
process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
const { enforceResidenceBoundary } = require('./residenceBoundary');

afterAll(() => {
  originalEnv.forEach(([k, v]) => {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  });
});

const listing = (authorId = 'model-1') => ({
  attributes: { state: 'published' },
  relationships: { author: { data: { id: { uuid: authorId } } } },
});
const optedOut = { safety_boundaries: { no_private_residence: true } };
const providerWith = privateData => ({
  data: { data: { attributes: { profile: { privateData } } } },
});
const bodyWith = protectedData => ({ params: { protectedData } });
const blocked = { status: 409, data: { errors: [{ code: 'booking-not-available' }] } };

beforeEach(() => {
  mockIntegrationSdk.users.show.mockResolvedValue(providerWith(optedOut));
});

describe('enforceResidenceBoundary', () => {
  it('blocks a private-residence booking against a model who opted out', async () => {
    await expect(
      enforceResidenceBoundary({
        listing: listing(),
        orderData: {},
        bodyParams: bodyWith({ location_type: 'private-residence' }),
      })
    ).rejects.toMatchObject(blocked);
  });

  it('does not look anything up for a non-residence booking', async () => {
    await expect(
      enforceResidenceBoundary({
        listing: listing(),
        orderData: {},
        bodyParams: bodyWith({ location_type: 'studio' }),
      })
    ).resolves.toBeUndefined();
    expect(mockIntegrationSdk.users.show).not.toHaveBeenCalled();
  });

  it('checks a server-resolved providerId in preference to the listing author', async () => {
    await expect(
      enforceResidenceBoundary({
        listing: listing('someone-else'),
        providerId: 'tx-provider-1',
        orderData: {},
        bodyParams: bodyWith({ location_type: 'private-residence' }),
      })
    ).rejects.toMatchObject(blocked);
    expect(mockIntegrationSdk.users.show).toHaveBeenCalledWith({ id: 'tx-provider-1' });
  });

  it('counts a private-residence location saved on the transaction at the enquiry step', async () => {
    // The booking request leaves location_type out; Sharetribe merges protectedData, so the
    // enquiry's value still applies and must be checked.
    await expect(
      enforceResidenceBoundary({
        listing: listing(),
        existingProtectedData: { location_type: 'private-residence' },
        orderData: {},
        bodyParams: bodyWith({ shoot_description: 'x' }),
      })
    ).rejects.toMatchObject(blocked);
  });

  it('lets the booking request override the enquiry value (merge semantics, no false block)', async () => {
    await expect(
      enforceResidenceBoundary({
        listing: listing(),
        existingProtectedData: { location_type: 'private-residence' },
        orderData: {},
        bodyParams: bodyWith({ location_type: 'studio' }),
      })
    ).resolves.toBeUndefined();
  });

  it('allows a private-residence booking when the model has not opted out', async () => {
    mockIntegrationSdk.users.show.mockResolvedValue(providerWith({}));
    await expect(
      enforceResidenceBoundary({
        listing: listing(),
        orderData: {},
        bodyParams: bodyWith({ location_type: 'private-residence' }),
      })
    ).resolves.toBeUndefined();
  });

  it('fails CLOSED for a residence booking when no provider can be resolved', async () => {
    await expect(
      enforceResidenceBoundary({
        listing: { attributes: {} },
        orderData: {},
        bodyParams: bodyWith({ location_type: 'private-residence' }),
      })
    ).rejects.toMatchObject(blocked);
    expect(mockIntegrationSdk.users.show).not.toHaveBeenCalled();
  });
});
