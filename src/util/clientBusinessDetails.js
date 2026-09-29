import { isClientUser } from './userHelpers';

/**
 * Client "Your business details" step (sign-up journey screen 18).
 *
 * "Submit for approval" on that step is the client's Gate A submission (account-status lifecycle,
 * docs/specs/account-status-lifecycle.md §5 + §6 Clients). It records an ISO timestamp on the
 * client's own privateData under BUSINESS_DETAILS_SUBMITTED_AT_KEY. That timestamp is the client
 * "submitted" signal read by util/accountStatus.js isAccountSubmitted (Draft vs Pending approval).
 *
 * privateData is readable only by the client themselves and the operator, and it is never shared
 * through a transaction. The marker only moves a client between two pre-approval states (Draft and
 * Pending approval); it grants no access and is not read by any gate.
 */

// Business type options (the protected `business_type` user field, config/configUser.js).
export const BUSINESS_TYPE_LIMITED_COMPANY = 'limited_company';
export const BUSINESS_TYPE_SOLE_TRADER = 'sole_trader';
export const BUSINESS_TYPES = [BUSINESS_TYPE_LIMITED_COMPANY, BUSINESS_TYPE_SOLE_TRADER];

// privateData key for the Gate A submission timestamp.
export const BUSINESS_DETAILS_SUBMITTED_AT_KEY = 'businessDetailsSubmittedAt';

/**
 * Has this client submitted their business details for approval (screen 18)?
 *
 * @param {Object} currentUser - currentUser API entity (privateData is only present on the
 *   current user's own entity)
 * @returns {boolean}
 */
export const hasSubmittedBusinessDetails = currentUser => {
  const submittedAt =
    currentUser?.attributes?.profile?.privateData?.[BUSINESS_DETAILS_SUBMITTED_AT_KEY];
  return typeof submittedAt === 'string' && submittedAt.length > 0;
};

/**
 * Should this user be sent to the business details step? True for a client who has not yet
 * submitted it. Used for the client's landing destinations (after email verification, after
 * logging in or signing up with Google).
 *
 * @param {Object} currentUser - currentUser API entity
 * @returns {boolean}
 */
export const clientNeedsBusinessDetails = currentUser =>
  !!currentUser?.id && isClientUser(currentUser) && !hasSubmittedBusinessDetails(currentUser);
