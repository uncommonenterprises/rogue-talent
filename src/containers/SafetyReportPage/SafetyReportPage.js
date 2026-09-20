import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Heading, Page, LayoutSingleColumn, IconAlert, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import SafetyReportForm from './SafetyReportForm/SafetyReportForm';
import { sendSafetyReport } from './SafetyReportPage.duck';
import css from './SafetyReportPage.module.css';

/**
 * SAF-29 — "Report a safety concern" page.
 *
 * A calm, always-available route (`/report-concern`) for reporting a safety
 * concern, SEPARATE from the booking dispute flow. When reached from a booking
 * (`?tx=…&role=…&party=…`) the related booking is prefilled.
 *
 * @param {Object} props
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled
 * @param {propTypes.currentUser} [props.currentUser] - The current user
 * @param {boolean} props.submitInProgress - Whether the submission is in progress
 * @param {propTypes.error} [props.submitError] - The submission error, if any
 * @param {boolean} props.reportSubmitted - Whether a report has been submitted
 * @param {Function} props.onSubmitReport - Submit handler
 * @returns {JSX.Element} Safety report page
 */
export const SafetyReportPageComponent = props => {
  const intl = useIntl();
  const location = useLocation();

  const {
    scrollingDisabled,
    currentUser,
    submitInProgress,
    submitError,
    reportSubmitted,
    onSubmitReport,
  } = props;

  const searchParams = new URLSearchParams(location.search);
  const relatedTransactionId = searchParams.get('tx') || null;
  const relatedRole = searchParams.get('role') || null;
  const relatedPartyName = searchParams.get('party') || null;

  const user = ensureCurrentUser(currentUser);
  const contactName = user.attributes?.profile?.displayName || null;
  const contactEmail = user.attributes?.email || null;

  const source = relatedTransactionId ? 'transaction' : 'general';

  // Human-readable label for the prefilled booking context (not editable).
  const relatedContextLabel = relatedTransactionId
    ? relatedPartyName
      ? intl.formatMessage(
          { id: 'SafetyReportPage.relatedBookingWithParty' },
          { party: relatedPartyName }
        )
      : intl.formatMessage({ id: 'SafetyReportPage.relatedBooking' })
    : null;

  const initialValues = {
    category: '',
    description: '',
    relatedParty: relatedPartyName || '',
    contactName: contactName || '',
    contactEmail: contactEmail || '',
  };

  const handleSubmit = values => {
    onSubmitReport({
      category: values.category,
      description: values.description,
      relatedParty: values.relatedParty || null,
      contactName: values.contactName || null,
      contactEmail: values.contactEmail || null,
      relatedTransactionId,
      relatedRole,
      source,
    });
  };

  const title = intl.formatMessage({ id: 'SafetyReportPage.title' });

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        mainColumnClassName={css.layoutWrapperMain}
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <Heading as="h1" rootClassName={css.title}>
            <FormattedMessage id="SafetyReportPage.heading" />
          </Heading>

          {/* Mandatory, prominent emergency copy (SAF-30). */}
          <div className={css.emergencyNotice} role="note">
            <IconAlert className={css.emergencyIcon} />
            <p className={css.emergencyText}>
              <FormattedMessage id="SafetyReportPage.emergencyNotice" />
            </p>
          </div>

          {reportSubmitted ? (
            <div className={css.successPanel}>
              <Heading as="h2" rootClassName={css.successTitle}>
                <FormattedMessage id="SafetyReportPage.successTitle" />
              </Heading>
              <p className={css.paragraph}>
                <FormattedMessage id="SafetyReportPage.successMessage" />
              </p>
              <p className={css.paragraph}>
                <FormattedMessage id="SafetyReportPage.successEmergencyReminder" />
              </p>
              <NamedLink name="LandingPage" className={css.backLink}>
                <FormattedMessage id="SafetyReportPage.backToHome" />
              </NamedLink>
            </div>
          ) : (
            <>
              <p className={css.intro}>
                <FormattedMessage id="SafetyReportPage.intro" />
              </p>
              <p className={css.slaNote}>
                <FormattedMessage id="SafetyReportPage.slaNote" />
              </p>

              <SafetyReportForm
                formId="SafetyReportForm"
                className={css.form}
                initialValues={initialValues}
                relatedContext={{ label: relatedContextLabel }}
                inProgress={submitInProgress}
                submitError={submitError}
                onSubmit={handleSubmit}
              />
            </>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const { submitInProgress, submitError, reportSubmitted } = state.SafetyReportPage;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    submitInProgress,
    submitError,
    reportSubmitted,
  };
};

const mapDispatchToProps = dispatch => ({
  onSubmitReport: values => dispatch(sendSafetyReport(values)),
});

const SafetyReportPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(SafetyReportPageComponent);

export default SafetyReportPage;
