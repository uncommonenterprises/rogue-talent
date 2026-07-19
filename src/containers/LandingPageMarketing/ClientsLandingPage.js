import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import FooterContainer from '../FooterContainer/FooterContainer';

import MarketingNav from './MarketingNav';
import css from './marketing.module.css';

const CAST = [
  { n: '01', title: 'Search', text: 'Filter by city, category, availability and budget.' },
  { n: '02', title: 'Book direct', text: 'Message and confirm with the model — no gatekeeper.' },
  { n: '03', title: 'Shoot', text: 'Contracts, releases and payment handled in-platform.' },
];

const TALENT = [
  { name: 'Mara Voss', meta: 'London · £1,200/day', available: true },
  { name: 'Aïcha Ndiaye', meta: 'Paris · €1,600/day' },
  { name: 'Lena Kaur', meta: 'Berlin · €1,100/day' },
  { name: 'Theo Adeyemi', meta: 'NYC · $1,400/day', available: true },
];

const PROTECT = [
  {
    title: 'Escrow payments',
    text:
      'Pay upfront into escrow; funds release to the model only once you confirm the shoot is complete. A formal process covers any dispute.',
  },
  {
    title: 'Usage rights, locked in',
    text:
      'Standardised contracts let you set image usage — duration, channels, territory, sublicensing — agreed and e-signed before the shoot.',
  },
  {
    title: 'Reviewed talent',
    text:
      'See real ratings on professionalism, punctuality and quality from other businesses before you book. No more casting blind.',
  },
];

/** Hand-coded, pixel-matched Clients / business landing page (/p/for-business). */
export const ClientsLandingPage = () => {
  const config = useConfiguration();
  const intl = useIntl();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.marketplaceName;

  const title = intl.formatMessage({ id: 'ClientsLandingPage.schemaTitle' }, { marketplaceName });
  const description = intl.formatMessage({ id: 'ClientsLandingPage.schemaDescription' });

  return (
    <Page title={title} description={description} scrollingDisabled={scrollingDisabled} contentType="website">
      <LayoutSingleColumn
        className={css.root}
        mainColumnClassName={css.main}
        topbar={<MarketingNav page="business" />}
        footer={<FooterContainer />}
      >
        {/* HERO */}
        <section className={css.hero}>
          <div className={css.heroOverlay} />
          <div className={`${css.inner} ${css.heroInner}`}>
            <div className={css.eyebrowLight}>For businesses</div>
            <h1 className={css.heroTitle}>Book verified models. Directly.</h1>
            <p className={css.heroIngress}>
              Search, book and pay talent without an agency in the loop. Faster casting, transparent
              rates, contracts handled.
            </p>
            <div className={css.heroButtons}>
              <NamedLink name="SignupPage" className={css.btnPrimary}>
                Create an account
              </NamedLink>
              <NamedLink name="SearchPage" className={css.btnGhostLight}>
                Browse talent
              </NamedLink>
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className={css.trustBar}>
          <div className={css.inner}>
            <div className={css.trustBarText}>Trusted by studios, brands &amp; photographers</div>
            <div className={css.logoRow}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={css.logo} />
              ))}
            </div>
          </div>
        </section>

        {/* CAST IN HOURS */}
        <section className={css.section}>
          <div className={css.inner}>
            <h2 className={css.sectionTitle}>Cast in hours, not weeks</h2>
            <p className={css.sectionIngress}>
              Skip the agency back-and-forth. Find, book and pay talent yourself.
            </p>
            <div className={css.grid3}>
              {CAST.map(s => (
                <div key={s.n} className={css.step}>
                  <div className={css.stepNum}>{s.n}</div>
                  <div className={css.stepTitle}>{s.title}</div>
                  <div className={css.stepText}>{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AVAILABLE THIS WEEK */}
        <section className={css.featured}>
          <div className={css.inner}>
            <div className={css.featuredHead}>
              <h2 className={css.sectionTitleTight}>Available this week</h2>
              <NamedLink name="SearchPage" className={css.viewAll}>
                View all →
              </NamedLink>
            </div>
            <div className={css.grid4}>
              {TALENT.map(t => (
                <div key={t.name} className={css.talentCard}>
                  <div className={css.talentPhoto}>
                    {t.available ? (
                      <span className={css.availableBadge}>
                        <span className={css.availableDot} /> Available
                      </span>
                    ) : null}
                  </div>
                  <div className={css.talentBody}>
                    <div className={css.talentName}>{t.name}</div>
                    <div className={css.talentMeta}>{t.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className={css.features}>
          <div className={`${css.inner} ${css.featuresInner}`}>
            <div className={css.featureRow}>
              <div className={css.featureText}>
                <div className={css.eyebrow}>One flat fee</div>
                <h3 className={css.featureTitle}>The model keeps 100%. You pay one flat fee.</h3>
                <p className={css.featureBody}>
                  A flat 15% booking fee on top of the model's rate — no agency markup, and full
                  transparency on exactly what the talent earns.
                </p>
              </div>
              <div className={css.featureMedia} />
            </div>
            <div className={css.featureRow}>
              <div className={css.featureMedia} />
              <div className={css.featureText}>
                <div className={css.eyebrow}>Verified &amp; protected</div>
                <h3 className={css.featureTitle}>Every model checked. Every contract handled.</h3>
                <p className={css.featureBody}>
                  Verified profiles, e-signed releases and secure payment — all inside Rogue.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* EVERY BOOKING PROTECTED */}
        <section className={css.section}>
          <div className={css.inner}>
            <h2 className={css.sectionTitle}>Every booking, protected</h2>
            <p className={css.sectionIngress}>
              Book with the confidence of an agency, without the agency.
            </p>
            <div className={css.grid3}>
              {PROTECT.map(c => (
                <div key={c.title} className={css.lightCard}>
                  <div className={css.lightCardTitle}>{c.title}</div>
                  <div className={css.lightCardText}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING */}
        <section className={css.closing}>
          <div className={css.inner}>
            <h2 className={css.closingTitle}>Post your first booking</h2>
            <p className={css.closingText}>Create a free account and start casting today.</p>
            <NamedLink name="SignupPage" className={css.btnOnAccent}>
              Create an account
            </NamedLink>
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

export default ClientsLandingPage;
