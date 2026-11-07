/**
 * server/api-util/reviewQueue.js
 * ---------------------------------------------------------------------------
 * Review tool (stage 1, READ-ONLY): the review queue (R01). Who is waiting for a review
 * decision, oldest first. See docs/specs/review-tool-spike.md §3.
 *
 * WHO IS "WAITING" (the same signals the rest of the app uses):
 *   Model   has a `model-profile` listing past draft (pendingApproval, closed or published) and no
 *           metadata `reviewDecision`. `closed` + no decision is a model who was published, then
 *           declined (the reconcile closed the listing), then resubmitted. `published` + no
 *           decision should not happen with the flag on; it is shown with an anomaly flag rather
 *           than hidden.
 *   Client  `privateData.businessDetailsSubmittedAt` is set (screen 18) and no `reviewDecision`.
 *   Resubmissions need no special handling: POST /api/resubmit-for-review clears the decision,
 *   so they reappear as "no decision".
 *   Never listed: banned or deleted accounts, and staff (reviewer role or admin).
 *
 * HOW (spike §3.2): two Integration API scans, made one call at a time (never in parallel; every
 * Integration call from this server shares one rate-limit bucket):
 *   listings.query({ pub_listingType: 'model-profile', states, include: author + author.stripeAccount })
 *   users.query({ pub_userType: 'client' })
 * then filtered in memory. For models, the Stripe progress is read from Stripe one account at a
 * time (stripeConnectStatus.js). The finished queue is cached for 30 seconds and shared by all
 * reviewers; concurrent requests share one build. A 429 from Sharetribe becomes "busy, try again".
 *
 * "SUBMITTED" DATE (stage 1 fallback): the trustworthy stamp is the server-written
 * `metadata.reviewQueuedAt`, which stage 3's reviewer-notification sweep will write. Stage 1 never
 * writes, so it uses the best read-only timestamp available and says which one it used:
 *   reviewQueuedAt (when present) > models: listing privateData.accuracyConfirmedAt (set when the
 *   model presses Submit on the review step) > listing createdAt
 *   clients: privateData.businessDetailsSubmittedAt > user createdAt.
 * accuracyConfirmedAt and businessDetailsSubmittedAt are written by the user themselves, so they
 * are good enough to sort by but not tamper-proof; reviewQueuedAt replaces them later.
 *
 * "RECENTLY DECIDED" needs who-decided-and-when (metadata reviewedAt / reviewedBy), which stage 2
 * writes. Until then the tab is empty with a note (recentlyDecidedAvailable: false).
 *
 * PERSONAL DATA: rows carry only what R01 shows (name, type, city or company, dates, status
 * words). Never email, phone, date of birth, addresses or Stripe details.
 *
 * ⚠️ TEST MARKETPLACE ONLY (ndstealth1-test). Reads only.
 */

const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');
const { getReviewDecision } = require('./reviewDecision');
const { isStaffUser } = require('./reviewerRoles');
const { isOverdue } = require('./workingDays');
const {
  getStripeAccountStatus,
  combineStripeStatus,
  STATUS_VERIFIED,
  STATUS_IN_PROGRESS,
  STATUS_NOT_STARTED,
} = require('./stripeConnectStatus');
const log = require('../log');

const MODEL_LISTING_TYPE = 'model-profile';
const CLIENT_USER_TYPE = 'client';
const LISTING_STATE_PENDING_APPROVAL = 'pendingApproval';
const LISTING_STATE_PUBLISHED = 'published';
const LISTING_STATE_CLOSED = 'closed';
const SUBMITTED_LISTING_STATES = [
  LISTING_STATE_PENDING_APPROVAL,
  LISTING_STATE_CLOSED,
  LISTING_STATE_PUBLISHED,
];
// Which listing to use when a model somehow has more than one submitted listing.
const LISTING_STATE_PRIORITY = {
  [LISTING_STATE_PENDING_APPROVAL]: 0,
  [LISTING_STATE_CLOSED]: 1,
  [LISTING_STATE_PUBLISHED]: 2,
};

const REVIEW_QUEUED_AT_METADATA_KEY = 'reviewQueuedAt';
const REVIEW_LOG_METADATA_KEY = 'reviewLog';
const BUSINESS_DETAILS_SUBMITTED_AT_KEY = 'businessDetailsSubmittedAt';
const ACCURACY_CONFIRMED_AT_KEY = 'accuracyConfirmedAt';

