/**
 * This file contains server side endpoints that can be used to perform backend
 * tasks that can not be handled in the browser.
 *
 * The endpoints should not clash with the application routes. Therefore, the
 * endpoints are prefixed in the main server where this file is used.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { deserialize } = require('./api-util/sdk');

const initiateLoginAs = require('./api/initiate-login-as');
const loginAs = require('./api/login-as');
const transactionLineItems = require('./api/transaction-line-items');
const initiatePrivileged = require('./api/initiate-privileged');
const transitionPrivileged = require('./api/transition-privileged');
const deleteAccount = require('./api/delete-account');
const safetyReport = require('./api/safety-report');
const createIdentitySession = require('./api/create-identity-session');
const reconcileOwnListing = require('./api/reconcile-own-listing');
const verifyNudge = require('./api/verify-nudge');

const createUserWithIdp = require('./api/auth/createUserWithIdp');

const { authenticateFacebook, authenticateFacebookCallback } = require('./api/auth/facebook');
const { authenticateGoogle, authenticateGoogleCallback } = require('./api/auth/google');

const router = express.Router();

// ================ API router middleware: ================ //

// Parse Transit body first to a string
router.use(
  bodyParser.text({
    type: 'application/transit+json',
  })
);

// Deserialize Transit body string to JS data
router.use((req, res, next) => {
  if (req.get('Content-Type') === 'application/transit+json' && typeof req.body === 'string') {
    try {
      req.body = deserialize(req.body);
    } catch (e) {
      console.error('Failed to parse request body as Transit:');
      console.error(e);
      res.status(400).send('Invalid Transit in request body.');
      return;
    }
  }
  next();
});

// ================ API router endpoints: ================ //

router.get('/initiate-login-as', initiateLoginAs);
router.get('/login-as', loginAs);
router.post('/transaction-line-items', transactionLineItems);
router.post('/initiate-privileged', initiatePrivileged);
router.post('/transition-privileged', transitionPrivileged);
router.post('/delete-account', deleteAccount);

// SAF-29: in-app safety concern report (separate from the booking dispute flow).
router.post('/safety-report', safetyReport);

// SAF-03: create a Stripe Identity VerificationSession for the logged-in client.
// (The paired webhook — /api/stripe-identity-webhook — is mounted at the app level
// in server/index.js because it needs a raw request body for signature verification.)
router.post('/create-identity-session', createIdentitySession);

// Account-status Step 2: authenticated own-session reconcile. The model's dashboard/profile
// pings this so operator approval / return-from-Stripe takes effect on next load. Fail-safe:
// never blocks the caller (see server/api/reconcile-own-listing.js).
router.post('/reconcile-own-listing', reconcileOwnListing);

// Account-status Step 4: "Approved → please verify" email nudge (lifecycle §8). A
// scheduled cron pings this with the CRON_SECRET; it sweeps Approved-unverified accounts
// (models via listing-state, clients via metadata) and sends spaced/capped Postmark
// nudges. Dormant + fail-safe until provisioned (see server/api/verify-nudge.js).
router.post('/cron/verify-nudge', verifyNudge);

// Create user with identity provider (e.g. Facebook or Google)
// This endpoint is called to create a new user after user has confirmed
// they want to continue with the data fetched from IdP (e.g. name and email)
router.post('/auth/create-user-with-idp', createUserWithIdp);

// Facebook authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Facebook
router.get('/auth/facebook', authenticateFacebook);

// This is the route for callback URL the user is redirected after authenticating
// with Facebook. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/facebook/callback', authenticateFacebookCallback);

// Google authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Google
router.get('/auth/google', authenticateGoogle);

// This is the route for callback URL the user is redirected after authenticating
// with Google. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/google/callback', authenticateGoogleCallback);

module.exports = router;
