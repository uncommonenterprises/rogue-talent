// Review-decision emails (amendment 30/09/2026). The Integration SDK and the mailer are
// injected in-memory fakes: nothing is sent and no marketplace is written.

jest.mock('../log', () => ({ error: jest.fn() }));
jest.mock('sharetribe-flex-integration-sdk', () => ({ createInstance: () => ({}) }));

const {
  decideDecisionEmail,
  buildDecisionEmail,
  runDecisionEmailSweep,
  SUPPORT_EMAIL,
} = require('./decisionEmails');

const NOW = Date.parse('2026-09-30T12:00:00.000Z');
const DASHES = new RegExp('[\\u2013\\u2014]');

const user = ({
  id,
  userType = 'model',
  state = 'active',
  metadata = {},
  privateData = {},
  email = `${id}@example.com`,
  firstName = 'Sam',
  deleted = false,
}) => ({
  id: { uuid: id },
  attributes: {
    state,
    banned: state === 'banned',
    deleted,
    email,
    profile: { firstName, publicData: { userType }, metadata, privateData },
  },
});

// A stateful fake Integration SDK: updateProfile merges into the stored users, so a second
// sweep sees the stamps written by the first (that's what makes the idempotency test real).
const makeSdk = users => {
  const byId = new Map(users.map(u => [u.id.uuid, u]));
  const updateProfile = jest.fn(({ id, metadata = {}, privateData = {} }) => {
    const u = byId.get(id);
    const profile = u.attributes.profile;
    profile.metadata = { ...profile.metadata, ...metadata };
    profile.privateData = { ...profile.privateData, ...privateData };
    return Promise.resolve({});
  });
  return {
    updateProfile,
    users: {
      query: jest.fn(() =>
        Promise.resolve({ data: { data: [...byId.values()], meta: { totalPages: 1 } } })
      ),
      updateProfile,
    },
  };
};

const okMailer = () => jest.fn(() => Promise.resolve({ sent: true, messageId: 'm' }));

const sweep = (sdk, mailer, extra = {}) =>
  runDecisionEmailSweep({ sdk, mailer, now: NOW, flowEnabled: true, ...extra });

// ---- decideDecisionEmail ------------------------------------------------------------

describe('decideDecisionEmail', () => {
  it('owes an email for a new approved or declined decision', () => {
    expect(
      decideDecisionEmail(user({ id: 'a', metadata: { reviewDecision: 'approved' } }))
    ).toEqual({ send: true, decision: 'approved' });
    expect(
      decideDecisionEmail(user({ id: 'd', metadata: { reviewDecision: 'declined' } }))
    ).toEqual({ send: true, decision: 'declined' });
  });

  it('owes nothing once that exact decision was emailed', () => {
    const u = user({
      id: 'a',
      metadata: { reviewDecision: 'approved', reviewDecisionEmailed: 'approved' },
    });
    expect(decideDecisionEmail(u)).toMatchObject({ send: false, reason: 'already-emailed' });
  });

  it('owes an email again when the decision changed since the last email', () => {
    const u = user({
      id: 'a',
      metadata: { reviewDecision: 'declined', reviewDecisionEmailed: 'approved' },
    });
    expect(decideDecisionEmail(u)).toEqual({ send: true, decision: 'declined' });
  });

  it('owes nothing without a (recognised) decision', () => {
    [{}, { reviewDecision: null }, { reviewDecision: 'Approved' }].forEach(metadata => {
      expect(decideDecisionEmail(user({ id: 'x', metadata }))).toMatchObject({ send: false });
    });
  });

  it('skips banned, deleted, email-less and non-model/client accounts', () => {
    const md = { reviewDecision: 'approved' };
    expect(decideDecisionEmail(user({ id: 'b', state: 'banned', metadata: md }))).toMatchObject({
      reason: 'inactive-account',
    });
    expect(decideDecisionEmail(user({ id: 'x', deleted: true, metadata: md }))).toMatchObject({
      reason: 'inactive-account',
    });
    expect(decideDecisionEmail(user({ id: 'n', email: null, metadata: md }))).toMatchObject({
      reason: 'no-email',
    });
    expect(
      decideDecisionEmail(user({ id: 'o', userType: 'operator', metadata: md }))
    ).toMatchObject({ reason: 'not-model-or-client' });
  });
});

