/**
 * server/api-util/reviewProfile.js
 * ---------------------------------------------------------------------------
 * Review tool (stage 1, READ-ONLY): what the review page shows for one person (R02 model, R04
 * client). See docs/specs/review-tool-spike.md §6.
 *
 * The Marketplace API cannot show a pendingApproval or closed listing to anyone but its author,
 * so the server reads it through the Integration API (any state, images included) and returns an
 * ALLOW-LISTED copy. Integration API responses include the user's email, privateData,
 * protectedData and the listing's privateData; none of that is forwarded except the few
 * business fields R04 needs to check a client. Never forwarded: email, phone numbers
 * (business_phone, phoneNumber), date of birth, Stripe details beyond status words, identity
 * session ids, the decline note.
 *
 * Model payload: the listing as clients will see it (title, description, public listing fields
 * except internal stamps, price, images as variant URLs), the author's display name and bio, and
 * the review panel facts (decision, submitted date, Stripe identity + bank words, resubmission).
 * Client payload: name, company, company number, business type, industry, website, business
 * address, identity + 18+ flags, current transaction rights, sign-up and submission dates.
 *
 * Anything not reviewable (unknown id, banned or deleted, staff, a model with only a draft, a
 * client who has not submitted) resolves to { kind: 'not-waiting' } (R07 state 4). Only callers
 * who have already passed the reviewer check ever reach this module.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test). Reads only.
 */

const { getReviewDecision } = require('./reviewDecision');
const { isStaffUser } = require('./reviewerRoles');
const { isOverdue } = require('./workingDays');
const { getStripeAccountStatus } = require('./stripeConnectStatus');
const {
  MODEL_LISTING_TYPE,
  SUBMITTED_LISTING_STATES,
  isBlockedUser,
  isResubmission,
  getModelSubmittedAt,
  getClientSubmittedAt,
  hasSubmittedBusinessDetails,
  getClientIdentityStatus,
  getFullName,
  getInitials,
  indexIncluded,
  getStripeAccountIdFor,
} = require('./reviewQueue');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IMAGE_VARIANTS = ['scaled-small', 'scaled-medium', 'scaled-large', 'scaled-xlarge'];

// Listing publicData keys that are internal stamps, not profile content.
const INTERNAL_LISTING_PUBLIC_DATA_KEYS = ['stripeAccountId'];

const NOT_WAITING = Object.freeze({ kind: 'not-waiting' });

const PERMISSION_ALLOW = 'permission/allow';
const PERMISSION_DENY = 'permission/deny';

/**
 * Is this a well-formed Sharetribe user id? Anything else is answered without an API call.
 * @param {string} userId
 * @returns {boolean}
 */
const isValidUserId = userId => typeof userId === 'string' && UUID_PATTERN.test(userId);

const stringOrNull = value => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * An image reduced to its id and variant URLs/sizes.
 * @param {Object} image - Integration API image resource
 * @returns {Object|null}
 */
const pickImage = image => {
  const id = image?.id?.uuid;
  const variants = image?.attributes?.variants || {};
  if (!id) {
    return null;
  }
  const picked = {};
  Object.keys(variants).forEach(name => {
    const v = variants[name];
    if (v && typeof v.url === 'string') {
      picked[name] = { name, url: v.url, width: v.width, height: v.height };
    }
  });
  return { id, variants: picked };
};

/**
 * Listing publicData without internal stamps. The rest is public profile content by design.
 * @param {Object} publicData
 * @returns {Object}
 */
const pickListingPublicData = publicData => {
  const result = {};
  Object.keys(publicData || {}).forEach(key => {
    if (!INTERNAL_LISTING_PUBLIC_DATA_KEYS.includes(key)) {
      result[key] = publicData[key];
    }
  });
  return result;
};

const pickPrice = price =>
  price && typeof price.amount === 'number' && typeof price.currency === 'string'
    ? { amount: price.amount, currency: price.currency }
    : null;

const reviewStatus = user => {
  const decision = getReviewDecision(user);
  return { decision, waiting: decision === null };
};

const accountFacts = user => ({
  createdAt: user?.attributes?.createdAt ? new Date(user.attributes.createdAt).toISOString() : null,
  emailVerified: user?.attributes?.emailVerified === true,
});

/**
 * The model review payload (R02). Pure.
 *
 * @param {Object} params
 * @param {Object} params.user - Integration API user
 * @param {Object} params.listing - the model-profile listing
 * @param {Array<Object>} params.images - the listing's image resources, in listing order
 * @param {{identity: string, bank: string}} params.stripeStatus
 * @param {Date} params.now
 * @returns {Object}
 */
const buildModelReviewPayload = ({ user, listing, images, stripeStatus, now }) => {
  const attrs = listing?.attributes || {};
  const profile = user?.attributes?.profile || {};
  const { submittedAt, submittedAtSource } = getModelSubmittedAt(listing, user);
  const title = stringOrNull(attrs.title) || getFullName(user);
  return {
    kind: 'model',
    userId: user?.id?.uuid,
    status: reviewStatus(user),
    submittedAt,
    submittedAtSource,
    overdue: submittedAt ? isOverdue(submittedAt, now) : false,
    resubmission: isResubmission({ user, listing }),
    stripe: { identity: stripeStatus?.identity, bank: stripeStatus?.bank },
    listing: {
      id: listing?.id?.uuid,
      state: attrs.state,
      title,
      description: stringOrNull(attrs.description),
      price: pickPrice(attrs.price),
      publicData: pickListingPublicData(attrs.publicData),
      images: (images || []).map(pickImage).filter(Boolean),
    },
    author: {
      displayName: stringOrNull(profile.displayName),
      bio: stringOrNull(profile.bio),
    },
    account: accountFacts(user),
  };
};

