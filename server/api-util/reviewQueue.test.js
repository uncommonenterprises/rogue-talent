// Review queue building and sorting. The Integration SDK is a hand-made read-only double: any
// write method would throw, and nothing touches a real marketplace.

jest.mock('./sdk', () => ({ getSdk: jest.fn() }));
jest.mock('../log', () => ({ error: jest.fn() }));

const {
  selectPendingModels,
  selectPendingClients,
  buildModelRow,
  buildClientRow,
  sortQueue,
  getModelSubmittedAt,
  getClientSubmittedAt,
  isResubmission,
  buildQueue,
  getQueue,
  resetQueueCache,
  CACHE_TTL_MS,
} = require('./reviewQueue');

const NOW = new Date('2026-11-04T15:00:00Z'); // Wednesday
const STAFF_ID = 'ffffffff-0000-4000-8000-00000000staff';

const user = (
  id,
  { metadata = {}, publicData = {}, protectedData = {}, privateData = {}, ...rest } = {}
) => ({
  id: { uuid: id },
  type: 'user',
  attributes: {
    state: 'active',
    banned: false,
    deleted: false,
    email: `${id}@example.com`,
    createdAt: new Date('2026-10-01T09:00:00Z'),
    profile: {
      firstName: `First${id}`,
      lastName: `Last${id}`,
      displayName: `First${id} L`,
      publicData,
      protectedData,
      privateData,
      metadata,
    },
    ...rest,
  },
});

const listing = (id, authorId, state, { createdAt, accuracyConfirmedAt, city = 'Leeds' } = {}) => ({
  id: { uuid: id },
  type: 'listing',
  attributes: {
    title: `Model ${authorId}`,
    state,
    createdAt: new Date(createdAt || '2026-10-20T09:00:00Z'),
    publicData: { listingType: 'model-profile', location: { address: `${city}, UK` } },
    privateData: accuracyConfirmedAt ? { accuracyConfirmedAt } : {},
  },
  relationships: { author: { data: { id: { uuid: authorId }, type: 'user' } } },
});

const scan = (data, included = []) => ({ data, included });

describe('selectPendingModels', () => {
  it('keeps submitted model listings whose author has no decision', () => {
    const result = selectPendingModels(
      scan(
        [
          listing('l1', 'm1', 'pendingApproval'),
          listing('l2', 'm2', 'pendingApproval'),
          listing('l3', 'm3', 'closed'),
          listing('l4', 'm4', 'draft'),
        ],
        [
          user('m1'),
          user('m2', { metadata: { reviewDecision: 'approved' } }),
          user('m3', { metadata: { reviewDecision: 'declined' } }),
          user('m4'),
        ]
      )
    );
    expect(result.map(r => r.user.id.uuid)).toEqual(['m1']);
  });

  it('includes resubmitted (closed, no decision) and anomalous (published, no decision) listings', () => {
    const result = selectPendingModels(
      scan(
        [listing('l1', 'm1', 'closed'), listing('l2', 'm2', 'published')],
        [user('m1'), user('m2')]
      )
    );
    expect(result.map(r => r.listing.attributes.state)).toEqual(['closed', 'published']);
  });

  it('treats an unrecognised decision value as no decision', () => {
    const result = selectPendingModels(
      scan(
        [listing('l1', 'm1', 'pendingApproval')],
        [user('m1', { metadata: { reviewDecision: 'Approved' } })]
      )
    );
    expect(result).toHaveLength(1);
  });

  it('skips banned, deleted and staff accounts, and other listing types', () => {
    process.env.REVIEW_ADMIN_USER_IDS = STAFF_ID;
    const other = listing('l5', 'm5', 'pendingApproval');
    other.attributes.publicData.listingType = 'something-else';
    const result = selectPendingModels(
      scan(
        [
          listing('l1', 'm1', 'pendingApproval'),
          listing('l2', 'm2', 'pendingApproval'),
          listing('l3', 'm3', 'pendingApproval'),
          listing('l4', STAFF_ID, 'pendingApproval'),
          other,
        ],
        [
          user('m1', { banned: true }),
          user('m2', { deleted: true }),
          user('m3', { metadata: { roles: ['reviewer'] } }),
          user(STAFF_ID),
          user('m5'),
        ]
      )
    );
    expect(result).toEqual([]);
    delete process.env.REVIEW_ADMIN_USER_IDS;
  });

  it('keeps one listing per model, preferring pendingApproval', () => {
    const result = selectPendingModels(
      scan([listing('l1', 'm1', 'published'), listing('l2', 'm1', 'pendingApproval')], [user('m1')])
    );
    expect(result).toHaveLength(1);
    expect(result[0].listing.id.uuid).toBe('l2');
  });

  it('finds the Stripe account id from the included stripeAccount, else the listing stamp', () => {
    const m1 = user('m1');
    m1.relationships = { stripeAccount: { data: { id: { uuid: 'sa1' }, type: 'stripeAccount' } } };
    const l2 = listing('l2', 'm2', 'pendingApproval');
    l2.attributes.publicData.stripeAccountId = 'acct_stamped';
    const result = selectPendingModels(
      scan(
        [listing('l1', 'm1', 'pendingApproval'), l2],
        [
          m1,
          user('m2'),
          {
            id: { uuid: 'sa1' },
            type: 'stripeAccount',
            attributes: { stripeAccountId: 'acct_rel' },
          },
        ]
      )
    );
    expect(result.map(r => r.stripeAccountId)).toEqual(['acct_rel', 'acct_stamped']);
  });
});

