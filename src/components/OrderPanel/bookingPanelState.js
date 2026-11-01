// Which version of the booking panel to show on a model's profile (B03 "panel states").
//
// READ ONLY: this reads the account-status lifecycle (Gate A review decision, Gate B identity
// check) to choose what the panel SAYS. It changes no gate and is not a gate itself: the server
// still decides whether a booking can be made. Flagged for the human developer review.

import {
  ACCOUNT_STATUS_APPROVED,
  ACCOUNT_STATUS_DRAFT,
  ACCOUNT_STATUS_PENDING,
  ACCOUNT_STATUS_VERIFIED,
  getAccountStatus,
  isAccountStatusFlowEnabled,
} from '../../util/accountStatus';
import { clientNeedsIdentityVerification, isClientUser } from '../../util/userHelpers';

export const PANEL_BOOK = 'book';
export const PANEL_LOGGED_OUT = 'loggedOut';
export const PANEL_PENDING = 'pending';
export const PANEL_VERIFY_IDENTITY = 'verifyIdentity';
export const PANEL_CHECK_STATUS = 'checkStatus';
export const PANEL_OWN_PROFILE = 'ownProfile';
export const PANEL_CLOSED = 'closed';

/**
 * @param {Object} params
 * @param {boolean} params.isAuthenticated
 * @param {Object} [params.currentUser]
 * @param {boolean} [params.isOwnListing]
 * @param {boolean} [params.isClosed]
 * @param {boolean} [params.flagEnabled] account-status flow flag (defaults to the env flag)
 * @returns {string} one of the PANEL_* values
 */
export const getBookingPanelState = ({
  isAuthenticated,
  currentUser,
  isOwnListing = false,
  isClosed = false,
  flagEnabled = isAccountStatusFlowEnabled(),
}) => {
  if (isOwnListing) {
    return PANEL_OWN_PROFILE;
  }
  if (isClosed) {
    return PANEL_CLOSED;
  }
  if (!isAuthenticated) {
    return PANEL_LOGGED_OUT;
  }
  // currentUser is still loading: show the normal booking panel; the server gate decides.
  if (!currentUser?.id || !isClientUser(currentUser)) {
    return PANEL_BOOK;
  }

  if (flagEnabled) {
    const status = getAccountStatus({ currentUser });
    if (status === ACCOUNT_STATUS_VERIFIED) {
      return PANEL_BOOK;
    }
    if (status === ACCOUNT_STATUS_APPROVED) {
      return PANEL_VERIFY_IDENTITY;
    }
    if (status === ACCOUNT_STATUS_PENDING || status === ACCOUNT_STATUS_DRAFT) {
      return PANEL_PENDING;
    }
    // Not approved (or anything unexpected): point to the account status page, nothing more.
    return PANEL_CHECK_STATUS;
  }

  // Flag off (today's behaviour): only the identity check (SAF-03) applies before checkout.
  return clientNeedsIdentityVerification(currentUser) ? PANEL_VERIFY_IDENTITY : PANEL_BOOK;
};
