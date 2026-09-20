import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { Heading } from '../../../components';

import css from './TransactionPanel.module.css';

/**
 * SAF-11: Automatic private-residence safety advisory for the MODEL.
 *
 * When a booking's `location_type` is `private-residence`, the model sees calm,
 * practical safety guidance while reviewing/accepting the request and while the
 * booking is confirmed. This is advisory only — it never blocks the booking and
 * is not shown to the client.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.show - Whether to render the advisory
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @returns {JSX.Element|null}
 */
const SafetyAdvisoryMaybe = props => {
  const { show, className, rootClassName } = props;

  if (!show) {
    return null;
  }

  const classes = classNames(rootClassName || css.safetyAdvisory, className);

  return (
    <section className={classes}>
      <Heading as="h3" rootClassName={css.safetyAdvisoryHeading}>
        <FormattedMessage id="TransactionPanel.residenceAdvisoryHeading" />
      </Heading>
      <p className={css.safetyAdvisoryIntro}>
        <FormattedMessage id="TransactionPanel.residenceAdvisoryIntro" />
      </p>
      <ul className={css.safetyAdvisoryList}>
        <li>
          <FormattedMessage id="TransactionPanel.residenceAdvisoryTip1" />
        </li>
        <li>
          <FormattedMessage id="TransactionPanel.residenceAdvisoryTip2" />
        </li>
        <li>
          <FormattedMessage id="TransactionPanel.residenceAdvisoryTip3" />
        </li>
      </ul>
      <p className={css.safetyAdvisoryEmergency}>
        <FormattedMessage id="TransactionPanel.residenceAdvisoryEmergency" />
      </p>
    </section>
  );
};

export default SafetyAdvisoryMaybe;
