// Which privileged transitions count as a payable booking request (and so must run the
// booking gates in transition-privileged).

const { isBookingRequestTransition, BOOKING_REQUEST_TRANSITIONS } = require('./bookingGates');

describe('isBookingRequestTransition', () => {
  it('covers booking after an enquiry and the negotiation pay-to-accept transition', () => {
    expect(isBookingRequestTransition('transition/request-payment-after-inquiry')).toBe(true);
    expect(isBookingRequestTransition('transition/request-payment-to-accept-offer')).toBe(true);
    expect(BOOKING_REQUEST_TRANSITIONS).toHaveLength(2);
  });

  it('does not cover non-booking transitions', () => {
    [
      'transition/accept',
      'transition/decline',
      'transition/make-offer-after-inquiry',
      'transition/customer-make-counter-offer',
      'transition/inquire',
      undefined,
      '',
    ].forEach(name => expect(isBookingRequestTransition(name)).toBe(false));
  });
});
