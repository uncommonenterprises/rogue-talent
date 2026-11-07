import React, { useRef } from 'react';
import { Form as FinalForm } from 'react-final-form';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { Form, FieldCheckbox, H4, PrimaryButton } from '../../../components';

import css from './SafetySettingsForm.module.css';

/**
 * The form on Account settings > Safety (models only). It holds the SAF-13 private-residence
 * boundary control, moved unchanged from Profile settings (tester feedback F5, part C): a single
 * opt-out checkbox, `noPrivateResidence`, saved to the model's USER privateData
 * (safety_boundaries.no_private_residence) and enforced silently server-side by SAF-14
 * (server/api-util/residenceBoundary.js).
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.formId] - The form id
 * @param {Object} props.initialValues - { noPrivateResidence: boolean }
 * @param {Function} props.onSubmit - Receives the form values
 * @param {boolean} [props.inProgress] - Whether a save is in progress
 * @param {boolean} [props.ready] - Whether the last save succeeded
 * @param {Object} [props.saveError] - The save error, if the last save failed
 * @returns {JSX.Element}
 */
const SafetySettingsForm = props => {
  const intl = useIntl();
  // The values of the last submit, so the button reads "saved" until something changes again.
  const submittedValues = useRef(null);

  return (
    <FinalForm
      {...props}
      render={formRenderProps => {
        const {
          className,
          rootClassName,
          formId = 'SafetySettingsForm',
          handleSubmit,
          inProgress = false,
          ready = false,
          saveError,
          pristine,
          values,
        } = formRenderProps;

        const pristineSinceLastSubmit =
          !!submittedValues.current && isEqual(values, submittedValues.current);
        const submitDisabled = pristine || pristineSinceLastSubmit || inProgress;

        return (
          <Form
            className={classNames(rootClassName || css.root, className)}
            onSubmit={e => {
              submittedValues.current = values;
              handleSubmit(e);
            }}
          >
            <div className={css.sectionContainer}>
              <H4 as="h2" className={css.sectionTitle}>
                <FormattedMessage id="SafetySettingsForm.safetyBoundariesHeading" />
              </H4>
              <FieldCheckbox
                id={`${formId}.noPrivateResidence`}
                name="noPrivateResidence"
                label={intl.formatMessage({ id: 'SafetySettingsForm.noPrivateResidenceLabel' })}
              />
              <p className={css.extraInfo}>
                <FormattedMessage id="SafetySettingsForm.noPrivateResidenceInfo" />
              </p>
            </div>

            {saveError ? (
              <p className={css.error} role="alert">
                <FormattedMessage id="SafetySettingsForm.saveFailed" />
              </p>
            ) : null}
            <PrimaryButton
              className={css.submitButton}
              type="submit"
              inProgress={inProgress}
              disabled={submitDisabled}
              ready={ready && pristineSinceLastSubmit}
            >
              <FormattedMessage id="SafetySettingsForm.saveChanges" />
            </PrimaryButton>
          </Form>
        );
      }}
    />
  );
};

export default SafetySettingsForm;
