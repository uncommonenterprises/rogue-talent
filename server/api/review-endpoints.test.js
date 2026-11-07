// Review tool stage 1 endpoints: access checks end to end. Both SDKs are mocked and every write
// method throws, so nothing is ever written to any marketplace. Covers reviewer, admin,
// non-reviewer, logged out, made-up id, tool off, and that responses carry no email/phone/DOB.

const mockCurrentUserShow = jest.fn();
const mockUsersShow = jest.fn();
const mockUsersQuery = jest.fn();
const mockListingsQuery = jest.fn();
const mockWrite = jest.fn(() => {
  throw new Error('stage 1 must never write');
});

jest.mock('../api-util/sdk', () => ({
  getSdk: () => ({ currentUser: { show: mockCurrentUserShow } }),
}));
jest.mock('sharetribe-flex-integration-sdk', () => ({
  createInstance: () => ({
    users: {
      show: mockUsersShow,
      query: mockUsersQuery,
      updateProfile: mockWrite,
      updatePermissions: mockWrite,
    },
    listings: {
      query: mockListingsQuery,
      update: mockWrite,
      approve: mockWrite,
      open: mockWrite,
      close: mockWrite,
    },
  }),
}));
jest.mock('../log', () => ({ error: jest.fn() }));

const reviewAccess = require('./review-access');
const reviewQueue = require('./review-queue');
const reviewProfile = require('./review-profile');
const { resetQueueCache } = require('../api-util/reviewQueue');

const ADMIN_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const REVIEWER_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const MODEL_ID = 'cccccccc-0000-4000-8000-000000000003';
const CLIENT_ID = 'dddddddd-0000-4000-8000-000000000004';
const MADE_UP_ID = 'eeeeeeee-0000-4000-8000-000000000005';

const NO_ACCESS = { status: 404, body: { error: 'not-found', status: 404 } };

const sessionUser = (id, metadata = {}, extra = {}) => ({
  data: {
    data: {
      id: { uuid: id },
      attributes: {
        state: 'active',
        banned: false,
        deleted: false,
        profile: { metadata },
        ...extra,
      },
    },
  },
});
const asReviewer = () =>
  mockCurrentUserShow.mockResolvedValue(sessionUser(REVIEWER_ID, { roles: ['reviewer'] }));
const asAdmin = () => mockCurrentUserShow.mockResolvedValue(sessionUser(ADMIN_ID));
const asClient = () =>
  mockCurrentUserShow.mockResolvedValue(sessionUser(CLIENT_ID, { reviewDecision: 'approved' }));
const asLoggedOut = () => mockCurrentUserShow.mockRejectedValue({ status: 401 });

// A target user stuffed with data that must never come back.
const targetClient = () => ({
  data: {
    data: {
      id: { uuid: CLIENT_ID },
      type: 'user',
      attributes: {
        state: 'active',
        banned: false,
        deleted: false,
        email: 'client@example.com',
        emailVerified: true,
        createdAt: new Date('2026-11-01T09:00:00Z'),
        profile: {
          firstName: 'Hannah',
          lastName: 'Reeve',
          displayName: 'Hannah R',
          publicData: { userType: 'client', company_name: 'Northlight Studio Ltd' },
          protectedData: { phoneNumber: '+447700900111', business_type: 'limited_company' },
          privateData: {
            businessDetailsSubmittedAt: '2026-11-03T10:00:00Z',
            business_phone: '+447700900222',
            date_of_birth: '1990-01-01',
            business_address: '1 Example Road',
          },
          metadata: {},
        },
      },
    },
    included: [],
  },
});

const FORBIDDEN = /client@example\.com|7700900111|7700900222|1990-01-01|date_of_birth|phone|"email"/i;

// Minimal Express response double; resolves with { status, body, headers } once sent.
const call = (handler, req = {}) =>
  new Promise(resolve => {
    let status = 200;
    const headers = {};
    const res = {
      headersSent: false,
      status(s) {
        status = s;
        return this;
      },
      set(name, value) {
        headers[name] = value;
        return this;
      },
      send(payload) {
        resolve({ status, body: JSON.parse(payload), headers });
        return this;
      },
      end() {
        return this;
      },
    };
    handler({ params: {}, ...req }, res);
  });

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
  process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
  process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
  process.env.REVIEW_ADMIN_USER_IDS = ADMIN_ID;
  delete process.env.STRIPE_SECRET_KEY;
  resetQueueCache();
  [mockCurrentUserShow, mockUsersShow, mockUsersQuery, mockListingsQuery, mockWrite].forEach(m =>
    m.mockClear()
  );
  mockCurrentUserShow.mockReset();
  mockUsersShow
    .mockReset()
    .mockImplementation(({ id }) =>
      id === CLIENT_ID ? Promise.resolve(targetClient()) : Promise.reject({ status: 404 })
    );
  mockListingsQuery.mockReset().mockResolvedValue({ data: { data: [], included: [], meta: {} } });
  mockUsersQuery
    .mockReset()
    .mockResolvedValue({ data: { data: [targetClient().data.data], included: [], meta: {} } });
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

