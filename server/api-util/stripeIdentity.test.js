// RT-FB-03 - client 18+ gate on the Stripe Identity verified date of birth.
//
// Covers processVerifiedSession end to end with Stripe's HTTPS API and the Sharetribe
// Integration SDK mocked: adult / under-18 / missing-DOB / fail-closed paths, the sticky
// under-18 flag, the restricted-key request shape, and that NO date of birth is ever
// persisted or logged.

const { EventEmitter } = require('events');

jest.mock('https', () => ({ request: jest.fn() }));

const mockIntegrationSdk = {
  users: {
    updateProfile: jest.fn(),
    show: jest.fn(),
  },
};
jest.mock('sharetribe-flex-integration-sdk', () => ({
  createInstance: () => mockIntegrationSdk,
}));
jest.mock('../log', () => ({ error: jest.fn() }));

const https = require('https');
const log = require('../log');

// Non-credential-shaped placeholder values (the pre-commit secret hook stays happy).
const RESTRICTED_KEY = 'restricted-key-for-tests';

beforeAll(() => {
  process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-id';
  process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-secret';
});

const stripeIdentity = require('./stripeIdentity');

const {
  processVerifiedSession,
  writeIdentityVerifiedFlag,
  AGE_OUTCOME_ADULT,
  AGE_OUTCOME_UNDER_18,
  AGE_OUTCOME_DOB_UNAVAILABLE,
  AGE_OUTCOME_HELD,
} = stripeIdentity;

// ---- helpers -------------------------------------------------------------------

// A distinctive DOB so we can prove it never leaks into writes or logs.
const ADULT_DOB = { day: 17, month: 4, year: 1993 };
const MINOR_DOB = { day: 17, month: 4, year: 2011 };
const NOW = new Date('2026-09-28T12:00:00Z');

// Pass `dob: OMIT` to leave the dob key out of verified_outputs entirely.
const OMIT = Symbol('omit');
const session = ({ status = 'verified', userId = 'user-1', dob = ADULT_DOB } = {}) => ({
  id: 'vs_test_1',
  object: 'identity.verification_session',
  status,
  metadata: { user_id: userId },
  verified_outputs: dob === OMIT ? {} : { dob },
});

// Make https.request answer with a given status + JSON body.
const mockStripeResponse = (statusCode, body) => {
  https.request.mockImplementation((options, callback) => {
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn(() => {
      const res = new EventEmitter();
      res.statusCode = statusCode;
      callback(res);
      res.emit('data', JSON.stringify(body));
      res.emit('end');
    });
    return req;
  });
};

const mockStripeNetworkError = () => {
  https.request.mockImplementation(() => {
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn(() => req.emit('error', new Error('socket hang up')));
    return req;
  });
};

const writtenMetadata = () => mockIntegrationSdk.users.updateProfile.mock.calls[0][0].metadata;

// Everything we persisted or logged, as one string, to prove the DOB never leaks.
const everythingPersistedOrLogged = () =>
  JSON.stringify([
    mockIntegrationSdk.users.updateProfile.mock.calls,
    log.error.mock.calls.map(([err, tag, data]) => [err && err.message, tag, data]),
  ]);

const expectNoDobLeak = dob => {
  const blob = everythingPersistedOrLogged();
  expect(blob).not.toContain(String(dob.year));
  expect(blob).not.toMatch(/"dob"|verified_outputs|date_of_birth/);
};

beforeEach(() => {
  process.env.STRIPE_IDENTITY_RESTRICTED_KEY = RESTRICTED_KEY;
  https.request.mockReset();
  log.error.mockReset();
  mockIntegrationSdk.users.updateProfile.mockReset().mockResolvedValue({});
  mockIntegrationSdk.users.show
    .mockReset()
    .mockResolvedValue({ data: { data: { attributes: { profile: { metadata: {} } } } } });
});

// ---- adult ---------------------------------------------------------------------

