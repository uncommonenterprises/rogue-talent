import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import FooterContainer from '../FooterContainer/FooterContainer';

import MarketingNav from './MarketingNav';
import css from './marketing.module.css';

// A verified badge used on the featured-talent placeholder cards.
const VerifiedTag = () => <span className={css.verified}>✓ Verified</span>;

const FEATURED = [
  { name: 'Mara Voss', meta: 'London · Editorial', price: '£1,200', verified: true },
  { name: 'Jonah Reid', meta: 'Manchester · Commercial', price: '£850' },
  { name: 'Aïcha Ndiaye', meta: 'Paris · Couture', price: '€1,600', verified: true },
  { name: 'Lena Kaur', meta: 'Berlin · Runway', price: '€1,100' },
];

const STATS = [
  { stat: '4,200', plus: true, label: 'Verified models' },
  { stat: '18k', label: 'Direct bookings' },
  { stat: '40', label: 'Cities' },
  { stat: '<2h', label: 'Avg. response' },
];

const STEPS = [
  { n: '01', title: 'Discover', text: 'Search verified talent by city, category and availability.' },
  { n: '02', title: 'Book direct', text: 'Agree rates and dates with the model in-platform. No gatekeeper.' },
  { n: '03', title: 'Shoot & pay', text: 'Secure payments, contracts and releases handled by Rogue.' },
];

const TRUST = [
  {
    title: 'Escrow payments',
    text:
      'The business pays upfront into escrow. Funds release to the model the moment the shoot is confirmed complete — no chasing invoices.',
  },
  {
    title: 'Clear contracts',
    text:
      'Every booking generates a contract with configurable image usage rights — duration, channels, territory — agreed by both sides before the shoot.',
  },
  {
    title: 'Two-way reviews',
    text:
      'Models and businesses review each other after every job. The best talent and the best clients rise to the top.',
  },
];

/**
 * Hand-coded, pixel-matched General homepage (replaces the PageBuilder landing-page asset for `/`).
 * Section order follows the Claude Design mockup; see docs/landing-pages-build-sheet.md.
 */
