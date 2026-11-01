import React from 'react';
import classNames from 'classnames';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage } from '../../util/reactIntl';
import { pathByRouteName } from '../../util/routes';
import { CONTRACT_CLAUSE_IDS } from '../../util/contracts';

import RtIcon from '../RtIcon/RtIcon';

import css from './LicenceSummary.module.css';

// The plain-English summary of the standard Content Licence & Model Release, in the words each
// side needs (B06 for the client, B08 for the model).
//
// LEGAL: this wording is DRAFT, pending legal review. It must stay marked as draft (the
// `draftNotice` prop) until a solicitor has signed off the licence and this summary.
export const LICENCE_POINT_IDS = {
  client: [
    'LicenceSummary.client.point1',
    'LicenceSummary.client.point2',
    'LicenceSummary.client.point3',
    'LicenceSummary.client.point4',
    'LicenceSummary.client.point5',
  ],
  model: [
    'LicenceSummary.model.point1',
    'LicenceSummary.model.point2',
    'LicenceSummary.model.point3',
    'LicenceSummary.model.point4',
  ],
};

const strong = text => <strong>{text}</strong>;

/**
 * "Read the full licence" before a booking exists (checkout): the full draft clauses, opened in
 * place. Once a booking exists, link to its ContractPage instead.
 *
 * @component
 * @returns {JSX.Element}
 */
export const FullLicenceDisclosure = () => (
  <details className={css.fullLicence}>
    <summary className={css.fullLicenceLink}>
      <FormattedMessage id="LicenceSummary.readFullLicence" />
    </summary>
    <ol className={css.clauses}>
      {CONTRACT_CLAUSE_IDS.map(({ heading, body }) => (
        <li key={heading}>
          <strong>
            <FormattedMessage id={heading} />
          </strong>{' '}
          <FormattedMessage id={body} />
        </li>
      ))}
    </ol>
  </details>
);

/**
 * "Read the full licence" for an existing booking: its contract, in a new tab.
 *
 * @component
 * @param {Object} props
 * @param {string} props.transactionId
 * @returns {JSX.Element}
 */
export const FullLicenceLink = ({ transactionId }) => {
  const routeConfiguration = useRouteConfiguration();
  const href = pathByRouteName('ContractPage', routeConfiguration, { id: transactionId });
  return (
    <a className={css.fullLicenceLink} href={href} target="_blank" rel="noopener noreferrer">
      <FormattedMessage id="LicenceSummary.readFullLicence" />
    </a>
  );
};

/**
 * The licence box: the draft notice, the plain-English points, then the way to the full licence.
 *
 * @component
 * @param {Object} props
 * @param {'client'|'model'} [props.audience] whose summary to show, default 'client'
 * @param {React.ReactNode} props.draftNotice the "draft, pending legal review" mark
 * @param {React.ReactNode} [props.fullLicence] "Read the full licence" (a link or a disclosure)
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
const LicenceSummary = props => {
  const { audience = 'client', draftNotice, fullLicence, className } = props;
  const ids = LICENCE_POINT_IDS[audience] || LICENCE_POINT_IDS.client;

  return (
    <div className={classNames(css.root, className)}>
      {draftNotice ? <p className={css.draftNotice}>{draftNotice}</p> : null}
      <ul className={css.points}>
        {ids.map(id => (
          <li key={id} className={css.point}>
            <RtIcon name="check" className={css.icon} />
            <span>
              <FormattedMessage id={id} values={{ strong }} />
            </span>
          </li>
        ))}
      </ul>
      {fullLicence}
    </div>
  );
};

export default LicenceSummary;
