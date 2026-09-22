// Account-status Step 4 — verify-nudge sweep tests.
//
// Covers: the Approved-unverified predicates (model via listing-state, client via
// metadata), the dedup/cap decision, the email templates, and the sweep — classification,
// dedup, sending, recording, dry-run, the not-configured path, and that it never throws.
// The Integration SDK + mailer are injected (no network, no env juggling for the core).

jest.mock('../log', () => ({ error: jest.fn() }));
// Mock the Integration SDK module so the real package (and its axios mapping) is never
// loaded — the sweep uses an injected sdk in these tests anyway.
jest.mock('sharetribe-flex-integration-sdk', () => ({ createInstance: () => ({}) }));

const {
  isClientApprovedUnverified,
  isModelApprovedUnverified,
  decideNudge,
  buildNudgeEmail,
  runVerifyNudgeSweep,
  DEFAULT_MAX_NUDGES,
} = require('./verifyNudge');

// ---- helpers -----------------------------------------------------------------

const user = ({
  id,
  userType,
  state = 'active',
  identityVerified,
  privateData = {},
  email = `${id}@ex.com`,
  firstName = 'Alex',
}) => ({
  id: { uuid: id },
  attributes: {
    state,
    email,
    profile: {
      firstName,
      publicData: { userType },
      metadata: identityVerified === undefined ? {} : { identity_verified: identityVerified },
      privateData,
    },
  },
});

const listing = ({ authorId, state }) => ({
  id: { uuid: `listing-${authorId}` },
  attributes: { state, publicData: { listingType: 'model-profile' } },
  relationships: { author: { data: { id: { uuid: authorId } } } },
});

// A minimal injectable Integration SDK backed by in-memory arrays.
const makeSdk = ({ users = [], listings = [] } = {}) => {
  const updateProfile = jest.fn().mockResolvedValue({});
  return {
    updateProfile,
    users: {
      query: jest.fn().mockResolvedValue({ data: { data: users, meta: { totalPages: 1 } } }),
      updateProfile,
    },
    listings: {
      query: jest.fn().mockResolvedValue({ data: { data: listings, meta: { totalPages: 1 } } }),
    },
  };
};

// ---- predicates --------------------------------------------------------------

describe('isClientApprovedUnverified', () => {
  it('true when active and not identity-verified', () => {
    expect(isClientApprovedUnverified(user({ id: 'c1', userType: 'client' }))).toBe(true);
  });
  it('false when identity_verified is true (they are Verified)', () => {
    expect(
      isClientApprovedUnverified(user({ id: 'c1', userType: 'client', identityVerified: true }))
    ).toBe(false);
  });
  it('false when not active (still Pending/Draft)', () => {
    expect(
      isClientApprovedUnverified(user({ id: 'c1', userType: 'client', state: 'pending-approval' }))
    ).toBe(false);
  });
});

describe('isModelApprovedUnverified', () => {
  const m = user({ id: 'm1', userType: 'model' });
  it('true when active and the listing is not published', () => {
    expect(isModelApprovedUnverified(m, 'pendingApproval')).toBe(true);
    expect(isModelApprovedUnverified(m, 'closed')).toBe(true);
    expect(isModelApprovedUnverified(m, 'draft')).toBe(true);
  });
  it('false when the listing is published (they are Verified)', () => {
    expect(isModelApprovedUnverified(m, 'published')).toBe(false);
  });
  it('false when the model has no listing (nothing to verify for yet)', () => {
    expect(isModelApprovedUnverified(m, null)).toBe(false);
  });
  it('false when not active', () => {
    const pending = user({ id: 'm2', userType: 'model', state: 'pending-approval' });
    expect(isModelApprovedUnverified(pending, 'pendingApproval')).toBe(false);
  });
});

// ---- decideNudge (dedup / cap) -----------------------------------------------

describe('decideNudge', () => {
  const now = Date.parse('2026-09-22T12:00:00Z');
  const cooldownMs = 48 * 60 * 60 * 1000;

  it('sends when never nudged before', () => {
    expect(decideNudge({ now, cooldownMs }).send).toBe(true);
  });
  it('caps at the max count', () => {
    const d = decideNudge({ verifyNudgeCount: DEFAULT_MAX_NUDGES, now, cooldownMs });
    expect(d).toEqual({ send: false, reason: 'cap' });
  });
  it('respects the cooldown window', () => {
    const recent = new Date(now - 60 * 60 * 1000).toISOString(); // 1h ago
    const d = decideNudge({ lastVerifyNudgeAt: recent, verifyNudgeCount: 1, now, cooldownMs });
    expect(d).toEqual({ send: false, reason: 'cooldown' });
  });
  it('sends again once the cooldown has elapsed', () => {
    const old = new Date(now - 72 * 60 * 60 * 1000).toISOString(); // 72h ago
    const d = decideNudge({ lastVerifyNudgeAt: old, verifyNudgeCount: 1, now, cooldownMs });
    expect(d.send).toBe(true);
  });
});

// ---- email templates ---------------------------------------------------------

describe('buildNudgeEmail', () => {
  it('model variant mentions bank + booking and links to payouts', () => {
    const { subject, textBody, tag } = buildNudgeEmail({ userType: 'model', firstName: 'Sam' });
    expect(subject).toMatch(/approved/i);
    expect(textBody).toMatch(/Hi Sam,/);
    expect(textBody).toMatch(/bank/i);
    expect(textBody).toMatch(/\/account\/payments/);
    expect(tag).toBe('verify-nudge-model');
  });
  it('client variant links to /verify-identity', () => {
    const { textBody, tag } = buildNudgeEmail({ userType: 'client', firstName: 'Jo' });
    expect(textBody).toMatch(/\/verify-identity/);
    expect(tag).toBe('verify-nudge-client');
  });
  it('handles a missing first name gracefully', () => {
    const { textBody } = buildNudgeEmail({ userType: 'client' });
    expect(textBody).toMatch(/^Hi,/);
  });
});

