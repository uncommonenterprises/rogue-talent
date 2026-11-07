import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { getTimeAgo } from '../../util/reviewTool';

import css from './ReviewTimeAgo.module.css';

/**
 * "3 days ago" for the review tool. Amber and bold when the wait is over 1 working day
 * (computed on the server, weekends excluded); amber only, never red (Neil, 07/11/2026).
 *
 * @component
 * @param {Object} props
 * @param {string} props.value ISO date
 * @param {boolean} [props.overdue]
 * @param {string} [props.className]
 * @returns {JSX.Element|null}
 */
const ReviewTimeAgo = ({ value, overdue = false, className }) => {
  const ago = getTimeAgo(value);
  if (!ago) {
    return null;
  }
  const id =
    ago.unit === 'justNow'
      ? 'ReviewTool.justNow'
      : ago.unit === 'hours'
      ? 'ReviewTool.hoursAgo'
      : 'ReviewTool.daysAgo';
  return (
    <span className={classNames(css.root, { [css.overdue]: overdue }, className)}>
      <FormattedMessage id={id} values={{ count: ago.count }} />
      {overdue ? (
        <span className={css.srOnly}>
          <FormattedMessage id="ReviewTool.overdueSr" />
        </span>
      ) : null}
    </span>
  );
};

export default ReviewTimeAgo;
