// Review page payloads: allow-listed copies only. The Integration SDK is a read-only double
// (write methods throw); nothing touches a real marketplace.

jest.mock('./sdk', () => ({ getSdk: jest.fn() }));
jest.mock('../log', () => ({ error: jest.fn() }));

const {
  buildModelReviewPayload,
  buildClientReviewPayload,
  getTransactionRights,
  pickListingPublicData,
  isValidUserId,
  loadReviewProfile,
} = require('./reviewProfile');

const NOW = new Date('2026-11-04T15:00:00Z');
const MODEL_ID = '11111111-0000-4000-8000-000000000001';
const CLIENT_ID = '22222222-0000-4000-8000-000000000002';

// Values that must never appear in any payload.
const SECRETS = {
  email: 'person@example.com',
  phone: '+447700900123',
  dob: '1999-04-01',
  note: 'Private decline note',
  session: 'vs_secret_session',
  acct: 'acct_secret',
  listingPrivate: 'listing-private-value',
};
const FORBIDDEN = new RegExp(
  [
    'person@example\\.com',
    '7700900123',
    '1999-04-01',
    'Private decline note',
    'vs_secret_session',
    'acct_secret',
    'listing-private-value',
    'date_of_birth',
    'business_phone',
    'phoneNumber',
    '"email"',
  ].join('|')
);

const fullUser = (
  id,
  { publicData = {}, protectedData = {}, privateData = {}, metadata = {} } = {}
) => ({
  id: { uuid: id },
  type: 'user',
  attributes: {
    state: 'active',
    banned: false,
    deleted: false,
    email: SECRETS.email,
    emailVerified: true,
    createdAt: new Date('2026-11-01T09:00:00Z'),
    profile: {
      firstName: 'Hannah',
      lastName: 'Reeve',
      displayName: 'Hannah R',
      bio: 'Bio text',
      publicData,
      protectedData: { phoneNumber: SECRETS.phone, ...protectedData },
      privateData: {
        date_of_birth: SECRETS.dob,
        rejectionReason: SECRETS.note,
        business_phone: SECRETS.phone,
        ...privateData,
      },
      metadata: { identity_verification_session_id: SECRETS.session, ...metadata },
    },
  },
});

const modelListing = (state = 'pendingApproval') => ({
  id: { uuid: 'listing-1' },
  type: 'listing',
  attributes: {
    title: 'Imogen Hart',
    description: 'About me',
    state,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    price: { amount: 38000, currency: 'GBP' },
    publicData: {
      listingType: 'model-profile',
      height_cm: 175,
      location: { address: 'Manchester, UK' },
      stripeAccountId: SECRETS.acct,
    },
    privateData: { accuracyConfirmedAt: '2026-11-02T12:00:00Z', other: SECRETS.listingPrivate },
  },
  relationships: { images: { data: [{ id: { uuid: 'img-1' }, type: 'image' }] } },
});

const image = {
  id: { uuid: 'img-1' },
  type: 'image',
  attributes: {
    variants: {
      'scaled-small': { name: 'scaled-small', url: 'https://img/1-s.jpg', width: 320, height: 400 },
    },
  },
};

describe('buildModelReviewPayload', () => {
  it('returns the profile as clients see it plus the review facts, and nothing private', () => {
    const payload = buildModelReviewPayload({
      user: fullUser(MODEL_ID, { publicData: { userType: 'model' } }),
      listing: modelListing(),
      images: [image],
      stripeStatus: { identity: 'verified', bank: 'in-progress' },
      now: NOW,
    });
    expect(payload).toMatchObject({
      kind: 'model',
      userId: MODEL_ID,
      status: { decision: null, waiting: true },
      submittedAt: '2026-11-02T12:00:00.000Z',
      submittedAtSource: 'accuracyConfirmedAt',
      overdue: true,
      resubmission: false,
      stripe: { identity: 'verified', bank: 'in-progress' },
      listing: {
        title: 'Imogen Hart',
        state: 'pendingApproval',
        price: { amount: 38000, currency: 'GBP' },
        publicData: { listingType: 'model-profile', height_cm: 175 },
        images: [{ id: 'img-1', variants: { 'scaled-small': { url: 'https://img/1-s.jpg' } } }],
      },
      author: { displayName: 'Hannah R', bio: 'Bio text' },
      account: { emailVerified: true },
    });
    expect(payload.listing.publicData.stripeAccountId).toBeUndefined();
    expect(JSON.stringify(payload)).not.toMatch(FORBIDDEN);
  });
});

