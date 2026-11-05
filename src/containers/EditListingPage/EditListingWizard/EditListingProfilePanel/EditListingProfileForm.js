import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import {
  autocompleteSearchRequired,
  autocompletePlaceSelected,
  composeValidators,
  required,
  maxLength,
} from '../../../../util/validators';

// Import shared components
import {
  Button,
  Form,
  FieldLocationAutocompleteInput,
  FieldTextInput,
} from '../../../../components';

// Import modules from parent directory
import { WizardActions, wizardPrimaryButtonClassName } from '../WizardShell/WizardShell';

// Import modules from this directory
import css from './EditListingProfileForm.module.css';

const identity = v => v;
// "About you" asks for the city the model is based in: towns and cities only, no airports,
// stations or street addresses (run-through 01/11/2026, finding 4).
const CITY_PLACE_TYPES = ['(cities)'];
const DISPLAY_NAME_MAX_LENGTH = 60;
// The optional bio ("About you" text) saved to the user's profile.bio. Sharetribe allows up to
// 5000 characters; a few short lines read best on the profile page, so the wizard caps it here.
export const BIO_MAX_LENGTH = 600;

/**
 * Validator for the optional bio: only the length is checked, and only once the model changes
 * the text. A longer bio written earlier on Profile settings (which has no cap) never blocks
 * this step while it is left as it is.
 *
 * @param {string} message error shown when the bio is too long
 * @param {string} initialBio the bio the form was opened with
 * @returns {Function} final-form field validator
 */
export const bioLengthValidator = (message, initialBio = '') => value =>
  typeof value === 'string' && value.length > BIO_MAX_LENGTH && value !== initialBio
    ? message
    : undefined;

const ErrorMessages = props => {
  const { fetchErrors } = props;
  const { updateListingError, createListingDraftError, updateProfileError } = fetchErrors || {};

  return updateListingError || createListingDraftError || updateProfileError ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingProfileForm.updateFailed" />
    </p>
  ) : null;
};

// Field label with the design-system required marker: a cobalt asterisk (aria-hidden) plus a
// visually hidden "required" for screen readers, as in CustomExtendedDataField.
const RequiredLabel = ({ labelId }) => {
  const intl = useIntl();
  return (
    <>
      {intl.formatMessage({ id: labelId })}{' '}
      <span className={css.req} aria-hidden="true">
        *
      </span>
      <span className={css.srOnly}>
        {intl.formatMessage({ id: 'CustomExtendedDataField.requiredIndicator' })}
      </span>
    </>
  );
};