describe('processVerifiedSession - adult', () => {
  it('sets identity_verified + age_verified_18plus when the verified DOB is 18+', async () => {
    mockStripeResponse(200, session());
    const result = await processVerifiedSession({
      userId: 'user-1',
      sessionId: 'vs_test_1',
      now: NOW,
    });
    expect(result).toEqual({ persisted: true, outcome: AGE_OUTCOME_ADULT });
    expect(mockIntegrationSdk.users.updateProfile).toHaveBeenCalledTimes(1);
    const metadata = writtenMetadata();
    expect(metadata).toMatchObject({
      identity_verified: true,
      age_verified_18plus: true,
      identity_verification_session_id: 'vs_test_1',
    });
    expect(typeof metadata.identity_verified_at).toBe('string');
    expect(typeof metadata.age_checked_at).toBe('string');
    expect(metadata).not.toHaveProperty('age_check_failed');
  });

  it('asks Stripe for ONLY the DOB, with the restricted key, via GET', async () => {
    mockStripeResponse(200, session());
    await processVerifiedSession({ userId: 'user-1', sessionId: 'vs_test_1', now: NOW });
    const [options] = https.request.mock.calls[0];
    expect(options.method).toBe('GET');
    expect(options.host).toBe('api.stripe.com');
    expect(options.path).toBe(
      '/v1/identity/verification_sessions/vs_test_1?expand%5B%5D=verified_outputs.dob'
    );
    expect(options.headers.Authorization).toBe(`Bearer ${RESTRICTED_KEY}`);
  });

  it('never persists or logs the DOB', async () => {
    mockStripeResponse(200, session());
    await processVerifiedSession({ userId: 'user-1', sessionId: 'vs_test_1', now: NOW });
    expectNoDobLeak(ADULT_DOB);
  });
});

// ---- under 18 ------------------------------------------------------------------

describe('processVerifiedSession - under 18', () => {
  it('does NOT verify, flags age_check_failed, and logs loudly', async () => {
    mockStripeResponse(200, session({ dob: MINOR_DOB }));
    const result = await processVerifiedSession({
      userId: 'user-1',
      sessionId: 'vs_test_1',
      now: NOW,
    });
    expect(result).toEqual({ persisted: true, outcome: AGE_OUTCOME_UNDER_18 });
    expect(writtenMetadata()).toMatchObject({
      identity_verified: false,
      age_verified_18plus: false,
      age_check_failed: true,
      identity_verified_at: null,
    });
    expect(log.error.mock.calls.map(c => c[1])).toContain('rtfb03-age-check-under-18');
    expectNoDobLeak(MINOR_DOB);
  });

  it('turns 18 tomorrow -> still under 18 today', async () => {
    mockStripeResponse(200, session({ dob: { day: 29, month: 9, year: 2008 } }));
    const result = await processVerifiedSession({
      userId: 'user-1',
      sessionId: 'vs_test_1',
      now: NOW,
    });
    expect(result.outcome).toBe(AGE_OUTCOME_UNDER_18);
    expect(writtenMetadata().identity_verified).toBe(false);
  });

  it('exactly 18 today -> verified', async () => {
    mockStripeResponse(200, session({ dob: { day: 28, month: 9, year: 2008 } }));
    const result = await processVerifiedSession({
      userId: 'user-1',
      sessionId: 'vs_test_1',
      now: NOW,
    });
    expect(result.outcome).toBe(AGE_OUTCOME_ADULT);
    expect(writtenMetadata().identity_verified).toBe(true);
  });
});

// ---- sticky under-18 flag ------------------------------------------------------

describe('processVerifiedSession - previously flagged under 18', () => {
  it('HOLDS a later adult verification for operator review (not verified)', async () => {
    mockStripeResponse(200, session());
    mockIntegrationSdk.users.show.mockResolvedValue({
      data: { data: { attributes: { profile: { metadata: { age_check_failed: true } } } } },
    });
    const result = await processVerifiedSession({
      userId: 'user-1',
      sessionId: 'vs_test_1',
      now: NOW,
    });
    expect(result).toEqual({ persisted: true, outcome: AGE_OUTCOME_HELD });
    const metadata = writtenMetadata();
    expect(metadata.identity_verified).toBe(false);
    expect(metadata.age_verified_18plus).toBe(false);
    // The sticky flag is never cleared by code.
    expect(metadata).not.toHaveProperty('age_check_failed');
    expect(log.error.mock.calls.map(c => c[1])).toContain('rtfb03-age-check-held');
  });

  it('rejects (-> webhook 500, Stripe retries) if the prior-flag lookup fails; no write', async () => {
    mockStripeResponse(200, session());
    mockIntegrationSdk.users.show.mockRejectedValue(new Error('integration down'));
    await expect(
      processVerifiedSession({ userId: 'user-1', sessionId: 'vs_test_1', now: NOW })
    ).rejects.toThrow('integration down');
    expect(mockIntegrationSdk.users.updateProfile).not.toHaveBeenCalled();
  });
});

