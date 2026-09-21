import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

// Contexts + util
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { ensureCurrentUser, userDisplayNameAsString } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import {
  CONTRACT_VERSION,
  CONTRACT_SUMMARY_POINT_IDS,
  CONTRACT_CLAUSE_IDS,
  getContractScheduleRows,
} from '../../util/contracts';

// Shared components
import { Heading, Page, LayoutSingleColumn, NamedLink, PrimaryButton } from '../../components';

// Local
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './ContractPage.module.css';

// Supplementary shoot-detail transaction field keys (captured at checkout),
// rendered as context beneath the Schedule. Guarded for legacy transactions.
const SHOOT_DETAIL_KEYS = ['shoot_type', 'location_type', 'shoot_description'];

// Resolve rows for a set of customer-role transaction field keys from
// protectedData, using the listing type config for labels + enum option labels.
const resolveRows = (keys, protectedData = {}, transactionFieldConfigs = []) =>
  keys.reduce((rows, key) => {
    const config = transactionFieldConfigs.find(f => f.key === key);
    if (!config) {
      return rows;
    }
    const raw = protectedData[`customer_${key}`];
    if (raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)) {
      return rows;
    }
    const optionLabel = option =>
      config.enumOptions?.find(o => `${o.option}` === `${option}`)?.label || option;
    const value = Array.isArray(raw) ? raw.map(optionLabel).join(', ') : optionLabel(raw);
    return rows.concat({ key, label: config.label, value });
  }, []);

const formatDateMaybe = (intl, date) =>
  date ? intl.formatDate(date, { year: 'numeric', month: 'long', day: 'numeric' }) : null;

const DefinitionRow = ({ label, value }) =>
  value != null && value !== '' ? (
    <div className={css.row}>
      <dt className={css.rowLabel}>{label}</dt>
      <dd className={css.rowValue}>{value}</dd>
    </div>
  ) : null;

