import { LISTING_STATE_PUBLISHED } from '../../util/types';
import { createSlug, LISTING_PAGE_PARAM_TYPE_EDIT } from '../../util/urlHelpers';
import { isClientUser } from '../../util/userHelpers';
import {
  ACCOUNT_STATUS_DRAFT,
  ACCOUNT_STATUS_PENDING,
  ACCOUNT_STATUS_APPROVED,
  ACCOUNT_STATUS_VERIFIED,
  ACCOUNT_STATUS_REJECTED,
  getAccountStatus,
  isAccountVerified,
  isModelUser,
} from '../../util/accountStatus';

/**
 * Account-status home (sign-up journey screens 14 to 17 for models, 19 to 21 + the client
 * variant of 17 for clients). The status itself is never computed here: it comes from
 * util/accountStatus.js getAccountStatus (the lifecycle's single source of truth). This file only
 * maps that status to a screen.
 */

export const ROLE_MODEL = 'model';
export const ROLE_CLIENT = 'client';

// Screens, one per role + status (17 has a model and a client variant).
export const SCREEN_MODEL_PENDING = 'model-pending'; // 14
export const SCREEN_MODEL_APPROVED = 'model-approved'; // 15
export const SCREEN_MODEL_VERIFIED = 'model-verified'; // 16
export const SCREEN_MODEL_REJECTED = 'model-rejected'; // 17 (model)
export const SCREEN_CLIENT_PENDING = 'client-pending'; // 19
export const SCREEN_CLIENT_APPROVED = 'client-approved'; // 20
export const SCREEN_CLIENT_VERIFIED = 'client-verified'; // 21
export const SCREEN_CLIENT_REJECTED = 'client-rejected'; // 17 (client)

const SCREENS = {
  [ROLE_MODEL]: {
    [ACCOUNT_STATUS_PENDING]: SCREEN_MODEL_PENDING,
    [ACCOUNT_STATUS_APPROVED]: SCREEN_MODEL_APPROVED,
    [ACCOUNT_STATUS_VERIFIED]: SCREEN_MODEL_VERIFIED,
    [ACCOUNT_STATUS_REJECTED]: SCREEN_MODEL_REJECTED,
  },
  [ROLE_CLIENT]: {
    [ACCOUNT_STATUS_PENDING]: SCREEN_CLIENT_PENDING,
    [ACCOUNT_STATUS_APPROVED]: SCREEN_CLIENT_APPROVED,
    [ACCOUNT_STATUS_VERIFIED]: SCREEN_CLIENT_VERIFIED,
    [ACCOUNT_STATUS_REJECTED]: SCREEN_CLIENT_REJECTED,
  },
};

// Where each role goes while the account-status flag is OFF (today's destinations, unchanged):
// models to their "Your profile" dashboard, clients to Browse models.
const FLAG_OFF_DESTINATION = {
  [ROLE_MODEL]: 'ManageListingsPage',
  [ROLE_CLIENT]: 'SearchPage',
};

// Draft has no status screen: the account hasn't been submitted yet, so the next step is to
// finish the submission. Models go to their "Your profile" dashboard (their draft profile and
// the link to continue it), clients to the business details step (screen 18).
const DRAFT_DESTINATION = {
  [ROLE_MODEL]: 'ManageListingsPage',
  [ROLE_CLIENT]: 'BusinessDetailsPage',
};

/**
 * Which view the account-status page shows.
 *
 * @param {Object} params
 * @param {boolean} params.flagEnabled - isAccountStatusFlowEnabled()
 * @param {Object} [params.currentUser] - currentUser API entity (with stripeAccount)
 * @param {Object} [params.ownListing] - the model's own profile listing (null if none)
 * @param {boolean} [params.ownListingFetched] - has the own-listing query finished?
 * @returns {{ kind: 'loading' } |
 *   { kind: 'redirect', name: string } |
 *   { kind: 'screen', screen: string, role: string, status: string, verified: boolean }}
 */
