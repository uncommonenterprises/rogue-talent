/**
 * server/api-util/providerVerifiedGate.js
 * ---------------------------------------------------------------------------
 * Account-status Step 2 — booking gate: a model (PROVIDER) must be Verified before a
 * real booking against them can initiate. Runs inside the privileged initiate
 * chokepoint (server/api/initiate-privileged.js) ALONGSIDE the SAF-14 residence filter
 * and the SAF-03 client-identity gate; all run before getTrustedSdk.
 *
 * WHY AN EXPLICIT CHECK: today a Stripe-incomplete provider's booking fails implicitly
 * at payment (destination charges require the provider's charges_enabled), which is an
 * opaque error. This gate blocks earlier with a clean, generic "not available" message.
 *
 * WHAT THIS GATE CAN ASSERT SERVER-SIDE (and what it layers with):
 *   - Provider user.state === 'active' (Gate A) — read via the Integration API.
 *   - The listing is 'published' (visible) — the reconcile function maintains
 *     published ⟺ Verified, so a published listing is the reconcile's assertion that
 *     Gate B (Stripe) is complete too.
 *   The Integration API exposes NO Stripe-account endpoint, so this gate cannot read the
 *   provider's charges_enabled/payouts_enabled directly. Gate B is therefore enforced by
 *   two other layers: (1) the reconcile function keeping the listing hidden unless
 *   Verified, and (2) Stripe's own destination-charge requirement at capture — the
 *   ultimate money-time backstop. This gate closes the "clean early rejection" + Gate-A
 *   parts; it is defence-in-depth, not the sole Gate-B enforcement.
 *
 * FAIL-SAFE (mirrors SAF-14/SAF-03): engages only when configured (Integration creds
 * present). Unconfigured → fails OPEN (resolves) + logs loudly, so bookings are never
 * blocked on the test env before provisioning. Speculative (price preview) calls are
 * always allowed. Surfaces the existing neutral `booking-not-available` code so no new
 * client-side error plumbing is needed.
 */

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const { BOOKING_UNAVAILABLE_CODE } = require('./residenceBoundary');
const log = require('../log');

const MODEL_USER_TYPE = 'model';
const LISTING_STATE_PUBLISHED = 'published';

let cachedIntegrationSdk = null;
const getIntegrationSdk = () => {
  const clientId = process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  if (!cachedIntegrationSdk) {
    cachedIntegrationSdk = flexIntegrationSdk.createInstance({ clientId, clientSecret });
  }
  return cachedIntegrationSdk;
};

// Reuse the existing neutral "not available" code so the checkout renders the same
// reason-free message (see src/util/errors.js + CheckoutPage/ErrorMessages.js).
const providerUnavailableError = () => {
  const error = new Error('Booking is not available for the selected options.');
  error.status = 409;
  error.statusText = 'Booking not available';
  error.data = { errors: [{ code: BOOKING_UNAVAILABLE_CODE }] };
  return error;
};

const isProviderUnavailableError = e =>
  Array.isArray(e?.data?.errors) &&
  e.data.errors.some(err => err.code === BOOKING_UNAVAILABLE_CODE);

/**
 * Enforce that a booking's provider (model) is Verified before a real initiate.
 * Resolves when the booking may proceed; rejects with a neutral booking-not-available
 * error (409) when a configured feature finds the provider not Verified.
 *
 * @param {Object} params
 * @param {Object} params.listing - the listing resource (from sdk.listings.show)
 * @param {boolean} params.isSpeculative - whether this is a speculative (preview) call
 * @returns {Promise<void>}
 */
const enforceProviderVerified = ({ listing, isSpeculative }) => {
  // Never block a price preview.
  if (isSpeculative) {
    return Promise.resolve();
  }

  const sdk = getIntegrationSdk();
  if (!sdk) {
    // Fail OPEN + loud log (mirrors SAF-14) so the operator knows the gate is not active.
    log.error(
      new Error('Provider-Verified gate not enforced: Integration credentials missing'),
      'provider-verified-not-enforced'
    );
    return Promise.resolve();
  }

  // Defensive: a booking should only reach here for a visible (published) listing. If the
  // listing is not published, treat it as unavailable rather than trusting a stale fetch.
  const listingState = listing?.attributes?.state;
  if (listingState && listingState !== LISTING_STATE_PUBLISHED) {
    log.error(
      new Error('Provider-Verified gate blocked: listing not published'),
      'provider-verified-blocked-listing-state',
      { listingState }
    );
    return Promise.reject(providerUnavailableError());
  }

  const providerId = listing?.relationships?.author?.data?.id?.uuid;
  if (!providerId) {
    // With creds present, an unresolved provider is anomalous. Fail CLOSED: a safety gate
    // must not be bypassed by a lookup gap.
    log.error(
      new Error('Provider-Verified gate could not resolve provider id from listing'),
      'provider-verified-no-provider'
    );
    return Promise.reject(providerUnavailableError());
  }

  return sdk.users
    .show({ id: providerId })
    .then(res => {
      const user = res?.data?.data;
      const userState = user?.attributes?.state;
      const userType = user?.attributes?.profile?.publicData?.userType;

      // Only gate models (providers). If the author is not a model, do not invent a block.
      if (userType && userType !== MODEL_USER_TYPE) {
        return undefined;
      }

      // Gate A: provider must be active. (Gate B / Stripe is enforced by reconcile keeping
      // the listing hidden unless Verified, and by Stripe at capture — see module header.)
      if (userState === 'active') {
        return undefined;
      }

      log.error(
        new Error('Provider-Verified gate blocked: provider not active'),
        'provider-verified-blocked',
        { providerId, userState }
      );
      return Promise.reject(providerUnavailableError());
    })
    .catch(e => {
      if (isProviderUnavailableError(e)) {
        // Our own block — rethrow unchanged.
        throw e;
      }
      // Lookup failed with creds present → fail CLOSED so an infra error cannot bypass the gate.
      log.error(e, 'provider-verified-lookup-failed', { providerId });
      throw providerUnavailableError();
    });
};

module.exports = {
  enforceProviderVerified,
  isProviderUnavailableError,
};