// Map pin inside the city field (sign-up journey screen 08).
const IconPin = () => (
  <svg
    className={css.pinSvg}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 14s5-4.2 5-8a5 5 0 10-10 0c0 3.8 5 8 5 8z"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <circle cx="8" cy="6" r="1.6" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

/**
 * The EditListingProfileForm component. Renders the model's display name, a city-level
 * location autocomplete and an optional bio for the "About you" wizard step (sign-up journey
 * screen 08). The name and city save to the listing (title + geolocation); the bio saves to the
 * user's profile.bio (the same value Profile settings edits). The model's attribute fields are
 * collected on the next step ("Your profile").
 *
 * @component
 * @param {Object} props
 * @param {string} [props.formId] - The form id
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {boolean} [props.autoFocus] - Whether the first input should be focused
 * @param {boolean} [props.disabled] - Whether the form is disabled
 * @param {boolean} [props.ready] - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.saveActionMsg - The save action button label
 * @param {Object} [props.backLinkProps] - NamedLink props for the wizard's "Back" link
 * @param {boolean} [props.updated] - Whether the form was just updated
 * @param {boolean} [props.updateInProgress] - Whether the save is in progress
 * @param {Object} [props.fetchErrors] - The fetch errors ({ updateListingError, updateProfileError })
 * @returns {JSX.Element}
 */
export const EditListingProfileForm = props => (
  <FinalForm
    mutators={{ ...arrayMutators }}
    {...props}
    render={formRenderProps => {
      const {
        formId = 'EditListingProfileForm',
        className,
        rootClassName,
        autoFocus,
        disabled,
        ready,
        handleSubmit,
        invalid,
        pristine,
        saveActionMsg,
        backLinkProps,
        updated,
        updateInProgress = false,
        fetchErrors,
        values,
        initialValues,
      } = formRenderProps;

      const intl = useIntl();
      const classes = classNames(rootClassName || css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      const cityRequiredMessage = intl.formatMessage({
        id: 'EditListingProfileForm.cityRequired',
      });
      const cityNotRecognizedMessage = intl.formatMessage({
        id: 'EditListingProfileForm.cityNotRecognized',
      });
      const displayNameRequiredMessage = intl.formatMessage({
        id: 'EditListingProfileForm.displayNameRequired',
      });
      const displayNameTooLongMessage = intl.formatMessage(
        { id: 'EditListingProfileForm.displayNameTooLong' },
        { maxLength: DISPLAY_NAME_MAX_LENGTH }
      );
      const bioTooLongMessage = intl.formatMessage(
        { id: 'EditListingProfileForm.bioTooLong' },
        { maxLength: BIO_MAX_LENGTH }
      );
      const bioLength = (values.bio || '').length;
      const bioHintId = `${formId}.bioHint`;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <ErrorMessages fetchErrors={fetchErrors} />

          <div className={css.field}>
            <FieldTextInput
              id={`${formId}.title`}
              name="title"
              type="text"
              label={<RequiredLabel labelId="EditListingProfileForm.displayNameLabel" />}
              placeholder={intl.formatMessage({
                id: 'EditListingProfileForm.displayNamePlaceholder',
              })}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              autoFocus={autoFocus}
              validate={composeValidators(
                required(displayNameRequiredMessage),
                maxLength(displayNameTooLongMessage, DISPLAY_NAME_MAX_LENGTH)
              )}
            />
            <p className={css.hint}>
              <FormattedMessage id="EditListingProfileForm.displayNameHint" />
            </p>
          </div>

          <div className={css.field}>
            <FieldLocationAutocompleteInput
              rootClassName={css.location}
              inputClassName={css.locationAutocompleteInput}
              iconClassName={css.locationAutocompleteInputIcon}
              CustomIcon={IconPin}
              predictionsClassName={css.predictionsRoot}
              validClassName={css.validLocation}
              useDarkText
              name="location"
              id={`${formId}.location`}
              label={<RequiredLabel labelId="EditListingProfileForm.cityLabel" />}
              placeholder={intl.formatMessage({ id: 'EditListingProfileForm.cityPlaceholder' })}
              useDefaultPredictions={false}
              placeTypes={CITY_PLACE_TYPES}
              scrollIntoViewOnFocus
              format={identity}
              valueFromForm={values.location}
              validate={composeValidators(
                autocompleteSearchRequired(cityRequiredMessage),
                autocompletePlaceSelected(cityNotRecognizedMessage)
              )}
            />
            <p className={css.hint}>
              <FormattedMessage id="EditListingProfileForm.cityHint" />
            </p>
          </div>

          <div className={css.field}>
            <FieldTextInput
              id={`${formId}.bio`}
              name="bio"
              type="textarea"
              label={intl.formatMessage({ id: 'EditListingProfileForm.bioLabel' })}
              maxLength={BIO_MAX_LENGTH}
              aria-describedby={bioHintId}
              validate={bioLengthValidator(bioTooLongMessage, initialValues?.bio)}
            />
            <div id={bioHintId} className={css.hintRow}>
              <p className={css.hint}>
                <FormattedMessage id="EditListingProfileForm.bioHint" />
              </p>
              <p className={css.counter}>
                <FormattedMessage
                  id="EditListingProfileForm.bioCounter"
                  values={{ count: bioLength, maxLength: BIO_MAX_LENGTH }}
                />
              </p>
            </div>
          </div>

          <WizardActions backLinkProps={backLinkProps}>
            <Button
              className={wizardPrimaryButtonClassName}
              type="submit"
              inProgress={submitInProgress}
              disabled={submitDisabled}
              ready={submitReady}
            >
              {saveActionMsg}
            </Button>
          </WizardActions>
        </Form>
      );
    }}
  />
);

export default EditListingProfileForm;
