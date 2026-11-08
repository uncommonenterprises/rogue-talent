// Who may see a model's free dates on their profile (B03b, decision 2, 08/11/2026: "Yes,
// approved clients only").
//
// READ ONLY and UI ONLY. This decides what the profile SHOWS; it is not a security boundary.
// The underlying time slots are public in the Sharetribe Marketplace API, so anyone can still
// query them directly (see the F8 report). Flagged for the human developer review.
//
// The rule: free dates show only to a logged-in client account that may book right now, i.e.
//   1. the booking panel is in its "book" state (the same account-status checks the panel uses:
//      bookingPanelState.js), AND
//   2. the account passes the same Gate A check as the server booking gate
//      (server/api-util/reviewDecision.js isGateAPassed): user state 'active', plus the
//      operator-set metadata reviewDecision === 'approved' when the account-status flow is on,
//      AND
//   3. it does not still need identity verification (SAF-03, when switched on).
// publicData.userType is user-writable, so it is only ever used to REFUSE (a model account, or
// an account that does not say it is a client), never to grant. The approval itself comes from
// operator-only metadata and the Sharetribe user state.
//
// The model viewing their own profile sees the same calendar, read-only (a preview).

import {
  getReviewDecision,
  isAccountStatusFlowEnabled,
  isModelUser,
  REVIEW_DECISION_APPROVED,
} from '../../util/accountStatus';
import { clientNeedsIdentityVerification, isClientUser } from '../../util/userHelpers';

import {
  PANEL_BOOK,
  PANEL_CHECK_STATUS,
  PANEL_CLOSED,
  PANEL_LOGGED_OUT,
  PANEL_MODEL_ACCOUNT,
  PANEL_OWN_PROFILE,
  PANEL_PENDING,
  PANEL_VERIFY_IDENTITY,
} from './bookingPanelState';

export const VIEWER_DATES = 'dates';
export const VIEWER_OWN = 'own';
export const VIEWER_LOADING = 'loading';
export const VIEWER_LOGGED_OUT = 'loggedOut';
export const VIEWER_PENDING = 'pending';
export const VIEWER_VERIFY_IDENTITY = 'verifyIdentity';
export const VIEWER_CHECK_STATUS = 'checkStatus';
export const VIEWER_MODEL_ACCOUNT = 'modelAccount';
export const VIEWER_NONE = 'none';

/**
 * Does this signed-in account pass the client-side mirror of the client booking gate?
 *
 * @param {Object} params
 * @param {Object} params.currentUser currentUser API entity
 * @param {boolean} [params.flagEnabled] account-status flow flag (defaults to the env flag)
 * @returns {boolean}
 */
export const isApprovedClientForAvailability = ({
  currentUser,
  flagEnabled = isAccountStatusFlowEnabled(),
}) => {
  if (!currentUser?.id) {
    return false;
  }
  // Refusals only: userType can never grant access.
  if (isModelUser(currentUser) || !isClientUser(currentUser)) {
    return false;
  }
  // Gate A, read exactly as the server reads it.
  if (currentUser.attributes?.state !== 'active') {
    return false;
  }
  if (flagEnabled && getReviewDecision(currentUser) !== REVIEW_DECISION_APPROVED) {
    return false;
  }
  return !clientNeedsIdentityVerification(currentUser);
};

/**
 * Which version of the availability calendar a viewer gets.
 *
 * @param {Object} params
 * @param {string} params.panelState one of the PANEL_* values from getBookingPanelState
 * @param {Object} [params.currentUser]
 * @param {boolean} [params.flagEnabled] account-status flow flag (defaults to the env flag)
 * @returns {string} one of the VIEWER_* values
 */
export const getAvailabilityViewerState = ({
  panelState,
  currentUser,
  flagEnabled = isAccountStatusFlowEnabled(),
}) => {
  switch (panelState) {
    case PANEL_OWN_PROFILE:
      return VIEWER_OWN;
    case PANEL_CLOSED:
      return VIEWER_NONE;
    case PANEL_LOGGED_OUT:
      return VIEWER_LOGGED_OUT;
    case PANEL_MODEL_ACCOUNT:
      return VIEWER_MODEL_ACCOUNT;
    case PANEL_PENDING:
      return VIEWER_PENDING;
    case PANEL_VERIFY_IDENTITY:
      return VIEWER_VERIFY_IDENTITY;
    case PANEL_CHECK_STATUS:
      return VIEWER_CHECK_STATUS;
    case PANEL_BOOK:
      // Signed in but the user has not loaded yet: wait, show nothing.
      if (!currentUser?.id) {
        return VIEWER_LOADING;
      }
      return isApprovedClientForAvailability({ currentUser, flagEnabled })
        ? VIEWER_DATES
        : VIEWER_CHECK_STATUS;
    default:
      return VIEWER_NONE;
  }
};
