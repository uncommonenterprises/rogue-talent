// Review tool: Stripe Connect progress as two status words. Stripe is never called (the read is
// injected), and no raw Stripe data is ever returned.

jest.mock('../log', () => ({ error: jest.fn() }));

const {
  summariseStripeAccount,
  combineStripeStatus,
  getStripeAccountStatus,
} = require('./stripeConnectStatus');

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('summariseStripeAccount', () => {
  it('maps charges/payouts and the ID check to identity/bank', () => {
    expect(summariseStripeAccount({ charges_enabled: true, payouts_enabled: true })).toEqual({
      identity: 'verified',
      bank: 'verified',
    });
    expect(
      summariseStripeAccount({
        charges_enabled: false,
        payouts_enabled: false,
        individual: { verification: { status: 'verified' } },
      })
    ).toEqual({ identity: 'verified', bank: 'in-progress' });
    expect(summariseStripeAccount({ charges_enabled: false, payouts_enabled: false })).toEqual({
      identity: 'in-progress',
      bank: 'in-progress',
    });
    expect(summariseStripeAccount(null)).toEqual({ identity: 'unknown', bank: 'unknown' });
  });

  it('returns only the two words, never account details', () => {
    const result = summariseStripeAccount({
      charges_enabled: true,
      payouts_enabled: false,
      email: 'model@example.com',
      individual: { dob: { day: 1, month: 1, year: 2000 }, phone: '+447700900000' },
      external_accounts: { data: [{ last4: '1234' }] },
    });
    expect(Object.keys(result).sort()).toEqual(['bank', 'identity']);
    expect(JSON.stringify(result)).not.toMatch(/example|2000|1234|7700/);
  });
});

describe('combineStripeStatus (queue chip)', () => {
  it('is verified only when both parts are', () => {
    expect(combineStripeStatus({ identity: 'verified', bank: 'verified' })).toBe('verified');
    expect(combineStripeStatus({ identity: 'verified', bank: 'in-progress' })).toBe('in-progress');
    expect(combineStripeStatus({ identity: 'not-started', bank: 'not-started' })).toBe(
      'not-started'
    );
    expect(combineStripeStatus({ identity: 'unknown', bank: 'verified' })).toBe('unknown');
  });
});

describe('getStripeAccountStatus', () => {
  it('is not-started without an account id, and never calls Stripe', async () => {
    const fetchAccount = jest.fn();
    expect(await getStripeAccountStatus(null, { fetchAccount })).toEqual({
      identity: 'not-started',
      bank: 'not-started',
    });
    expect(fetchAccount).not.toHaveBeenCalled();
  });

  it('is unknown when the key is missing or the id is malformed', async () => {
    const fetchAccount = jest.fn();
    delete process.env.STRIPE_SECRET_KEY;
    expect(await getStripeAccountStatus('acct_123', { fetchAccount })).toEqual({
      identity: 'unknown',
      bank: 'unknown',
    });
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    expect(await getStripeAccountStatus('acct_1/../../v1/charges', { fetchAccount })).toEqual({
      identity: 'unknown',
      bank: 'unknown',
    });
    expect(fetchAccount).not.toHaveBeenCalled();
  });

  it('reads and summarises the account, and is unknown on an error', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const ok = jest.fn().mockResolvedValue({ charges_enabled: true, payouts_enabled: true });
    expect(await getStripeAccountStatus('acct_123', { fetchAccount: ok })).toEqual({
      identity: 'verified',
      bank: 'verified',
    });
    expect(ok).toHaveBeenCalledWith('acct_123');
    const failing = jest.fn().mockRejectedValue(new Error('boom'));
    expect(await getStripeAccountStatus('acct_123', { fetchAccount: failing })).toEqual({
      identity: 'unknown',
      bank: 'unknown',
    });
  });
});