// ---- the sweep ---------------------------------------------------------------

describe('runVerifyNudgeSweep', () => {
  // NOTE: jest config sets resetMocks:true, which wipes mock *implementations* before
  // every test — so (re)install the resolved value in beforeEach, not at describe scope.
  const mailerOk = jest.fn();

  beforeEach(() => {
    mailerOk.mockReset().mockResolvedValue({ sent: true, messageId: 'mid' });
  });

  it('is not-configured (dormant) when no sdk is available', async () => {
    // No injected sdk + no env creds → getIntegrationSdk() returns null.
    const summary = await runVerifyNudgeSweep({ mailer: mailerOk });
    expect(summary.configured).toBe(false);
    expect(summary.reason).toBe('not-configured');
    expect(mailerOk).not.toHaveBeenCalled();
  });

  it('nudges an Approved-unverified model and a client, and records each', async () => {
    const sdk = makeSdk({
      users: [user({ id: 'm1', userType: 'model' }), user({ id: 'c1', userType: 'client' })],
      listings: [listing({ authorId: 'm1', state: 'pendingApproval' })],
    });
    const summary = await runVerifyNudgeSweep({ sdk, mailer: mailerOk });

    expect(summary.configured).toBe(true);
    expect(summary.approvedUnverifiedModels).toBe(1);
    expect(summary.approvedUnverifiedClients).toBe(1);
    expect(summary.nudged).toBe(2);
    expect(mailerOk).toHaveBeenCalledTimes(2);
    expect(sdk.users.updateProfile).toHaveBeenCalledTimes(2);
    // Recorded counter increments from 0 → 1.
    expect(sdk.users.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ privateData: expect.objectContaining({ verifyNudgeCount: 1 }) })
    );
  });

  it('does not nudge a Verified model (published listing) or Verified client', async () => {
    const sdk = makeSdk({
      users: [
        user({ id: 'm1', userType: 'model' }),
        user({ id: 'c1', userType: 'client', identityVerified: true }),
      ],
      listings: [listing({ authorId: 'm1', state: 'published' })],
    });
    const summary = await runVerifyNudgeSweep({ sdk, mailer: mailerOk });
    expect(summary.approvedUnverifiedModels).toBe(0);
    expect(summary.approvedUnverifiedClients).toBe(0);
    expect(summary.nudged).toBe(0);
    expect(mailerOk).not.toHaveBeenCalled();
  });

  it('skips a capped user and a user in cooldown (no send, no record)', async () => {
    const now = Date.parse('2026-09-22T12:00:00Z');
    const recent = new Date(now - 60 * 60 * 1000).toISOString();
    const sdk = makeSdk({
      users: [
        user({
          id: 'c1',
          userType: 'client',
          privateData: { verifyNudgeCount: DEFAULT_MAX_NUDGES },
        }),
        user({
          id: 'c2',
          userType: 'client',
          privateData: { verifyNudgeCount: 1, lastVerifyNudgeAt: recent },
        }),
      ],
    });
    const summary = await runVerifyNudgeSweep({ sdk, mailer: mailerOk, now });
    expect(summary.approvedUnverifiedClients).toBe(2);
    expect(summary.cappedSkipped).toBe(1);
    expect(summary.cooldownSkipped).toBe(1);
    expect(summary.nudged).toBe(0);
    expect(mailerOk).not.toHaveBeenCalled();
  });

  it('dry-run classifies + counts "would nudge" but sends/records nothing', async () => {
    const sdk = makeSdk({
      users: [user({ id: 'c1', userType: 'client' })],
    });
    const summary = await runVerifyNudgeSweep({ sdk, mailer: mailerOk, dryRun: true });
    expect(summary.nudged).toBe(1);
    expect(mailerOk).not.toHaveBeenCalled();
    expect(sdk.users.updateProfile).not.toHaveBeenCalled();
  });

  it('does NOT record when the mail send fails (so it retries next run)', async () => {
    const failingMailer = jest.fn().mockResolvedValue({ sent: false, reason: 'send-error' });
    const sdk = makeSdk({ users: [user({ id: 'c1', userType: 'client' })] });
    const summary = await runVerifyNudgeSweep({ sdk, mailer: failingMailer });
    expect(summary.sendFailed).toBe(1);
    expect(summary.nudged).toBe(0);
    expect(sdk.users.updateProfile).not.toHaveBeenCalled();
  });

  it('never throws when the Integration query blows up — reports why=error', async () => {
    const sdk = makeSdk();
    sdk.users.query.mockRejectedValue(new Error('integration down'));
    const summary = await runVerifyNudgeSweep({ sdk, mailer: mailerOk });
    expect(summary.reason).toBe('error');
    expect(summary.errors).toBe(1);
  });

  it('paginates users across multiple pages', async () => {
    const sdk = makeSdk({ users: [], listings: [] });
    sdk.users.query
      .mockResolvedValueOnce({
        data: { data: [user({ id: 'c1', userType: 'client' })], meta: { totalPages: 2 } },
      })
      .mockResolvedValueOnce({
        data: { data: [user({ id: 'c2', userType: 'client' })], meta: { totalPages: 2 } },
      });
    const summary = await runVerifyNudgeSweep({ sdk, mailer: mailerOk });
    expect(sdk.users.query).toHaveBeenCalledTimes(2);
    expect(summary.scanned).toBe(2);
    expect(summary.nudged).toBe(2);
  });
});
