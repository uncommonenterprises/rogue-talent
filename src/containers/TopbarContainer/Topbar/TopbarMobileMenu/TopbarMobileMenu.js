/**
 *  TopbarMobileMenu prints the menu content for authenticated user or
 * shows login actions for those who are not authenticated.
 */
import React from 'react';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import { FormattedMessage } from '../../../../util/reactIntl';
import { ensureCurrentUser } from '../../../../util/data';

import { primaryActionLink } from '../TopbarDesktop/CustomLinksMenu/PriorityLinks';

import {
  AvatarLarge,
  ExternalLink,
  InlineTextButton,
  NamedLink,
  NotificationBadge,
} from '../../../../components';

import css from './TopbarMobileMenu.module.css';

const CustomLinkComponent = ({ linkConfig, currentPage }) => {
  const { group, text, type, href, route } = linkConfig;
  const getCurrentPageClass = page => {
    const hasPageName = name => currentPage?.indexOf(name) === 0;
    const isCMSPage = pageId => hasPageName('CMSPage') && currentPage === `${page}:${pageId}`;
    const isInboxPage = tab => hasPageName('InboxPage') && currentPage === `${page}:${tab}`;
    const isCurrentPage = currentPage === page;

    return isCMSPage(route?.params?.pageId) || isInboxPage(route?.params?.tab) || isCurrentPage
      ? css.currentPage
      : null;
  };

  // Note: if the config contains 'route' keyword,
  // then in-app linking config has been resolved already.
  if (type === 'internal' && route) {
    // Internal link
    const { name, params, to } = route || {};
    const className = classNames(css.navigationLink, getCurrentPageClass(name));
    return (
      <li className={className}>
        <NamedLink name={name} params={params} to={to}>
          <span className={css.menuItemBorder} />
          {text}
        </NamedLink>
      </li>
    );
  }
  return (
    <li className={css.navigationLink}>
      <ExternalLink href={href}>
        <span className={css.menuItemBorder} />
        {text}
      </ExternalLink>
    </li>
  );
};

/**
 * Menu for mobile layout (opens through hamburger icon)
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isAuthenticated
 * @param {string?} props.currentPage
 * @param {boolean} props.currentUserHasListings
 * @param {Object?} props.currentUser API entity
 * @param {number} props.notificationCount
 * @param {Array<Object>} props.customLinks Contains object like { group, text, type, href, route }
 * @param {Function} props.onLogout
 * @param {Object} props.primaryLink the primary provider action (see primaryActionLink)
 * @param {boolean} props.showAccountStatusLink add the "Account status" link
 * @param {boolean} [props.showProfileSettingsLink] add the "Profile settings" link (default true;
 *   models don't get it, see util/settingsPages.js)
 * @param {boolean} [props.showReviewQueueLink] add the "Review queue" link (reviewers and admins)
 * @returns {JSX.Element} search icon
 */