describe('selectPendingClients', () => {
  it('keeps clients who submitted business details and have no decision', () => {
    const submitted = { businessDetailsSubmittedAt: '2026-11-03T10:00:00Z' };
    const result = selectPendingClients(
      scan([
        user('c1', { privateData: submitted }),
        user('c2', { privateData: {} }),
        user('c3', { privateData: submitted, metadata: { reviewDecision: 'approved' } }),
        user('c4', { privateData: submitted, metadata: { roles: ['reviewer'] } }),
        user('c5', { privateData: submitted, banned: true }),
      ])
    );
    expect(result.map(u => u.id.uuid)).toEqual(['c1']);
  });
});

describe('submitted date fallbacks (stage 1 never writes reviewQueuedAt)', () => {
  it('models: reviewQueuedAt > accuracyConfirmedAt > listing createdAt', () => {
    const l = listing('l1', 'm1', 'pendingApproval', {
      accuracyConfirmedAt: '2026-11-02T12:00:00Z',
    });
    expect(
      getModelSubmittedAt(l, user('m1', { metadata: { reviewQueuedAt: '2026-11-03T08:00:00Z' } }))
    ).toEqual({
      submittedAt: '2026-11-03T08:00:00.000Z',
      submittedAtSource: 'reviewQueuedAt',
    });
    expect(getModelSubmittedAt(l, user('m1'))).toEqual({
      submittedAt: '2026-11-02T12:00:00.000Z',
      submittedAtSource: 'accuracyConfirmedAt',
    });
    expect(getModelSubmittedAt(listing('l2', 'm1', 'pendingApproval'), user('m1'))).toEqual({
      submittedAt: '2026-10-20T09:00:00.000Z',
      submittedAtSource: 'listingCreatedAt',
    });
  });

  it('clients: reviewQueuedAt > businessDetailsSubmittedAt > user createdAt', () => {
    expect(
      getClientSubmittedAt(
        user('c1', { privateData: { businessDetailsSubmittedAt: '2026-11-03T10:00:00Z' } })
      )
    ).toEqual({
      submittedAt: '2026-11-03T10:00:00.000Z',
      submittedAtSource: 'businessDetailsSubmittedAt',
    });
    expect(
      getClientSubmittedAt(user('c1', { privateData: { businessDetailsSubmittedAt: 'garbage' } }))
    ).toEqual({
      submittedAt: '2026-10-01T09:00:00.000Z',
      submittedAtSource: 'userCreatedAt',
    });
  });
});

