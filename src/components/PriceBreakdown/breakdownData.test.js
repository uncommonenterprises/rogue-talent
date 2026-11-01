import Decimal from 'decimal.js';

import { types as sdkTypes } from '../../util/sdkLoader';

import { getBreakdownData } from './breakdownData';

const { Money } = sdkTypes;
const gbp = n => new Money(n, 'GBP');

// Rogue Talent pricing: day rate x days, plus a 15% customer commission, 0% provider commission.
const lineItems = (dayRate, days, { providerCommission = true, reversal = false } = {}) => {
  const subtotal = dayRate * days;
  const fee = Math.round(subtotal * 0.15);
  return [
    {
      code: 'line-item/day',
      includeFor: ['customer', 'provider'],
      unitPrice: gbp(dayRate),
      quantity: new Decimal(days),
      lineTotal: gbp(subtotal),
      reversal: false,
    },
    {
      code: 'line-item/customer-commission',
      includeFor: ['customer'],
      unitPrice: gbp(subtotal),
      percentage: new Decimal(15),
      lineTotal: gbp(fee),
      reversal: false,
    },
    ...(providerCommission
      ? [
          {
            code: 'line-item/provider-commission',
            includeFor: ['provider'],
            unitPrice: gbp(subtotal),
            percentage: new Decimal(0),
            lineTotal: gbp(0),
            reversal: false,
          },
        ]
      : []),
    ...(reversal
      ? [
          {
            code: 'line-item/day',
            includeFor: ['customer', 'provider'],
            unitPrice: gbp(dayRate),
            quantity: new Decimal(-days),
            lineTotal: gbp(-subtotal),
            reversal: true,
          },
        ]
      : []),
  ];
};

describe('getBreakdownData (B05)', () => {
  it('client view: day rate x days, 15% fee, total', () => {
    const data = getBreakdownData(lineItems(45000, 2), 'customer');
    expect(data.unitPrice).toEqual(gbp(45000));
    expect(data.quantity).toEqual(2);
    expect(data.subtotal).toEqual(gbp(90000));
    expect(data.fee).toEqual(gbp(13500));
    expect(data.feePercentage).toEqual(15);
    expect(data.total).toEqual(gbp(103500));
    expect(data.hasRefunds).toBe(false);
  });

  it('keeps pence when the fee has some (day rate £225, 3 days)', () => {
    const data = getBreakdownData(lineItems(22500, 3), 'customer');
    expect(data.fee).toEqual(gbp(10125));
    expect(data.total).toEqual(gbp(77625));
  });

  it('model view: earns 100% of the rate, fee taken is 0', () => {
    const data = getBreakdownData(lineItems(45000, 2), 'provider');
    expect(data.subtotal).toEqual(gbp(90000));
    expect(data.fee).toEqual(gbp(0));
    expect(data.feePercentage).toEqual(0);
    expect(data.total).toEqual(gbp(90000));
  });

  it('model view without a provider commission line: fee 0, no percentage', () => {
    const data = getBreakdownData(lineItems(45000, 1, { providerCommission: false }), 'provider');
    expect(data.fee).toEqual(gbp(0));
    expect(data.feePercentage).toBeNull();
    expect(data.total).toEqual(gbp(45000));
  });

  it('flags refunds and returns null with no unit line item', () => {
    const refunded = getBreakdownData(lineItems(45000, 2, { reversal: true }), 'customer');
    expect(refunded.hasRefunds).toBe(true);
    expect(getBreakdownData([], 'customer')).toBeNull();
    expect(getBreakdownData(undefined, 'provider')).toBeNull();
  });
});
