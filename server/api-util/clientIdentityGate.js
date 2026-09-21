/**
 * server/api-util/clientIdentityGate.js
 * ---------------------------------------------------------------------------
 * SAF-03 — Server-side booking gate: a CLIENT (customer) must be identity-verified
 * (via Stripe Identity — see stripeIdentity.js) before a REAL booking can initiate.
 *
 * This is the authoritative, un-bypassable check. It runs inside the privileged
 * initiate chokepoint (server/api/initiate-privileged.js) ALONGSIDE:
 *   - Sharetribe's own email-verification / `initiateTransactions` permission gate
 *     (enforced natively during the trusted initiate), and
 *   - SAF-14's residence-boundary filter (enforceResidenceBoundary).
 * All three coexist and run before getTrustedSdk.
 *
 * FAIL-SAFE (mirrors SAF-14): the gate only engages when the feature is CONFIGURED
 * (STRIPE_SECRET_KEY present). When unconfigured — the default until Neil provisions —
 * it fails OPEN (resolves) and logs loudly, so it never blocks bookings on the test
 * env before provisioning. Speculative calls (price previews) are always allowed so
 * the checkout/listing price still renders; only the real initiate is gated.
 */

const stripeIdentity = require('./stripeIdentity');
const log = require('../log');

// Client-detectable error code surfaced at checkout as a "verify your identity"
// message with a link to the verification flow (see src/util/errors.js +
// CheckoutPage/ErrorMessages.js).
const IDENTITY_VERIFICATION_REQUIRED_CODE = 'identity-verification-required';

// Only gate the buyer role. Providers (models) are the sellers here; they are
// ID-verified via Stripe Connect, not this flow.
const CLIENT_USER_TYPE = 'client';

const identityRequiredError = () => {
  const error = new Error('Please verify your identity before booking.');
  error.status = 403;
  error.statusText = 'Identity verification required';
  // Shaped so the client's storableError() exposes it as apiErrors with our code.
  error.data = { errors: [{ code: IDENTITY_VERIFICATION_REQUIRED_CODE }] };
  return error;
};

const isIdentityRequiredError = e =>
  Array.isArray(e?.data?.errors) &&
  e.data.errors.some(err => err.code === IDENTITY_VERIFICATION_REQUIRED_CODE);

/**
 * Enforce client identity verification before a real booking initiate.
 * Resolves when the booking may proceed; rejects with a client-facing
 * identity-required error (403, code `identity-verification-required`) when a
 * configured feature finds the requesting client unverified.
 *
 * @param {Object} params
 * @param {Object} params.sdk - a request-scoped Marketplace SDK (getSdk(req,res))
 * @param {boolean} params.isSpeculative - whether this is a speculative (preview) call
 * @returns {Promise<void>}
 */
const enforceClientIdentityVerification = ({ sdk, isSpeculative }) => {
  // Never block a price preview, and never engage when the feature is unconfigured.
  if (isSpeculative) {
    return Promise.resolve();
  }
  if (!stripeIdentity.isConfigured()) {
    // Fail OPEN and log loudly (mirrors SAF-14) so the operator knows SAF-03 is not
    // currently active. Do NOT block bookings before Neil provisions the keys.
    log.error(
      new Error('SAF-03 identity gate not enforced: STRIPE_SECRET_KEY missing'),
      'saf03-not-enforced'
    );
    return Promise.resolve();
  }

  return sdk.currentUser
    .show()
    .then(res => {
      const user = res?.data?.data;
      const userType = user?.attributes?.profile?.publicData?.userType;

      // Only clients (buyers) are gated. If we cannot resolve a client, do not
      // invent a block — providers/edge roles fall through to the native gates.
      if (userType && userType !== CLIENT_USER_TYPE) {
        return undefined;
      }

      if (stripeIdentity.isUserIdentityVerified(user)) {
        return undefined;
      }

      // Operator log records the enforcement (not exposed to the client).
      log.error(
        new Error('SAF-03 booking blocked: client not identity-verified'),
        'saf03-blocked',
        { userId: user?.id?.uuid }
      );
      return Promise.reject(identityRequiredError());
    })
    .catch(e => {
      if (isIdentityRequiredError(e)) {
        // Our own block — rethrow unchanged.
        throw e;
      }
      // Could not resolve the current user with the feature configured. Fail CLOSED:
      // a safety/identity gate must not be bypassed by a lookup gap.
      log.error(e, 'saf03-identity-lookup-failed');
      throw identityRequiredError();
    });
};

module.exports = {
  enforceClientIdentityVerification,
  isIdentityRequiredError,
  IDENTITY_VERIFICATION_REQUIRED_CODE,
};
