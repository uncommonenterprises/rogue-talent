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

const getUserType = currentUser => currentUser?.attributes?.profile?.publicData?.userType;

// Note: the model's city/location is captured by the city autocomplete below (saved to
// the listing's geolocation), not by a user field — so there is no separate "city" user
// field to render here.
const getPublicUserFields = config => {
  const userFields = config?.user?.userFields || [];
  return userFields.filter(uf => uf.scope === 'public');
};

// Resolve the listing type info needed to create the draft. Uses the type already on the
// listing if present, otherwise the single configured listing type (this marketplace has
// one: model-profile). Returns {} if it can't be resolved (e.g. multiple types) — in
// which case the draft can't be created here and the flow falls back to Details.
const getListingTypeValues = (listing, config) => {
  const publicData = listing?.attributes?.publicData || {};
  const { listingType, transactionProcessAlias, unitType } = publicData;
  if (listingType && transactionProcessAlias && unitType) {
    return { listingType, transactionProcessAlias, unitType };
  }
  const listingTypes = config?.listing?.listingTypes || [];
  if (listingTypes.length === 1) {
    const { listingType: type, transactionType } = listingTypes[0] || {};
    if (type && transactionType?.alias && transactionType?.unitType) {
      return {
        listingType: type,
        transactionProcessAlias: transactionType.alias,
        unitType: transactionType.unitType,
      };
    }
  }
  return {};
};

const getInitialValues = props => {
  const { currentUser, config, listing } = props;
  const userType = getUserType(currentUser);
  const publicUserFields = getPublicUserFields(config);
  const profilePublicData = currentUser?.attributes?.profile?.publicData || {};

  // Display name is the listing title; location is stored on the listing
  // (geolocation + publicData.location.address).
  const { title, geolocation, publicData: listingPublicData } = listing?.attributes || {};
  const address = listingPublicData?.location?.address;
  const locationFieldsPresent = address && geolocation;

  return {
    title,
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
    listing,
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
  const publicUserFields = getPublicUserFields(config);

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
          const { title, location, ...rest } = values;
          const { selectedPlace } = location || {};
          const { address, origin } = selectedPlace || {};

          const profileValues = {
            publicData: {
              ...pickUserFieldsData(rest, 'public', userType, publicUserFields),
            },
          };
          const listingValues = {
            title: title.trim(),
            geolocation: origin,
            publicData: {
              ...getListingTypeValues(listing, config),
              location: { address },
            },
          };

          // Persist chosen place so the autocomplete keeps it through re-renders.
          setState({
            initialValues: {
              ...rest,
              title,
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
