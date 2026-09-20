const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const log = require('../log');

// SAF-13/14 — model private-residence boundary control (silent server-side filter).
//
// A model can opt out of private-residence shoots via a single toggle in profile
// settings (SAF-13), stored in her USER privateData at:
//   privateData.safety_boundaries.no_private_residence === true
//
// SAF-14 enforces that boundary here, server-side, when a client books a shoot whose
// `location_type` is `private-residence`. The block must be SILENT: the client only ever
// sees a generic "booking not available" message and the model's boundary is NEVER
// revealed. The model's privateData is not readable by the client, nor by the customer's
// (token-exchanged) trusted SDK — only by the operator via the Integration API — so the
// lookup runs with operator credentials here on the server.

const INTEGRATION_CLIENT_ID = process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
const INTEGRATION_CLIENT_SECRET = process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;

const PRIVATE_RESIDENCE = 'private-residence';

// Client-detectable error code. The checkout renders this as a neutral, reason-free
// "not available" message (see src/util/errors.js + CheckoutPage/ErrorMessages.js).
// The code deliberately says nothing about residences or boundaries.
const BOOKING_UNAVAILABLE_CODE = 'booking-not-available';

let cachedIntegrationSdk = null;
const getIntegrationSdk = () => {
  if (!INTEGRATION_CLIENT_ID || !INTEGRATION_CLIENT_SECRET) {
    return null;
  }
  if (!cachedIntegrationSdk) {
    cachedIntegrationSdk = flexIntegrationSdk.createInstance({
      clientId: INTEGRATION_CLIENT_ID,
      clientSecret: INTEGRATION_CLIENT_SECRET,
    });
  }
  return cachedIntegrationSdk;
};

// The requested location type is captured at checkout as a customer listing field and
// lands in the order protectedData; fall back to orderData for safety.
const getRequestedLocationType = (orderData, bodyParams) => {
  const protectedData = bodyParams?.params?.protectedData || {};
  return protectedData.location_type || orderData?.location_type || null;
};

/**
 * Whether a provider's privateData opts them out of private-residence shoots.
 * @param {Object} privateData - the provider's user profile privateData
 * @returns {boolean}
 */
const providerBlocksPrivateResidence = privateData =>
  privateData?.safety_boundaries?.no_private_residence === true;

// Build the generic, reason-free error surfaced to the client.
const bookingUnavailableError = () => {
  const error = new Error('Booking is not available for the selected options.');
  error.status = 409;
  error.statusText = 'Booking not available';
  // Shaped so the client's storableError() exposes it as apiErrors with our code.
  error.data = { errors: [{ code: BOOKING_UNAVAILABLE_CODE }] };
  return error;
};

const isBookingUnavailableError = e =>
  Array.isArray(e?.data?.errors) &&
  e.data.errors.some(err => err.code === BOOKING_UNAVAILABLE_CODE);

/**
 * SAF-14 silent filter. Resolves when the booking may proceed; rejects with a generic
 * booking-unavailable error (status 409, code `booking-not-available`) when the provider
 * has opted out of private-residence shoots and this booking is a private residence.
 *
 * The model's boundary is never included in the thrown error — only the generic code.
 *
 * @param {Object} params
 * @param {Object} params.listing - the listing resource from sdk.listings.show
 * @param {Object} params.orderData - order data from the checkout request body
 * @param {Object} params.bodyParams - body params from the checkout request body
 * @returns {Promise<void>}
 */
const enforceResidenceBoundary = ({ listing, orderData, bodyParams }) => {
  const locationType = getRequestedLocationType(orderData, bodyParams);

  // Only private-residence bookings can be blocked. Every other location type — and the
  // whole non-residence booking flow — is untouched (no Integration API call at all).
  if (locationType !== PRIVATE_RESIDENCE) {
    return Promise.resolve();
  }

  const sdk = getIntegrationSdk();
  if (!sdk) {
    // Enforcement requires operator (Integration API) credentials on the server. Rather
    // than silently blocking ALL residence bookings if an env var is missing, fail OPEN
    // and log loudly so the operator knows SAF-14 is not currently active.
    log.error(
      new Error('SAF-14 residence boundary not enforced: integration credentials missing'),
      'saf14-not-enforced'
    );
    return Promise.resolve();
  }

  const providerId = listing?.relationships?.author?.data?.id?.uuid;
  if (!providerId) {
    // With creds present, an unresolved provider is anomalous. Fail CLOSED for a
    // residence booking: a boundary must not be bypassed by a lookup gap.
    log.error(new Error('SAF-14 could not resolve provider id from listing'), 'saf14-no-provider');
    return Promise.reject(bookingUnavailableError());
  }

  return sdk.users
    .show({ id: providerId })
    .then(res => {
      const privateData = res?.data?.data?.attributes?.profile?.privateData;
      if (providerBlocksPrivateResidence(privateData)) {
        // Silent block. Operator log records the enforcement (not exposed to client);
        // the thrown error carries only the generic code.
        log.error(
          new Error('SAF-14 residence booking blocked by provider boundary'),
          'saf14-blocked',
          { providerId }
        );
        return Promise.reject(bookingUnavailableError());
      }
      return undefined;
    })
    .catch(e => {
      if (isBookingUnavailableError(e)) {
        // Our own generic block — rethrow unchanged.
        throw e;
      }
      // Integration lookup failed with creds present → fail CLOSED for residence shoots
      // so an infra error can never bypass a stated boundary.
      log.error(e, 'saf14-boundary-lookup-failed', { providerId });
      throw bookingUnavailableError();
    });
};

module.exports = {
  enforceResidenceBoundary,
  providerBlocksPrivateResidence,
  isBookingUnavailableError,
  PRIVATE_RESIDENCE,
  BOOKING_UNAVAILABLE_CODE,
};
