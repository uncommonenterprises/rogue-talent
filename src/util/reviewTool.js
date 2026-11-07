/**
 * Review tool (stage 1, read-only) helpers for the web app: the review queue (R01) and the
 * review page (R02 model, R04 client). The data comes from the server's own review endpoints
 * (server/api/review-*.js), which check access and trim the payload; nothing here decides who
 * may see anything.
 */
import { types as sdkTypes } from './sdkLoader';

const { UUID, Money } = sdkTypes;

const UK_TIME_ZONE = 'Europe/London';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// The one error code every review endpoint sends to callers without access (R07 state 1).
export const REVIEW_NO_ACCESS_ERROR = 'not-found';
export const REVIEW_BUSY_ERROR = 'busy';

export const REVIEW_KIND_MODEL = 'model';
export const REVIEW_KIND_CLIENT = 'client';
export const REVIEW_KIND_NOT_WAITING = 'not-waiting';

export const QUEUE_TAB_ALL = 'all';
export const QUEUE_TAB_MODELS = 'models';
export const QUEUE_TAB_CLIENTS = 'clients';
export const QUEUE_TAB_DECIDED = 'decided';
export const QUEUE_TABS = [QUEUE_TAB_ALL, QUEUE_TAB_MODELS, QUEUE_TAB_CLIENTS, QUEUE_TAB_DECIDED];

// Checklists (R02 / R04, draft wording; Neil 07/11/2026: item 3 "No nudity in photos", all five
// required before Approve). The labels live in en.json under ReviewPanel.check.<id>.
export const MODEL_CHECKLIST = ['samePerson', 'over18', 'noNudity', 'realName', 'ratesPlausible'];
export const COMPANY_CHECKLIST = [
  'companyFound',
  'companyNameMatches',
  'companyActive',
  'companyBooksModels',
  'contactRealPerson',
];
export const SOLE_TRADER_CHECKLIST = [
  'linkShowsBusiness',
  'tradingNameMatches',
  'addressGenuine',
  'soleTraderBooksModels',
  'contactRealPerson',
];

const BUSINESS_TYPE_SOLE_TRADER = 'sole_trader';

// Nav link only: cache the server's "can review" answer per browser tab for 15 minutes so it is
// asked once a session, not on every page load. The server re-checks on every review request.
const REVIEW_ACCESS_STORAGE_KEY = 'rtReviewAccess';
export const REVIEW_ACCESS_CACHE_MS = 15 * 60 * 1000;

/**
 * Does this user carry the reviewer role in their (operator-only) metadata? Display only.
 * @param {Object} currentUser
 * @returns {boolean}
 */
export const hasReviewerRole = currentUser => {
  const roles = currentUser?.attributes?.profile?.metadata?.roles;
  return Array.isArray(roles) && roles.includes('reviewer');
};

/**
 * The cached "can review" answer for this user, or null when missing, stale or for someone else.
 * @param {string} userId
 * @param {number} [nowMs]
 * @returns {boolean|null}
 */
export const readCachedReviewAccess = (userId, nowMs = Date.now()) => {
  try {
    const raw = window.sessionStorage.getItem(REVIEW_ACCESS_STORAGE_KEY);
    const cached = raw ? JSON.parse(raw) : null;
    if (
      cached &&
      cached.userId === userId &&
      typeof cached.canReview === 'boolean' &&
      nowMs - cached.at < REVIEW_ACCESS_CACHE_MS
    ) {
      return cached.canReview;
    }
  } catch (e) {
    // Storage unavailable (private mode etc.): ask the server.
  }
  return null;
};

/**
 * Remember the "can review" answer for this user.
 * @param {string} userId
 * @param {boolean} canReview
 * @param {number} [nowMs]
 */
export const writeCachedReviewAccess = (userId, canReview, nowMs = Date.now()) => {
  try {
    window.sessionStorage.setItem(
      REVIEW_ACCESS_STORAGE_KEY,
      JSON.stringify({ userId, canReview, at: nowMs })
    );
  } catch (e) {
    // Ignore: the link is cosmetic.
  }
};

/**
 * Reduce an error thrown by the review API calls to { error, status } for the store.
 * @param {Object} e - the error from util/api.js (carries the JSON body's fields)
 * @returns {{error: (string|null), status: (number|null)}}
 */
export const toReviewError = e => ({
  error: typeof e?.error === 'string' ? e.error : null,
  status: typeof e?.status === 'number' ? e.status : null,
});

/**
 * Was this error the review tool's "no access" response?
 * @param {Object} error - from toReviewError
 * @returns {boolean}
 */
export const isReviewNoAccessError = error =>
  error?.error === REVIEW_NO_ACCESS_ERROR || error?.status === 404;

/**
 * Was this error "busy, try again" (rate limit, or the server could not tell who you are)?
 * @param {Object} error - from toReviewError
 * @returns {boolean}
 */
export const isReviewBusyError = error =>
  error?.error === REVIEW_BUSY_ERROR || error?.status === 503;

