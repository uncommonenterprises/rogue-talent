import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import { NamedLink } from '../../../components';

import css from './RequestSent.module.css';

/**
 * What was agreed (B07 summary): dates, shoot type, where (location type and the address, which
 * only the client and the model see) and the content licence the client agreed to at checkout.
 *
 * @component
 */
const BookingSummaryRows = props => {
  const {
    datesLabel,
    dayCountLabel,
    shootTypeLabel,
    locationTypeLabel,
    shootAddress,
    licenceAgreedLabel,
    transactionId,
  } = props;

  const row = (labelId, value, small) =>
    value ? (
      <div className={css.kvRow}>
        <dt>
          <FormattedMessage id={labelId} />
        </dt>
        <dd>
          {value}
          {small ? <small>{small}</small> : null}
        </dd>
      </div>
    ) : null;

  return (
    <dl className={css.kvRows}>
      {row('BookingCheckout.datesLabel', datesLabel, dayCountLabel)}
      {row('RequestSent.shootLabel', shootTypeLabel)}
      {row('RequestSent.whereLabel', locationTypeLabel || shootAddress, locationTypeLabel ? shootAddress : null)}
      {row(
        'RequestSent.licenceLabel',
        licenceAgreedLabel,
        transactionId ? (
          <NamedLink name="ContractPage" params={{ id: transactionId }}>
            <FormattedMessage id="RequestSent.viewLicence" />
          </NamedLink>
        ) : null
      )}
    </dl>
  );
};

export default BookingSummaryRows;
