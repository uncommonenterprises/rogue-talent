/**
 * Numbers for the booking price breakdown (B05). Pure functions, no React.
 *
 * Works on Sharetribe line items, either the estimated ones (booking panel, from the server's
 * line-items endpoint) or a transaction's own (checkout, booking page).
 */
import Decimal from 'decimal.js';

import { types as sdkTypes } from '../../util/sdkLoader';
import {
  LINE_ITEM_CUSTOMER_COMMISSION,
  LINE_ITEM_PROVIDER_COMMISSION,
  LISTING_UNIT_TYPES,
} from '../../util/types';

const { Money } = sdkTypes;

const toDecimal = v => new Decimal(v instanceof Decimal ? v.toString() : v ?? 0);
const amountOf = money => (money instanceof Money ? money.amount : 0);

/**
 * @param {Array<Object>} lineItems all line items (both roles)
 * @param {'customer'|'provider'} role whose view to build
 * @returns {Object|null} null if there is no unit line item (nothing to show). Otherwise:
 *   { unitPrice, quantity, subtotal, fee, feePercentage, total, hasRefunds, currency }
 *   - unitPrice, subtotal: the day rate and day rate x days
 *   - fee: the booking fee the client pays (customer view) or the fee taken from the model
 *     (provider view, shown as a positive amount, normally 0)
 *   - feePercentage: the fee's percentage as a number (e.g. 15), or null
 *   - total: what the client pays (customer) or what the model earns (provider)
 *   - hasRefunds: true if any line item is a reversal (cancelled or refunded booking)
 */
export const getBreakdownData = (lineItems = [], role = 'customer') => {
  const forRole = (lineItems || []).filter(item => (item.includeFor || []).includes(role));
  const isUnit = item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal;
  const unit = forRole.find(isUnit);
  if (!unit || !(unit.unitPrice instanceof Money)) {
    return null;
  }
  const currency = unit.unitPrice.currency;
  const feeCode =
    role === 'customer' ? LINE_ITEM_CUSTOMER_COMMISSION : LINE_ITEM_PROVIDER_COMMISSION;
  const feeItem = forRole.find(item => item.code === feeCode && !item.reversal);

  const sum = items =>
    items.reduce((acc, item) => acc.plus(amountOf(item.lineTotal)), new Decimal(0));
  const subtotalAmount = sum(forRole.filter(isUnit));
  const feeAmount = feeItem ? new Decimal(amountOf(feeItem.lineTotal)).abs() : new Decimal(0);
  const totalAmount = sum(forRole);
  const feePercentage =
    feeItem && feeItem.percentage != null
      ? toDecimal(feeItem.percentage)
          .abs()
          .toNumber()
      : null;

  return {
    currency,
    unitPrice: unit.unitPrice,
    quantity: toDecimal(unit.quantity).toNumber(),
    subtotal: new Money(subtotalAmount.toNumber(), currency),
    fee: new Money(feeAmount.toNumber(), currency),
    feePercentage,
    total: new Money(totalAmount.toNumber(), currency),
    hasRefunds: forRole.some(item => item.reversal),
  };
};