describe('buildClientReviewPayload', () => {
  it('returns R04 facts only: no email, phone, date of birth or decline note', () => {
    const payload = buildClientReviewPayload({
      user: fullUser(CLIENT_ID, {
        publicData: {
          userType: 'client',
          company_name: 'Northlight Studio Ltd',
          company_registration_number: '01234567',
          industry: 'fashion',
          client_website_url: 'northlight.example',
        },
        protectedData: { business_type: 'limited_company', ageConfirmed18Plus: true },
        privateData: {
          business_address: 'Unit 4, Mill Lane, Leeds',
          businessDetailsSubmittedAt: '2026-11-01T17:42:00Z',
        },
        metadata: { identity_verified: true, age_verified_18plus: true },
      }),
      permissionSet: { attributes: { initiateTransactions: 'permission/deny' } },
      now: NOW,
    });
    expect(payload).toEqual({
      kind: 'client',
      userId: CLIENT_ID,
      status: { decision: null, waiting: true },
      submittedAt: '2026-11-01T17:42:00.000Z',
      submittedAtSource: 'businessDetailsSubmittedAt',
      overdue: true,
      resubmission: false,
      person: { name: 'Hannah Reeve', initials: 'HR' },
      business: {
        businessType: 'limited_company',
        companyName: 'Northlight Studio Ltd',
        companyNumber: '01234567',
        industry: 'fashion',
        website: 'northlight.example',
        address: 'Unit 4, Mill Lane, Leeds',
      },
      identity: {
        status: 'verified',
        verified18Plus: true,
        ageCheckFailed: false,
        declared18Plus: true,
      },
      transactionRights: 'denied',
      account: { createdAt: '2026-11-01T09:00:00.000Z', emailVerified: true },
    });
    expect(JSON.stringify(payload)).not.toMatch(FORBIDDEN);
  });
});

describe('small helpers', () => {
  it('maps transaction rights', () => {
    expect(getTransactionRights({ attributes: { initiateTransactions: 'permission/allow' } })).toBe(
      'allowed'
    );
    expect(getTransactionRights({ attributes: { initiateTransactions: 'permission/deny' } })).toBe(
      'denied'
    );
    expect(getTransactionRights(null)).toBe('unknown');
  });

  it('drops internal listing stamps', () => {
    expect(pickListingPublicData({ a: 1, stripeAccountId: 'acct_x' })).toEqual({ a: 1 });
  });

  it('accepts only UUID-shaped ids', () => {
    expect(isValidUserId(MODEL_ID)).toBe(true);
    expect(isValidUserId('../users')).toBe(false);
    expect(isValidUserId(undefined)).toBe(false);
  });
});

// ================ loadReviewProfile ================ //

const forbidden = name => () => {
  throw new Error(`write method ${name} must never be called`);
};

const makeSdk = ({ userRes, userError, listings = [], included = [] }) => ({
  users: {
    show: jest.fn(() => (userError ? Promise.reject(userError) : Promise.resolve(userRes))),
    updateProfile: forbidden('users.updateProfile'),
    updatePermissions: forbidden('users.updatePermissions'),
  },
  listings: {
    query: jest.fn(() => Promise.resolve({ data: { data: listings, included } })),
    update: forbidden('listings.update'),
    approve: forbidden('listings.approve'),
    close: forbidden('listings.close'),
    open: forbidden('listings.open'),
  },
});

const stripe = () => Promise.resolve({ identity: 'not-started', bank: 'not-started' });

