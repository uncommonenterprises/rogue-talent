// Where a model's "profile" lives right now (run-through 01/11/2026, finding 1).
//
// Used by every place that sends a model to their profile: the email-verification redirect, the
// sign-up redirect for a logged-in model, the guard on the new-profile route, and the topbar /
// mobile menu "Your profile" link. A model with a profile must never land on a blank new one.

// Import configs and util modules
import { LISTING_STATE_DRAFT } from '../../util/types';
import {
  LISTING_PAGE_PARAM_TYPE_DRAFT,
  LISTING_PAGE_PARAM_TYPE_EDIT,
  createSlug,
} from '../../util/urlHelpers';
import { isAccountStatusFlowEnabled } from '../../util/accountStatus';

// Import modules from this directory
import { PROFILE, getResumeTab } from './EditListingWizard/wizardSteps';

/**
 * Route (NamedLink / NamedRedirect props) for a model's profile:
 * - no listing: the new-profile flow ("Create your profile");
 * - a draft: that draft, at the first incomplete step, or "Review & submit" when all four steps
 *   are complete;
 * - submitted (pending approval, published or closed): the account-status page when the
 *   account-status flow is on, otherwise the "Your profile" dashboard (ManageListingsPage).
 *
 * @param {Object} params
 * @param {Object} [params.profileListing] the model's own listing (with images), or null
 * @param {Object} params.config marketplace config (listing types and fields)
 * @param {boolean} [params.flagEnabled] account-status flow flag; defaults to the env flag
 * @returns {{ name: string, params?: Object }}
 */
export const getModelProfileRoute = ({
  profileListing,
  config,
  flagEnabled = isAccountStatusFlowEnabled(),
}) => {
  const id = profileListing?.id?.uuid;
  if (!id) {
    return { name: 'NewListingPage' };
  }

  if (profileListing.attributes?.state === LISTING_STATE_DRAFT) {
    const slug = createSlug(profileListing.attributes?.title || '') || 'draft';
    return {
      name: 'EditListingPage',
      params: {
        id,
        slug,
        type: LISTING_PAGE_PARAM_TYPE_DRAFT,
        tab: getResumeTab(profileListing, config),
      },
    };
  }

  return { name: flagEnabled ? 'AccountStatusPage' : 'ManageListingsPage' };
};

/**
 * Route for a model's "Edit profile" links (tester feedback F5, part C: models have no Profile
 * settings page). Goes to the wizard's "About you" step, where the display name, city and bio
 * are edited:
 * - no listing: the new-profile flow (which starts on "About you");
 * - a draft: that draft's "About you" step;
 * - submitted (pending approval, published or closed): the edit wizard's "About you" step.
 *
 * @param {Object} params
 * @param {Object} [params.profileListing] the model's own listing, or null
 * @returns {{ name: string, params?: Object }}
 */
export const getModelEditProfileRoute = ({ profileListing } = {}) => {
  const id = profileListing?.id?.uuid;
  if (!id) {
    return { name: 'NewListingPage' };
  }
  const isDraft = profileListing.attributes?.state === LISTING_STATE_DRAFT;
  const slug = createSlug(profileListing.attributes?.title || '') || 'draft';
  return {
    name: 'EditListingPage',
    params: {
      id,
      slug,
      type: isDraft ? LISTING_PAGE_PARAM_TYPE_DRAFT : LISTING_PAGE_PARAM_TYPE_EDIT,
      tab: PROFILE,
    },
  };
};
