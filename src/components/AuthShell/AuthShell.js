import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

import NamedLink from '../NamedLink/NamedLink';

import css from './AuthShell.module.css';

// Panel copy per auth screen (sign-up journey mockups 01 to 07). Each variant reads its copy from
// en.json under `AuthShell.<variant>.*`. `points` is the number of tick points the panel shows and
// `switchLink` is the optional link in the panel footer (duplicated under the form on mobile).
const VARIANTS = {
  join: { points: 3, switchLink: null },
  model: {
    points: 3,
    switchLink: { name: 'SignupForUserTypePage', params: { userType: 'client' } },
  },
  client: {
    points: 3,
    switchLink: { name: 'SignupForUserTypePage', params: { userType: 'model' } },
  },
  verify: { points: 0, switchLink: null },
  login: { points: 0, switchLink: { name: 'SignupPage', params: {} } },
  recovery: { points: 0, switchLink: null },
};

const IconTick = () => (
  <svg
    className={css.pointIcon}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M2.5 8.5l3.5 3.5 7-7.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PanelFoot = props => {
  const { variant, switchLink, switchLinkTo, linkClassName } = props;
  if (!switchLink) {
    return <FormattedMessage id={`AuthShell.${variant}.foot`} />;
  }
  return (
    <>
      <FormattedMessage id={`AuthShell.${variant}.foot`} />{' '}
      <NamedLink
        className={linkClassName}
        name={switchLink.name}
        params={switchLink.params}
        to={switchLinkTo}
      >
        <FormattedMessage id={`AuthShell.${variant}.footLink`} />
      </NamedLink>
    </>
  );
};

/**
 * Heading block for a form inside the AuthShell (Bricolage title + secondary lede).
 *
 * @component
 * @param {Object} props
 * @param {ReactNode} props.title the h1 text
 * @param {ReactNode?} props.lede supporting line under the title
 * @param {boolean?} props.centered centre-align the heading block
 * @param {boolean?} props.small use the smaller (28px) title size
 * @returns {JSX.Element}
 */
export const AuthFormHeader = props => {
  const { title, lede, centered = false, small = false } = props;
  return (
    <div className={classNames(css.formHeader, { [css.formHeaderCentered]: centered })}>
      <h1 className={classNames(css.formTitle, { [css.formTitleSmall]: small })}>{title}</h1>
      {lede ? <p className={css.formLede}>{lede}</p> : null}
    </div>
  );
};

/**
 * Split layout for every account screen (sign-up journey, RT-FB-01): a dark ink brand panel beside
 * the form on desktop, collapsing to a slim header bar (brand + eyebrow) above the form below 900px.
 * There is no background photo. A panel-footer link (e.g. "Not a model? Sign up as a client") is
 * repeated under the form on mobile, where the panel footer is hidden.
 *
 * @component
 * @param {Object} props
 * @param {'join'|'model'|'client'|'verify'|'login'|'recovery'} props.variant which panel copy to show
 * @param {Object?} props.switchLinkTo extra `to` props (e.g. history state) for the panel footer link
 * @param {string?} props.contentClassName extra class for the form column
 * @param {ReactNode} props.children the form column content
 * @returns {JSX.Element}
 */
const AuthShell = props => {
  const { variant: variantProp, switchLinkTo, contentClassName, children } = props;
  const variant = VARIANTS[variantProp] ? variantProp : 'join';
  const { points, switchLink } = VARIANTS[variant];
  const pointNumbers = Array.from({ length: points }, (_, i) => i + 1);

  return (
    <div className={css.root}>
      <aside className={css.panel}>
        <NamedLink name="LandingPage" className={css.brand}>
          <FormattedMessage id="AuthShell.brand" />
          <span className={css.brandDot}>.</span>
        </NamedLink>

        <div className={css.panelBody}>
          <p className={css.eyebrow}>
            <FormattedMessage id={`AuthShell.${variant}.eyebrow`} />
          </p>
          <p className={css.headline}>
            <FormattedMessage id={`AuthShell.${variant}.headline`} />
            <br />
            <span className={css.headlineAccent}>
              <FormattedMessage id={`AuthShell.${variant}.headlineAccent`} />
            </span>
          </p>
          <p className={css.lede}>
            <FormattedMessage id={`AuthShell.${variant}.lede`} />
          </p>
          {pointNumbers.length > 0 ? (
            <ul className={css.points}>
              {pointNumbers.map(n => (
                <li key={n} className={css.point}>
                  <IconTick />
                  <FormattedMessage id={`AuthShell.${variant}.point${n}`} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className={css.panelFoot}>
          <PanelFoot
            variant={variant}
            switchLink={switchLink}
            switchLinkTo={switchLinkTo}
            linkClassName={css.panelFootLink}
          />
        </p>
      </aside>

      <main id="main-content" className={classNames(css.content, contentClassName)}>
        <div className={css.contentInner}>
          {children}
          {switchLink ? (
            <p className={css.mobileSwitch}>
              <PanelFoot
                variant={variant}
                switchLink={switchLink}
                switchLinkTo={switchLinkTo}
                linkClassName={css.mobileSwitchLink}
              />
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default AuthShell;
