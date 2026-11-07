import React, { useRef } from 'react';
import { Form as FinalForm } from 'react-final-form';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import * as validators from '../../../util/validators';

import { FieldTextInput, Form, H4, SecondaryButton } from '../../../components';

import css from './ContactNameForm.module.css';

/**
 * "Your name" on Account settings > Contact details (models only; tester feedback F5, part C).
 * Models have no Profile settings page, so their first and last name are edited here. Saved to
 * the user's profile.firstName / profile.lastName. The button is secondary so the contact details
 * form keeps the page's one primary action.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.formId] - The form id
 * @param {Object} props.initialValues - { firstName, lastName }
 * @param {Function} props.onSubmit - Receives { firstName, lastName }
 * @param {boolean} [props.inProgress] - Whether a save is in progress
 * @param {boolean} [props.ready] - Whether the last save succeeded
 * @param {Object} [props.saveError] - The save error, if the last save failed
 * @returns {JSX.Element}
 */
const ContactNameForm = props => {
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
          formId = 'ContactNameForm',
          handleSubmit,
          inProgress = false,
          ready = false,
          saveError,
          invalid,
          pristine,
          values,
        } = formRenderProps;

        const firstNameRequired = validators.required(
          intl.formatMessage({ id: 'ContactNameForm.firstNameRequired' })
        );
        const lastNameRequired = validators.required(
          intl.formatMessage({ id: 'ContactNameForm.lastNameRequired' })
        );

        const pristineSinceLastSubmit =
          !!submittedValues.current && isEqual(values, submittedValues.current);
        const submitDisabled = invalid || pristine || pristineSinceLastSubmit || inProgress;

        return (
          <Form
            className={classNames(rootClassName || css.root, className)}
            onSubmit={e => {
              submittedValues.current = values;
              handleSubmit(e);
            }}
          >
            <H4 as="h2" className={css.sectionTitle}>
              <FormattedMessage id="ContactNameForm.heading" />
            </H4>
            <div className={css.nameContainer}>
              <FieldTextInput
                className={css.firstName}
                type="text"
                id={`${formId}.firstName`}
                name="firstName"
                autoComplete="given-name"
                label={intl.formatMessage({ id: 'ContactNameForm.firstNameLabel' })}
                validate={firstNameRequired}
              />
              <FieldTextInput
                className={css.lastName}
                type="text"
                id={`${formId}.lastName`}
                name="lastName"
                autoComplete="family-name"
                label={intl.formatMessage({ id: 'ContactNameForm.lastNameLabel' })}
                validate={lastNameRequired}
              />
            </div>
            <p className={css.extraInfo}>
              <FormattedMessage id="ContactNameForm.info" />
            </p>

            {saveError ? (
              <p className={css.error} role="alert">
                <FormattedMessage id="ContactNameForm.saveFailed" />
              </p>
            ) : null}
            <SecondaryButton
              className={css.submitButton}
              type="submit"
              inProgress={inProgress}
              disabled={submitDisabled}
              ready={ready && pristineSinceLastSubmit}
            >
              <FormattedMessage id="ContactNameForm.saveName" />
            </SecondaryButton>
          </Form>
        );
      }}
    />
  );
};

export default ContactNameForm;