/**
 * Current transaction rights from the effectivePermissionSet relationship.
 * @param {Object} permissionSet
 * @returns {'allowed'|'denied'|'unknown'}
 */
const getTransactionRights = permissionSet => {
  const value = permissionSet?.attributes?.initiateTransactions;
  return value === PERMISSION_ALLOW ? 'allowed' : value === PERMISSION_DENY ? 'denied' : 'unknown';
};

/**
 * The client review payload (R04). Pure. No email, phone or date of birth.
 *
 * @param {Object} params
 * @param {Object} params.user - Integration API user
 * @param {Object} [params.permissionSet] - the included effectivePermissionSet
 * @param {Date} params.now
 * @returns {Object}
 */
const buildClientReviewPayload = ({ user, permissionSet, now }) => {
  const profile = user?.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const protectedData = profile.protectedData || {};
  const privateData = profile.privateData || {};
  const metadata = profile.metadata || {};
  const { submittedAt, submittedAtSource } = getClientSubmittedAt(user);
  const name = getFullName(user);
  return {
    kind: 'client',
    userId: user?.id?.uuid,
    status: reviewStatus(user),
    submittedAt,
    submittedAtSource,
    overdue: submittedAt ? isOverdue(submittedAt, now) : false,
    resubmission: isResubmission({ user }),
    person: { name, initials: getInitials(name) },
    business: {
      businessType: stringOrNull(protectedData.business_type),
      companyName: stringOrNull(publicData.company_name),
      companyNumber: stringOrNull(publicData.company_registration_number),
      industry: stringOrNull(publicData.industry),
      website: stringOrNull(publicData.client_website_url),
      address: stringOrNull(privateData.business_address),
    },
    identity: {
      status: getClientIdentityStatus(user),
      verified18Plus: metadata.age_verified_18plus === true,
      ageCheckFailed: metadata.age_check_failed === true,
      declared18Plus: protectedData.ageConfirmed18Plus === true,
    },
    transactionRights: getTransactionRights(permissionSet),
    account: accountFacts(user),
  };
};

const pickSubmittedModelListing = listings => {
  const candidates = (listings || []).filter(
    l =>
      l?.attributes?.publicData?.listingType === MODEL_LISTING_TYPE &&
      SUBMITTED_LISTING_STATES.includes(l?.attributes?.state)
  );
  // Prefer the one waiting for approval, then closed, then published (as the queue does).
  const order = state => SUBMITTED_LISTING_STATES.indexOf(state);
  return (
    candidates.sort((a, b) => order(a.attributes.state) - order(b.attributes.state))[0] || null
  );
};

const isNotFound = e => (e?.status || e?.statusCode) === 404;

/**
 * Load one person for the review page. Reads only, one call at a time. Resolves with a payload
 * ({ kind: 'model' | 'client' | 'not-waiting' }); rejects on other Integration API errors
 * (429 included) for the endpoint to report.
 *
 * @param {Object} params
 * @param {Object} params.integrationSdk
 * @param {string} params.userId
 * @param {Function} [params.getStripeStatus]
 * @param {Function} [params.now] - () => Date
 * @returns {Promise<Object>}
 */
const loadReviewProfile = ({
  integrationSdk,
  userId,
  getStripeStatus = getStripeAccountStatus,
  now = () => new Date(),
}) => {
  if (!isValidUserId(userId)) {
    return Promise.resolve(NOT_WAITING);
  }
  return integrationSdk.users
    .show({ id: userId, include: ['effectivePermissionSet', 'stripeAccount'] })
    .catch(e => {
      if (isNotFound(e)) {
        return null;
      }
      throw e;
    })
    .then(userRes => {
      const user = userRes?.data?.data;
      if (!user || isBlockedUser(user) || isStaffUser(user)) {
        return NOT_WAITING;
      }
      const userIncluded = indexIncluded(userRes?.data?.included);
      return integrationSdk.listings
        .query({
          authorId: userId,
          include: ['images'],
          'fields.image': IMAGE_VARIANTS.map(v => `variants.${v}`),
        })
        .then(listingRes => {
          const listing = pickSubmittedModelListing(listingRes?.data?.data);
          if (listing) {
            const listingIncluded = indexIncluded(listingRes?.data?.included);
            const images = (listing.relationships?.images?.data || [])
              .map(ref => listingIncluded.get(`image/${ref?.id?.uuid}`))
              .filter(Boolean);
            const stripeAccountId = getStripeAccountIdFor(user, userIncluded, listing);
            return getStripeStatus(stripeAccountId).then(stripeStatus =>
              buildModelReviewPayload({ user, listing, images, stripeStatus, now: now() })
            );
          }
          const isClient = user.attributes?.profile?.publicData?.userType === 'client';
          if (isClient && hasSubmittedBusinessDetails(user)) {
            const permissionSetId = user.relationships?.effectivePermissionSet?.data?.id?.uuid;
            const permissionSet = permissionSetId
              ? userIncluded.get(`permissionSet/${permissionSetId}`)
              : null;
            return buildClientReviewPayload({ user, permissionSet, now: now() });
          }
          return NOT_WAITING;
        });
    });
};

module.exports = {
  IMAGE_VARIANTS,
  NOT_WAITING,
  isValidUserId,
  pickImage,
  pickListingPublicData,
  getTransactionRights,
  buildModelReviewPayload,
  buildClientReviewPayload,
  loadReviewProfile,
};
