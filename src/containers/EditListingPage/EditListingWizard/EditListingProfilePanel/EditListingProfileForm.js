import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { getPropsForCustomUserFieldInputs } from '../../../../util/userHelpers';
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
  CustomExtendedDataField,
  FieldLocationAutocompleteInput,
  FieldTextInput,
} from '../../../../components';

// Import modules from this directory
import css from './EditListingProfileForm.module.css';

const identity = v => v;
const DISPLAY_NAME_MAX_LENGTH = 60;

const ErrorMessages = props => {
  const { fetchErrors } = props;
  const { updateProfileError, updateListingError } = fetchErrors || {};

  return (
    <>
      {updateProfileError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingProfileForm.updateFailed" />
        </p>
      ) : null}
      {updateListingError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingProfileForm.updateFailed" />
        </p>
      ) : null}
    </>
  );
};

/**
 * The EditListingProfileForm component. Renders the model's custom user-profile
 * fields (from config.user.userFields) plus a city-level location autocomplete, so a
 * model fills in their profile (saved to the user) and where they're based (saved to
 * the listing's geolocation) in a single "About you" wizard step.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.formId] - The form id
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {boolean} [props.autoFocus] - Whether the first input should be focused
 * @param {Array} props.userFields - The user field configurations to render
 * @param {string} props.userType - The current user's user type (used to filter fields)
 * @param {boolean} [props.disabled] - Whether the form is disabled
 * @param {boolean} [props.ready] - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.saveActionMsg - The save action button label
 * @param {boolean} [props.updated] - Whether the form was just updated
 * @param {boolean} [props.updateInProgress] - Whether the save is in progress
 * @param {Object} [props.fetchErrors] - The fetch errors ({ updateProfileError, updateListingError })
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
        userFields,
        userType,
        invalid,
        pristine,
        saveActionMsg,
        updated,
        updateInProgress = false,
        fetchErrors,
        values,
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

      const userFieldProps = getPropsForCustomUserFieldInputs(userFields, userType, false);

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <ErrorMessages fetchErrors={fetchErrors} />

          <FieldTextInput
            id={`${formId}.title`}
            name="title"
            className={css.displayName}
            type="text"
            label={intl.formatMessage({ id: 'EditListingProfileForm.displayNameLabel' })}
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

          <FieldLocationAutocompleteInput
            rootClassName={css.location}
            inputClassName={css.locationAutocompleteInput}
            iconClassName={css.locationAutocompleteInputIcon}
            predictionsClassName={css.predictionsRoot}
            validClassName={css.validLocation}
            name="location"
            id={`${formId}.location`}
            label={intl.formatMessage({ id: 'EditListingProfileForm.cityLabel' })}
            placeholder={intl.formatMessage({ id: 'EditListingProfileForm.cityPlaceholder' })}
            useDefaultPredictions={false}
            format={identity}
            valueFromForm={values.location}
            validate={composeValidators(
              autocompleteSearchRequired(cityRequiredMessage),
              autocompletePlaceSelected(cityNotRecognizedMessage)
            )}
          />

          {userFieldProps.map(({ key, ...fieldProps }) => (
            <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
          ))}

          <Button
            className={css.submitButton}
            type="submit"
            inProgress={submitInProgress}
            disabled={submitDisabled}
            ready={submitReady}
          >
            {saveActionMsg}
          </Button>
        </Form>
      );
    }}
  />
);

export default EditListingProfileForm;
