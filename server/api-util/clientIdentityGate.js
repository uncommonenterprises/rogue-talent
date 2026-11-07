/**
 * server/api-util/clientIdentityGate.js
 * ---------------------------------------------------------------------------
 * SAF-03 — Server-side booking gate: a CLIENT (customer) must be identity-verified
 * (via Stripe Identity — see stripeIdentity.js) before a REAL booking can initiate.
 *
 * This is the authoritative, un-bypassable check. It runs inside the privileged
 * booking chokepoints (server/api/initiate-privileged.js, and transition-privileged.js for a
 * booking after an enquiry; sequence in api-util/bookingGates.js) ALONGSIDE:
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
 *
 * GATE A, REVIEW APPROVAL (amendment 30/09/2026, SAFETY-CRITICAL): when the account-status
 * flag is ON (REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED === 'true'), a client must ALSO have
 * passed manual review: user state 'active' AND the operator-set metadata
 * reviewDecision === 'approved' (api-util/reviewDecision.js). Otherwise the real initiate is
 * refused with code `account-approval-required` (the checkout links to the account-status
 * page). This check is independent of the Stripe configuration: it needs only the client's
 * own currentUser. With the flag OFF it does not run, so behaviour is unchanged.
 * So, with both switches on, a client can book only when approved + identity-verified; and
 * `identity_verified` is only ever written true together with a passed 18+ check on the
 * verified ID (stripeIdentity.writeIdentityVerifiedFlag), so the 18+ input is unchanged.
 *
 * WHO IS GATED (07/11/2026, SAFETY): whoever is booking as the customer, i.e. the caller's own
 * currentUser. The account's profile publicData.userType is user-writable, so it must never
 * EXEMPT anyone from the gate: a client who sets userType to 'model' or to anything else is
 * still gated in full. userType may only ever ADD a refusal: an account that says it is a
 * model is refused outright with `client-account-required` ("Only client accounts can book
 * models", the same wording the booking panel shows). A model who rewrites their userType to
 * 'client' then meets the full client gate (approval + identity + 18+), like any client.
 */

const stripeIdentity = require('./stripeIdentity');
const {
  isAccountStatusFlowEnabled,
  isUserGateAPassed,
  getReviewDecision,
} = require('./reviewDecision');
const log = require('../log');

// Client-detectable error code surfaced at checkout as a "verify your identity"
// message with a link to the verification flow (see src/util/errors.js +
// CheckoutPage/ErrorMessages.js).
const IDENTITY_VERIFICATION_REQUIRED_CODE = 'identity-verification-required';

// Client-detectable error code for a client who has not passed manual review (Gate A). The
// checkout shows "your account needs to be approved" with a link to the account-status page
// (see src/util/errors.js isAccountApprovalRequiredError + CheckoutPage/ErrorMessages.js).
const ACCOUNT_APPROVAL_REQUIRED_CODE = 'account-approval-required';

// Client-detectable error code for a model account trying to book as a customer. The checkout
// shows "Only client accounts can book models." (see src/util/errors.js
// isClientAccountRequiredError + CheckoutPage/ErrorMessages.js).
const CLIENT_ACCOUNT_REQUIRED_CODE = 'client-account-required';

// Models are the sellers here and cannot book. Used ONLY to refuse, never to exempt: the value
// is user-writable (see the module header).
const MODEL_USER_TYPE = 'model';

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

const approvalRequiredError = () => {
  const error = new Error('Your account needs to be approved before booking.');
  error.status = 403;
  error.statusText = 'Account approval required';
  error.data = { errors: [{ code: ACCOUNT_APPROVAL_REQUIRED_CODE }] };
  return error;
};

const isApprovalRequiredError = e =>
  Array.isArray(e?.data?.errors) &&
  e.data.errors.some(err => err.code === ACCOUNT_APPROVAL_REQUIRED_CODE);

const clientAccountRequiredError = () => {
  const error = new Error('Only client accounts can book models.');
  error.status = 403;
  error.statusText = 'Client account required';
  error.data = { errors: [{ code: CLIENT_ACCOUNT_REQUIRED_CODE }] };
  return error;
};

