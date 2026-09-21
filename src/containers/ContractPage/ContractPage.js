import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

// Contexts + util
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { ensureCurrentUser, userDisplayNameAsString } from '../../util/data';
import { formatMoney } from '../../util/currency';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { getUsageLicenceRows, CONTRACT_VERSION } from '../../util/contracts';

// Shared components
import { Heading, Page, LayoutSingleColumn, NamedLink, PrimaryButton } from '../../components';

// Local
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './ContractPage.module.css';

// Shoot-detail transaction field keys (already captured today), rendered on the
// contract in a dedicated section.
const SHOOT_DETAIL_KEYS = ['shoot_type', 'location_type', 'shoot_address', 'shoot_description'];

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
 * Contracts v1 — print-optimised contract for a single booking.
 *
 * A deterministic rendering of data already frozen on the transaction (parties,
 * engagement, shoot details, image-usage licence, acceptance record). Both
 * parties can reach it from the TransactionPage; "Download PDF" uses the browser
 * print dialog (no PDF library, no new dependency). SSR-safe.
 *
 * ⚠️ LEGAL: the licence body wording is placeholder "DRAFT — pending legal
 * review". A lawyer must supply the real licence/release text and confirm
 * clickwrap sufficiency before real users are onboarded.
 *
 * Identity gap: contracts want legal party names, but today we only hold the
 * model's display name and the client's account/company name (ties to SAF-03
 * legal-name capture). Named accordingly + flagged below.
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
  const booking = transaction?.booking;
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

  // Parties (see legal-name gap note).
  const modelName = userDisplayNameAsString(provider, '');
  const clientName = userDisplayNameAsString(customer, '');
  const clientCompany = customer?.attributes?.profile?.publicData?.company_name;

  // Engagement.
  const listingTitle = listing?.attributes?.title;
  const bookingStart = formatDateMaybe(intl, booking?.attributes?.displayStart);
  const bookingEnd = formatDateMaybe(intl, booking?.attributes?.displayEnd);
  const dayRate = listing?.attributes?.price ? formatMoney(intl, listing.attributes.price) : null;
  const total = transaction?.attributes?.payinTotal
    ? formatMoney(intl, transaction.attributes.payinTotal)
    : null;

  // Field sections.
  const shootRows = resolveRows(SHOOT_DETAIL_KEYS, protectedData, transactionFieldConfigs);
  const usageRows = getUsageLicenceRows(protectedData, transactionFieldConfigs);

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
                  <PrimaryButton
                    type="button"
                    className={css.printButton}
                    onClick={handlePrint}
                  >
                    <FormattedMessage id="ContractPage.downloadPdf" />
                  </PrimaryButton>
                </div>

                <Heading as="h1" rootClassName={css.contractTitle}>
                  <FormattedMessage id="ContractPage.contractTitle" />
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
              </header>

              {/* Parties */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="ContractPage.partiesHeading" />
                </Heading>
                <dl className={css.definitions}>
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.partyClient' })}
                    value={clientCompany ? `${clientName} (${clientCompany})` : clientName}
                  />
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.partyModel' })}
                    value={modelName}
                  />
                </dl>
                <p className={css.footnote}>
                  <FormattedMessage id="ContractPage.legalNameNote" />
                </p>
              </section>

              {/* Engagement */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="ContractPage.engagementHeading" />
                </Heading>
                <dl className={css.definitions}>
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.profile' })}
                    value={listingTitle}
                  />
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.bookingDates' })}
                    value={
                      bookingStart && bookingEnd
                        ? intl.formatMessage(
                            { id: 'ContractPage.dateRange' },
                            { start: bookingStart, end: bookingEnd }
                          )
                        : bookingStart
                    }
                  />
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.dayRate' })}
                    value={dayRate}
                  />
                  <DefinitionRow
                    label={intl.formatMessage({ id: 'ContractPage.total' })}
                    value={total}
                  />
                </dl>
              </section>

              {/* Shoot details */}
              {shootRows.length > 0 ? (
                <section className={css.section}>
                  <Heading as="h2" rootClassName={css.sectionHeading}>
                    <FormattedMessage id="ContractPage.shootHeading" />
                  </Heading>
                  <dl className={css.definitions}>
                    {shootRows.map(r => (
                      <DefinitionRow key={r.key} label={r.label} value={r.value} />
                    ))}
                  </dl>
                </section>
              ) : null}

              {/* Image usage licence */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="ContractPage.licenceHeading" />
                </Heading>
                {usageRows.length > 0 ? (
                  <dl className={css.definitions}>
                    {usageRows.map(r => (
                      <DefinitionRow key={r.key} label={r.label} value={r.value} />
                    ))}
                  </dl>
                ) : (
                  <p className={css.paragraph}>
                    <FormattedMessage id="ContractPage.licenceMissing" />
                  </p>
                )}
                {/* DRAFT — pending legal review. Placeholder grant-of-licence
                    wording; the lawyer supplies the real text. */}
                <p className={css.licenceBodyDraft}>
                  <FormattedMessage id="ContractPage.licenceBodyDraft" />
                </p>
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

              {/* Boilerplate placeholder */}
              <section className={css.section}>
                <Heading as="h2" rootClassName={css.sectionHeading}>
                  <FormattedMessage id="ContractPage.termsHeading" />
                </Heading>
                <p className={css.licenceBodyDraft}>
                  <FormattedMessage id="ContractPage.termsBodyDraft" />
                </p>
              </section>
            </article>
          ) : null}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default ContractPageComponent;
