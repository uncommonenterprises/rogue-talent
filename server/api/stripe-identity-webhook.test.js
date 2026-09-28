// RT-FB-03 - Stripe Identity webhook routing. The age decision itself is tested in
// api-util/stripeIdentity.test.js; here we check the webhook sends `verified` events
// through the age-gated path (never straight to identity_verified: true) and maps
// outcomes to the right HTTP status for Stripe.

jest.mock('../log', () => ({ error: jest.fn() }));
jest.mock('../api-util/stripeIdentity', () => ({
  isWebhookConfigured: jest.fn(() => true),
  constructWebhookEvent: jest.fn(),
  processVerifiedSession: jest.fn(),
  writeIdentityVerifiedFlag: jest.fn(),
  AGE_OUTCOME_ADULT: 'adult',
}));

const stripeIdentity = require('../api-util/stripeIdentity');
const webhook = require('./stripe-identity-webhook');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const event = type => ({
  type,
  data: { object: { id: 'vs_1', metadata: { user_id: 'user-1' } } },
});

const run = async type => {
  stripeIdentity.constructWebhookEvent.mockReturnValue(event(type));
  const res = mockRes();
  await webhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') }, res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  stripeIdentity.isWebhookConfigured.mockReturnValue(true);
});

describe('stripe-identity-webhook', () => {
  it('routes a verified event through the age-gated processVerifiedSession', async () => {
    stripeIdentity.processVerifiedSession.mockResolvedValue({ persisted: true, outcome: 'adult' });
    const res = await run('identity.verification_session.verified');
    expect(stripeIdentity.processVerifiedSession).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionId: 'vs_1',
    });
    expect(stripeIdentity.writeIdentityVerifiedFlag).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('acknowledges (200) an under-18 outcome - the decision is final, no retry', async () => {
    stripeIdentity.processVerifiedSession.mockResolvedValue({
      persisted: true,
      outcome: 'under-18',
    });
    const res = await run('identity.verification_session.verified');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 on a transient failure so Stripe retries', async () => {
    stripeIdentity.processVerifiedSession.mockRejectedValue(new Error('stripe 503'));
    const res = await run('identity.verification_session.verified');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it.each([
    'identity.verification_session.requires_input',
    'identity.verification_session.redacted',
  ])('%s writes not-verified without an age check', async type => {
    stripeIdentity.writeIdentityVerifiedFlag.mockResolvedValue(true);
    const res = await run(type);
    expect(stripeIdentity.writeIdentityVerifiedFlag).toHaveBeenCalledWith({
      userId: 'user-1',
      verified: false,
      sessionId: 'vs_1',
    });
    expect(stripeIdentity.processVerifiedSession).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('refuses (503) when the webhook secret is not configured', async () => {
    stripeIdentity.isWebhookConfigured.mockReturnValue(false);
    const res = mockRes();
    await webhook({ headers: {}, body: Buffer.from('{}') }, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
