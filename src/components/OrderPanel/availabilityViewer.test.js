import { createCurrentUser } from '../../util/testData';

import { getBookingPanelState } from './bookingPanelState';
import {
  getAvailabilityViewerState,
  isApprovedClientForAvailability,
  VIEWER_CHECK_STATUS,
  VIEWER_DATES,
  VIEWER_LOADING,
  VIEWER_LOGGED_OUT,
  VIEWER_MODEL_ACCOUNT,
  VIEWER_NONE,
  VIEWER_OWN,
  VIEWER_PENDING,
  VIEWER_VERIFY_IDENTITY,
} from './availabilityViewer';

const user = ({ userType = 'client', metadata = {}, privateData = {}, state = 'active' } = {}) =>
  createCurrentUser('user-1', {
    state,
    profile: {
      displayName: 'Ben C',
      abbreviatedName: 'BC',
      publicData: userType ? { userType } : {},
      metadata,
      privateData,
    },
  });

// What the profile shows a viewer, end to end through the same panel-state checks the booking
// panel uses (decision 2, 08/11/2026: free dates for logged-in, approved clients only).
const viewerFor = ({
  isAuthenticated = true,
  currentUser = null,
  isOwnListing = false,
  isClosed = false,
  flagEnabled = false,
}) =>
  getAvailabilityViewerState({
    panelState: getBookingPanelState({
      isAuthenticated,
      currentUser,
      isOwnListing,
      isClosed,
      flagEnabled,
    }),
    currentUser,
    flagEnabled,
  });

const approved = { reviewDecision: 'approved' };
const verified = { reviewDecision: 'approved', identity_verified: true };

describe("who sees a model's free dates (B03b viewer gate)", () => {
  const originalIdFlag = process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED;
  afterEach(() => {
    if (originalIdFlag === undefined) {
      delete process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED;
    } else {
      process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED = originalIdFlag;
    }
  });

  it('logged-out visitors see no dates', () => {
    expect(viewerFor({ isAuthenticated: false })).toEqual(VIEWER_LOGGED_OUT);
    expect(viewerFor({ isAuthenticated: false, flagEnabled: true })).toEqual(VIEWER_LOGGED_OUT);
  });

  it('the model viewing their own profile sees the preview, nothing else wins over it', () => {
    expect(viewerFor({ currentUser: user({ userType: 'model' }), isOwnListing: true })).toEqual(
      VIEWER_OWN
    );
  });

  it('a closed profile shows no availability at all', () => {
    expect(viewerFor({ currentUser: user({ metadata: verified }), isClosed: true })).toEqual(
      VIEWER_NONE
    );
  });

  it('models viewing another model see no dates, even if approved', () => {
    const model = user({ userType: 'model', metadata: verified });
    expect(viewerFor({ currentUser: model })).toEqual(VIEWER_MODEL_ACCOUNT);
    expect(viewerFor({ currentUser: model, flagEnabled: true })).toEqual(VIEWER_MODEL_ACCOUNT);
  });

  describe('account-status flow ON (Gate A = operator review decision)', () => {
    it('an approved and verified client sees the dates', () => {
      expect(viewerFor({ currentUser: user({ metadata: verified }), flagEnabled: true })).toEqual(
        VIEWER_DATES
      );
    });

    it('a pending client sees no dates', () => {
      const pending = user({ privateData: { businessDetailsSubmittedAt: '2026-11-01' } });
      expect(viewerFor({ currentUser: pending, flagEnabled: true })).toEqual(VIEWER_PENDING);
    });

    it('a declined client sees no dates', () => {
      const declined = user({ metadata: { reviewDecision: 'declined' } });
      expect(viewerFor({ currentUser: declined, flagEnabled: true })).toEqual(VIEWER_CHECK_STATUS);
    });

    it('an approved client who still has to verify their identity sees no dates yet', () => {
      expect(viewerFor({ currentUser: user({ metadata: approved }), flagEnabled: true })).toEqual(
        VIEWER_VERIFY_IDENTITY
      );
    });

    it('a review decision with a typo never reads as approved', () => {
      const typo = user({ metadata: { reviewDecision: 'Approved', identity_verified: true } });
      expect(isApprovedClientForAvailability({ currentUser: typo, flagEnabled: true })).toBe(false);
    });
  });

  describe('account-status flow OFF (Gate A = an active account, as the server reads it)', () => {
    it('an active client sees the dates', () => {
      expect(viewerFor({ currentUser: user() })).toEqual(VIEWER_DATES);
    });

    it('a banned account sees no dates', () => {
      expect(viewerFor({ currentUser: user({ state: 'banned' }) })).toEqual(VIEWER_CHECK_STATUS);
    });

    it('a client who must verify their identity first sees no dates', () => {
      process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED = 'true';
      expect(viewerFor({ currentUser: user() })).toEqual(VIEWER_VERIFY_IDENTITY);
    });
  });

  it('self-set userType never grants access: an account that does not say "client" sees no dates', () => {
    const noType = user({ userType: null, metadata: verified });
    expect(viewerFor({ currentUser: noType, flagEnabled: true })).toEqual(VIEWER_CHECK_STATUS);
    const otherType = user({ userType: 'agency', metadata: verified });
    expect(viewerFor({ currentUser: otherType, flagEnabled: true })).toEqual(VIEWER_CHECK_STATUS);
  });

  it('a signed-in visitor whose account has not loaded yet sees nothing until it has', () => {
    expect(viewerFor({ isAuthenticated: true, currentUser: null })).toEqual(VIEWER_LOADING);
  });

  it('the strict check refuses a missing user', () => {
    expect(isApprovedClientForAvailability({ currentUser: null, flagEnabled: false })).toBe(false);
  });
});