describe('resubmission flag', () => {
  it('is set by a declined entry in the stage 2 review log, or a closed model listing', () => {
    expect(
      isResubmission({ user: user('c1', { metadata: { reviewLog: [{ decision: 'declined' }] } }) })
    ).toBe(true);
    expect(
      isResubmission({ user: user('c1', { metadata: { reviewLog: [{ decision: 'approved' }] } }) })
    ).toBe(false);
    expect(isResubmission({ user: user('m1'), listing: listing('l1', 'm1', 'closed') })).toBe(true);
    expect(
      isResubmission({ user: user('m1'), listing: listing('l1', 'm1', 'pendingApproval') })
    ).toBe(false);
  });
});

describe('rows', () => {
  it('model row: R01 fields only, amber when over 1 working day', () => {
    const row = buildModelRow({
      listing: listing('l1', 'm1', 'pendingApproval', {
        accuracyConfirmedAt: '2026-11-02T12:00:00Z',
      }),
      user: user('m1'),
      stripeStatus: { identity: 'verified', bank: 'in-progress' },
      now: NOW,
    });
    expect(row).toEqual({
      userId: 'm1',
      type: 'model',
      name: 'Model m1',
      initials: 'MM',
      place: 'Leeds',
      submittedAt: '2026-11-02T12:00:00.000Z',
      submittedAtSource: 'accuracyConfirmedAt',
      overdue: true,
      verification: 'in-progress',
      resubmission: false,
      anomaly: null,
    });
  });

  it('client row: company as the place, identity status from metadata, no email/phone/address', () => {
    const row = buildClientRow({
      user: user('c1', {
        publicData: { company_name: 'Northlight Studio Ltd' },
        protectedData: { business_type: 'limited_company' },
        privateData: {
          businessDetailsSubmittedAt: '2026-11-04T09:00:00Z',
          business_phone: '+447700900123',
          business_address: '1 Example Road',
        },
        metadata: { identity_verification_session_id: 'vs_123' },
      }),
      now: NOW,
    });
    expect(row).toMatchObject({
      type: 'client',
      name: 'Firstc1 Lastc1',
      place: 'Northlight Studio Ltd',
      businessType: 'limited_company',
      verification: 'in-progress',
      overdue: false,
    });
    expect(JSON.stringify(row)).not.toMatch(/example\.com|7700|Example Road|vs_123/);
  });
});

describe('sortQueue', () => {
  it('sorts oldest first, rows without a date last', () => {
    const rows = [
      { userId: 'b', submittedAt: '2026-11-03T00:00:00.000Z' },
      { userId: 'c', submittedAt: null },
      { userId: 'a', submittedAt: '2026-11-01T00:00:00.000Z' },
      { userId: 'd', submittedAt: '2026-11-03T00:00:00.000Z' },
    ];
    expect(sortQueue(rows).map(r => r.userId)).toEqual(['a', 'b', 'd', 'c']);
    expect(rows[0].userId).toBe('b'); // input not mutated
  });
});

// ================ buildQueue / getQueue ================ //

const makeSdk = ({ listingPages, userPages, log: callLog = [] }) => {
  const pageOf = (pages, page) => ({
    data: {
      data: pages[page - 1].data,
      included: pages[page - 1].included || [],
      meta: { totalPages: pages.length },
    },
  });
  const forbidden = name => () => {
    throw new Error(`write method ${name} must never be called`);
  };
  return {
    listings: {
      query: jest.fn(params => {
        callLog.push(`listings:${params.page}`);
        return Promise.resolve(pageOf(listingPages, params.page));
      }),
      update: forbidden('listings.update'),
      approve: forbidden('listings.approve'),
      close: forbidden('listings.close'),
      open: forbidden('listings.open'),
    },
    users: {
      query: jest.fn(params => {
        callLog.push(`users:${params.page}`);
        return Promise.resolve(pageOf(userPages, params.page));
      }),
      updateProfile: forbidden('users.updateProfile'),
      updatePermissions: forbidden('users.updatePermissions'),
    },
  };
};