// ---- buildDecisionEmail (copy) --------------------------------------------------------

describe('buildDecisionEmail', () => {
  const original = process.env.REACT_APP_MARKETPLACE_ROOT_URL;
  beforeAll(() => {
    process.env.REACT_APP_MARKETPLACE_ROOT_URL = 'https://rt.example/';
  });
  afterAll(() => {
    if (original === undefined) {
      delete process.env.REACT_APP_MARKETPLACE_ROOT_URL;
    } else {
      process.env.REACT_APP_MARKETPLACE_ROOT_URL = original;
    }
  });

  it('model approved: verify with Stripe, links to the account-status page', () => {
    const e = buildDecisionEmail({ decision: 'approved', userType: 'model', firstName: 'Sam' });
    expect(e.subject).toBe('Your profile is approved. Verify with Stripe to go live');
    expect(e.textBody).toMatch(/^Hi Sam,/);
    expect(e.textBody).toContain('https://rt.example/account-status');
    expect(e.tag).toBe('review-approved-model');
  });

  it('client approved: verify your identity (or ready to book if already verified)', () => {
    const unverified = buildDecisionEmail({ decision: 'approved', userType: 'client' });
    expect(unverified.subject).toBe(
      'Your business is approved. Verify your identity to start booking'
    );
    expect(unverified.textBody).toMatch(/^Hi,/);
    expect(unverified.textBody).toContain('https://rt.example/account-status');
    const verified = buildDecisionEmail({
      decision: 'approved',
      userType: 'client',
      identityVerified: true,
    });
    expect(verified.subject).toBe("Your business is approved. You're ready to book");
  });

  it('declined: quotes the private note when there is one', () => {
    const e = buildDecisionEmail({
      decision: 'declined',
      userType: 'model',
      note: 'Two portfolio photos are blurry.',
    });
    expect(e.subject).toBe("Your profile wasn't approved this time");
    expect(e.textBody).toContain('What our reviewer noted:\n"Two portfolio photos are blurry."');
    expect(e.textBody).toContain('Resubmit for approval');
    expect(e.textBody).toContain(SUPPORT_EMAIL);
  });

  it('declined: the general line when there is no note', () => {
    const e = buildDecisionEmail({ decision: 'declined', userType: 'client' });
    expect(e.subject).toBe("Your business wasn't approved this time");
    expect(e.textBody).toContain("We didn't include a specific note this time.");
    expect(e.textBody).toContain('Update your business details');
    expect(e.textBody).not.toContain('What our reviewer noted');
  });

  it('never uses an em or en dash in any subject or body', () => {
    // The check itself works.
    expect(String.fromCharCode(0x2014)).toMatch(DASHES);
    expect(String.fromCharCode(0x2013)).toMatch(DASHES);
    expect('-').not.toMatch(DASHES);

    const all = [
      buildDecisionEmail({ decision: 'approved', userType: 'model' }),
      buildDecisionEmail({ decision: 'approved', userType: 'client' }),
      buildDecisionEmail({ decision: 'approved', userType: 'client', identityVerified: true }),
      buildDecisionEmail({ decision: 'declined', userType: 'model', note: 'n' }),
      buildDecisionEmail({ decision: 'declined', userType: 'client' }),
    ];
    all.forEach(e => {
      expect(e.subject).not.toMatch(DASHES);
      expect(e.textBody).not.toMatch(DASHES);
    });
  });
});

// ---- runDecisionEmailSweep ------------------------------------------------------------

