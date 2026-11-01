import enMessages from '../translations/en.json';
import { states } from '../transactions/transactionProcessBooking';

import {
  BOOKING_STATUS,
  STATE_TO_STATUS,
  getBannerMessageIds,
  getBookingStatus,
  getHoursLeft,
  getNextSteps,
  getRowNoteId,
} from './bookingStatus';

const customer = state => getBookingStatus({ state, role: 'customer' });
const provider = state => getBookingStatus({ state, role: 'provider' });

describe('booking status mapping (B09)', () => {
  it('maps every booking process state, except the initial one', () => {
    const mapped = Object.values(states).filter(s => s !== states.INITIAL);
    mapped.forEach(state => {
      expect(STATE_TO_STATUS[state]).toBeTruthy();
    });
  });

  it('uses the B09 table: one label for both sides', () => {
    const table = {
      preauthorized: 'requested',
      accepted: 'accepted',
      'accepted-late': 'accepted',
      completed: 'completed',
      delivered: 'completed',
      'reviewed-by-customer': 'completed',
      'reviewed-by-provider': 'completed',
      reviewed: 'completed',
      declined: 'declined',
      expired: 'expired',
      canceled: 'cancelled',
      'cancelled-charged': 'cancelled',
      'cancelled-charged-paid': 'cancelled',
      withdrawn: 'cancelled',
      'disputed-hold': 'underReview',
      'refunded-dispute': 'refunded',
    };
    Object.entries(table).forEach(([state, status]) => {
      expect(customer(state).status).toBe(status);
      expect(provider(state).status).toBe(status);
      expect(customer(state).labelId).toBe(provider(state).labelId);
    });
  });

  it('chip colours: amber waiting, green confirmed, cobalt tint done, grey ended, no red', () => {
    expect(customer('preauthorized').chip).toBe('requested');
    expect(customer('disputed-hold').chip).toBe('review');
    expect(customer('accepted').chip).toBe('accepted');
    expect(customer('reviewed').chip).toBe('completed');
    expect(customer('declined').chip).toBe('declined');
    expect(customer('expired').chip).toBe('expired');
    expect(customer('withdrawn').chip).toBe('cancelled');
    expect(customer('refunded-dispute').chip).toBe('cancelled');
  });

  it('the model never sees the client’s payment steps', () => {
    expect(customer('pending-payment').status).toBe(BOOKING_STATUS.FINISH_REQUEST);
    expect(customer('payment-expired').status).toBe(BOOKING_STATUS.PAYMENT_EXPIRED);
    expect(provider('pending-payment')).toBeNull();
    expect(provider('payment-expired')).toBeNull();
  });

  it('flags late acceptance, withdrawal and a due review', () => {
    expect(customer('accepted-late').isLate).toBe(true);
    expect(customer('accepted').isLate).toBe(false);
    expect(customer('withdrawn').isWithdrawn).toBe(true);
    // The client can review once paid out, until they have reviewed.
    expect(customer('delivered').reviewDue).toBe(true);
    expect(customer('reviewed-by-provider').reviewDue).toBe(true);
    expect(customer('reviewed-by-customer').reviewDue).toBe(false);
    expect(customer('completed').reviewDue).toBe(false);
    // And the model likewise.
    expect(provider('reviewed-by-customer').reviewDue).toBe(true);
    expect(provider('reviewed-by-provider').reviewDue).toBe(false);
  });

  it('tells an operator decline apart from the model declining', () => {
    const byTeam = getBookingStatus({
      state: 'declined',
      role: 'provider',
      lastTransition: 'transition/operator-decline',
    });
    expect(byTeam.status).toBe('declined');
    expect(byTeam.variant).toBe('declinedByTeam');
    expect(provider('declined').variant).toBe('declined');
  });

  it('Q9: a withdrawn request is Cancelled with its own sentence on each side', () => {
    const c = customer('withdrawn');
    const p = provider('withdrawn');
    expect(c.status).toBe('cancelled');
    expect(getRowNoteId(c, 'customer')).toBe('BookingStatus.note.customer.withdrawn');
    expect(getRowNoteId(p, 'provider')).toBe('BookingStatus.note.provider.withdrawn');
    expect(enMessages['BookingStatus.note.provider.withdrawn']).toBe(
      'Withdrawn by the client. Not charged.'
    );
  });

  it('cancelled rows state the money outcome', () => {
    expect(getRowNoteId(customer('canceled'), 'customer')).toBe(
      'BookingStatus.note.customer.cancelledRefunded'
    );
    expect(getRowNoteId(customer('cancelled-charged'), 'customer')).toBe(
      'BookingStatus.note.customer.cancelledCharged'
    );
    expect(getRowNoteId(provider('cancelled-charged'), 'provider')).toBe(
      'BookingStatus.note.provider.cancelledCharged'
    );
  });

  it('"Review due" replaces the row sentence while a review is possible', () => {
    expect(getRowNoteId(customer('delivered'), 'customer')).toBe('BookingStatus.note.reviewDue');
    expect(getRowNoteId(customer('reviewed'), 'customer')).toBeNull();
    expect(getRowNoteId(customer('completed'), 'customer')).toBeNull();
    expect(getRowNoteId(provider('completed'), 'provider')).toBe(
      'BookingStatus.note.provider.completed'
    );
  });

  it('a Requested row without a known deadline still says the client is not charged', () => {
    expect(getRowNoteId(customer('preauthorized'), 'customer', false)).toBe(
      'BookingStatus.note.customer.requestedNoDeadline'
    );
    expect(getRowNoteId(provider('preauthorized'), 'provider', false)).toBeNull();
  });

  it('banners: none for Requested (B07, B08 pages), one for every ended or active state', () => {
    expect(getBannerMessageIds(customer('preauthorized'), 'customer')).toBeNull();
    expect(getBannerMessageIds(provider('preauthorized'), 'provider')).toBeNull();
    expect(getBannerMessageIds(customer('accepted-late'), 'customer')).toEqual({
      titleId: 'BookingStatus.banner.customer.accepted.title',
      bodyId: 'BookingStatus.banner.customer.accepted.body',
    });
    expect(getBannerMessageIds(provider('withdrawn'), 'provider').titleId).toBe(
      'BookingStatus.banner.provider.withdrawn.title'
    );
  });

  it('every message id the mapping can produce exists in en.json, with no em dashes', () => {
    const roles = ['customer', 'provider'];
    const lastTransitions = [undefined, 'transition/operator-decline'];
    Object.keys(STATE_TO_STATUS).forEach(state => {
      roles.forEach(role => {
        lastTransitions.forEach(lastTransition => {
          const s = getBookingStatus({ state, role, lastTransition });
          if (!s) {
            return;
          }
          const ids = [s.labelId, getRowNoteId(s, role), getRowNoteId(s, role, false)];
          const banner = getBannerMessageIds(s, role);
          if (banner) {
            ids.push(banner.titleId, banner.bodyId);
          }
          ids.filter(Boolean).forEach(id => {
            expect([id, typeof enMessages[id]]).toEqual([id, 'string']);
            expect(enMessages[id]).not.toContain('—');
          });
        });
      });
    });
  });

  it('next steps: find another model after an ended request, ask again after expiry', () => {
    expect(getNextSteps(customer('declined'), 'customer')).toEqual({
      findAnother: true,
      requestAgain: false,
    });
    expect(getNextSteps(customer('expired'), 'customer')).toEqual({
      findAnother: true,
      requestAgain: true,
    });
    expect(getNextSteps(provider('expired'), 'provider')).toEqual({
      findAnother: false,
      requestAgain: false,
    });
    expect(getNextSteps(customer('accepted'), 'customer').findAnother).toBe(false);
  });
});

describe('getHoursLeft', () => {
  const deadline = new Date(Date.UTC(2026, 10, 3, 16, 20));
  it('counts whole hours left', () => {
    const now = new Date(Date.UTC(2026, 10, 1, 16, 50));
    expect(getHoursLeft(deadline, now)).toBe(47);
  });
  it('never goes below zero', () => {
    expect(getHoursLeft(deadline, new Date(Date.UTC(2026, 10, 4)))).toBe(0);
  });
  it('is null without a deadline or a clock', () => {
    expect(getHoursLeft(null, new Date())).toBeNull();
    expect(getHoursLeft(deadline, null)).toBeNull();
  });
});
