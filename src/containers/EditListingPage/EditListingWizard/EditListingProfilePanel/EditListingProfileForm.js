import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { getPropsForCustomUserFieldInputs } from '../../../../util/userHelpers';

// Import shared components
import { Button, Form, CustomExtendedDataField } from '../../../../components';

// Import modules from this directory
import css from './EditListingProfileForm.module.css';

const ErrorMessage = props => {
  const { fetchErrors } = props;
  const { updateProfileError } = fetchErrors || {};

  return updateProfileError ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingProfileForm.updateFailed" />
    </p>
  ) : null;
};

/**
 * The EditListingProfileForm component. Renders the model's custom user-profile
 * fields (from config.user.userFields) so they can be filled in during the
 * Create-your-profile wizard rather than only in Account Settings.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.formId] - The form id
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {Array} props.userFields - The user field configurations to render
 * @param {string} props.userType - The current user's user type (used to filter fields)
 * @param {boolean} [props.disabled] - Whether the form is disabled
 * @param {boolean} [props.ready] - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.saveActionMsg - The save action button label
 * @param {boolean} [props.updated] - Whether the form was just updated
 * @param {boolean} [props.updateInProgress] - Whether the save is in progress
 * @param {Object} [props.fetchErrors] - The fetch errors ({ updateProfileError })
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
      } = formRenderProps;

      const classes = classNames(rootClassName || css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      const userFieldProps = getPropsForCustomUserFieldInputs(userFields, userType, false);

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <ErrorMessage fetchErrors={fetchErrors} />

          {userFieldProps.length === 0 ? (
            <p className={css.noFields}>
              <FormattedMessage id="EditListingProfileForm.noFields" />
            </p>
          ) : (
            userFieldProps.map(({ key, ...fieldProps }) => (
              <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
            ))
          )}

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