// ---- fail closed: DOB unavailable ----------------------------------------------

describe('processVerifiedSession - fails CLOSED when the DOB is unavailable', () => {
  const expectNotVerified = async (why, { callsStripe = true } = {}) => {
    const result = await processVerifiedSession({
      userId: 'user-1',
      sessionId: 'vs_test_1',
      now: NOW,
    });
    expect(result).toEqual({ persisted: true, outcome: AGE_OUTCOME_DOB_UNAVAILABLE, why });
    const metadata = writtenMetadata();
    expect(metadata.identity_verified).toBe(false);
    expect(metadata.age_verified_18plus).toBe(false);
    expect(metadata).not.toHaveProperty('age_check_failed');
    expect(log.error.mock.calls.map(c => c[1])).toContain('rtfb03-age-check-dob-unavailable');
    expect(https.request).toHaveBeenCalledTimes(callsStripe ? 1 : 0);
  };

  it('DOB missing from verified_outputs', async () => {
    mockStripeResponse(200, session({ dob: OMIT }));
    await expectNotVerified('evaluated');
  });

  it('DOB null (e.g. secret key used / not expanded)', async () => {
    mockStripeResponse(200, session({ dob: null }));
    await expectNotVerified('evaluated');
  });

  it('DOB incomplete', async () => {
    mockStripeResponse(200, session({ dob: { day: 1, month: 1, year: null } }));
    await expectNotVerified('evaluated');
  });

  it('restricted key not provisioned -> does not call Stripe, not verified', async () => {
    delete process.env.STRIPE_IDENTITY_RESTRICTED_KEY;
    await expectNotVerified('restricted-key-missing', { callsStripe: false });
  });

  it('Stripe says the session is not verified', async () => {
    mockStripeResponse(200, session({ status: 'requires_input' }));
    await expectNotVerified('session-not-verified');
  });

  it('session belongs to a different user', async () => {
    mockStripeResponse(200, session({ userId: 'someone-else' }));
    await expectNotVerified('session-user-mismatch');
  });

  it('Stripe rejects the read permanently (e.g. 403 key lacks permission)', async () => {
    mockStripeResponse(403, { error: { message: 'insufficient permissions' } });
    await expectNotVerified('stripe-rejected');
  });
});

describe('processVerifiedSession - transient Stripe failures', () => {
  it.each([
    ['5xx', () => mockStripeResponse(500, { error: { message: 'boom' } })],
    ['429', () => mockStripeResponse(429, { error: { message: 'slow down' } })],
    ['network', () => mockStripeNetworkError()],
  ])('%s rejects so Stripe retries; nothing is written', async (_label, arrange) => {
    arrange();
    await expect(
      processVerifiedSession({ userId: 'user-1', sessionId: 'vs_test_1', now: NOW })
    ).rejects.toBeTruthy();
    expect(mockIntegrationSdk.users.updateProfile).not.toHaveBeenCalled();
  });
});

// ---- write invariant -----------------------------------------------------------

describe('writeIdentityVerifiedFlag - RT-FB-03 invariant', () => {
  it('cannot write identity_verified: true without a passed age check', async () => {
    await writeIdentityVerifiedFlag({ userId: 'user-1', verified: true, sessionId: 'vs_1' });
    expect(writtenMetadata()).toMatchObject({
      identity_verified: false,
      age_verified_18plus: false,
      identity_verified_at: null,
    });
  });

  it('a requires_input/redacted style write leaves the sticky under-18 flag alone', async () => {
    await writeIdentityVerifiedFlag({ userId: 'user-1', verified: false, sessionId: 'vs_1' });
    expect(writtenMetadata()).not.toHaveProperty('age_check_failed');
    expect(writtenMetadata()).not.toHaveProperty('age_checked_at');
  });
});