const isClientAccountRequiredError = e =>
  Array.isArray(e?.data?.errors) &&
  e.data.errors.some(err => err.code === CLIENT_ACCOUNT_REQUIRED_CODE);

/**
 * Enforce the client booking gate before a real booking initiate: review approval (Gate A,
 * flag ON only) and identity verification (SAF-03, when configured).
 * Resolves when the booking may proceed; rejects with a client-facing 403 when an active
 * check fails: code `client-account-required` (a model account), `account-approval-required`
 * (not approved; checked before identity, since approval is the next step) or
 * `identity-verification-required` (not identity-verified).
 * Applies to the caller (the customer), whatever their self-set publicData.userType says.
 *
 * @param {Object} params
 * @param {Object} params.sdk - a request-scoped Marketplace SDK (getSdk(req,res))
 * @param {boolean} params.isSpeculative - whether this is a speculative (preview) call
 * @returns {Promise<void>}
 */
const enforceClientIdentityVerification = ({ sdk, isSpeculative }) => {
  // Never block a price preview.
  if (isSpeculative) {
    return Promise.resolve();
  }

  // Each check stays behind its own existing switch.
  const identityGateOn = stripeIdentity.isConfigured();
  const approvalGateOn = isAccountStatusFlowEnabled();

  if (!identityGateOn) {
    // Fail OPEN and log loudly (mirrors SAF-14) so the operator knows SAF-03 is not
    // currently active. Do NOT block bookings before Neil provisions the keys.
    log.error(
      new Error('SAF-03 identity gate not enforced: STRIPE_SECRET_KEY missing'),
      'saf03-not-enforced'
    );
  }
  if (!identityGateOn && !approvalGateOn) {
    // Neither check is switched on: unchanged pre-amendment behaviour.
    return Promise.resolve();
  }

  return sdk.currentUser
    .show()
    .then(res => {
      const user = res?.data?.data;
      const userType = user?.attributes?.profile?.publicData?.userType;

      // Whoever books as the customer is gated, whatever userType says (it is user-writable,
      // so it can never exempt anyone). A self-declared model is refused outright: models
      // cannot book. Every other value (client, missing, or anything else) gets the full gate.
      if (userType === MODEL_USER_TYPE) {
        log.error(
          new Error('Booking blocked: a model account tried to book as a customer'),
          'client-gate-model-account-blocked',
          { userId: user?.id?.uuid }
        );
        return Promise.reject(clientAccountRequiredError());
      }

      // Gate A (flag ON only): the client must be active AND review-approved by the
      // operator. A Stripe-identity-verified client without an approved decision is refused.
      if (approvalGateOn && !isUserGateAPassed(user, { flowEnabled: true })) {
        log.error(
          new Error('Client booking blocked: account not review-approved (Gate A)'),
          'client-approval-blocked',
          { userId: user?.id?.uuid, reviewDecision: getReviewDecision(user) }
        );
        return Promise.reject(approvalRequiredError());
      }

      if (!identityGateOn || stripeIdentity.isUserIdentityVerified(user)) {
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
      if (
        isIdentityRequiredError(e) ||
        isApprovalRequiredError(e) ||
        isClientAccountRequiredError(e)
      ) {
        // Our own block — rethrow unchanged.
        throw e;
      }
      // Could not resolve the current user with a check switched on. Fail CLOSED:
      // a safety/identity gate must not be bypassed by a lookup gap.
      log.error(e, 'saf03-identity-lookup-failed');
      throw identityGateOn ? identityRequiredError() : approvalRequiredError();
    });
};

module.exports = {
  enforceClientIdentityVerification,
  isIdentityRequiredError,
  isApprovalRequiredError,
  isClientAccountRequiredError,
  IDENTITY_VERIFICATION_REQUIRED_CODE,
  ACCOUNT_APPROVAL_REQUIRED_CODE,
  CLIENT_ACCOUNT_REQUIRED_CODE,
};