describe('runDecisionEmailSweep', () => {
  it('sends each owed email once, with the note, and stamps the decision', async () => {
    const users = [
      user({ id: 'm1', metadata: { reviewDecision: 'approved' } }),
      user({
        id: 'c1',
        userType: 'client',
        metadata: { reviewDecision: 'declined' },
        privateData: { rejectionReason: 'Company number not found.' },
      }),
      user({ id: 'p1' }), // pending: no decision
    ];
    const sdk = makeSdk(users);
    const mailer = okMailer();
    const summary = await sweep(sdk, mailer);

    expect(summary).toMatchObject({
      configured: true,
      scanned: 3,
      approvedOwed: 1,
      declinedOwed: 1,
      sent: 2,
      sendFailed: 0,
      recordFailed: 0,
    });
    expect(mailer).toHaveBeenCalledTimes(2);
    expect(mailer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'c1@example.com',
        replyTo: SUPPORT_EMAIL,
        subject: "Your business wasn't approved this time",
        textBody: expect.stringContaining('"Company number not found."'),
      })
    );
    // Approved: stamp + start the verify-nudge cooldown. Declined: stamp only.
    expect(sdk.updateProfile).toHaveBeenCalledWith({
      id: 'm1',
      metadata: { reviewDecisionEmailed: 'approved' },
      privateData: { lastVerifyNudgeAt: '2026-09-30T12:00:00.000Z' },
    });
    expect(sdk.updateProfile).toHaveBeenCalledWith({
      id: 'c1',
      metadata: { reviewDecisionEmailed: 'declined' },
    });
  });

  it('is idempotent: a second run sends nothing', async () => {
    const sdk = makeSdk([
      user({ id: 'm1', metadata: { reviewDecision: 'approved' } }),
      user({ id: 'm2', metadata: { reviewDecision: 'declined' } }),
    ]);
    const mailer = okMailer();
    await sweep(sdk, mailer);
    expect(mailer).toHaveBeenCalledTimes(2);

    const second = await sweep(sdk, mailer);
    expect(mailer).toHaveBeenCalledTimes(2);
    expect(second).toMatchObject({ sent: 0, approvedOwed: 0, declinedOwed: 0 });
  });

  it('a changed decision is emailed again', async () => {
    const m1 = user({ id: 'm1', metadata: { reviewDecision: 'approved' } });
    const sdk = makeSdk([m1]);
    const mailer = okMailer();
    await sweep(sdk, mailer);
    expect(mailer).toHaveBeenLastCalledWith(
      expect.objectContaining({ tag: 'review-approved-model' })
    );

    // The operator changes their mind.
    m1.attributes.profile.metadata.reviewDecision = 'declined';
    const summary = await sweep(sdk, mailer);
    expect(summary).toMatchObject({ sent: 1, declinedOwed: 1 });
    expect(mailer).toHaveBeenLastCalledWith(
      expect.objectContaining({ tag: 'review-declined-model' })
    );
    expect(m1.attributes.profile.metadata.reviewDecisionEmailed).toBe('declined');
  });

  it('a second decline after a resubmission (stamp cleared) is emailed again', async () => {
    const m1 = user({
      id: 'm1',
      metadata: { reviewDecision: 'declined', reviewDecisionEmailed: 'declined' },
    });
    const sdk = makeSdk([m1]);
    const mailer = okMailer();
    expect((await sweep(sdk, mailer)).sent).toBe(0);

    // Resubmit clears both keys (see resubmitForReview.js); the operator declines again.
    m1.attributes.profile.metadata = { reviewDecision: null, reviewDecisionEmailed: null };
    expect((await sweep(sdk, mailer)).sent).toBe(0);
    m1.attributes.profile.metadata.reviewDecision = 'declined';
    expect((await sweep(sdk, mailer)).sent).toBe(1);
  });

  it('dry run counts what is owed but sends and stamps nothing', async () => {
    const sdk = makeSdk([
      user({ id: 'm1', metadata: { reviewDecision: 'approved' } }),
      user({ id: 'c1', userType: 'client', metadata: { reviewDecision: 'declined' } }),
    ]);
    const mailer = okMailer();
    const summary = await sweep(sdk, mailer, { dryRun: true });
    expect(summary).toMatchObject({ dryRun: true, approvedOwed: 1, declinedOwed: 1, sent: 0 });
    expect(mailer).not.toHaveBeenCalled();
    expect(sdk.updateProfile).not.toHaveBeenCalled();

    // A real run afterwards still sends (the dry run left no stamp).
    expect((await sweep(sdk, mailer)).sent).toBe(2);
  });

  it('a failed send is not stamped, so the next run retries it', async () => {
    const sdk = makeSdk([user({ id: 'm1', metadata: { reviewDecision: 'approved' } })]);
    const failing = jest.fn(() => Promise.resolve({ sent: false, reason: 'send-error' }));
    const summary = await sweep(sdk, failing);
    expect(summary).toMatchObject({ sent: 0, sendFailed: 1 });
    expect(sdk.updateProfile).not.toHaveBeenCalled();

    expect((await sweep(sdk, okMailer())).sent).toBe(1);
  });

  it('a failed stamp is reported (recordFailed) for the operator', async () => {
    const sdk = makeSdk([user({ id: 'm1', metadata: { reviewDecision: 'approved' } })]);
    sdk.users.updateProfile.mockImplementationOnce(() => Promise.reject(new Error('down')));
    const summary = await sweep(sdk, okMailer());
    expect(summary).toMatchObject({ sent: 1, recordFailed: 1 });
  });

  it('skips banned accounts and accounts without an email', async () => {
    const sdk = makeSdk([
      user({ id: 'b1', state: 'banned', metadata: { reviewDecision: 'declined' } }),
      user({ id: 'n1', email: null, metadata: { reviewDecision: 'approved' } }),
    ]);
    const mailer = okMailer();
    const summary = await sweep(sdk, mailer);
    expect(summary).toMatchObject({ sent: 0, skippedInactive: 1, skippedNoEmail: 1 });
    expect(mailer).not.toHaveBeenCalled();
  });

  it('is dormant with the account-status flag off', async () => {
    const sdk = makeSdk([user({ id: 'm1', metadata: { reviewDecision: 'approved' } })]);
    const mailer = okMailer();
    const summary = await sweep(sdk, mailer, { flowEnabled: false });
    expect(summary).toMatchObject({
      configured: false,
      reason: 'account-status-flow-disabled',
    });
    expect(sdk.users.query).not.toHaveBeenCalled();
    expect(mailer).not.toHaveBeenCalled();
  });

  it('is dormant without Integration creds or Postmark', async () => {
    delete process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
    delete process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
    delete process.env.POSTMARK_SERVER_TOKEN;
    const noSdk = await runDecisionEmailSweep({ flowEnabled: true, mailer: okMailer() });
    expect(noSdk).toMatchObject({ configured: false, reason: 'not-configured' });
    const noMail = await runDecisionEmailSweep({ flowEnabled: true, sdk: makeSdk([]) });
    expect(noMail).toMatchObject({ configured: false, reason: 'not-configured' });
  });

  it('never throws when the user query fails', async () => {
    const sdk = makeSdk([]);
    sdk.users.query.mockImplementation(() => Promise.reject(new Error('down')));
    const summary = await sweep(sdk, okMailer());
    expect(summary).toMatchObject({ reason: 'error', errors: 1 });
  });

  it('refuses to run twice at once (no double-send from overlapping cron calls)', async () => {
    let release;
    const sdk = makeSdk([user({ id: 'm1', metadata: { reviewDecision: 'approved' } })]);
    sdk.users.query.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = () => resolve({ data: { data: [], meta: { totalPages: 1 } } });
        })
    );
    const first = sweep(sdk, okMailer());
    const second = await sweep(sdk, okMailer());
    expect(second).toMatchObject({ reason: 'already-running' });
    release();
    await first;
    // After the first finishes, a new run proceeds normally.
    expect((await sweep(sdk, okMailer())).sent).toBe(1);
  });
});
