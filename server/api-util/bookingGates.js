/**
 * server/api-util/bookingGates.js
 * ---------------------------------------------------------------------------
 * THE booking gate sequence, shared by every server route that can create a payable booking
 * request, so the routes cannot drift apart (SAFETY-CRITICAL):
 *   - server/api/initiate-privileged.js   transition/request-payment (a fresh booking request)
 *   - server/api/transition-privileged.js transition/request-payment-after-inquiry (booking
 *     after an enquiry) and any other transition in BOOKING_REQUEST_TRANSITIONS
 *
 * Order and semantics (unchanged from initiate-privileged, where they were first built):
 *   1. SAF-14 residence boundary (residenceBoundary.js). Silent, generic error. Runs for both
 *      speculative and real calls. Fails OPEN when unconfigured, CLOSED on a lookup error.
 *   2. Client gate (clientIdentityGate.js): Gate A review approval (flag ON) and SAF-03 Stripe
 *      Identity + 18+ (when configured). Speculative calls allowed. Fails OPEN when neither
 *      check is switched on, CLOSED on a lookup error.
 *   3. Provider-Verified gate (providerVerifiedGate.js). Speculative calls allowed. Fails OPEN
 *      when unconfigured, CLOSED on a lookup error.
 *   4. Minimum notice (minimumNoticeGate.js, F8 follow-up 08/11/2026): a daily booking may not
 *      start today or inside the model's min_booking_notice (listing time zone), the same rule
 *      the date picker applies. Runs for speculative and real calls. Fails CLOSED when the
 *      listing or its time zone is missing.
 * All three must run BEFORE getTrustedSdk, and coexist with Sharetribe's own native
 * email-verification / initiateTransactions permission gate.
 *
 * Inputs must be resolved SERVER-SIDE: the listing from sdk.listings.show (initiate) or from
 * the existing transaction (transition), the provider from the transaction where there is
 * one, and the customer from the caller's own session (the client gate reads currentUser).
 */

const { enforceResidenceBoundary } = require('./residenceBoundary');
const { enforceClientIdentityVerification } = require('./clientIdentityGate');
const { enforceProviderVerified } = require('./providerVerifiedGate');
const { enforceMinimumNotice } = require('./minimumNoticeGate');

// Transitions that turn an existing transaction into a payable booking request. Only these
// run the gates in transition-privileged; every other privileged transition (e.g. a provider
// offer in a negotiation process) is untouched.
//   - request-payment-after-inquiry: booking-v2 (deployed as default-booking/release-1) and
//     the stock purchase process. Privileged, so it can only be performed through our server.
//   - request-payment-to-accept-offer: stock negotiation process. Not privileged there and not
//     used by the model-profile listing type; listed so that, if it is ever routed through our
//     server, it is gated rather than silently skipped.
const BOOKING_REQUEST_TRANSITIONS = [
  'transition/request-payment-after-inquiry',
  'transition/request-payment-to-accept-offer',
];

/**
 * Whether a privileged transition creates a payable booking request from an existing
 * transaction (and must therefore pass the booking gates).
 * @param {string} transitionName
 * @returns {boolean}
 */
const isBookingRequestTransition = transitionName =>
  BOOKING_REQUEST_TRANSITIONS.includes(transitionName);

/**
 * Run every booking gate, in order. Resolves when the booking may proceed; rejects with the
 * first gate's client-facing error otherwise.
 *
 * @param {Object} params
 * @param {Object} params.sdk - the request-scoped Marketplace SDK (getSdk(req, res)); the client
 *   gate reads the caller's own currentUser from it
 * @param {Object} params.listing - the listing being booked, resolved server-side
 * @param {string} [params.providerId] - the provider's user id, resolved server-side from the
 *   existing transaction. Omitted on initiate, where the listing author is the provider.
 * @param {Object} [params.existingProtectedData] - the existing transaction's protectedData
 *   (transition only), so a location type saved at the enquiry step is still checked
 * @param {Object} params.orderData - order data from the request body
 * @param {Object} params.bodyParams - body params from the request body
 * @param {boolean} params.isSpeculative - whether this is a speculative (preview) call
 * @returns {Promise<void>}
 */
const enforceBookingGates = ({
  sdk,
  listing,
  providerId,
  existingProtectedData,
  orderData,
  bodyParams,
  isSpeculative,
}) =>
  enforceResidenceBoundary({ listing, providerId, existingProtectedData, orderData, bodyParams })
    .then(() => enforceClientIdentityVerification({ sdk, isSpeculative }))
    .then(() => enforceProviderVerified({ listing, providerId, isSpeculative }))
    .then(() => enforceMinimumNotice({ listing, orderData, bodyParams }));

module.exports = {
  enforceBookingGates,
  isBookingRequestTransition,
  BOOKING_REQUEST_TRANSITIONS,
};
