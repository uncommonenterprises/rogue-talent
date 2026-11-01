import Decimal from 'decimal.js';

import { types as sdkTypes } from '../../util/sdkLoader';

import PriceBreakdown from './PriceBreakdown';

const { Money } = sdkTypes;
const gbp = n => new Money(n, 'GBP');

// Day rate x days, 15% customer commission, 0% provider commission (Rogue Talent pricing).
const lineItems = (dayRate, days) => {
  const subtotal = dayRate * days;
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
      lineTotal: gbp(Math.round(subtotal * 0.15)),
      reversal: false,
    },
    {
      code: 'line-item/provider-commission',
      includeFor: ['provider'],
      unitPrice: gbp(subtotal),
      percentage: new Decimal(0),
      lineTotal: gbp(0),
      reversal: false,
    },
  ];
};

export const ClientTravelIncluded = {
  component: PriceBreakdown,
  props: { lineItems: lineItems(45000, 2), modelName: 'Ava', travelFeePolicy: 'included' },
  group: 'payment',
};

export const ClientTravelSeparate = {
  component: PriceBreakdown,
  props: {
    lineItems: lineItems(45000, 2),
    modelName: 'Ava',
    travelFeePolicy: 'charged-separately',
  },
  group: 'payment',
};

export const Model = {
  component: PriceBreakdown,
  props: { lineItems: lineItems(45000, 2), role: 'provider' },
  group: 'payment',
};

export const ClientWithPence = {
  component: PriceBreakdown,
  props: { lineItems: lineItems(22500, 3), modelName: 'Ava' },
  group: 'payment',
};
