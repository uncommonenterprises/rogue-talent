import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import FooterContainer from '../FooterContainer/FooterContainer';

import MarketingNav from './MarketingNav';
import css from './marketing.module.css';

const VALUE = [
  {
    glyph: '100%',
    title: 'Keep your full rate',
    text: 'No commission, ever. You keep 100% of your day rate — the business pays the platform fee.',
  },
  { glyph: 'You', title: 'Set your own rates', text: 'You decide your day rate and which work you take on.' },
  { glyph: '↗', title: 'Get discovered', text: 'Verified brands search Rogue for talent like you every day.' },
  {
    glyph: '✓',
    title: 'Verified businesses only',
    text: "Every business is verified before they can book — you're never dealing with random strangers.",
  },
];

const STEPS = [
  { n: '01', title: 'Create your profile', text: 'Add your portfolio, stats, categories and day rate.' },
  { n: '02', title: 'Get booked direct', text: 'Approve requests from verified brands on your terms.' },
  { n: '03', title: 'Get paid, protected', text: 'Contracts and secure payment handled by Rogue.' },
];

const PROTECTED = [
  {
    title: 'Paid on time, always',
    text:
      "Payment is secured in escrow before you arrive. You're paid the moment the client confirms the shoot is done.",
  },
  {
    title: 'Your image, your terms',
    text:
      'Every job comes with a clear contract covering how your images can be used. You agree the terms before you shoot.',
  },
  {
    title: 'Know before you book',
    text:
      "Rate every client, and see other models' ratings before you accept. Only work with businesses you can trust.",
  },
];

/** Hand-coded, pixel-matched Models landing page (/p/for-models). */
export const ModelsLandingPage = () => {
  const config = useConfiguration();
  const intl = useIntl();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.marketplaceName;

  const title = intl.formatMessage({ id: 'ModelsLandingPage.schemaTitle' }, { marketplaceName });
  const description = intl.formatMessage({ id: 'ModelsLandingPage.schemaDescription' });

  return (
    <Page title={title} description={description} scrollingDisabled={scrollingDisabled} contentType="website">
      <LayoutSingleColumn
        className={css.root}
        mainColumnClassName={css.main}
        topbar={<MarketingNav page="models" />}
        footer={<FooterContainer />}
      >
        {/* HERO */}
        <section className={css.hero}>
          <div className={css.heroOverlay} />
          <div className={`${css.inner} ${css.heroInner}`}>
            <div className={css.eyebrowLight}>For models</div>
            <h1 className={css.heroTitle}>Your face. Your rates. No middleman.</h1>
            <p className={css.heroIngress}>
              Build a profile, get discovered by real brands, and keep everything you earn.
            </p>
            <div className={css.heroButtons}>
              <NamedLink name="SignupPage" className={css.btnPrimary}>
                Create your profile
              </NamedLink>
              <a href="#steps" className={css.btnGhostLight}>
                See how it works
              </a>
            </div>
          </div>
        </section>

        {/* VALUE PROPS */}
        <section className={css.section}>
          <div className={css.inner}>
            <div className={css.grid2}>
              {VALUE.map(v => (
                <div key={v.title} className={css.valueCard}>
                  <div className={css.valueGlyph}>{v.glyph}</div>
                  <div className={css.valueTitle}>{v.title}</div>
                  <div className={css.valueText}>{v.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE — booked direct */}
        <section className={css.features}>
          <div className={`${css.inner} ${css.featuresInner}`}>
            <div className={css.featureRow}>
              <div className={css.featureText}>
                <div className={css.eyebrow}>Booked direct</div>
                <h3 className={css.featureTitle}>Brands message you. Not an agent.</h3>
                <p className={css.featureBody}>
                  Own your relationships and your calendar. You approve every booking before it's
                  confirmed.
                </p>
                <div className={css.tags}>
                  <span className={css.tag}>Editorial</span>
                  <span className={`${css.tag} ${css.tagAccent}`}>Top booked</span>
                  <span className={css.tag}>Runway</span>
                </div>
              </div>
              <div className={`${css.featureMedia} ${css.featureMediaPortrait}`} />
            </div>
          </div>
        </section>

        {/* THREE STEPS */}
        <section id="steps" className={css.section}>
          <div className={css.inner}>
            <h2 className={css.sectionTitle}>Start earning in three steps</h2>
            <div className={css.grid3}>
              {STEPS.map(s => (
                <div key={s.n} className={css.step}>
                  <div className={css.stepNum}>{s.n}</div>
                  <div className={css.stepTitle}>{s.title}</div>
                  <div className={css.stepText}>{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROTECTED */}
        <section className={css.featured}>
          <div className={css.inner}>
            <h2 className={css.sectionTitle}>You're protected, start to finish</h2>
            <p className={css.sectionIngress}>
              Going direct doesn't mean going it alone. Rogue handles the parts that used to need an
              agency.
            </p>
            <div className={css.grid3}>
              {PROTECTED.map(c => (
                <div key={c.title} className={css.lightCard}>
                  <div className={css.lightCardTitle}>{c.title}</div>
                  <div className={css.lightCardText}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section className={css.testimonial}>
          <div className={css.inner}>
            <div className={css.quote}>
              “I left my agency and doubled my take-home. Same shoots, none of the cut.”
            </div>
            <div className={css.attribution}>Mara Voss · Editorial model, London</div>
          </div>
        </section>

        {/* CLOSING */}
        <section className={css.closing}>
          <div className={css.inner}>
            <h2 className={css.closingTitle}>Ready to go rogue?</h2>
            <p className={css.closingText}>Your profile is free. You keep what you earn.</p>
            <NamedLink name="SignupPage" className={css.btnOnAccent}>
              Create your profile
            </NamedLink>
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

export default ModelsLandingPage;