const expectNothingRead = () => {
  expect(mockUsersShow).not.toHaveBeenCalled();
  expect(mockUsersQuery).not.toHaveBeenCalled();
  expect(mockListingsQuery).not.toHaveBeenCalled();
};

describe('who gets in', () => {
  it('reviewer: queue and profile load', async () => {
    asReviewer();
    const queue = await call(reviewQueue);
    expect(queue.status).toBe(200);
    expect(queue.body.items.map(r => r.userId)).toEqual([CLIENT_ID]);
    const profile = await call(reviewProfile, { params: { userId: CLIENT_ID } });
    expect(profile.status).toBe(200);
    expect(profile.body.kind).toBe('client');
  });

  it('admin (env list, no role): queue and profile load; access says isAdmin', async () => {
    asAdmin();
    expect((await call(reviewQueue)).status).toBe(200);
    expect((await call(reviewProfile, { params: { userId: CLIENT_ID } })).status).toBe(200);
    expect(await call(reviewAccess)).toMatchObject({
      status: 200,
      body: { canReview: true, isAdmin: true },
    });
  });

  it('reviewer: access says canReview, not admin', async () => {
    asReviewer();
    expect((await call(reviewAccess)).body).toEqual({ canReview: true, isAdmin: false });
  });
});

describe('who is kept out (identical 404, nothing read)', () => {
  const cases = [
    ['a non-reviewer (approved client)', asClient],
    ['a logged-out caller', asLoggedOut],
    [
      'a banned reviewer',
      () =>
        mockCurrentUserShow.mockResolvedValue(
          sessionUser(REVIEWER_ID, { roles: ['reviewer'] }, { banned: true })
        ),
    ],
    [
      'someone who self-set a role in their own public data',
      () =>
        mockCurrentUserShow.mockResolvedValue({
          data: {
            data: {
              id: { uuid: CLIENT_ID },
              attributes: {
                state: 'active',
                profile: { publicData: { roles: ['reviewer'] }, metadata: {} },
              },
            },
          },
        }),
    ],
  ];

  cases.forEach(([label, setup]) => {
    it(`${label}: same response for the queue, a real id and a made-up id`, async () => {
      setup();
      const responses = [
        await call(reviewQueue),
        await call(reviewProfile, { params: { userId: CLIENT_ID } }),
        await call(reviewProfile, { params: { userId: MADE_UP_ID } }),
        await call(reviewProfile, { params: { userId: 'not-even-an-id' } }),
        await call(reviewAccess),
      ];
      responses.forEach(r => expect({ status: r.status, body: r.body }).toEqual(NO_ACCESS));
      expectNothingRead();
    });
  });

  it('everyone, reviewers included, when the tool is switched off', async () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'false';
    asReviewer();
    const r = await call(reviewQueue);
    expect({ status: r.status, body: r.body }).toEqual(NO_ACCESS);
    expect(mockCurrentUserShow).not.toHaveBeenCalled();
    expectNothingRead();
  });
});

describe('reviewer edge cases', () => {
  it('a made-up id is "not waiting", not an error', async () => {
    asReviewer();
    const r = await call(reviewProfile, { params: { userId: MADE_UP_ID } });
    expect(r).toMatchObject({ status: 200, body: { kind: 'not-waiting' } });
  });

  it('no Integration credentials: 503 not-configured', async () => {
    delete process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
    asReviewer();
    expect((await call(reviewQueue)).body).toEqual({ error: 'not-configured', status: 503 });
  });

  it('Sharetribe rate limit: 503 busy', async () => {
    asReviewer();
    mockListingsQuery.mockRejectedValue({ status: 429 });
    expect((await call(reviewQueue)).body).toEqual({ error: 'busy', status: 503 });
  });

  it('cannot tell who the caller is (Marketplace API error): 503, nothing read', async () => {
    mockCurrentUserShow.mockRejectedValue({ status: 500 });
    expect((await call(reviewQueue)).body).toEqual({ error: 'unavailable', status: 503 });
    expectNothingRead();
  });
});

describe('responses', () => {
  it('carry no email, phone or date of birth, and are never cached or indexed', async () => {
    asReviewer();
    const queue = await call(reviewQueue);
    const profile = await call(reviewProfile, { params: { userId: CLIENT_ID } });
    [queue, profile].forEach(r => {
      expect(JSON.stringify(r.body)).not.toMatch(FORBIDDEN);
      expect(r.headers['Cache-Control']).toBe('no-store');
      expect(r.headers['X-Robots-Tag']).toMatch(/noindex/);
    });
  });

  it('never call a write method', async () => {
    asReviewer();
    await call(reviewQueue);
    await call(reviewProfile, { params: { userId: CLIENT_ID } });
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
