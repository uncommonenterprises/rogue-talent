// Review tool access rules. The Marketplace SDK is mocked: nothing is read from or written to
// any marketplace.

const mockCurrentUserShow = jest.fn();
jest.mock('./sdk', () => ({ getSdk: () => ({ currentUser: { show: mockCurrentUserShow } }) }));
jest.mock('../log', () => ({ error: jest.fn() }));

const {
  parseAdminUserIds,
  isAdminUserId,
  getRoles,
  isReviewerUser,
  isStaffUser,
  getReviewAccess,
  resolveReviewer,
  NO_ACCESS_BODY,
} = require('./reviewerRoles');

const ADMIN_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const REVIEWER_ID = 'bbbbbbbb-0000-4000-8000-000000000002';

const user = (id, metadata = {}, attrs = {}) => ({
  id: { uuid: id },
  attributes: { state: 'active', banned: false, deleted: false, profile: { metadata }, ...attrs },
});

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
  process.env.REVIEW_ADMIN_USER_IDS = ` ${ADMIN_ID.toUpperCase()} , other-id`;
  mockCurrentUserShow.mockReset();
});
afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('admin allow-list', () => {
  it('parses comma/space separated ids, case-insensitively, ignoring blanks', () => {
    expect([...parseAdminUserIds(' A, b ,,c d ')]).toEqual(['a', 'b', 'c', 'd']);
    expect(parseAdminUserIds('').size).toBe(0);
    expect(parseAdminUserIds(undefined).size).toBe(0);
  });

  it('reads REVIEW_ADMIN_USER_IDS on every call', () => {
    expect(isAdminUserId(ADMIN_ID)).toBe(true);
    process.env.REVIEW_ADMIN_USER_IDS = '';
    expect(isAdminUserId(ADMIN_ID)).toBe(false);
    expect(isAdminUserId('')).toBe(false);
    expect(isAdminUserId(undefined)).toBe(false);
  });
});

describe('reviewer role (metadata.roles)', () => {
  it('only counts the exact string "reviewer" in a roles array', () => {
    expect(isReviewerUser(user(REVIEWER_ID, { roles: ['reviewer'] }))).toBe(true);
    expect(isReviewerUser(user(REVIEWER_ID, { roles: ['Reviewer'] }))).toBe(false);
    expect(isReviewerUser(user(REVIEWER_ID, { roles: 'reviewer' }))).toBe(false);
    expect(isReviewerUser(user(REVIEWER_ID, {}))).toBe(false);
    expect(getRoles(user(REVIEWER_ID, { roles: ['reviewer', 3, null] }))).toEqual(['reviewer']);
  });

  it('ignores a role placed in user-writable data', () => {
    const selfGranted = {
      id: { uuid: REVIEWER_ID },
      attributes: {
        state: 'active',
        profile: {
          publicData: { roles: ['reviewer'] },
          protectedData: { roles: ['reviewer'] },
          privateData: { roles: ['reviewer'] },
          metadata: {},
        },
      },
    };
    expect(isReviewerUser(selfGranted)).toBe(false);
    expect(getReviewAccess(selfGranted).allowed).toBe(false);
  });

  it('treats reviewers and admins as staff', () => {
    expect(isStaffUser(user(REVIEWER_ID, { roles: ['reviewer'] }))).toBe(true);
    expect(isStaffUser(user(ADMIN_ID))).toBe(true);
    expect(isStaffUser(user('someone'))).toBe(false);
  });
});

describe('getReviewAccess', () => {
  it('allows reviewers and admins', () => {
    expect(getReviewAccess(user(REVIEWER_ID, { roles: ['reviewer'] }))).toEqual({
      allowed: true,
      userId: REVIEWER_ID,
      isAdmin: false,
      isReviewer: true,
    });
    expect(getReviewAccess(user(ADMIN_ID))).toEqual({
      allowed: true,
      userId: ADMIN_ID,
      isAdmin: true,
      isReviewer: false,
    });
  });

  it('refuses everyone else, banned or deleted staff, logged-out callers and a disabled tool', () => {
    expect(getReviewAccess(user('client-id', { reviewDecision: 'approved' })).allowed).toBe(false);
    expect(getReviewAccess(null).allowed).toBe(false);
    expect(
      getReviewAccess(user(REVIEWER_ID, { roles: ['reviewer'] }, { banned: true })).allowed
    ).toBe(false);
    expect(getReviewAccess(user(ADMIN_ID, {}, { deleted: true })).allowed).toBe(false);
    expect(getReviewAccess(user(ADMIN_ID, {}, { state: 'banned' })).allowed).toBe(false);
    expect(getReviewAccess(user(ADMIN_ID), { toolEnabled: false }).allowed).toBe(false);
  });
});

describe('resolveReviewer (from the caller’s own session)', () => {
  it('resolves a reviewer from currentUser.show', async () => {
    mockCurrentUserShow.mockResolvedValue({
      data: { data: user(REVIEWER_ID, { roles: ['reviewer'] }) },
    });
    const access = await resolveReviewer({}, {});
    expect(access.allowed).toBe(true);
    expect(mockCurrentUserShow).toHaveBeenCalledTimes(1);
  });

  it('treats a missing or expired session (401/403) as no access, not an error', async () => {
    mockCurrentUserShow.mockRejectedValue({ status: 401 });
    expect(await resolveReviewer({}, {})).toEqual({
      allowed: false,
      userId: null,
      isAdmin: false,
      isReviewer: false,
    });
  });

  it('marks other failures so the endpoint can say "try again"', async () => {
    mockCurrentUserShow.mockRejectedValue({ status: 500 });
    const access = await resolveReviewer({}, {});
    expect(access.allowed).toBe(false);
    expect(access.failed).toBe(true);
  });

  it('does not call the Marketplace API at all when the tool is off', async () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'false';
    const access = await resolveReviewer({}, {});
    expect(access.allowed).toBe(false);
    expect(mockCurrentUserShow).not.toHaveBeenCalled();
  });

  it('has one fixed no-access body', () => {
    expect(NO_ACCESS_BODY).toEqual({ error: 'not-found', status: 404 });
    expect(Object.isFrozen(NO_ACCESS_BODY)).toBe(true);
  });
});
