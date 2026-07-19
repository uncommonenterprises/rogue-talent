import React from 'react';
import classNames from 'classnames';

import { NamedLink } from '../../components';

import css from './MarketingNav.module.css';

/**
 * Marketing top nav for the hand-coded landing pages (general / models / clients).
 * Same nav across all three — only the active link and the primary CTA differ, driven by
 * the `page` prop. Rendered as the topbar of the marketing LayoutSingleColumn.
 *
 * @param {Object} props
 * @param {'general'|'models'|'business'} props.page which landing page this is
 */
const MarketingNav = ({ page = 'general' }) => {
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
        <NamedLink name="CMSPage" params={{ pageId: 'for-models' }} className={linkClass(page === 'models')}>
          For models
        </NamedLink>
        <NamedLink
          name="CMSPage"
          params={{ pageId: 'for-business' }}
          className={linkClass(page === 'business')}
        >
          For business
        </NamedLink>
      </div>

      <div className={css.actions}>
        <NamedLink name="LoginPage" className={css.signin}>
          Sign in
        </NamedLink>
        <NamedLink name={cta.to} className={css.cta}>
          {cta.label}
        </NamedLink>
      </div>
    </nav>
  );
};

export default MarketingNav;
