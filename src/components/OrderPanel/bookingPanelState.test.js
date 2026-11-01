import { createCurrentUser } from '../../util/testData';

import {
  getBookingPanelState,
  PANEL_BOOK,
  PANEL_LOGGED_OUT,
  PANEL_PENDING,
  PANEL_VERIFY_IDENTITY,
  PANEL_CHECK_STATUS,
  PANEL_OWN_PROFILE,
  PANEL_CLOSED,
} from './bookingPanelState';

const client = ({ metadata = {}, privateData = {} } = {}) =>
  createCurrentUser('client-1', {
    profile: {
      displayName: 'Ben C',
      abbreviatedName: 'BC',
      publicData: { userType: 'client' },
      metadata,
      privateData,
    },
  });

describe('getBookingPanelState (B03 panel states)', () => {
  const originalIdFlag = process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED;
  afterEach(() => {
    if (originalIdFlag === undefined) {
      delete process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED;
    } else {
      process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED = originalIdFlag;
    }
  });

  it('own profile wins over everything else', () => {
    expect(
      getBookingPanelState({ isAuthenticated: true, isOwnListing: true, isClosed: true })
    ).toEqual(PANEL_OWN_PROFILE);
  });

  it('closed profile, then logged out', () => {
    expect(getBookingPanelState({ isAuthenticated: false, isClosed: true })).toEqual(PANEL_CLOSED);
    expect(getBookingPanelState({ isAuthenticated: false })).toEqual(PANEL_LOGGED_OUT);
  });

  it('a loaded user counts as logged in even without isAuthenticated', () => {
    expect(
      getBookingPanelState({ isAuthenticated: false, currentUser: client(), flagEnabled: false })
    ).toEqual(PANEL_BOOK);
  });

  it('shows the booking panel while the user is still loading', () => {
    expect(getBookingPanelState({ isAuthenticated: true, currentUser: null })).toEqual(PANEL_BOOK);
  });

  describe('account-status flow ON', () => {
    const base = { isAuthenticated: true, flagEnabled: true };

    it('verified client (approved + ID verified) can book', () => {
      const currentUser = client({
        metadata: { reviewDecision: 'approved', identity_verified: true },
      });
      expect(getBookingPanelState({ ...base, currentUser })).toEqual(PANEL_BOOK);
    });

    it('approved but not ID verified is asked to verify', () => {
      const currentUser = client({ metadata: { reviewDecision: 'approved' } });
      expect(getBookingPanelState({ ...base, currentUser })).toEqual(PANEL_VERIFY_IDENTITY);
    });

    it('no decision yet is waiting for approval (even if ID is verified)', () => {
      const currentUser = client({
        metadata: { identity_verified: true },
        privateData: { businessDetailsSubmittedAt: '2026-11-01T10:00:00Z' },
      });
      expect(getBookingPanelState({ ...base, currentUser })).toEqual(PANEL_PENDING);
      expect(getBookingPanelState({ ...base, currentUser: client() })).toEqual(PANEL_PENDING);
    });

    it('declined points to the account status page', () => {
      const currentUser = client({ metadata: { reviewDecision: 'declined' } });
      expect(getBookingPanelState({ ...base, currentUser })).toEqual(PANEL_CHECK_STATUS);
    });
  });

  describe('account-status flow OFF (today)', () => {
    const base = { isAuthenticated: true, flagEnabled: false };

    it('books as before when the identity UX flag is off', () => {
      delete process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED;
      expect(getBookingPanelState({ ...base, currentUser: client() })).toEqual(PANEL_BOOK);
    });

    it('asks an unverified client to verify when the identity UX flag is on', () => {
      process.env.REACT_APP_IDENTITY_VERIFICATION_ENABLED = 'true';
      expect(getBookingPanelState({ ...base, currentUser: client() })).toEqual(
        PANEL_VERIFY_IDENTITY
      );
      const verified = client({ metadata: { identity_verified: true } });
      expect(getBookingPanelState({ ...base, currentUser: verified })).toEqual(PANEL_BOOK);
    });
  });
});
