import { REVIEW_TYPE_OF_PROVIDER, REVIEW_TYPE_OF_CUSTOMER } from './types';

/**
 * SAF-25 — "Safety & respect" review dimension.
 *
 * Sharetribe reviews are natively a single rating + content, so the structured
 * "Safety & respect" score is stored alongside the review in the TRANSACTION's
 * protectedData (written by :action/update-protected-data on the review
 * transitions — see ext/transaction-processes/booking-v2/process.edn).
 *
 * It is stored per reviewer role so the two parties' scores never overwrite each
 * other. protectedData is visible to the two parties + the operator only — this
 * value is intentionally NOT public on profiles (see docs/spikes/saf-25-review-dimension.md).
 */

// Rating (1–5) the CUSTOMER gave the provider (their review is `ofProvider`).
export const SAFETY_RESPECT_RATING_BY_CUSTOMER = 'safetyRespectRatingByCustomer';
// Rating (1–5) the PROVIDER gave the customer (their review is `ofCustomer`).
export const SAFETY_RESPECT_RATING_BY_PROVIDER = 'safetyRespectRatingByProvider';

/**
 * Given a review entity's `type` and the transaction protectedData, return the
 * safety & respect rating (1–5) the reviewer gave, or null when it's absent —
 * older reviews won't have it, and a viewer without protectedData access
 * (e.g. the public profile page) never receives it.
 *
 * @param {string} reviewType - REVIEW_TYPE_OF_PROVIDER | REVIEW_TYPE_OF_CUSTOMER
 * @param {Object} [protectedData] - the transaction's protectedData
 * @returns {number|null}
 */
export const getSafetyRespectRatingForReviewType = (reviewType, protectedData) => {
  if (!protectedData) {
    return null;
  }
  // A review `ofProvider` was written by the customer; `ofCustomer` by the provider.
  const raw =
    reviewType === REVIEW_TYPE_OF_PROVIDER
      ? protectedData[SAFETY_RESPECT_RATING_BY_CUSTOMER]
      : reviewType === REVIEW_TYPE_OF_CUSTOMER
      ? protectedData[SAFETY_RESPECT_RATING_BY_PROVIDER]
      : null;
  return typeof raw === 'number' ? raw : null;
};
