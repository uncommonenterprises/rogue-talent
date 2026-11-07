// SAF-13: a model's private-residence boundary (tester feedback F5, part C moved it from Profile
// settings to Account settings > Safety, unchanged).
//
// The boundary lives in the model's USER privateData, so clients can never read it. It is
// enforced silently server-side by SAF-14 (server/api-util/residenceBoundary.js), which reads
// exactly `privateData.safety_boundaries.no_private_residence === true`. These helpers must keep
// producing that same shape: do not rename or restructure the keys without changing the server.

/**
 * Whether the model has the private-residence boundary switched on. privateData is readable by
 * its owner, i.e. the current user.
 *
 * @param {Object} currentUser currentUser API entity
 * @returns {boolean}
 */
export const hasNoPrivateResidenceBoundary = currentUser =>
  currentUser?.attributes?.profile?.privateData?.safety_boundaries?.no_private_residence === true;

/**
 * The updateProfile payload saving the boundary. Identical to what Profile settings sent before
 * the move: the whole `safety_boundaries` object, with `no_private_residence` as a real boolean
 * (only an explicit `true` switches it on).
 *
 * @param {boolean} noPrivateResidence the form's checkbox value
 * @returns {Object} { privateData: { safety_boundaries: { no_private_residence } } }
 */
export const getSafetyBoundariesUpdate = noPrivateResidence => ({
  privateData: {
    safety_boundaries: {
      no_private_residence: noPrivateResidence === true,
    },
  },
});
