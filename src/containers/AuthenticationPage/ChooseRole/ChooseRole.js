import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import { NamedLink, AuthFormHeader } from '../../../components';

import css from './ChooseRole.module.css';

const IconModel = () => (
  <svg
    className={css.lineIcon}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const IconClient = () => (
  <svg
    className={css.lineIcon}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconChevron = () => (
  <svg
    className={css.lineIcon}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// The two roles on Rogue Talent, in the order the mockup shows them.
const ROLES = [{ userType: 'model', Icon: IconModel }, { userType: 'client', Icon: IconClient }];

/**
 * Screen 01 "Choose your path": two role cards replace the old user-type dropdown (RT-FB-01).
 * Each card links to the existing per-user-type sign-up route (SignupForUserTypePage).
 * Cards are navigation, not a competing primary action: hairline border, cobalt on hover.
 *
 * @component
 * @param {Object} props
 * @param {Array<{ userType: string }>} props.userTypes configured user types
 * @param {Object?} props.linkTo extra `to` props for the links (e.g. history state with `from`)
 * @param {ReactNode?} props.footer content under the cards (e.g. the log in line)
 * @returns {JSX.Element}
 */
const ChooseRole = props => {
  const { userTypes = [], linkTo, footer } = props;
  const configuredTypes = userTypes.map(ut => ut.userType);
  const roles = ROLES.filter(role => configuredTypes.includes(role.userType));

  return (
    <div className={css.root}>
      <AuthFormHeader
        centered
        title={<FormattedMessage id="ChooseRole.title" />}
        lede={<FormattedMessage id="ChooseRole.lede" />}
      />
      <div className={css.roleGrid}>
        {roles.map(({ userType, Icon }) => (
          <NamedLink
            key={userType}
            className={css.roleCard}
            name="SignupForUserTypePage"
            params={{ userType }}
            to={linkTo}
          >
            <span className={css.roleIcon}>
              <Icon />
            </span>
            <h2 className={css.roleTitle}>
              <FormattedMessage id={`ChooseRole.${userType}.title`} />
            </h2>
            <p className={css.roleBody}>
              <FormattedMessage id={`ChooseRole.${userType}.body`} />
            </p>
            <span className={css.roleCta}>
              <FormattedMessage id={`ChooseRole.${userType}.cta`} />
              <IconChevron />
            </span>
          </NamedLink>
        ))}
      </div>
      {footer}
    </div>
  );
};

export default ChooseRole;
