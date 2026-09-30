// Gate A amendment 30/09/2026: the server's review-decision predicate.

const {
  isAccountStatusFlowEnabled,
  getReviewDecision,
  isGateAPassed,
  isUserGateAPassed,
} = require('./reviewDecision');

const user = ({ state = 'active', reviewDecision } = {}) => ({
  attributes: {
    state,
    profile: { metadata: reviewDecision === undefined ? {} : { reviewDecision } },
  },
});

describe('isAccountStatusFlowEnabled', () => {
  const original = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    } else {
      process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = original;
    }
  });

  it('is on only for the exact string "true"', () => {
    delete process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;
    expect(isAccountStatusFlowEnabled()).toBe(false);
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = '1';
    expect(isAccountStatusFlowEnabled()).toBe(false);
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
    expect(isAccountStatusFlowEnabled()).toBe(true);
  });
});

describe('getReviewDecision', () => {
  it('reads approved / declined from metadata', () => {
    expect(getReviewDecision(user({ reviewDecision: 'approved' }))).toBe('approved');
    expect(getReviewDecision(user({ reviewDecision: 'declined' }))).toBe('declined');
  });
  it('treats anything else as no decision', () => {
    [undefined, null, '', 'Approved', 'approved ', true].forEach(value => {
      expect(getReviewDecision(user({ reviewDecision: value }))).toBe(null);
    });
    expect(getReviewDecision(undefined)).toBe(null);
  });
});

describe('isGateAPassed', () => {
  const states = ['active', 'pending-approval', 'banned', undefined];
  const decisions = ['approved', 'declined', null];

  it('flag OFF: unchanged pre-amendment behaviour (active only), whatever the decision', () => {
    states.forEach(userState =>
      decisions.forEach(reviewDecision => {
        expect(isGateAPassed({ userState, reviewDecision, flowEnabled: false })).toBe(
          userState === 'active'
        );
      })
    );
  });

  it('flag ON: requires active AND approved', () => {
    states.forEach(userState =>
      decisions.forEach(reviewDecision => {
        expect(isGateAPassed({ userState, reviewDecision, flowEnabled: true })).toBe(
          userState === 'active' && reviewDecision === 'approved'
        );
      })
    );
  });

  it('flag ON: active with no decision is NOT approved', () => {
    expect(isGateAPassed({ userState: 'active', reviewDecision: null, flowEnabled: true })).toBe(
      false
    );
  });

  it('flag ON: a banned account fails even if approved', () => {
    expect(
      isGateAPassed({ userState: 'banned', reviewDecision: 'approved', flowEnabled: true })
    ).toBe(false);
  });

  it('isUserGateAPassed reads the user resource', () => {
    expect(isUserGateAPassed(user({ reviewDecision: 'approved' }), { flowEnabled: true })).toBe(
      true
    );
    expect(isUserGateAPassed(user({ reviewDecision: 'Approved' }), { flowEnabled: true })).toBe(
      false
    );
    expect(isUserGateAPassed(user(), { flowEnabled: true })).toBe(false);
    expect(isUserGateAPassed(user(), { flowEnabled: false })).toBe(true);
  });
});
