import React from 'react';
import '@testing-library/jest-dom';
import Decimal from 'decimal.js';

import { renderWithProviders as render } from '../../util/testHelpers';
import { types as sdkTypes } from '../../util/sdkLoader';
import enMessages from '../../translations/en.json';

import PriceBreakdown from './PriceBreakdown';

const { Money } = sdkTypes;
const gbp = n => new Money(n, 'GBP');

const lineItems = [
  {
    code: 'line-item/day',
    includeFor: ['customer', 'provider'],
    unitPrice: gbp(45000),
    quantity: new Decimal(2),
    lineTotal: gbp(90000),
    reversal: false,
  },
  {
    code: 'line-item/customer-commission',
    includeFor: ['customer'],
    unitPrice: gbp(90000),
    percentage: new Decimal(15),
    lineTotal: gbp(13500),
    reversal: false,
  },
  {
    code: 'line-item/provider-commission',
    includeFor: ['provider'],
    unitPrice: gbp(90000),
    percentage: new Decimal(0),
    lineTotal: gbp(0),
    reversal: false,
  },
];

const keys = [
  'OrderBreakdown.baseUnitDay',
  'OrderBreakdown.providerTotalDefault',
  'PriceBreakdown.bookingFee',
  'PriceBreakdown.feeTakenFromYou',
  'PriceBreakdown.total',
  'PriceBreakdown.customerNote',
  'PriceBreakdown.providerNote',
  'PriceBreakdown.travelIncluded',
  'PriceBreakdown.travelNotIncluded',
];
const messages = Object.fromEntries(keys.map(k => [k, enMessages[k]]));

describe('PriceBreakdown (B05)', () => {
  it('client view: rows, total and the "keeps 100%" sentence, no ".00"', () => {
    const { getByText, container } = render(
      <PriceBreakdown lineItems={lineItems} modelName="Ava" travelFeePolicy="included" />,
      { messages }
    );
    expect(getByText('£450 x 2 days')).toBeInTheDocument();
    expect(getByText('£900')).toBeInTheDocument();
    expect(getByText('Booking fee (15%)')).toBeInTheDocument();
    expect(getByText('£135')).toBeInTheDocument();
    expect(getByText('£1,035')).toBeInTheDocument();
    expect(container.textContent).toContain(
      'The booking fee is how Rogue Talent is paid. Ava keeps 100% of the day rate (£900). Travel is included in the rate.'
    );
    expect(container.textContent).not.toContain('—');
  });

  it('client view with travel charged separately says the total is not the whole cost', () => {
    const { container } = render(
      <PriceBreakdown lineItems={lineItems} modelName="Ava" travelFeePolicy="charged-separately" />,
      { messages }
    );
    expect(container.textContent).toContain('Travel is not included.');
    expect(container.textContent).toContain('Ava charges travel separately');
    expect(container.textContent).not.toContain('Travel is included in the rate.');
  });

  it('model view: fee taken £0, earns 100%, never the client total', () => {
    const { getByText, queryByText, container } = render(
      <PriceBreakdown lineItems={lineItems} role="provider" />,
      { messages }
    );
    expect(getByText('Fee taken from you')).toBeInTheDocument();
    expect(getByText('£0')).toBeInTheDocument();
    expect(getByText("You'll earn")).toBeInTheDocument();
    expect(queryByText('£1,035')).not.toBeInTheDocument();
    expect(container.textContent).toContain('The client pays the 15% booking fee on top of it.');
  });

  it('renders nothing without a unit line item', () => {
    const { container } = render(<PriceBreakdown lineItems={[]} />, { messages });
    expect(container.firstChild).toBeNull();
  });
});
