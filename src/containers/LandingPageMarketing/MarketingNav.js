import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { pathByRouteName } from '../../util/routes';
import { isAccountStatusFlowEnabled, isModelUser } from '../../util/accountStatus';
import { isClientUser } from '../../util/userHelpers';
import { showProfileSettingsForUser } from '../../util/settingsPages';
import { useMounted } from '../../util/useMounted';
import { logout } from '../../ducks/auth.duck';
import {
  Avatar,
  InlineTextButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  NamedLink,
} from '../../components';

import css from './MarketingNav.module.css';

// Logged-in actions (sign-up journey stage 1 follow-up): the site topbar's role-aware inbox
// link, plus a primary link to where the user works from. Models go to their profile; clients
// (and anyone whose role isn't known yet) go to browse talent.
// Run-through M4: on phones the marketing nav had no way to reach account status, settings or
// log out. A compact avatar menu (the same links as the site topbar's profile menu) replaces the
// inbox text link there, which moves into the menu.
const AccountMenu = ({ currentUser, isModel, inboxLabelId }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const routeConfiguration = useRouteConfiguration();
  const showAccountStatus = isAccountStatusFlowEnabled() && (isModel || isClientUser(currentUser));

  const handleLogout = () => {
    dispatch(logout()).then(() => {
      // As in the site topbar: a full page load so no signed-in data stays in memory.
      if (typeof window !== 'undefined') {
        window.location = pathByRouteName('LandingPage', routeConfiguration);
      }
    });
  };

  const item = (key, name, labelId, params) => (
    <MenuItem key={key}>
      <NamedLink className={css.menuLink} name={name} params={params}>
        <FormattedMessage id={labelId} />
      </NamedLink>
    </MenuItem>
  );

  return (
    <div className={css.accountMenu}>
      <Menu contentPlacementOffset={0}>
        <MenuLabel
          className={css.accountMenuLabel}
          ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.profileMenu' })}
        >
          <Avatar className={css.avatar} user={currentUser} disableProfileLink />
        </MenuLabel>
        <MenuContent className={css.accountMenuContent}>
          {[
            ...(showAccountStatus
              ? [item('status', 'AccountStatusPage', 'TopbarMobileMenu.accountStatusLink')]
              : []),
            item('inbox', 'InboxPage', inboxLabelId, { tab: isModel ? 'sales' : 'orders' }),
            // Tester F F5 part C: models have no Profile settings page.
            ...(showProfileSettingsForUser(currentUser)
              ? [item('profile', 'ProfileSettingsPage', 'TopbarDesktop.profileSettingsLink')]
              : []),
            item('account', 'AccountSettingsPage', 'TopbarDesktop.accountSettingsLink'),
            <MenuItem key="logout">
              <InlineTextButton rootClassName={css.menuLink} onClick={handleLogout}>
                <FormattedMessage id="TopbarDesktop.logout" />
              </InlineTextButton>
            </MenuItem>,
          ]}
        </MenuContent>
      </Menu>
    </div>
  );
};

const LoggedInActions = ({ currentUser }) => {
  const isModel = isModelUser(currentUser);
  const inboxLabelId = isModel ? 'TopbarDesktop.inboxRequests' : 'TopbarDesktop.inboxBookings';
  return (
    <>
      <NamedLink
        name="InboxPage"
        params={{ tab: isModel ? 'sales' : 'orders' }}
        className={classNames(css.signin, css.inboxLink)}
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
      <AccountMenu currentUser={currentUser} isModel={isModel} inboxLabelId={inboxLabelId} />
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
  // The server renders logged out; show the logged-in actions once the page has hydrated so the
  // first browser render matches the server HTML (see util/useMounted.js).
  const mounted = useMounted();
  const isAuthenticatedInStore = useSelector(state => !!state.auth?.isAuthenticated);
  const isAuthenticated = mounted && isAuthenticatedInStore;
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