const SUBMITTED_SOURCE_QUEUED = 'reviewQueuedAt';
const SUBMITTED_SOURCE_ACCURACY = 'accuracyConfirmedAt';
const SUBMITTED_SOURCE_LISTING_CREATED = 'listingCreatedAt';
const SUBMITTED_SOURCE_BUSINESS_DETAILS = 'businessDetailsSubmittedAt';
const SUBMITTED_SOURCE_USER_CREATED = 'userCreatedAt';

const ANOMALY_PUBLISHED_WITHOUT_DECISION = 'published-without-decision';

const PER_PAGE = 100;
const MAX_PAGES = 20; // 2,000 records per scan; partition by date if we ever get near it
const CACHE_TTL_MS = 30 * 1000;

// ================ Integration SDK ================ //

let integrationSdkInstance = null;
/**
 * The operator Integration SDK, or null when the credentials are missing (feature inactive).
 * @returns {Object|null}
 */
const getIntegrationSdk = () => {
  const clientId = process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  if (!integrationSdkInstance) {
    integrationSdkInstance = flexIntegrationSdk.createInstance({ clientId, clientSecret });
  }
  return integrationSdkInstance;
};

/**
 * Was this a Sharetribe rate-limit rejection?
 * @param {Error} e
 * @returns {boolean}
 */
const isRateLimited = e => (e?.status || e?.statusCode) === 429;

// ================ Pure helpers (shared with reviewProfile.js) ================ //

const getId = resource => resource?.id?.uuid || null;
const getProfile = user => user?.attributes?.profile || {};
const getMetadata = user => getProfile(user).metadata || {};