describe('buildQueue', () => {
  it('scans models then clients, page by page, one call at a time, and sorts the result', async () => {
    const callLog = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const sdk = makeSdk({
      listingPages: [
        {
          data: [
            listing('l1', 'm1', 'pendingApproval', { accuracyConfirmedAt: '2026-11-02T12:00:00Z' }),
          ],
          included: [user('m1')],
        },
        {
          data: [listing('l2', 'm2', 'closed', { accuracyConfirmedAt: '2026-10-30T12:00:00Z' })],
          included: [user('m2')],
        },
      ],
      userPages: [
        {
          data: [
            user('c1', { privateData: { businessDetailsSubmittedAt: '2026-11-04T12:00:00Z' } }),
            // A model who also looks like a client is only listed once, as a model.
            user('m1', { privateData: { businessDetailsSubmittedAt: '2026-11-01T12:00:00Z' } }),
          ],
        },
      ],
      log: callLog,
    });
    const wrap = fn => params => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return fn(params).then(r => {
        inFlight -= 1;
        return r;
      });
    };
    sdk.listings.query = wrap(sdk.listings.query);
    sdk.users.query = wrap(sdk.users.query);
    const getStripeStatus = jest.fn(() =>
      Promise.resolve({ identity: 'not-started', bank: 'not-started' })
    );

    const queue = await buildQueue({ integrationSdk: sdk, getStripeStatus, now: () => NOW });

    expect(callLog).toEqual(['listings:1', 'listings:2', 'users:1']);
    expect(maxInFlight).toBe(1);
    expect(queue.items.map(r => [r.userId, r.type])).toEqual([
      ['m2', 'model'],
      ['m1', 'model'],
      ['c1', 'client'],
    ]);
    expect(queue.items[0].resubmission).toBe(true);
    expect(queue.counts).toEqual({ all: 3, models: 2, clients: 1 });
    expect(queue.recentlyDecided).toEqual([]);
    expect(queue.recentlyDecidedAvailable).toBe(false);
    expect(getStripeStatus).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(queue)).not.toMatch(/example\.com/);
  });

  it('asks for models with the right filters', async () => {
    const sdk = makeSdk({ listingPages: [{ data: [] }], userPages: [{ data: [] }] });
    await buildQueue({ integrationSdk: sdk, now: () => NOW });
    expect(sdk.listings.query).toHaveBeenCalledWith(
      expect.objectContaining({
        pub_listingType: 'model-profile',
        states: 'pendingApproval,closed,published',
        include: ['author', 'author.stripeAccount'],
        perPage: 100,
      })
    );
    expect(sdk.users.query).toHaveBeenCalledWith(
      expect.objectContaining({ pub_userType: 'client' })
    );
  });
});

describe('getQueue (30 second cache)', () => {
  beforeEach(() => resetQueueCache());

  it('reuses the queue within 30 seconds and rebuilds after', async () => {
    const sdk = makeSdk({ listingPages: [{ data: [] }], userPages: [{ data: [] }] });
    let clockMs = 1000000;
    const clock = () => clockMs;
    await getQueue({ integrationSdk: sdk, clock });
    await getQueue({ integrationSdk: sdk, clock });
    expect(sdk.listings.query).toHaveBeenCalledTimes(1);
    clockMs += CACHE_TTL_MS + 1;
    await getQueue({ integrationSdk: sdk, clock });
    expect(sdk.listings.query).toHaveBeenCalledTimes(2);
  });

  it('shares one build between concurrent callers', async () => {
    const sdk = makeSdk({ listingPages: [{ data: [] }], userPages: [{ data: [] }] });
    await Promise.all([getQueue({ integrationSdk: sdk }), getQueue({ integrationSdk: sdk })]);
    expect(sdk.listings.query).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure (e.g. a 429)', async () => {
    const sdk = makeSdk({ listingPages: [{ data: [] }], userPages: [{ data: [] }] });
    const original = sdk.listings.query;
    sdk.listings.query = jest.fn(() => Promise.reject({ status: 429 }));
    await expect(getQueue({ integrationSdk: sdk })).rejects.toEqual({ status: 429 });
    sdk.listings.query = original;
    await expect(getQueue({ integrationSdk: sdk })).resolves.toMatchObject({ items: [] });
  });
});
