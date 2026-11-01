/**
 * Booking statuses (B09): one label set for both sides. The client and the model see the same
 * status name for the same booking; only the sentence and the next action differ.
 *
 * Pure functions. The process states are the client graph's names
 * (src/transactions/transactionProcessBooking.js), so "canceled" is the full-refund cancel.
 */

export const BOOKING_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  UNDER_REVIEW: 'underReview',
  REFUNDED: 'refunded',
  FINISH_REQUEST: 'finishRequest',
  PAYMENT_EXPIRED: 'paymentExpired',
  INQUIRY: 'inquiry',
};

const S = BOOKING_STATUS;

// The state-to-label mapping table on B09.
export const STATE_TO_STATUS = {
  inquiry: S.INQUIRY,
  'pending-payment': S.FINISH_REQUEST,
  'payment-expired': S.PAYMENT_EXPIRED,
  preauthorized: S.REQUESTED,
  accepted: S.ACCEPTED,
  'accepted-late': S.ACCEPTED,
  completed: S.COMPLETED,
  delivered: S.COMPLETED,
  'reviewed-by-customer': S.COMPLETED,
  'reviewed-by-provider': S.COMPLETED,
  reviewed: S.COMPLETED,
  declined: S.DECLINED,
  expired: S.EXPIRED,
  canceled: S.CANCELLED,
  'cancelled-charged': S.CANCELLED,
  'cancelled-charged-paid': S.CANCELLED,
  withdrawn: S.CANCELLED,
  'disputed-hold': S.UNDER_REVIEW,
  'refunded-dispute': S.REFUNDED,
};

// Chip colour per status: amber = waiting on someone, green = confirmed, cobalt tint = done,
// grey = ended. No red.
export const STATUS_CHIP = {
  [S.REQUESTED]: 'requested',
  [S.FINISH_REQUEST]: 'requested',
  [S.UNDER_REVIEW]: 'review',
  [S.ACCEPTED]: 'accepted',
  [S.COMPLETED]: 'completed',
  [S.DECLINED]: 'declined',
  [S.EXPIRED]: 'expired',
  [S.CANCELLED]: 'cancelled',
  [S.REFUNDED]: 'cancelled',
  [S.PAYMENT_EXPIRED]: 'cancelled',
  [S.INQUIRY]: 'cancelled',
};

// The client's own payment steps: the model never sees these.
const CLIENT_ONLY = [S.FINISH_REQUEST, S.PAYMENT_EXPIRED];

const OPERATOR_DECLINE = 'transition/operator-decline';

// Which sentence (the "variant") goes with a state. Several states share a label but not a
// money outcome, so the sentence is chosen from the state.
const variantFor = (state, status, lastTransition) => {
  switch (state) {
    case 'completed':
      return 'completed';
    case 'delivered':
    case 'reviewed-by-customer':
    case 'reviewed-by-provider':
    case 'reviewed':
      return 'completedPaid';
    case 'canceled':
      return 'cancelledRefunded';
    case 'cancelled-charged':
      return 'cancelledCharged';
    case 'cancelled-charged-paid':
      return 'cancelledChargedPaid';
    case 'withdrawn':
      return 'withdrawn';
    case 'declined':
      return lastTransition === OPERATOR_DECLINE ? 'declinedByTeam' : 'declined';
    default:
      return status;
  }
};

/**
 * The status of a booking for one side.
 *
 * @param {Object} params
 * @param {string} params.state process state (client graph name), e.g. 'preauthorized'
 * @param {'customer'|'provider'} params.role whose view
 * @param {string} [params.lastTransition] e.g. 'transition/operator-decline'
 * @returns {Object|null} null when there is no booking status to show this side. Otherwise:
 *   { status, chip, labelId, variant, isLate, isWithdrawn, reviewDue }
 */
export const getBookingStatus = ({ state, role, lastTransition } = {}) => {
  const status = STATE_TO_STATUS[state];
  if (!status) {
    return null;
  }
  const isCustomer = role === 'customer';
  if (!isCustomer && CLIENT_ONLY.includes(status)) {
    return null;
  }
  const reviewStates = isCustomer
    ? ['delivered', 'reviewed-by-provider']
    : ['delivered', 'reviewed-by-customer'];

  return {
    status,
    chip: STATUS_CHIP[status],
    labelId: `BookingStatus.${status}`,
    variant: variantFor(state, status, lastTransition),
    isLate: state === 'accepted-late',
    isWithdrawn: state === 'withdrawn',
    reviewDue: reviewStates.includes(state),
  };
};