const validDateIso = value => {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Banned, deleted or otherwise not reviewable.
 * @param {Object} user
 * @returns {boolean}
 */
const isBlockedUser = user => {
  const attrs = user?.attributes || {};
  return !user || attrs.banned === true || attrs.deleted === true || attrs.state === 'banned';
};

/**
 * Can this account appear in the queue at all (exists, not banned/deleted, not staff)?
 * @param {Object} user
 * @returns {boolean}
 */
const isQueueEligibleUser = user => !isBlockedUser(user) && !isStaffUser(user);

/**
 * Has this person been declined before (so the row is a resubmission)? Reads the stage 2
 * `metadata.reviewLog` when it exists; until then the only read-only signal is a model whose
 * listing is `closed` with no decision (published, declined, then resubmitted).
 *
 * @param {Object} params
 * @param {Object} params.user
 * @param {Object} [params.listing] - the model's listing
 * @returns {boolean}
 */
const isResubmission = ({ user, listing } = {}) => {
  const reviewLog = getMetadata(user)[REVIEW_LOG_METADATA_KEY];
  const declinedBefore =
    Array.isArray(reviewLog) && reviewLog.some(entry => entry && entry.decision === 'declined');
  return declinedBefore || listing?.attributes?.state === LISTING_STATE_CLOSED;
};

/**
 * Best available read-only "submitted" timestamp for a model (see module header).
 * @param {Object} listing
 * @param {Object} user - the author
 * @returns {{submittedAt: (string|null), submittedAtSource: (string|null)}}
 */
const getModelSubmittedAt = (listing, user) => {
  const queued = validDateIso(getMetadata(user)[REVIEW_QUEUED_AT_METADATA_KEY]);
  if (queued) {
    return { submittedAt: queued, submittedAtSource: SUBMITTED_SOURCE_QUEUED };
  }
  const confirmed = validDateIso(listing?.attributes?.privateData?.[ACCURACY_CONFIRMED_AT_KEY]);
  if (confirmed) {
    return { submittedAt: confirmed, submittedAtSource: SUBMITTED_SOURCE_ACCURACY };
  }
  const created = validDateIso(listing?.attributes?.createdAt);
  return created
    ? { submittedAt: created, submittedAtSource: SUBMITTED_SOURCE_LISTING_CREATED }
    : { submittedAt: null, submittedAtSource: null };
};

/**
 * Best available read-only "submitted" timestamp for a client (see module header).
 * @param {Object} user
 * @returns {{submittedAt: (string|null), submittedAtSource: (string|null)}}
 */
const getClientSubmittedAt = user => {
  const queued = validDateIso(getMetadata(user)[REVIEW_QUEUED_AT_METADATA_KEY]);
  if (queued) {
    return { submittedAt: queued, submittedAtSource: SUBMITTED_SOURCE_QUEUED };
  }
  const submitted = validDateIso(getProfile(user).privateData?.[BUSINESS_DETAILS_SUBMITTED_AT_KEY]);
  if (submitted) {
    return { submittedAt: submitted, submittedAtSource: SUBMITTED_SOURCE_BUSINESS_DETAILS };
  }
  const created = validDateIso(user?.attributes?.createdAt);
  return created
    ? { submittedAt: created, submittedAtSource: SUBMITTED_SOURCE_USER_CREATED }
    : { submittedAt: null, submittedAtSource: null };
};

/**
 * Has this client submitted their business details (screen 18)?
 * @param {Object} user
 * @returns {boolean}
 */
const hasSubmittedBusinessDetails = user => {
  const v = getProfile(user).privateData?.[BUSINESS_DETAILS_SUBMITTED_AT_KEY];
  return typeof v === 'string' && v.length > 0;
};

/**
 * Client identity check progress from the SAF-03 metadata flags (stripeIdentity.js).
 * @param {Object} user
 * @returns {'verified'|'in-progress'|'not-started'}
 */
const getClientIdentityStatus = user => {
  const metadata = getMetadata(user);
  if (metadata.identity_verified === true) {
    return STATUS_VERIFIED;
  }
  return metadata.identity_verification_session_id ? STATUS_IN_PROGRESS : STATUS_NOT_STARTED;
};

/**
 * The city from a listing's public location ("Manchester, UK" -> "Manchester"), as the public
 * profile shows it (util/modelProfile.js getModelCity).
 * @param {Object} listing
 * @returns {string|null}
 */
const getListingCity = listing => {
  const address = listing?.attributes?.publicData?.location?.address;
  if (typeof address !== 'string' || !address.trim()) {
    return null;
  }
  return address.split(',')[0].trim() || null;
};

/**
 * A person's full name for the reviewer (first + last), falling back to the display name.
 * @param {Object} user
 * @returns {string}
 */
const getFullName = user => {
  const { firstName, lastName, displayName } = getProfile(user);
  const full = [firstName, lastName]
    .filter(s => typeof s === 'string' && s.trim())
    .join(' ')
    .trim();
  return full || (typeof displayName === 'string' ? displayName.trim() : '') || '';
};

/**
 * Two-letter monogram for the avatar (no photos in the queue).
 * @param {string} name
 * @returns {string}
 */
const getInitials = name =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');

const indexIncluded = included => {
  const map = new Map();
  (included || []).forEach(resource => {
    const id = getId(resource);
    if (id) {
      map.set(`${resource.type}/${id}`, resource);
    }
  });
  return map;
};

const relatedId = (resource, name) => resource?.relationships?.[name]?.data?.id?.uuid || null;

/**
 * The model's connected Stripe account id: the user's stripeAccount relationship when included,
 * else the id the reconcile stamps on the listing (modelVisibility.js).
 * @param {Object} user
 * @param {Map} includedMap
 * @param {Object} [listing]
 * @returns {string|null}
 */
const getStripeAccountIdFor = (user, includedMap, listing) => {
  const stripeAccountRelId = relatedId(user, 'stripeAccount');
  const stripeAccount = stripeAccountRelId
    ? includedMap.get(`stripeAccount/${stripeAccountRelId}`)
    : null;
  return (
    stripeAccount?.attributes?.stripeAccountId ||
    listing?.attributes?.publicData?.stripeAccountId ||
    null
  );
};

/**
 * From a model listings scan, the models waiting for a decision: one entry per author.
 *
 * @param {{data: Array, included: Array}} scan
 * @returns {Array<{listing: Object, user: Object, stripeAccountId: (string|null)}>}
 */
const selectPendingModels = scan => {
  const includedMap = indexIncluded(scan?.included);
  const byAuthor = new Map();
  (scan?.data || []).forEach(listing => {
    const attrs = listing?.attributes || {};
    if (attrs.publicData?.listingType !== MODEL_LISTING_TYPE) {
      return;
    }
    if (!SUBMITTED_LISTING_STATES.includes(attrs.state)) {
      return;
    }
    const authorId = relatedId(listing, 'author');
    const user = authorId ? includedMap.get(`user/${authorId}`) : null;
    if (!user || !isQueueEligibleUser(user) || getReviewDecision(user) !== null) {
      return;
    }
    const existing = byAuthor.get(authorId);
    if (
      !existing ||
      LISTING_STATE_PRIORITY[attrs.state] <
        LISTING_STATE_PRIORITY[existing.listing.attributes.state]
    ) {
      byAuthor.set(authorId, {
        listing,
        user,
        stripeAccountId: getStripeAccountIdFor(user, includedMap, listing),
      });
    }
  });
  return Array.from(byAuthor.values());
};

/**
 * From a client users scan, the clients waiting for a decision.
 * @param {{data: Array}} scan
 * @returns {Array<Object>} user resources
 */
const selectPendingClients = scan =>
  (scan?.data || []).filter(
    user =>
      isQueueEligibleUser(user) &&
      hasSubmittedBusinessDetails(user) &&
      getReviewDecision(user) === null
  );

/**
 * A queue row for a model (only what R01 shows).
 * @param {Object} params
 * @param {Object} params.listing
 * @param {Object} params.user
 * @param {{identity: string, bank: string}} params.stripeStatus
 * @param {Date} params.now
 * @returns {Object}
 */
const buildModelRow = ({ listing, user, stripeStatus, now }) => {
  const name = (listing?.attributes?.title || '').trim() || getFullName(user);
  const { submittedAt, submittedAtSource } = getModelSubmittedAt(listing, user);
  return {
    userId: getId(user),
    type: 'model',
    name,
    initials: getInitials(name),
    place: getListingCity(listing),
    submittedAt,
    submittedAtSource,
    overdue: submittedAt ? isOverdue(submittedAt, now) : false,
    verification: combineStripeStatus(stripeStatus),
    resubmission: isResubmission({ user, listing }),
    anomaly:
      listing?.attributes?.state === LISTING_STATE_PUBLISHED
        ? ANOMALY_PUBLISHED_WITHOUT_DECISION
        : null,
  };
};

/**
 * A queue row for a client (only what R01 shows).
 * @param {Object} params
 * @param {Object} params.user
 * @param {Date} params.now
 * @returns {Object}
 */
const buildClientRow = ({ user, now }) => {
  const name = getFullName(user);
  const profile = getProfile(user);
  const { submittedAt, submittedAtSource } = getClientSubmittedAt(user);
  return {
    userId: getId(user),
    type: 'client',
    name,
    initials: getInitials(name),
    place: profile.publicData?.company_name || null,
    businessType: profile.protectedData?.business_type || null,
    submittedAt,
    submittedAtSource,
    overdue: submittedAt ? isOverdue(submittedAt, now) : false,
    verification: getClientIdentityStatus(user),
    resubmission: isResubmission({ user }),
    anomaly: null,
  };
};

/**
 * Oldest first. Rows without a date go last; ties keep a stable order by user id.
 * @param {Array<Object>} rows
 * @returns {Array<Object>} a new sorted array
 */
const sortQueue = rows =>
  [...(rows || [])].sort((a, b) => {
    const ta = a.submittedAt ? Date.parse(a.submittedAt) : Infinity;
    const tb = b.submittedAt ? Date.parse(b.submittedAt) : Infinity;
    if (ta !== tb) {
      return ta < tb ? -1 : 1;
    }
    return String(a.userId).localeCompare(String(b.userId));
  });

// ================ Scans (sequential) ================ //

/**
 * Run a paged Integration API query one page at a time and collect data + included.
 * @param {Function} queryFn
 * @param {Object} params
 * @returns {Promise<{data: Array, included: Array}>}
 */
const scanPages = (queryFn, params) => {
  const data = [];
  const included = [];
  const step = page =>
    queryFn({ ...params, page, perPage: PER_PAGE }).then(res => {
      const body = res?.data || {};
      data.push(...(body.data || []));
      included.push(...(body.included || []));
      const totalPages = body.meta?.totalPages || 1;
      return page < totalPages && page < MAX_PAGES ? step(page + 1) : { data, included };
    });
  return step(1);
};

const scanModelListings = integrationSdk =>
  scanPages(params => integrationSdk.listings.query(params), {
    pub_listingType: MODEL_LISTING_TYPE,
    states: SUBMITTED_LISTING_STATES.join(','),
    include: ['author', 'author.stripeAccount'],
  });

const scanClients = integrationSdk =>
  scanPages(params => integrationSdk.users.query(params), { pub_userType: CLIENT_USER_TYPE });

// Resolve each model's Stripe status one at a time (never in parallel).
const resolveStripeStatuses = (models, getStripeStatus) =>
  models.reduce(
    (chain, model) =>
      chain.then(results =>
        getStripeStatus(model.stripeAccountId).then(status => [...results, status])
      ),
    Promise.resolve([])
  );

/**
 * Build the whole queue (no cache). Rejects on an Integration API error (429 included).
 *
 * @param {Object} params
 * @param {Object} params.integrationSdk
 * @param {Function} [params.getStripeStatus] - acct id => Promise<{identity, bank}>
 * @param {Function} [params.now] - () => Date
 * @returns {Promise<Object>} { items, counts, generatedAt, recentlyDecided, recentlyDecidedAvailable }
 */
const buildQueue = ({
  integrationSdk,
  getStripeStatus = getStripeAccountStatus,
  now = () => new Date(),
}) =>
  scanModelListings(integrationSdk).then(modelScan =>
    scanClients(integrationSdk).then(clientScan => {
      const models = selectPendingModels(modelScan);
      const modelIds = new Set(models.map(m => getId(m.user)));
      // A person with a model profile is reviewed as a model, never twice.
      const clients = selectPendingClients(clientScan).filter(u => !modelIds.has(getId(u)));
      return resolveStripeStatuses(models, getStripeStatus).then(statuses => {
        const at = now();
        const rows = [
          ...models.map((m, i) => buildModelRow({ ...m, stripeStatus: statuses[i], now: at })),
          ...clients.map(user => buildClientRow({ user, now: at })),
        ];
        const items = sortQueue(rows);
        return {
          items,
          counts: {
            all: items.length,
            models: items.filter(r => r.type === 'model').length,
            clients: items.filter(r => r.type === 'client').length,
          },
          generatedAt: at.toISOString(),
          recentlyDecided: [],
          recentlyDecidedAvailable: false,
        };
      });
    })
  );

// ================ Cache ================ //

let cachedQueue = null; // { at: ms, value }
let inflightQueue = null;

/**
 * The queue, cached for 30 seconds and shared by every reviewer; concurrent callers share one
 * build. Errors are not cached.
 *
 * @param {Object} params - as buildQueue, plus { clock } (ms) for tests
 * @returns {Promise<Object>}
 */
const getQueue = (params = {}) => {
  const { clock = Date.now } = params;
  if (cachedQueue && clock() - cachedQueue.at < CACHE_TTL_MS) {
    return Promise.resolve(cachedQueue.value);
  }
  if (inflightQueue) {
    return inflightQueue;
  }
  inflightQueue = buildQueue(params).then(
    value => {
      cachedQueue = { at: clock(), value };
      inflightQueue = null;
      return value;
    },
    err => {
      inflightQueue = null;
      if (!isRateLimited(err)) {
        log.error(err, 'review-queue-build-failed');
      }
      throw err;
    }
  );
  return inflightQueue;
};

/** Tests only: forget the cached queue. */
const resetQueueCache = () => {
  cachedQueue = null;
  inflightQueue = null;
};

module.exports = {
  MODEL_LISTING_TYPE,
  SUBMITTED_LISTING_STATES,
  ANOMALY_PUBLISHED_WITHOUT_DECISION,
  SUBMITTED_SOURCE_QUEUED,
  SUBMITTED_SOURCE_ACCURACY,
  SUBMITTED_SOURCE_LISTING_CREATED,
  SUBMITTED_SOURCE_BUSINESS_DETAILS,
  SUBMITTED_SOURCE_USER_CREATED,
  CACHE_TTL_MS,
  getIntegrationSdk,
  isRateLimited,
  isBlockedUser,
  isQueueEligibleUser,
  isResubmission,
  getModelSubmittedAt,
  getClientSubmittedAt,
  hasSubmittedBusinessDetails,
  getClientIdentityStatus,
  getListingCity,
  getFullName,
  getInitials,
  indexIncluded,
  getStripeAccountIdFor,
  selectPendingModels,
  selectPendingClients,
  buildModelRow,
  buildClientRow,
  sortQueue,
  scanPages,
  buildQueue,
  getQueue,
  resetQueueCache,
};