/**
 * Contracts (v1) — print-optimised standard contract for a single booking.
 *
 * Renders the ONE standard Rogue Talent Content Licence & Model Release that
 * applies to every booking (Neil, 2026-09-21): the plain-English summary + the
 * numbered clauses (from en.json / docs/legal/rogue-talent-content-licence-DRAFT.md),
 * plus the per-booking Schedule auto-filled from the transaction (parties, shoot
 * dates, location, booking reference, fee). There is NO per-booking usage
 * selection. Both parties can reach it from the TransactionPage; "Download PDF"
 * uses the browser print dialog (no PDF library, no new dependency). SSR-safe.
 *
 * ⚠️ LEGAL: the contract body wording is DRAFT — pending legal review. A UK
 * solicitor must finalise it before real users are onboarded.
 *
 * Identity gap: contracts want legal party names, but today we only hold the
 * model's display name and the client's account/company name (ties to SAF-03
 * legal-name capture). Named accordingly + flagged in the footnote.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ContractPageComponent = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const params = useParams();

  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const currentUser = useSelector(state => state.user?.currentUser);
  const { transactionRef, fetchInProgress, fetchError } = useSelector(state => state.ContractPage);
  const transaction = useSelector(state => {
    const [tx] = getMarketplaceEntities(state, transactionRef ? [transactionRef] : []);
    return tx || null;
  });

  const title = intl.formatMessage({ id: 'ContractPage.title' });

  const user = ensureCurrentUser(currentUser);
  const customer = transaction?.customer;
  const provider = transaction?.provider;
  const listing = transaction?.listing;
  const protectedData = transaction?.attributes?.protectedData || {};

  // Access gate: only the two parties may view the contract (the API already
  // rejects non-parties; this is a friendly UI guard).
  const isCustomerParty = user?.id && customer?.id && user.id.uuid === customer.id.uuid;
  const isProviderParty = user?.id && provider?.id && user.id.uuid === provider.id.uuid;
  const isParty = isCustomerParty || isProviderParty;

  // Back to the right side of the booking for this user.
  const bookingPageName = isProviderParty ? 'SaleDetailsPage' : 'OrderDetailsPage';

  const transactionFieldConfigs =
    config.listing.listingTypes.find(
      lt => lt.listingType === listing?.attributes?.publicData?.listingType
    )?.transactionFields || [];

  // Party names (see legal-name gap note).
  const modelName = userDisplayNameAsString(provider, '');
  const clientName = userDisplayNameAsString(customer, '');

  // Per-booking Schedule (auto-filled) + supplementary shoot details.
  const scheduleRows = getContractScheduleRows({ transaction, intl });
  const shootRows = resolveRows(SHOOT_DETAIL_KEYS, protectedData, transactionFieldConfigs);

  // Acceptance record. Client acceptance is the clickwrap at checkout (≈ tx
  // creation / request-payment). Model acceptance is the timestamped Accept
  // transition. Both are recorded, attributed events tied to this transaction.
  const transitions = transaction?.attributes?.transitions || [];
  const acceptTransition = transitions.find(t => (t.transition || '').includes('accept'));
  const clientAcceptedAt = formatDateMaybe(intl, transaction?.attributes?.createdAt);
  const modelAcceptedAt = formatDateMaybe(intl, acceptTransition?.createdAt);
  const licenceVersion = protectedData.licenceAgreementVersion || CONTRACT_VERSION;

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const contentReady = transaction && isParty;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        mainColumnClassName={css.layoutMain}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          {fetchInProgress ? (
            <p className={css.loading}>
              <FormattedMessage id="ContractPage.loading" />
            </p>
          ) : fetchError || !transaction ? (
            <p className={css.error}>
              <FormattedMessage id="ContractPage.loadError" />
            </p>
          ) : !isParty ? (
            <p className={css.error}>
              <FormattedMessage id="ContractPage.notAuthorized" />
            </p>
          ) : null}

          {contentReady ? (
            <article className={css.contract}>
              <header className={css.contractHeader}>
                <div className={css.noPrint}>
                  <NamedLink
                    name={bookingPageName}
                    params={{ id: params.id }}
                    className={css.backLink}
                  >
                    <FormattedMessage id="ContractPage.backToBooking" />
                  </NamedLink>
                  <PrimaryButton type="button" className={css.printButton} onClick={handlePrint}>
                    <FormattedMessage id="ContractPage.downloadPdf" />
                  </PrimaryButton>
                </div>

                <Heading as="h1" rootClassName={css.contractTitle}>
                  <FormattedMessage id="Contract.title" />
                </Heading>
                <p className={css.draftNotice}>
                  <FormattedMessage id="ContractPage.draftNotice" />
                </p>
                <p className={css.reference}>
                  <FormattedMessage
                    id="ContractPage.reference"
                    values={{ id: params.id, version: licenceVersion }}
                  />
                </p>
                <p className={css.intro}>
                  <FormattedMessage id="Contract.formationIntro" />
                </p>
              </header>

              {/* Plain-English summary */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="Contract.summaryHeading" />
                </Heading>
                <p className={css.summaryNote}>
                  <FormattedMessage id="Contract.summaryNote" />
                </p>
                <ul className={css.summaryList}>
                  {CONTRACT_SUMMARY_POINT_IDS.map(id => (
                    <li key={id} className={css.summaryItem}>
                      <FormattedMessage id={id} />
                    </li>
                  ))}
                </ul>
              </section>

              {/* Schedule (auto-filled per booking) */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="Contract.scheduleHeading" />
                </Heading>
                {scheduleRows.length > 0 ? (
                  <dl className={css.definitions}>
                    {scheduleRows.map(r => (
                      <DefinitionRow key={r.key} label={r.label} value={r.value} />
                    ))}
                  </dl>
                ) : (
                  <p className={css.paragraph}>
                    <FormattedMessage id="Contract.scheduleMissing" />
                  </p>
                )}
                {shootRows.length > 0 ? (
                  <dl className={css.definitions}>
                    {shootRows.map(r => (
                      <DefinitionRow key={r.key} label={r.label} value={r.value} />
                    ))}
                  </dl>
                ) : null}
                <p className={css.footnote}>
                  <FormattedMessage id="ContractPage.legalNameNote" />
                </p>
              </section>

              {/* Agreement — the numbered, binding clauses */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="Contract.agreementHeading" />
                </Heading>
                <ol className={css.clauseList}>
                  {CONTRACT_CLAUSE_IDS.map(clause => (
                    <li key={clause.heading} className={css.clause}>
                      <span className={css.clauseHeading}>
                        <FormattedMessage id={clause.heading} />
                      </span>{' '}
                      <span className={css.clauseBody}>
                        <FormattedMessage id={clause.body} />
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Acceptance record */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="ContractPage.acceptanceHeading" />
                </Heading>
                <dl className={css.definitions}>
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.clientAccepted' })}
                    value={
                      clientAcceptedAt
                        ? intl.formatMessage(
                            { id: 'ContractPage.clientAcceptedValue' },
                            { name: clientName, date: clientAcceptedAt }
                          )
                        : null
                    }
                  />
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.modelAccepted' })}
                    value={
                      modelAcceptedAt
                        ? intl.formatMessage(
                            { id: 'ContractPage.modelAcceptedValue' },
                            { name: modelName, date: modelAcceptedAt }
                          )
                        : intl.formatMessage({ id: 'ContractPage.modelNotYetAccepted' })
                    }
                  />
                </dl>
              </section>

              <p className={css.footnote}>
                <FormattedMessage id="Contract.solicitorFootnote" />
              </p>
            </article>
          ) : null}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default ContractPageComponent;
