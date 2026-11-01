import { getBillingDetails } from './CheckoutPageTransactionHelpers';

const currentUser = { attributes: { email: 'ben@example.com' } };

describe('getBillingDetails (B06 billing, open question 4)', () => {
  it('booking checkout: name, email, postcode and country only', () => {
    expect(
      getBillingDetails({ name: 'Ben Carter', postal: ' m1 1ae ', country: 'GB' }, currentUser)
    ).toEqual({
      name: 'Ben Carter',
      email: 'ben@example.com',
      address: { postal_code: 'M1 1AE', country: 'GB' },
    });
  });

  it('sends no address when neither postcode nor country is given', () => {
    expect(getBillingDetails({ name: 'Ben Carter' }, currentUser)).toEqual({
      name: 'Ben Carter',
      email: 'ben@example.com',
    });
  });

  it('keeps the full template address when a street address is given', () => {
    const details = getBillingDetails(
      {
        name: 'A',
        addressLine1: '1 Street',
        addressLine2: '',
        postal: 'M1 1AE',
        city: 'Manchester',
        state: '',
        country: 'GB',
      },
      currentUser
    );
    expect(details.address).toEqual({
      city: 'Manchester',
      country: 'GB',
      line1: '1 Street',
      line2: '',
      postal_code: 'M1 1AE',
      state: '',
    });
  });
});