describe('loadReviewProfile', () => {
  it('answers a malformed id without any API call', async () => {
    const sdk = makeSdk({});
    expect(await loadReviewProfile({ integrationSdk: sdk, userId: 'nope' })).toEqual({
      kind: 'not-waiting',
    });
    expect(sdk.users.show).not.toHaveBeenCalled();
  });

  it('answers an unknown id (404) as not waiting', async () => {
    const sdk = makeSdk({ userError: { status: 404 } });
    expect(await loadReviewProfile({ integrationSdk: sdk, userId: MODEL_ID })).toEqual({
      kind: 'not-waiting',
    });
  });

  it('loads a model with a submitted listing, images and Stripe status', async () => {
    const sdk = makeSdk({
      userRes: { data: { data: fullUser(MODEL_ID, { publicData: { userType: 'model' } }) } },
      listings: [modelListing('pendingApproval')],
      included: [image],
    });
    const payload = await loadReviewProfile({
      integrationSdk: sdk,
      userId: MODEL_ID,
      getStripeStatus: stripe,
      now: () => NOW,
    });
    expect(payload.kind).toBe('model');
    expect(payload.listing.images).toHaveLength(1);
    expect(sdk.users.show).toHaveBeenCalledWith({
      id: MODEL_ID,
      include: ['effectivePermissionSet', 'stripeAccount'],
    });
    expect(sdk.listings.query).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: MODEL_ID, include: ['images'] })
    );
    expect(JSON.stringify(payload)).not.toMatch(FORBIDDEN);
  });

  it('a model with only a draft is not waiting', async () => {
    const sdk = makeSdk({
      userRes: { data: { data: fullUser(MODEL_ID, { publicData: { userType: 'model' } }) } },
      listings: [modelListing('draft')],
    });
    expect(
      await loadReviewProfile({ integrationSdk: sdk, userId: MODEL_ID, getStripeStatus: stripe })
    ).toEqual({ kind: 'not-waiting' });
  });

  it('loads a submitted client with their transaction rights', async () => {
    const client = fullUser(CLIENT_ID, {
      publicData: { userType: 'client' },
      privateData: { businessDetailsSubmittedAt: '2026-11-01T17:42:00Z' },
    });
    client.relationships = {
      effectivePermissionSet: { data: { id: { uuid: 'ps-1' }, type: 'permissionSet' } },
    };
    const sdk = makeSdk({
      userRes: {
        data: {
          data: client,
          included: [
            {
              id: { uuid: 'ps-1' },
              type: 'permissionSet',
              attributes: { initiateTransactions: 'permission/allow' },
            },
          ],
        },
      },
    });
    const payload = await loadReviewProfile({
      integrationSdk: sdk,
      userId: CLIENT_ID,
      now: () => NOW,
    });
    expect(payload.kind).toBe('client');
    expect(payload.transactionRights).toBe('allowed');
    expect(JSON.stringify(payload)).not.toMatch(FORBIDDEN);
  });

  it('a client who has not submitted, a staff account, or a banned account is not waiting', async () => {
    const notSubmitted = makeSdk({
      userRes: { data: { data: fullUser(CLIENT_ID, { publicData: { userType: 'client' } }) } },
    });
    const staff = makeSdk({
      userRes: { data: { data: fullUser(CLIENT_ID, { metadata: { roles: ['reviewer'] } }) } },
    });
    const bannedUser = fullUser(CLIENT_ID, {
      publicData: { userType: 'client' },
      privateData: { businessDetailsSubmittedAt: '2026-11-01T17:42:00Z' },
    });
    bannedUser.attributes.banned = true;
    const banned = makeSdk({ userRes: { data: { data: bannedUser } } });
    for (const sdk of [notSubmitted, staff, banned]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await loadReviewProfile({ integrationSdk: sdk, userId: CLIENT_ID })).toEqual({
        kind: 'not-waiting',
      });
    }
  });

  it('passes other errors (e.g. 429) on to the endpoint', async () => {
    const sdk = makeSdk({ userError: { status: 429 } });
    await expect(loadReviewProfile({ integrationSdk: sdk, userId: MODEL_ID })).rejects.toEqual({
      status: 429,
    });
  });
});
