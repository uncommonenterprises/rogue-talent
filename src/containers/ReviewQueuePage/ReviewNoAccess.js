import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';

import { NamedLink } from '../../components';

import css from './ReviewNoAccess.module.css';

/**
 * R07 state 1: what anyone without review access sees on /review and /review/:userId. One
 * heading and one way out; no names, no mention of reviewers, and the same for real and made-up
 * links. The server sends the same response in every no-access case, so this never depends on
 * who the link is for.
 *
 * @component
 * @returns {JSX.Element}
 */
const ReviewNoAccess = () => (
  <div className={css.root}>
    <h1 className={css.title}>
      <FormattedMessage id="ReviewNoAccess.title" />
    </h1>
    <NamedLink name="LandingPage" className={css.homeLink}>
      <FormattedMessage id="ReviewNoAccess.homeLink" />
    </NamedLink>
  </div>
);

export default ReviewNoAccess;
