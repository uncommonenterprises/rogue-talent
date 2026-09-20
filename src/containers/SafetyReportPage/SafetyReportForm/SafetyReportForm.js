import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';

import { Form, PrimaryButton, FieldSelect, FieldTextInput } from '../../../components';

import css from './SafetyReportForm.module.css';

const CATEGORY_OPTIONS = [
  'safety-concern',
  'harassment',
  'identity-mismatch',
  'inappropriate-behaviour',
  'other',
];

/**
 * SAF-29 — Report a safety concern form (separate from the booking dispute flow).
 *
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default root class
 * @param {string} [props.formId] - The form ID
 * @param {boolean} [props.inProgress] - Whether the submission is in progress
 * @param {propTypes.error} [props.submitError] - The submission error, if any
 * @param {Object} [props.relatedContext] - Prefilled booking context (label + hidden id)
 * @param {Function} props.onSubmit - Submit handler
 * @returns {JSX.Element} Safety report form
 */
const SafetyReportForm = props => {
  const intl = useIntl();

  return (
    <FinalForm
      {...props}
      render={fieldRenderProps => {
        const {
          className,
          formId,
          handleSubmit,
          inProgress = false,
          submitError,
          relatedContext,
          invalid,
        } = fieldRenderProps;

        const categoryLabel = intl.formatMessage({ id: 'SafetyReportForm.categoryLabel' });
        const categoryPlaceholder = intl.formatMessage({
          id: 'SafetyReportForm.categoryPlaceholder',
        });
        const categoryRequired = validators.required(
          intl.formatMessage({ id: 'SafetyReportForm.categoryRequired' })
        );

        const descriptionLabel = intl.formatMessage({ id: 'SafetyReportForm.descriptionLabel' });
        const descriptionPlaceholder = intl.formatMessage({
          id: 'SafetyReportForm.descriptionPlaceholder',
        });
        const descriptionRequired = validators.requiredAndNonEmptyString(
          intl.formatMessage({ id: 'SafetyReportForm.descriptionRequired' })
        );

        const relatedPartyLabel = intl.formatMessage({ id: 'SafetyReportForm.relatedPartyLabel' });
        const relatedPartyPlaceholder = intl.formatMessage({
          id: 'SafetyReportForm.relatedPartyPlaceholder',
        });

        const contactNameLabel = intl.formatMessage({ id: 'SafetyReportForm.contactNameLabel' });
        const contactEmailLabel = intl.formatMessage({ id: 'SafetyReportForm.contactEmailLabel' });
        const emailInvalid = validators.emailFormatValid(
          intl.formatMessage({ id: 'SafetyReportForm.contactEmailInvalid' })
        );

        const classes = classNames(css.root, className);
        const submitDisabled = invalid || inProgress;

        const hasRelatedContext = !!relatedContext?.label;

        return (
          <Form className={classes} onSubmit={handleSubmit}>
            <FieldSelect
              id={formId ? `${formId}.category` : 'category'}
              name="category"
              className={css.field}
              label={categoryLabel}
              validate={categoryRequired}
            >
              <option disabled value="">
                {categoryPlaceholder}
              </option>
              {CATEGORY_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {intl.formatMessage({ id: `SafetyReportForm.category.${option}` })}
                </option>
              ))}
            </FieldSelect>

            {hasRelatedContext ? (
              <div className={css.relatedContext}>
                <span className={css.relatedContextLabel}>
                  <FormattedMessage id="SafetyReportForm.relatedBookingLabel" />
                </span>
                <span className={css.relatedContextValue}>{relatedContext.label}</span>
              </div>
            ) : null}

            <FieldTextInput
              id={formId ? `${formId}.relatedParty` : 'relatedParty'}
              name="relatedParty"
              className={css.field}
              type="text"
              label={relatedPartyLabel}
              placeholder={relatedPartyPlaceholder}
            />

            <FieldTextInput
              id={formId ? `${formId}.description` : 'description'}
              name="description"
              className={css.field}
              type="textarea"
              label={descriptionLabel}
              placeholder={descriptionPlaceholder}
              validate={descriptionRequired}
            />

            <div className={css.contactRow}>
              <FieldTextInput
                id={formId ? `${formId}.contactName` : 'contactName'}
                name="contactName"
                className={css.contactField}
                type="text"
                label={contactNameLabel}
                autoComplete="name"
              />
              <FieldTextInput
                id={formId ? `${formId}.contactEmail` : 'contactEmail'}
                name="contactEmail"
                className={css.contactField}
                type="email"
                label={contactEmailLabel}
                autoComplete="email"
                validate={emailInvalid}
              />
            </div>

            {submitError ? (
              <p className={css.error}>
                <FormattedMessage id="SafetyReportForm.submitError" />
              </p>
            ) : null}

            <PrimaryButton type="submit" inProgress={inProgress} disabled={submitDisabled}>
              <FormattedMessage id="SafetyReportForm.submitButton" />
            </PrimaryButton>
          </Form>
        );
      }}
    />
  );
};

export default SafetyReportForm;
