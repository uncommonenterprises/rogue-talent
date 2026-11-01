import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatMoneyCompact } from '../../util/currency';

import Notice from '../Notice/Notice';

import { getBreakdownData } from './breakdownData';

import css from './PriceBreakdown.module.css';

const Row = ({ label, value, isTotal = false }) => (
  <div className={isTotal ? css.rowTotal : css.row}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

/**
 * Booking price breakdown (B05), one component for the booking panel, the phone sheet, checkout
 * and the booking page. Day rate x days, then the booking fee, then the total; pence only when
 * needed.
 *
 * - Client view: "£450 x 2 days", "Booking fee (15%)", "Total", then a plain sentence that the
 *   model keeps 100% of the day rate, and whether travel is included.
 * - Model view: "£450 x 2 days", "Fee taken from you £0", "You'll earn", then "That is 100% of
 *   your rate..." with the payout promise. The model never sees the client's total.
 *
 * Returns null when there is nothing to show, or when the booking has refunds (callers keep the
 * detailed receipt for those).
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.lineItems transaction or estimated line items
 * @param {'customer'|'provider'} [props.role] default 'customer'
 * @param {string} [props.modelName] the model's first name, for the sentences
 * @param {string} [props.travelFeePolicy] the model's `travel_fee_policy` ('included' |
 *   'charged-separately'); omitted = no travel sentence
 * @param {Array<{key: string, label: React.ReactNode, value: string}>} [props.extraRows] rows
 *   to add before the total (room for a future travel line, no rework needed)
 * @param {React.ReactNode} [props.notePrefix] text shown before the note (e.g. "Not charged
 *   unless Ava accepts.")
 * @param {boolean} [props.showNote] default true
 * @param {string} [props.className]
 * @returns {JSX.Element|null}
 */
const PriceBreakdown = props => {
  const intl = useIntl();
  const {
    lineItems,
    role = 'customer',
    modelName = '',
    travelFeePolicy,
    extraRows = [],
    notePrefix,
    showNote = true,
    className,
  } = props;

  const data = getBreakdownData(lineItems, role);
  if (!data || data.hasRefunds) {
    return null;
  }

  const money = m => formatMoneyCompact(intl, m);
  const isCustomer = role === 'customer';
  const unitLabel = intl.formatMessage(
    { id: 'OrderBreakdown.baseUnitDay' },
    { unitPrice: money(data.unitPrice), quantity: data.quantity }
  );
  const feeLabel = isCustomer
    ? data.feePercentage != null
      ? intl.formatMessage({ id: 'PriceBreakdown.bookingFee' }, { percentage: data.feePercentage })
      : intl.formatMessage({ id: 'PriceBreakdown.bookingFeeNoPercentage' })
    : intl.formatMessage({ id: 'PriceBreakdown.feeTakenFromYou' });
  const totalLabel = isCustomer
    ? intl.formatMessage({ id: 'PriceBreakdown.total' })
    : intl.formatMessage({ id: 'OrderBreakdown.providerTotalDefault' });

  // The model's note names the client's fee, which only the client's line items carry (the
  // provider's copy of the transaction may not include them; 15% is the configured default).
  const clientFeePercentage = isCustomer
    ? data.feePercentage
    : getBreakdownData(lineItems, 'customer')?.feePercentage ?? 15;

  const travelCharged = isCustomer && travelFeePolicy === 'charged-separately';
  const travelIncluded = isCustomer && travelFeePolicy === 'included';

  return (
    <div className={classNames(css.root, className)}>
      <dl className={css.rows}>
        <Row label={unitLabel} value={money(data.subtotal)} />
        <Row label={feeLabel} value={money(data.fee)} />
        {extraRows.map(r => (
          <Row key={r.key} label={r.label} value={r.value} />
        ))}
        <Row label={totalLabel} value={money(data.total)} isTotal />
      </dl>

      {travelCharged ? (
        <Notice>
          <p>
            <FormattedMessage
              id="PriceBreakdown.travelNotIncluded"
              values={{ name: modelName, strong: text => <strong>{text}</strong> }}
            />
          </p>
        </Notice>
      ) : null}

      {showNote ? (
        <p className={css.note}>
          {notePrefix ? <>{notePrefix} </> : null}
          {isCustomer ? (
            <>
              <FormattedMessage
                id="PriceBreakdown.customerNote"
                values={{ name: modelName, amount: money(data.subtotal) }}
              />
              {travelIncluded ? (
                <>
                  {' '}
                  <FormattedMessage id="PriceBreakdown.travelIncluded" />
                </>
              ) : null}
            </>
          ) : (
            <FormattedMessage
              id="PriceBreakdown.providerNote"
              values={{ percentage: clientFeePercentage }}
            />
          )}
        </p>
      ) : null}
    </div>
  );
};

export default PriceBreakdown;
