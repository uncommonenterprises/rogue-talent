// Which settings pages a user has (tester feedback F5, part C).
//
// Models have one profile (the "Your profile" wizard and their public profile) and one
// "Account settings". They have no "Profile settings" page: their name moved to Account settings >
// Contact details, their profile picture is their cover photo, their bio lives in the wizard, and
// their private-residence boundary moved to Account settings > Safety. Clients keep Profile
// settings exactly as before.

import { isModelUser } from './accountStatus';

/**
 * Whether to offer the user the "Profile settings" page. Models never get it. While the current
 * user is still loading the answer is false, so a model never sees the link flash up; a client's
 * link appears once their user has loaded.
 *
 * @param {Object} currentUser currentUser API entity, or null while loading
 * @returns {boolean}
 */
export const showProfileSettingsForUser = currentUser =>
  !!currentUser?.id && !isModelUser(currentUser);

/**
 * Whether to offer the user the Account settings > "Safety" page (the SAF-13 private-residence
 * boundary). Models only; false while the current user is still loading.
 *
 * @param {Object} currentUser currentUser API entity, or null while loading
 * @returns {boolean}
 */
export const showSafetySettingsForUser = currentUser => isModelUser(currentUser);
