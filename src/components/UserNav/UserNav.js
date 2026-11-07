import React from 'react';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import classNames from 'classnames';
import { ACCOUNT_SETTINGS_PAGES } from '../../routing/routeConfiguration';
import { LinkTabNavHorizontal } from '../../components';

import css from './UserNav.module.css';

/**
 * A component that renders a navigation bar for a user-specific pages.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} props.currentPage - The current page (e.g. 'ManageListingsPage')
 * @param {boolean} [props.showManageListingsLink] - Whether to show the "Your listings" tab
 * @param {boolean} [props.showProfileSettingsLink] - Whether to show the "Profile settings" tab.
 *   Models don't have Profile settings (tester feedback F5, part C); see util/settingsPages.js.
 * @returns {JSX.Element} User navigation component
 */
const UserNav = props => {
  const {
    className,
    rootClassName,
    currentPage,
    showManageListingsLink,
    showProfileSettingsLink = true,
  } = props;
  const intl = useIntl();
  const classes = classNames(rootClassName || css.root, className);

  const manageListingsTabMaybe = showManageListingsLink
    ? [
        {
          text: <FormattedMessage id="UserNav.yourListings" />,
          selected: currentPage === 'ManageListingsPage',
          linkProps: {
            name: 'ManageListingsPage',
          },
        },
      ]
    : [];

  const profileSettingsTabMaybe = showProfileSettingsLink
    ? [
        {
          text: <FormattedMessage id="UserNav.profileSettings" />,
          selected: currentPage === 'ProfileSettingsPage',
          disabled: false,
          linkProps: {
            name: 'ProfileSettingsPage',
          },
        },
      ]
    : [];

  const tabs = [
    ...manageListingsTabMaybe,
    ...profileSettingsTabMaybe,
    {
      text: <FormattedMessage id="UserNav.accountSettings" />,
      selected: ACCOUNT_SETTINGS_PAGES.includes(currentPage),
      disabled: false,
      linkProps: {
        name: 'ContactDetailsPage',
      },
    },
  ];

  return (
    <LinkTabNavHorizontal
      className={classes}
      tabRootClassName={css.tab}
      tabs={tabs}
      skin="dark"
      ariaLabel={intl.formatMessage({ id: 'UserNav.screenreader.userNav' })}
    />
  );
};

export default UserNav;
