// Client booking gate: SAF-03 identity (unchanged) + Gate A review approval
// (amendment 30/09/2026, flag ON only). The Marketplace SDK is a stub; nothing is written.

jest.mock('../log', () => ({ error: jest.fn() }));

const {
  enforceClientIdentityVerification,
  ACCOUNT_APPROVAL_REQUIRED_CODE,
  IDENTITY_VERIFICATION_REQUIRED_CODE,
} = require('./clientIdentityGate');

const FLAG = 'REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED';
const originalFlag = process.env[FLAG];
const originalStripeKey = process.env.STRIPE_SECRET_KEY;

const restore = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

const sdkFor = ({ userType = 'client', state = 'active', metadata = {} } = {}) => ({
  currentUser: {
    show: jest.fn().mockResolvedValue({
      data: {
        data: {
          id: { uuid: 'client-1' },
          attributes: { state, profile: { publicData: { userType }, metadata } },
        },
      },
    }),
  },
});

const approvalBlocked = {
  status: 403,
  data: { errors: [{ code: ACCOUNT_APPROVAL_REQUIRED_CODE }] },
};
const identityBlocked = {
  status: 403,
  data: { errors: [{ code: IDENTITY_VERIFICATION_REQUIRED_CODE }] },
};

const approvedVerified = { reviewDecision: 'approved', identity_verified: true };

afterEach(() => {
  restore(FLAG, originalFlag);
  restore('STRIPE_SECRET_KEY', originalStripeKey);
});

describe('client booking gate: flag ON + identity configured (the cutover state)', () => {
  beforeEach(() => {
    process.env[FLAG] = 'true';
    process.env.STRIPE_SECRET_KEY = 'configured-in-test';
  });

  it('blocks an identity-verified (18+) client with NO review decision', async () => {
    const sdk = sdkFor({ metadata: { identity_verified: true, age_verified_18plus: true } });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(approvalBlocked);
  });

  it('blocks an identity-verified client who was declined', async () => {
    const sdk = sdkFor({ metadata: { identity_verified: true, reviewDecision: 'declined' } });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(approvalBlocked);
  });

  it('blocks an unrecognised decision value (a typo is never approved)', async () => {
    const sdk = sdkFor({ metadata: { identity_verified: true, reviewDecision: 'APPROVED' } });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(approvalBlocked);
  });

  it('blocks an approved client who is not identity-verified (18+ check not passed)', async () => {
    const sdk = sdkFor({ metadata: { reviewDecision: 'approved', age_check_failed: true } });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(identityBlocked);
  });

  it('asks for approval first when a client is neither approved nor verified', async () => {
    const sdk = sdkFor();
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(approvalBlocked);
  });

  it('allows an approved, identity-verified client', async () => {
    const sdk = sdkFor({ metadata: approvedVerified });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).resolves.toBeUndefined();
  });

  it('does not gate a non-client (models fall through to the native gates)', async () => {
    const sdk = sdkFor({ userType: 'model' });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).resolves.toBeUndefined();
  });

  it('always allows speculative (price preview) calls, without a lookup', async () => {
    const sdk = sdkFor();
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: true })
    ).resolves.toBeUndefined();
    expect(sdk.currentUser.show).not.toHaveBeenCalled();
  });

  it('fails CLOSED when the current-user lookup errors', async () => {
    const sdk = { currentUser: { show: jest.fn().mockRejectedValue(new Error('api down')) } };
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(identityBlocked);
  });
});

describe('client booking gate: flag ON, identity NOT configured', () => {
  beforeEach(() => {
    process.env[FLAG] = 'true';
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('still requires review approval (the approval check needs no Stripe keys)', async () => {
    const sdk = sdkFor();
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(approvalBlocked);
  });

  it('allows an approved client (identity fails open while unconfigured, as today)', async () => {
    const sdk = sdkFor({ metadata: { reviewDecision: 'approved' } });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).resolves.toBeUndefined();
  });

  it('fails CLOSED with the approval code when the lookup errors', async () => {
    const sdk = { currentUser: { show: jest.fn().mockRejectedValue(new Error('api down')) } };
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(approvalBlocked);
  });
});

describe('client booking gate: flag OFF (unchanged behaviour)', () => {
  beforeEach(() => {
    delete process.env[FLAG];
  });

  it('identity configured: an identity-verified client with no decision can book', async () => {
    process.env.STRIPE_SECRET_KEY = 'configured-in-test';
    const sdk = sdkFor({ metadata: { identity_verified: true } });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).resolves.toBeUndefined();
  });

  it('identity configured: an unverified client is blocked for identity, as today', async () => {
    process.env.STRIPE_SECRET_KEY = 'configured-in-test';
    const sdk = sdkFor({ metadata: { reviewDecision: 'approved' } });
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).rejects.toMatchObject(identityBlocked);
  });

  it('nothing configured: fails OPEN without a lookup, as today', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const sdk = sdkFor();
    await expect(
      enforceClientIdentityVerification({ sdk, isSpeculative: false })
    ).resolves.toBeUndefined();
    expect(sdk.currentUser.show).not.toHaveBeenCalled();
  });
});
