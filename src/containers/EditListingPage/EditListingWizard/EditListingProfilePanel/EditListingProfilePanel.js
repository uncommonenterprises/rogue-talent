import React from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { initialValuesForUserFields, pickUserFieldsData } from '../../../../util/userHelpers';

// Import shared components
import { H3 } from '../../../../components';

// Import modules from this directory
import EditListingProfileForm from './EditListingProfileForm';
import css from './EditListingProfilePanel.module.css';

const getUserType = currentUser => currentUser?.attributes?.profile?.publicData?.userType;

/**
 * The EditListingProfilePanel — a wizard step ("About you") that lets a model fill
 * in their user-profile custom fields (measurements, experience, categories, etc.)
 * inside the Create-your-profile flow. Unlike the other wizard panels, this saves to
 * the current user's profile (via onSubmit -> onUpdateProfile) rather than to the listing.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.config - The marketplace config (provides config.user.userFields)
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {boolean} props.panelUpdated - Whether the panel was just updated
 * @param {boolean} props.updateInProgress - Whether the profile update is in progress
 * @param {Object} props.errors - Errors object ({ updateProfileError })
 * @param {Function} props.onSubmit - Save handler; receives a profile-update payload
 * @param {string} props.submitButtonText - The submit button label
 * @returns {JSX.Element}
 */
const EditListingProfilePanel = props => {
  const {
    className,
    rootClassName,
    currentUser,
    config,
    disabled,
    ready,
    onSubmit,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const userType = getUserType(currentUser);
  const userFields = config?.user?.userFields || [];
  const publicUserFields = userFields.filter(uf => uf.scope === 'public');
  const publicData = currentUser?.attributes?.profile?.publicData || {};

  const initialValues = initialValuesForUserFields(
    publicData,
    'public',
    userType,
    publicUserFields
  );

  return (
    <main className={classes}>
      <H3 as="h1">
        <FormattedMessage id="EditListingProfilePanel.title" />
      </H3>
      <p className={css.guidance}>
        <FormattedMessage id="EditListingProfilePanel.guidance" />
      </p>
      <EditListingProfileForm
        className={css.form}
        initialValues={initialValues}
        userFields={publicUserFields}
        userType={userType}
        saveActionMsg={submitButtonText}
        disabled={disabled}
        ready={ready}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        fetchErrors={errors}
        onSubmit={values => {
          const updateValues = {
            publicData: {
              ...pickUserFieldsData(values, 'public', userType, publicUserFields),
            },
          };
          onSubmit(updateValues);
        }}
      />
    </main>
  );
};

export default EditListingProfilePanel;