/**
 * The checklist ids for a review payload.
 * @param {Object} profile - review payload
 * @returns {Array<string>}
 */
export const getChecklistIds = profile => {
  if (profile?.kind === REVIEW_KIND_CLIENT) {
    return profile?.business?.businessType === BUSINESS_TYPE_SOLE_TRADER
      ? SOLE_TRADER_CHECKLIST
      : COMPANY_CHECKLIST;
  }
  return MODEL_CHECKLIST;
};

/**
 * Filter queue rows for a tab.
 * @param {Array<Object>} items
 * @param {string} tab
 * @returns {Array<Object>}
 */
export const filterQueueItems = (items, tab) => {
  const rows = Array.isArray(items) ? items : [];
  if (tab === QUEUE_TAB_MODELS) {
    return rows.filter(r => r.type === REVIEW_KIND_MODEL);
  }
  if (tab === QUEUE_TAB_CLIENTS) {
    return rows.filter(r => r.type === REVIEW_KIND_CLIENT);
  }
  if (tab === QUEUE_TAB_DECIDED) {
    return [];
  }
  return rows;
};

/**
 * DD/MM/YYYY in UK time (standing rule for dates).
 * @param {string|Date} value
 * @returns {string|null}
 */
export const formatUkDate = value => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

/**
 * How long ago, as a unit and a count for the "x days ago" message.
 * Under an hour = 'justNow'; under a day = hours; otherwise whole calendar days (24h periods).
 *
 * @param {string|Date} value
 * @param {Date} [now]
 * @returns {{unit: ('justNow'|'hours'|'days'), count: number}|null}
 */
export const getTimeAgo = (value, now = new Date()) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  const diff = Math.max(0, now.getTime() - date.getTime());
  if (diff < HOUR_MS) {
    return { unit: 'justNow', count: 0 };
  }
  if (diff < DAY_MS) {
    return { unit: 'hours', count: Math.floor(diff / HOUR_MS) };
  }
  return { unit: 'days', count: Math.floor(diff / DAY_MS) };
};

/**
 * The longest wait in the queue, in whole days (for the summary line).
 * @param {Array<Object>} items
 * @param {Date} [now]
 * @returns {number|null}
 */
export const getLongestWaitDays = (items, now = new Date()) => {
  const times = (items || [])
    .map(r => (r.submittedAt ? Date.parse(r.submittedAt) : NaN))
    .filter(t => !Number.isNaN(t));
  if (times.length === 0) {
    return null;
  }
  return Math.floor(Math.max(0, now.getTime() - Math.min(...times)) / DAY_MS);
};

/**
 * Companies House search link for a company number (R04). Confirmed working 07/11/2026:
 * https://find-and-update.company-information.service.gov.uk/search/companies?q=00445790
 * returns the company as the first result.
 *
 * @param {string} companyNumber
 * @returns {string|null}
 */
export const getCompaniesHouseSearchUrl = companyNumber => {
  const number = typeof companyNumber === 'string' ? companyNumber.trim() : '';
  if (!number) {
    return null;
  }
  return `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(
    number
  )}`;
};

/**
 * Status word -> chip style (the rt-status colours: green done, amber in progress, grey not
 * started / unknown). Uses the BookingStatusChip styles.
 * @param {string} status
 * @returns {string}
 */
export const getStatusChipStyle = status =>
  status === 'verified' ? 'accepted' : status === 'in-progress' ? 'requested' : 'cancelled';

/**
 * Rebuild image entities (what ResponsiveImage and the profile gallery expect) from the
 * server's trimmed images.
 * @param {Array<Object>} images - [{ id, variants }]
 * @returns {Array<Object>}
 */
export const toImageEntities = images =>
  (images || []).map(img => ({
    id: new UUID(img.id),
    type: 'image',
    attributes: { variants: img.variants || {} },
  }));

/**
 * The listing price as a Money object, or null.
 * @param {{amount: number, currency: string}} price
 * @returns {Money|null}
 */
export const toMoney = price =>
  price && typeof price.amount === 'number' && price.currency
    ? new Money(price.amount, price.currency)
    : null;

/**
 * A minimal author entity for the profile sections (display name + bio only).
 * @param {Object} author - { displayName, bio }
 * @returns {Object}
 */
export const toAuthorEntity = author => ({
  type: 'user',
  attributes: {
    profile: { displayName: author?.displayName || '', bio: author?.bio || null },
  },
});

/**
 * Label for an enum user field option from the app config (e.g. industry), else the raw value.
 * @param {Object} config - app config
 * @param {string} key - user field key
 * @param {string} value - option
 * @returns {string|null}
 */
export const getUserFieldOptionLabel = (config, key, value) => {
  if (!value) {
    return null;
  }
  const field = (config?.user?.userFields || []).find(f => f.key === key);
  const option = (field?.enumOptions || []).find(o => `${o.option}` === `${value}`);
  return option?.label || value;
};
