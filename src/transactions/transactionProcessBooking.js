/**
 * Transaction process graph for bookings:
 *   - default-booking (Rogue Talent booking-v2)
 *
 * booking-v2 adds, vs stock default-booking: a 48h provider accept window; a
 * two-tier customer cancellation (full refund ≥48h before the shoot via
 * `customer-cancel`, no refund <48h via `customer-cancel-late`), gated by the
 * automatic `enter-late` transition; an always-full-refund provider cancel; and
 * a dispute/no-show window — payout is split from completion (`complete` →
 * `completed` with no payout, `auto-payout` fires later), with operator
 * dispute transitions in between. See docs/booking-process-design.md.
 */

/**
 * Transitions
 *
 * These strings must sync with values defined in Marketplace API,
 * since transaction objects given by API contain info about last transitions.
 */

export const transitions = {
  REQUEST_PAYMENT: 'transition/request-payment',

  INQUIRE: 'transition/inquire',
  REQUEST_PAYMENT_AFTER_INQUIRY: 'transition/request-payment-after-inquiry',

  CONFIRM_PAYMENT: 'transition/confirm-payment',
  EXPIRE_PAYMENT: 'transition/expire-payment',

  // Provider accepts/declines the request (48h window). Operator can act on their behalf.
  ACCEPT: 'transition/accept',
  DECLINE: 'transition/decline',
  OPERATOR_ACCEPT: 'transition/operator-accept',
  OPERATOR_DECLINE: 'transition/operator-decline',

  // Auto-decline + full refund if the provider doesn't respond within the 48h accept window.
  EXPIRE: 'transition/expire',

  // Automatic: at booking-start − 48h, a confirmed booking becomes non-refundable
  // for a customer cancel.
  ENTER_LATE: 'transition/enter-late',

  // Two-tier customer cancellation.
  CUSTOMER_CANCEL: 'transition/customer-cancel', // ≥48h before shoot → full refund
  CUSTOMER_CANCEL_LATE: 'transition/customer-cancel-late', // <48h → no refund (model still paid)

  // Provider cancellation — always a full refund to the client, both tiers (captures a reason).
  PROVIDER_CANCEL: 'transition/provider-cancel',
  PROVIDER_CANCEL_LATE: 'transition/provider-cancel-late',

  // Operator cancellation overrides (full refund).
  OPERATOR_CANCEL: 'transition/operator-cancel',
  OPERATOR_CANCEL_LATE: 'transition/operator-cancel-late',

  // Shoot date passed → completed (NO payout yet). Opens the dispute window.
  COMPLETE: 'transition/complete',
  COMPLETE_LATE: 'transition/complete-late',

  // Payout fires 2 days after booking-end (the dispute window closes).
  AUTO_PAYOUT: 'transition/auto-payout',
  OPERATOR_COMPLETE: 'transition/operator-complete', // operator releases payout early

  // Dispute / no-show path (operator, during the completed → delivered window).
  OPERATOR_DISPUTE_REFUND: 'transition/operator-dispute-refund',
  OPERATOR_DISPUTE_HOLD: 'transition/operator-dispute-hold',
  OPERATOR_HOLD_REFUND: 'transition/operator-hold-refund',
  OPERATOR_HOLD_RELEASE: 'transition/operator-hold-release',

  // No-refund customer cancel: operator override (full refund) + the scheduled payout to the model.
  OPERATOR_CANCEL_CHARGED: 'transition/operator-cancel-charged',
  PAYOUT_CANCELLED_CHARGED: 'transition/payout-cancelled-charged',

  // Reviews (bilateral, stock).
  REVIEW_1_BY_PROVIDER: 'transition/review-1-by-provider',
  REVIEW_2_BY_PROVIDER: 'transition/review-2-by-provider',
  REVIEW_1_BY_CUSTOMER: 'transition/review-1-by-customer',
  REVIEW_2_BY_CUSTOMER: 'transition/review-2-by-customer',
  EXPIRE_CUSTOMER_REVIEW_PERIOD: 'transition/expire-customer-review-period',
  EXPIRE_PROVIDER_REVIEW_PERIOD: 'transition/expire-provider-review-period',
  EXPIRE_REVIEW_PERIOD: 'transition/expire-review-period',
};

/**
 * States (local clarity only — not synced with API state names).
 */
