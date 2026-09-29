import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { isModelUser } from '../../util/accountStatus';
import { NamedLink } from '../../components';

import css from './MarketingNav.module.css';

// Logged-in actions (sign-up journey stage 1 follow-up): the site topbar's role-aware inbox
// link, plus a primary link to where the user works from. Models go to their profile; clients
// (and anyone whose role isn't known yet) go to browse talent.
const LoggedInActions = ({ currentUser }) => {
  const isModel = isModelUser(currentUser);
  const inboxLabelId = isModel ? 'TopbarDesktop.inboxRequests' : 'TopbarDesktop.inboxBookings';
  return (
    <>
      <NamedLink
        name="InboxPage"
        params={{ tab: isModel ? 'sales' : 'orders' }}
        className={css.signin}
      >
        <FormattedMessage id={inboxLabelId} />
      </NamedLink>
      {isModel ? (
        <NamedLink name="ManageListingsPage" className={css.cta}>
          <FormattedMessage id="MarketingNav.yourProfile" />
        </NamedLink>
      ) : (
        <NamedLink name="SearchPage" className={css.cta}>
          <FormattedMessage id="MarketingNav.browseTalent" />
        </NamedLink>
      )}
    </>
  );
};

/**
 * Marketing top nav for the hand-coded landing pages (general / models / clients).
 * Same nav across all three - only the active link and the primary CTA differ, driven by
 * the `page` prop. Rendered as the topbar of the marketing LayoutSingleColumn.
 *
 * Logged-out visitors get "Sign in" and the sign-up CTA; logged-in users get their inbox and
 * a link to their profile (models) or to browse talent (clients) instead.
 *
 * @param {Object} props
 * @param {'general'|'models'|'business'} props.page which landing page this is
 */
const MarketingNav = ({ page = 'general' }) => {
  const isAuthenticated = useSelector(state => !!state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);

  const cta =
    page === 'models'
      ? { label: 'Create your profile', to: 'SignupPage' }
      : page === 'business'
      ? { label: 'Create an account', to: 'SignupPage' }
      : { label: 'Join Rogue Talent', to: 'SignupPage' };

  const linkClass = active => classNames(css.link, { [css.linkActive]: active });

  return (
    <nav className={css.nav}>
      <NamedLink name="LandingPage" className={css.brand}>
        Rogue<span className={css.dot}>.</span>
      </NamedLink>

      <div className={css.links}>
        <NamedLink name="SearchPage" className={linkClass(page === 'general')}>
          Discover
        </NamedLink>
        <a href="/#how" className={css.link}>
          How it works
        </a>
        <NamedLink name="ForModelsPage" className={linkClass(page === 'models')}>
          For models
        </NamedLink>
        <NamedLink name="ForBusinessPage" className={linkClass(page === 'business')}>
          For business
        </NamedLink>
      </div>

      <div className={css.actions}>
        {isAuthenticated ? (
          <LoggedInActions currentUser={currentUser} />
        ) : (
          <>
            <NamedLink name="LoginPage" className={css.signin}>
              Sign in
            </NamedLink>
            <NamedLink name={cta.to} className={css.cta}>
              {cta.label}
            </NamedLink>
          </>
        )}
      </div>
    </nav>
  );
};

export default MarketingNav;
