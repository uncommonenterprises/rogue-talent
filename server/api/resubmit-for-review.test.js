// Resubmit after a decline (amendment 30/09/2026). Both SDKs are mocked: nothing is written to
// any marketplace. Covers: only 'declined' can be cleared, it can never approve, it is
// idempotent, other users' accounts are refused, and unauthenticated calls are refused.

const mockCurrentUserShow = jest.fn();
const mockUpdateProfile = jest.fn();

jest.mock('../api-util/sdk', () => ({
  getSdk: () => ({ currentUser: { show: mockCurrentUserShow } }),
}));
jest.mock('sharetribe-flex-integration-sdk', () => ({
  createInstance: () => ({ users: { updateProfile: mockUpdateProfile } }),
}));
jest.mock('../log', () => ({ error: jest.fn() }));

const resubmitForReview = require('./resubmit-for-review');
const { buildResubmitUpdate } = require('../api-util/resubmitForReview');

const SELF = 'user-self';

const sessionUser = (metadata = {}, id = SELF) => ({
  data: {
    data: {
      id: { uuid: id },
      attributes: { state: 'active', profile: { publicData: { userType: 'model' }, metadata } },
    },
  },
});

// Minimal Express response double; resolves with { status, body } once sent.
const call = (body = {}) =>
  new Promise(resolve => {
    let status = 200;
    const res = {
      headersSent: false,
      status(s) {
        status = s;
        return this;
      },
      set() {
        return this;
      },
      send(payload) {
        resolve({ status, body: JSON.parse(payload) });
        return this;
      },
      end() {
        return this;
      },
    };
    resubmitForReview({ body }, res);
  });

beforeAll(() => {
  process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
  process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
});

beforeEach(() => {
  mockCurrentUserShow.mockReset();
  mockUpdateProfile.mockReset().mockResolvedValue({});
});

describe('POST /api/resubmit-for-review', () => {
  it('clears a declined decision on the session user (and only that user)', async () => {
    mockCurrentUserShow.mockResolvedValue(sessionUser({ reviewDecision: 'declined' }));
    const result = await call();
    expect(result).toEqual({
      status: 200,
      body: { ok: true, resubmitted: true, reviewDecision: null },
    });
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      id: SELF,
      metadata: { reviewDecision: null, reviewDecisionEmailed: null },
      privateData: { rejectionReason: null },
    });
  });

  it('can never set approved: the only value it writes to reviewDecision is null', () => {
    const update = buildResubmitUpdate(SELF);
    expect(update.metadata.reviewDecision).toBeNull();
    expect(JSON.stringify(update)).not.toMatch(/approved/);
  });

  it('refuses an approved account (409) and writes nothing', async () => {
    mockCurrentUserShow.mockResolvedValue(sessionUser({ reviewDecision: 'approved' }));
    const result = await call();
    expect(result).toEqual({ status: 409, body: { error: 'not-declined' } });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('refuses any unrecognised stored value (409) and writes nothing', async () => {
    for (const value of ['Declined', 'declined ', 'rejected', true, 0]) {
      mockCurrentUserShow.mockResolvedValue(sessionUser({ reviewDecision: value }));
      // eslint-disable-next-line no-await-in-loop
      const result = await call();
      expect(result.status).toBe(409);
    }
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('is idempotent: with no decision it succeeds as a no-op and writes nothing', async () => {
    mockCurrentUserShow.mockResolvedValue(sessionUser({}));
    const first = await call();
    mockCurrentUserShow.mockResolvedValue(sessionUser({ reviewDecision: null }));
    const second = await call();
    [first, second].forEach(result =>
      expect(result).toEqual({
        status: 200,
        body: { ok: true, resubmitted: false, reviewDecision: null },
      })
    );
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("refuses a request naming another user's account (403) and writes nothing", async () => {
    mockCurrentUserShow.mockResolvedValue(sessionUser({ reviewDecision: 'declined' }));
    const result = await call({ userId: 'someone-else' });
    expect(result).toEqual({ status: 403, body: { error: 'forbidden' } });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('accepts the session user naming their own id', async () => {
    mockCurrentUserShow.mockResolvedValue(sessionUser({ reviewDecision: 'declined' }));
    const result = await call({ userId: SELF });
    expect(result.status).toBe(200);
    expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ id: SELF }));
  });

  it('refuses an unauthenticated caller (401) and writes nothing', async () => {
    const unauthenticated = new Error('Unauthorized');
    unauthenticated.status = 401;
    mockCurrentUserShow.mockRejectedValue(unauthenticated);
    expect(await call()).toEqual({ status: 401, body: { error: 'unauthorized' } });

    const forbidden = new Error('Forbidden');
    forbidden.status = 403;
    mockCurrentUserShow.mockRejectedValue(forbidden);
    expect(await call()).toEqual({ status: 401, body: { error: 'unauthorized' } });

    mockCurrentUserShow.mockResolvedValue({ data: { data: null } });
    expect(await call()).toEqual({ status: 401, body: { error: 'unauthorized' } });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('reports a failed write as 500 (the decline stays in place)', async () => {
    mockCurrentUserShow.mockResolvedValue(sessionUser({ reviewDecision: 'declined' }));
    mockUpdateProfile.mockRejectedValue(new Error('integration down'));
    expect(await call()).toEqual({ status: 500, body: { error: 'resubmit-failed' } });
  });

  it('is inactive without Integration creds (503), never crashes', async () => {
    await jest.isolateModulesAsync(async () => {
      delete process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
      delete process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
      const { resubmitDeclinedReview } = require('../api-util/resubmitForReview');
      const user = sessionUser({ reviewDecision: 'declined' }).data.data;
      expect(await resubmitDeclinedReview({ user })).toEqual({
        status: 503,
        body: { error: 'not-configured' },
      });
    });
    process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
    process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