export const states = {
  INITIAL: 'initial',
  INQUIRY: 'inquiry',
  PENDING_PAYMENT: 'pending-payment',
  PAYMENT_EXPIRED: 'payment-expired',
  PREAUTHORIZED: 'preauthorized',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  ACCEPTED: 'accepted',
  ACCEPTED_LATE: 'accepted-late',
  CANCELED: 'canceled', // full-refund cancellation (customer ≥48h / any provider / operator)
  CANCELLED_CHARGED: 'cancelled-charged', // customer <48h, no refund, model owed payout
  CANCELLED_CHARGED_PAID: 'cancelled-charged-paid',
  COMPLETED: 'completed', // shoot done, payout pending — dispute window
  DISPUTED_HOLD: 'disputed-hold',
  REFUNDED_DISPUTE: 'refunded-dispute',
  DELIVERED: 'delivered', // payout made; reviewable
  REVIEWED: 'reviewed',
  REVIEWED_BY_CUSTOMER: 'reviewed-by-customer',
  REVIEWED_BY_PROVIDER: 'reviewed-by-provider',
};

/**
 * Description of transaction process graph. Keep in sync with the pushed
 * `default-booking` version (booking-v2) — see ext/transaction-processes/booking-v2.
 */
export const graph = {
  // NOTE: update the release number to match the pushed booking-v2 version alias.
  id: 'default-booking/release-2',
  initial: states.INITIAL,
  states: {
    [states.INITIAL]: {
      on: {
        [transitions.INQUIRE]: states.INQUIRY,
        [transitions.REQUEST_PAYMENT]: states.PENDING_PAYMENT,
      },
    },
    [states.INQUIRY]: {
      on: {
        [transitions.REQUEST_PAYMENT_AFTER_INQUIRY]: states.PENDING_PAYMENT,
      },
    },
    [states.PENDING_PAYMENT]: {
      on: {
        [transitions.EXPIRE_PAYMENT]: states.PAYMENT_EXPIRED,
        [transitions.CONFIRM_PAYMENT]: states.PREAUTHORIZED,
      },
    },
    [states.PAYMENT_EXPIRED]: {},
    [states.PREAUTHORIZED]: {
      on: {
        [transitions.DECLINE]: states.DECLINED,
        [transitions.OPERATOR_DECLINE]: states.DECLINED,
        [transitions.EXPIRE]: states.EXPIRED,
        [transitions.ACCEPT]: states.ACCEPTED,
        [transitions.OPERATOR_ACCEPT]: states.ACCEPTED,
      },
    },
    [states.DECLINED]: {},
    [states.EXPIRED]: {},

    [states.ACCEPTED]: {
      on: {
        [transitions.ENTER_LATE]: states.ACCEPTED_LATE,
        [transitions.CUSTOMER_CANCEL]: states.CANCELED,
        [transitions.PROVIDER_CANCEL]: states.CANCELED,
        [transitions.OPERATOR_CANCEL]: states.CANCELED,
        [transitions.COMPLETE]: states.COMPLETED,
      },
    },
    [states.ACCEPTED_LATE]: {
      on: {
        [transitions.CUSTOMER_CANCEL_LATE]: states.CANCELLED_CHARGED,
        [transitions.PROVIDER_CANCEL_LATE]: states.CANCELED,
        [transitions.OPERATOR_CANCEL_LATE]: states.CANCELED,
        [transitions.COMPLETE_LATE]: states.COMPLETED,
      },
    },

    [states.CANCELED]: {},

    [states.CANCELLED_CHARGED]: {
      on: {
        [transitions.OPERATOR_CANCEL_CHARGED]: states.REFUNDED_DISPUTE,
        [transitions.PAYOUT_CANCELLED_CHARGED]: states.CANCELLED_CHARGED_PAID,
      },
    },
    [states.CANCELLED_CHARGED_PAID]: {},

    [states.COMPLETED]: {
      on: {
        [transitions.AUTO_PAYOUT]: states.DELIVERED,
        [transitions.OPERATOR_COMPLETE]: states.DELIVERED,
        [transitions.OPERATOR_DISPUTE_REFUND]: states.REFUNDED_DISPUTE,
        [transitions.OPERATOR_DISPUTE_HOLD]: states.DISPUTED_HOLD,
      },
    },
    [states.DISPUTED_HOLD]: {
      on: {
        [transitions.OPERATOR_HOLD_REFUND]: states.REFUNDED_DISPUTE,
        [transitions.OPERATOR_HOLD_RELEASE]: states.DELIVERED,
      },
    },
    [states.REFUNDED_DISPUTE]: {},

    [states.DELIVERED]: {
      on: {
        [transitions.EXPIRE_REVIEW_PERIOD]: states.REVIEWED,
        [transitions.REVIEW_1_BY_CUSTOMER]: states.REVIEWED_BY_CUSTOMER,
        [transitions.REVIEW_1_BY_PROVIDER]: states.REVIEWED_BY_PROVIDER,
      },
    },
    [states.REVIEWED_BY_CUSTOMER]: {
      on: {
        [transitions.REVIEW_2_BY_PROVIDER]: states.REVIEWED,
        [transitions.EXPIRE_PROVIDER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED_BY_PROVIDER]: {
      on: {
        [transitions.REVIEW_2_BY_CUSTOMER]: states.REVIEWED,
        [transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED]: { type: 'final' },
  },
};

// Transitions worth showing in the activity feed.
export const isRelevantPastTransition = transition => {
  return [
    transitions.ACCEPT,
    transitions.OPERATOR_ACCEPT,
    transitions.CONFIRM_PAYMENT,
    transitions.DECLINE,
    transitions.OPERATOR_DECLINE,
    transitions.EXPIRE,
    transitions.CUSTOMER_CANCEL,
    transitions.CUSTOMER_CANCEL_LATE,
    transitions.PROVIDER_CANCEL,
    transitions.PROVIDER_CANCEL_LATE,
    transitions.OPERATOR_CANCEL,
    transitions.OPERATOR_CANCEL_LATE,
    transitions.COMPLETE,
    transitions.COMPLETE_LATE,
    transitions.AUTO_PAYOUT,
    transitions.OPERATOR_COMPLETE,
    transitions.OPERATOR_DISPUTE_REFUND,
    transitions.OPERATOR_DISPUTE_HOLD,
    transitions.OPERATOR_HOLD_REFUND,
    transitions.OPERATOR_HOLD_RELEASE,
    transitions.OPERATOR_CANCEL_CHARGED,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
  ].includes(transition);
};

export const isCustomerReview = transition => {
  return [transitions.REVIEW_1_BY_CUSTOMER, transitions.REVIEW_2_BY_CUSTOMER].includes(transition);
};

export const isProviderReview = transition => {
  return [transitions.REVIEW_1_BY_PROVIDER, transitions.REVIEW_2_BY_PROVIDER].includes(transition);
};

// Privileged transitions must go through the trusted backend (line items set there).
export const isPrivileged = transition => {
  return [transitions.REQUEST_PAYMENT, transitions.REQUEST_PAYMENT_AFTER_INQUIRY].includes(
    transition
  );
};

// Booking is "over" (service delivered / paid out / reviewed).
export const isCompleted = transition => {
  const txCompletedTransitions = [
    transitions.COMPLETE,
    transitions.COMPLETE_LATE,
    transitions.AUTO_PAYOUT,
    transitions.OPERATOR_COMPLETE,
    transitions.OPERATOR_HOLD_RELEASE,
    transitions.PAYOUT_CANCELLED_CHARGED,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
    transitions.EXPIRE_REVIEW_PERIOD,
    transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD,
    transitions.EXPIRE_PROVIDER_REVIEW_PERIOD,
  ];
  return txCompletedTransitions.includes(transition);
};

// Transitions where action/stripe-refund-payment is called (client fully refunded).
// NOTE: CUSTOMER_CANCEL_LATE is deliberately absent — the <48h cancel issues no refund.
export const isRefunded = transition => {
  const txRefundedTransitions = [
    transitions.EXPIRE_PAYMENT,
    transitions.EXPIRE,
    transitions.DECLINE,
    transitions.OPERATOR_DECLINE,
    transitions.CUSTOMER_CANCEL,
    transitions.PROVIDER_CANCEL,
    transitions.PROVIDER_CANCEL_LATE,
    transitions.OPERATOR_CANCEL,
    transitions.OPERATOR_CANCEL_LATE,
    transitions.OPERATOR_DISPUTE_REFUND,
    transitions.OPERATOR_HOLD_REFUND,
    transitions.OPERATOR_CANCEL_CHARGED,
  ];
  return txRefundedTransitions.includes(transition);
};

export const statesNeedingProviderAttention = [states.PREAUTHORIZED];