// Variants with a list-row sentence (B09 "In the lists"), per side.
const ROW_NOTES = {
  customer: [
    'requested',
    'finishRequest',
    'paymentExpired',
    'accepted',
    'declined',
    'declinedByTeam',
    'expired',
    'withdrawn',
    'cancelledRefunded',
    'cancelledCharged',
    'cancelledChargedPaid',
    'underReview',
    'refunded',
  ],
  provider: [
    'requested',
    'accepted',
    'completed',
    'completedPaid',
    'declined',
    'declinedByTeam',
    'expired',
    'withdrawn',
    'cancelledRefunded',
    'cancelledCharged',
    'cancelledChargedPaid',
    'underReview',
    'refunded',
  ],
};

/**
 * The message id of the list-row sentence, or null if this status has none.
 * "Review due" replaces the sentence while a review is possible.
 *
 * @param {Object} bookingStatus from getBookingStatus
 * @param {'customer'|'provider'} role
 * @param {boolean} [hasDeadline] the Requested sentence names the reply-by time
 * @returns {string|null}
 */
export const getRowNoteId = (bookingStatus, role, hasDeadline = true) => {
  if (!bookingStatus) {
    return null;
  }
  const side = role === 'customer' ? 'customer' : 'provider';
  if (bookingStatus.reviewDue) {
    return 'BookingStatus.note.reviewDue';
  }
  const { variant } = bookingStatus;
  if (!ROW_NOTES[side].includes(variant)) {
    return null;
  }
  if (variant === 'requested' && !hasDeadline) {
    return side === 'customer' ? 'BookingStatus.note.customer.requestedNoDeadline' : null;
  }
  return `BookingStatus.note.${side}.${variant}`;
};

// Variants with a page banner. Requested has its own pages (B07 client, B08 model); a pending
// payment sends the client back to checkout; an enquiry keeps the template heading.
const BANNER_VARIANTS = {
  customer: [
    'accepted',
    'completed',
    'completedPaid',
    'declined',
    'declinedByTeam',
    'expired',
    'withdrawn',
    'cancelledRefunded',
    'cancelledCharged',
    'cancelledChargedPaid',
    'underReview',
    'refunded',
    'paymentExpired',
  ],
  provider: [
    'accepted',
    'completed',
    'completedPaid',
    'declined',
    'declinedByTeam',
    'expired',
    'withdrawn',
    'cancelledRefunded',
    'cancelledCharged',
    'cancelledChargedPaid',
    'underReview',
    'refunded',
  ],
};

/**
 * Message ids for the booking page banner (B09 "On the booking page"), or null.
 *
 * @param {Object} bookingStatus from getBookingStatus
 * @param {'customer'|'provider'} role
 * @returns {{ titleId: string, bodyId: string }|null}
 */
export const getBannerMessageIds = (bookingStatus, role) => {
  if (!bookingStatus) {
    return null;
  }
  const side = role === 'customer' ? 'customer' : 'provider';
  const { variant } = bookingStatus;
  if (!BANNER_VARIANTS[side].includes(variant)) {
    return null;
  }
  const base = `BookingStatus.banner.${side}.${variant}`;
  return { titleId: `${base}.title`, bodyId: `${base}.body` };
};

/**
 * The next step the client is offered on an ended request (B09): find another model, and for an
 * expired request, ask the same model again.
 *
 * @param {Object} bookingStatus from getBookingStatus
 * @param {'customer'|'provider'} role
 * @returns {{ findAnother: boolean, requestAgain: boolean }}
 */
export const getNextSteps = (bookingStatus, role) => {
  const variant = bookingStatus?.variant;
  const isCustomer = role === 'customer';
  const ended = ['declined', 'declinedByTeam', 'expired', 'withdrawn', 'paymentExpired'];
  return {
    findAnother: isCustomer && ended.includes(variant),
    requestAgain: isCustomer && variant === 'expired',
  };
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Whole hours left before a deadline (never negative). "47 hours left".
 *
 * @param {Date} deadline
 * @param {Date|number} now
 * @returns {number|null}
 */
export const getHoursLeft = (deadline, now) => {
  if (!(deadline instanceof Date) || isNaN(deadline)) {
    return null;
  }
  const nowMs = now instanceof Date ? now.getTime() : now;
  if (typeof nowMs !== 'number' || isNaN(nowMs)) {
    return null;
  }
  return Math.max(0, Math.floor((deadline.getTime() - nowMs) / HOUR_MS));
};