export const getStatusView = ({ flagEnabled, currentUser, ownListing, ownListingFetched }) => {
  if (!currentUser?.id) {
    return { kind: 'loading' };
  }

  const role = isModelUser(currentUser)
    ? ROLE_MODEL
    : isClientUser(currentUser)
    ? ROLE_CLIENT
    : null;

  if (!role) {
    return { kind: 'redirect', name: 'LandingPage' };
  }

  // Dormant lifecycle: with the flag off this page is inactive and only forwards to the
  // destinations people get today.
  if (!flagEnabled) {
    return { kind: 'redirect', name: FLAG_OFF_DESTINATION[role] };
  }

  // A model's submission signal is their listing state: wait for it rather than briefly
  // treating a submitted model as Draft.
  if (role === ROLE_MODEL && !ownListingFetched) {
    return { kind: 'loading' };
  }

  const status = getAccountStatus({ currentUser, ownListing });
  if (status === ACCOUNT_STATUS_DRAFT) {
    return { kind: 'redirect', name: DRAFT_DESTINATION[role] };
  }

  return {
    kind: 'screen',
    screen: SCREENS[role][status],
    role,
    status,
    // Gate B, for the "verified while waiting" (banked) tracker state on screens 14 and 19.
    verified: isAccountVerified({ currentUser }),
  };
};

// ---- Progress tracker (screens 14 and 19) --------------------------------------------------

export const TRACKER_DONE = 'done';
export const TRACKER_CURRENT = 'current';
export const TRACKER_TODO = 'todo';

/**
 * The four tracker steps while Pending approval: 1 Submitted (done), 2 Review (current, "In
 * progress"), 3 Verify (done if verification is already banked, else to do), 4 Live / Ready to
 * book (to do).
 *
 * @param {Object} params
 * @param {string} params.role - 'model' | 'client'
 * @param {boolean} params.verified - Gate B already complete (banked)
 * @returns {Array<{ key: string, labelId: string, state: 'done'|'current'|'todo' }>}
 */
export const getPendingTrackerSteps = ({ role, verified }) => {
  const prefix = `AccountStatusPage.tracker.${role}`;
  return [
    { key: 'submitted', labelId: `${prefix}.submitted`, state: TRACKER_DONE },
    { key: 'review', labelId: `${prefix}.review`, state: TRACKER_CURRENT },
    { key: 'verify', labelId: `${prefix}.verify`, state: verified ? TRACKER_DONE : TRACKER_TODO },
    { key: 'ready', labelId: `${prefix}.ready`, state: TRACKER_TODO },
  ];
};

// ---- Screen 17: the reviewer note ------------------------------------------------------------

/**
 * The operator-set note shown on the "Not approved" screen: the user's profile metadata key
 * `rejectionReason` (a plain string), set in Sharetribe Console on the user's extended data
 * (Metadata) or via the Integration API. Only the operator can write metadata, so the user can't
 * change it. Note: metadata is readable by anyone who can see the user, not just the user.
 */
export const REJECTION_REASON_METADATA_KEY = 'rejectionReason';

/**
 * The reviewer note, or null when the operator didn't leave one (the screen then shows the
 * fallback line).
 *
 * @param {Object} currentUser - currentUser API entity
 * @returns {string|null}
 */
export const getRejectionReason = currentUser => {
  const reason = currentUser?.attributes?.profile?.metadata?.[REJECTION_REASON_METADATA_KEY];
  return typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null;
};

// ---- Model profile links -------------------------------------------------------------------

/**
 * NamedLink props for the model's public profile page (their listing).
 * @param {Object} ownListing
 * @returns {{ name: string, params: Object }|null}
 */
export const getProfileLinkProps = ownListing => {
  const id = ownListing?.id?.uuid;
  if (!id) {
    return null;
  }
  const slug = createSlug(ownListing.attributes?.title || '') || 'profile';
  return { name: 'ListingPage', params: { id, slug } };
};

/**
 * NamedLink props for a tab of the model's profile editor (e.g. 'availability' = "Your
 * calendar", 'profile' = "About you"). Without a listing, "Create your profile".
 *
 * @param {Object} ownListing
 * @param {string} tab
 * @returns {{ name: string, params?: Object }}
 */
export const getEditProfileLinkProps = (ownListing, tab) => {
  const id = ownListing?.id?.uuid;
  if (!id) {
    return { name: 'NewListingPage' };
  }
  const slug = createSlug(ownListing.attributes?.title || '') || 'profile';
  return {
    name: 'EditListingPage',
    params: { id, slug, type: LISTING_PAGE_PARAM_TYPE_EDIT, tab },
  };
};

/**
 * Is the model's profile actually published (visible in search)? The status can read Verified a
 * moment before the reconcile publishes the listing, so screen 16 only says "You're live" once
 * it is.
 *
 * @param {Object} ownListing
 * @returns {boolean}
 */
export const isProfilePublished = ownListing =>
  ownListing?.attributes?.state === LISTING_STATE_PUBLISHED;