const TopbarMobileMenu = props => {
  const {
    isAuthenticated,
    currentPage,
    inboxTab,
    currentUser,
    isProvider,
    isCustomer,
    notificationCount = 0,
    customLinks,
    onLogout,
    showCreateListingsLink,
    primaryLink: primaryLinkProp,
    showAccountStatusLink = false,
    showProfileSettingsLink = true,
    showReviewQueueLink = false,
  } = props;

  const user = ensureCurrentUser(currentUser);

  // Role-aware inbox label: providers (models) see "Requests", customers "My bookings".
  const inboxLabelId = isProvider
    ? 'TopbarDesktop.inboxRequests'
    : isCustomer
    ? 'TopbarDesktop.inboxBookings'
    : 'TopbarMobileMenu.inboxLink';

  const extraLinks = customLinks.map((linkConfig, index) => {
    return (
      <CustomLinkComponent
        key={`${linkConfig.text}_${index}`}
        linkConfig={linkConfig}
        currentPage={currentPage}
      />
    );
  });

  // Run-through finding 2 (M3): a model who already has a profile gets "Your profile" in the
  // list below (to their draft or the dashboard) and no big "Create your profile" button.
  const primaryLink = primaryLinkProp || primaryActionLink();
  const createListingsLinkMaybe =
    showCreateListingsLink && !primaryLink.hasProfile ? (
      <NamedLink
        className={css.createNewListingLink}
        name={primaryLink.name}
        params={primaryLink.params}
      >
        <FormattedMessage id={primaryLink.labelId} />
      </NamedLink>
    ) : null;

  if (!isAuthenticated) {
    const signup = (
      <NamedLink name="SignupPage" className={css.signupLink}>
        <FormattedMessage id="TopbarMobileMenu.signupLink" />
      </NamedLink>
    );

    const login = (
      <NamedLink name="LoginPage" className={css.loginLink}>
        <FormattedMessage id="TopbarMobileMenu.loginLink" />
      </NamedLink>
    );

    const signupOrLogin = (
      <span className={css.authenticationLinks}>
        <FormattedMessage
          id="TopbarMobileMenu.signupOrLogin"
          values={{ lineBreak: <br />, signup, login }}
        />
      </span>
    );
    return (
      <nav className={css.root}>
        <div className={css.content}>
          <div className={css.authenticationGreeting}>
            <FormattedMessage
              id="TopbarMobileMenu.unauthorizedGreeting"
              values={{ lineBreak: <br />, signupOrLogin }}
            />
          </div>

          <ul className={css.customLinksWrapper}>{extraLinks}</ul>

          <div className={css.spacer} />
        </div>
        <div className={css.footer}>{createListingsLinkMaybe}</div>
      </nav>
    );
  }

  const notificationCountBadge =
    notificationCount > 0 ? (
      <NotificationBadge className={css.notificationBadge} count={notificationCount} />
    ) : null;

  const displayName = user.attributes.profile.firstName;
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    const isInboxPage = currentPage?.indexOf('InboxPage') === 0 && page?.indexOf('InboxPage') === 0;
    return currentPage === page || isAccountSettingsPage || isInboxPage ? css.currentPage : null;
  };

  const yourProfileLink = primaryLink.hasProfile
    ? { name: primaryLink.name, params: primaryLink.params }
    : { name: 'ManageListingsPage', params: {} };
  const manageListingsLinkMaybe = showCreateListingsLink ? (
    <li className={classNames(css.navigationLink, currentPageClass(yourProfileLink.name))}>
      <NamedLink name={yourProfileLink.name} params={yourProfileLink.params}>
        <FormattedMessage id="TopbarMobileMenu.yourListingsLink" />
      </NamedLink>
    </li>
  ) : null;

  const accountStatusLinkMaybe = showAccountStatusLink ? (
    <li className={classNames(css.navigationLink, currentPageClass('AccountStatusPage'))}>
      <NamedLink name="AccountStatusPage">
        <FormattedMessage id="TopbarMobileMenu.accountStatusLink" />
      </NamedLink>
    </li>
  ) : null;

  const reviewQueueLinkMaybe = showReviewQueueLink ? (
    <li className={classNames(css.navigationLink, currentPageClass('ReviewQueuePage'))}>
      <NamedLink name="ReviewQueuePage">
        <FormattedMessage id="TopbarMobileMenu.reviewQueueLink" />
      </NamedLink>
    </li>
  ) : null;

  return (
    <div className={css.root}>
      <AvatarLarge className={css.avatar} user={currentUser} />
      <div className={css.content}>
        <span className={css.greeting}>
          <FormattedMessage id="TopbarMobileMenu.greeting" values={{ displayName }} />
        </span>
        <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
          <FormattedMessage id="TopbarMobileMenu.logoutLink" />
        </InlineTextButton>

        <ul className={css.accountLinksWrapper}>
          <li className={classNames(css.inbox, currentPageClass(`InboxPage:${inboxTab}`))}>
            <NamedLink name="InboxPage" params={{ tab: inboxTab }}>
              <FormattedMessage id={inboxLabelId} />
              {notificationCountBadge}
            </NamedLink>
          </li>
          {reviewQueueLinkMaybe}
          {accountStatusLinkMaybe}
          {manageListingsLinkMaybe}
          {showProfileSettingsLink ? (
            <li className={classNames(css.navigationLink, currentPageClass('ProfileSettingsPage'))}>
              <NamedLink name="ProfileSettingsPage">
                <FormattedMessage id="TopbarMobileMenu.profileSettingsLink" />
              </NamedLink>
            </li>
          ) : null}
          <li className={classNames(css.navigationLink, currentPageClass('AccountSettingsPage'))}>
            <NamedLink name="AccountSettingsPage">
              <FormattedMessage id="TopbarMobileMenu.accountSettingsLink" />
            </NamedLink>
          </li>
        </ul>
        <ul className={css.customLinksWrapper}>{extraLinks}</ul>
        <div className={css.spacer} />
      </div>
      <div className={css.footer}>{createListingsLinkMaybe}</div>
    </div>
  );
};

export default TopbarMobileMenu;