export const GeneralLandingPage = () => {
  const config = useConfiguration();
  const intl = useIntl();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.marketplaceName;

  const title = intl.formatMessage(
    { id: 'GeneralLandingPage.schemaTitle' },
    { marketplaceName }
  );
  const description = intl.formatMessage({ id: 'GeneralLandingPage.schemaDescription' });

  return (
    <Page title={title} description={description} scrollingDisabled={scrollingDisabled} contentType="website">
      <LayoutSingleColumn
        className={css.root}
        mainColumnClassName={css.main}
        topbar={<MarketingNav page="general" />}
        footer={<FooterContainer />}
      >
        {/* 1 — HERO */}
        <section className={css.hero}>
          <div className={css.heroOverlay} />
          <div className={`${css.inner} ${css.heroInner}`}>
            <div className={css.eyebrowLight}>The model, disrupted</div>
            <h1 className={css.heroTitle}>Models and brands, connected direct.</h1>
            <p className={css.heroIngress}>
              The marketplace where models and the businesses that book them work together
              directly — no agents, no middlemen, no cut.
            </p>
            <div className={css.heroButtons}>
              <NamedLink name="SignupPage" className={css.btnPrimary}>
                Create your account
              </NamedLink>
              <NamedLink name="SearchPage" className={css.btnGhostLight}>
                Browse talent
              </NamedLink>
            </div>
          </div>
        </section>

        {/* 2 — STATS */}
        <section className={css.statBand}>
          <div className={css.inner}>
            <div className={css.statGrid}>
              {STATS.map(s => (
                <div key={s.label} className={css.statCell}>
                  <div className={css.statNumber}>
                    {s.stat}
                    {s.plus ? <span className={css.statPlus}>+</span> : null}
                  </div>
                  <div className={css.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 — HOW IT WORKS */}
        <section id="how" className={css.section}>
          <div className={css.inner}>
            <h2 className={css.sectionTitle}>How Rogue works</h2>
            <p className={css.sectionIngress}>
              Find talent, agree terms and pay — all in one place, with no agency in the middle.
            </p>
            <div className={css.grid3}>
              {STEPS.map(step => (
                <div key={step.n} className={css.step}>
                  <div className={css.stepNum}>{step.n}</div>
                  <div className={css.stepTitle}>{step.title}</div>
                  <div className={css.stepText}>{step.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 — FEATURED TALENT */}
        <section className={css.featured}>
          <div className={css.inner}>
            <div className={css.featuredHead}>
              <h2 className={css.sectionTitleTight}>Featured talent</h2>
              <NamedLink name="SearchPage" className={css.viewAll}>
                View all →
              </NamedLink>
            </div>
            <div className={css.grid4}>
              {FEATURED.map(t => (
                <div key={t.name} className={css.talentCard}>
                  <div className={css.talentPhoto}>{t.verified ? <VerifiedTag /> : null}</div>
                  <div className={css.talentBody}>
                    <div className={css.talentName}>{t.name}</div>
                    <div className={css.talentMeta}>{t.meta}</div>
                    <div className={css.talentPrice}>
                      {t.price}
                      <small> /day</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — FEATURES (alternating) */}
        <section className={css.features}>
          <div className={`${css.inner} ${css.featuresInner}`}>
            <div className={css.featureRow}>
              <div className={css.featureText}>
                <div className={css.eyebrow}>No agents. Ever.</div>
                <h3 className={css.featureTitle}>Keep the relationship — and the fee.</h3>
                <p className={css.featureBody}>
                  The work happens between the model and the business. Rogue just makes it safe, not
                  expensive.
                </p>
              </div>
              <div className={css.featureMedia} />
            </div>
            <div className={css.featureRow}>
              <div className={css.featureMedia} />
              <div className={css.featureText}>
                <div className={css.eyebrow}>Verified both sides</div>
                <h3 className={css.featureTitle}>Everyone is checked before they book.</h3>
                <p className={css.featureBody}>
                  Models and businesses are verified, so every booking starts from trust.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6 — TRUST (dark) */}
        <section className={css.dark}>
          <div className={css.inner}>
            <h2 className={css.sectionTitleLight}>Built-in protection, every booking</h2>
            <p className={css.sectionIngressLight}>
              The trust that agencies claimed to provide — now built into the platform, on both
              sides.
            </p>
            <div className={css.grid3}>
              {TRUST.map(c => (
                <div key={c.title} className={css.darkCard}>
                  <div className={css.darkCardTitle}>{c.title}</div>
                  <div className={css.darkCardText}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7 — DUAL PATH */}
        <section className={css.dualPath}>
          <div className={`${css.inner} ${css.dualGrid}`}>
            <div className={css.pathCard}>
              <div className={css.pathTitle}>I'm a model</div>
              <p className={css.pathText}>
                Build a profile, set your rates, get booked directly. Keep everything you earn.
              </p>
              <NamedLink name="SignupPage" className={css.btnInk}>
                Join as talent
              </NamedLink>
            </div>
            <div className={`${css.pathCard} ${css.pathCardAccent}`}>
              <div className={css.pathTitle}>I'm a business</div>
              <p className={css.pathText}>
                Search, book and pay verified models directly. Faster casting, one flat 15% booking
                fee — no agency markup.
              </p>
              <NamedLink name="SignupPage" className={css.btnPathAccent}>
                Join as business
              </NamedLink>
            </div>
          </div>
        </section>

        {/* 8 — CLOSING CTA */}
        <section className={css.closing}>
          <div className={css.inner}>
            <h2 className={css.closingTitle}>Ready to go rogue?</h2>
            <p className={css.closingText}>Create your free account in minutes.</p>
            <NamedLink name="SignupPage" className={css.btnOnAccent}>
              Create your account
            </NamedLink>
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

export default GeneralLandingPage;
