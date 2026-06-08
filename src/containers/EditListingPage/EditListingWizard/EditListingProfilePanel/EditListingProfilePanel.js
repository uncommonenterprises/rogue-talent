import React, { useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { initialValuesForUserFields, pickUserFieldsData } from '../../../../util/userHelpers';

// Import shared components
import { H3 } from '../../../../components';

// Import modules from this directory
import EditListingProfileForm from './EditListingProfileForm';
import css from './EditListingProfilePanel.module.css';

// Console-configured user fields with one of these keys are treated as a model's
// "city" and are NOT rendered here, because location is captured by the city
// autocomplete below (which saves to the listing's geolocation, powering search).
// Remove the corresponding user field in Sharetribe Console to retire it fully.
const CITY_PROFILE_FIELD_KEYS = ['city', 'town', 'location'];

const getUserType = currentUser => currentUser?.attributes?.profile?.publicData?.userType;

const getPublicUserFields = (config, currentUser) => {
  const userFields = config?.user?.userFields || [];
  return userFields.filter(
    uf => uf.scope === 'public' && !CITY_PROFILE_FIELD_KEYS.includes(uf.key)
  );
};

const getInitialValues = props => {
  const { currentUser, config, listing } = props;
  const userType = getUserType(currentUser);
  const publicUserFields = getPublicUserFields(config, currentUser);
  const profilePublicData = currentUser?.attributes?.profile?.publicData || {};

  // Location is stored on the listing (geolocation + publicData.location.address).
  const { geolocation, publicData: listingPublicData } = listing?.attributes || {};
  const address = listingPublicData?.location?.address;
  const locationFieldsPresent = address && geolocation;

  return {
    ...initialValuesForUserFields(profilePublicData, 'public', userType, publicUserFields),
    location: locationFieldsPresent
      ? { search: address, selectedPlace: { address, origin: geolocation } }
      : null,
  };
};

/**
 * The EditListingProfilePanel — the "About you" wizard step. It lets a model fill in
 * their user-profile custom fields (measurements, experience, categories, etc.) AND the
 * city they're based in, in one step. Profile fields save to the current user (via
 * onUpdateProfile); the city saves to the listing's geolocation (via onUpdateListing),
 * so it powers location-based search. Both saves are dispatched by the parent through
 * the onSubmit handler, which receives { profileValues, listingValues }.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {propTypes.ownListing} props.listing - The listing (location source)
 * @param {Object} props.config - The marketplace config (provides config.user.userFields)
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {boolean} props.panelUpdated - Whether the panel was just updated
 * @param {boolean} props.updateInProgress - Whether a save is in progress
 * @param {Object} props.errors - Errors object ({ updateProfileError, updateListingError })
 * @param {Function} props.onSubmit - Save handler; receives { profileValues, listingValues }
 * @param {string} props.submitButtonText - The submit button label
 * @returns {JSX.Element}
 */
const EditListingProfilePanel = props => {
  // LocationAutocompleteInput has no internal state, so we hold initialValues in state
  // to avoid re-renders (during the geocoding XHR) overwriting the chosen place.
  const [state, setState] = useState({ initialValues: getInitialValues(props) });

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
  const publicUserFields = getPublicUserFields(config, currentUser);

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
        initialValues={state.initialValues}
        userFields={publicUserFields}
        userType={userType}
        saveActionMsg={submitButtonText}
        disabled={disabled}
        ready={ready}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        fetchErrors={errors}
        autoFocus
        onSubmit={values => {
          const { location, ...rest } = values;
          const { selectedPlace } = location || {};
          const { address, origin } = selectedPlace || {};

          const profileValues = {
            publicData: {
              ...pickUserFieldsData(rest, 'public', userType, publicUserFields),
            },
          };
          const listingValues = {
            geolocation: origin,
            publicData: { location: { address } },
          };

          // Persist chosen place so the autocomplete keeps it through re-renders.
          setState({
            initialValues: {
              ...rest,
              location: { search: address, selectedPlace: { address, origin } },
            },
          });

          onSubmit({ profileValues, listingValues });
        }}
      />
    </main>
  );
};

export default EditListingProfilePanel;
