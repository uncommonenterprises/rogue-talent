import React, { useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';

// Import shared components
import { H3 } from '../../../../components';

// Import modules from this directory
import EditListingProfileForm from './EditListingProfileForm';
import css from './EditListingProfilePanel.module.css';

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

// Build a privacy-preserving default display name from the user's signup name:
// "Lucy" + "Southern" -> "Lucy S.". Falls back to the first name alone (or '')
// so the field is still editable if the surname is missing.
const defaultDisplayName = currentUser => {
  const { firstName, lastName } = currentUser?.attributes?.profile || {};
  const first = firstName?.trim();
  if (!first) {
    return '';
  }
  const lastInitial = lastName?.trim()?.charAt(0)?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
};

const getInitialValues = props => {
  const { listing, currentUser } = props;
  // Display name is the listing title; location is stored on the listing
  // (geolocation + publicData.location.address).
  const { title, geolocation, publicData: listingPublicData } = listing?.attributes || {};
  const address = listingPublicData?.location?.address;
  const locationFieldsPresent = address && geolocation;

  return {
    // Pre-fill new profiles with "First L." from the signup name; models who use a
    // professional name can edit it. Existing listings keep their saved title.
    title: title || defaultDisplayName(currentUser),
    location: locationFieldsPresent
      ? { search: address, selectedPlace: { address, origin: geolocation } }
      : null,
  };
};

/**
 * The EditListingProfilePanel — the "About you" wizard step (the first step). It collects
 * just the model's display name and the city they're based in. The display name becomes
 * the listing title (and creates the draft in the new-listing flow); the city becomes the
 * listing geolocation (powering location search). The model's attribute fields live on the
 * next step ("Your profile"). The parent persists the returned listing values via onSubmit.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing (source of the title + city)
 * @param {Object} props.config - The marketplace config (provides the listing type)
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {boolean} props.panelUpdated - Whether the panel was just updated
 * @param {boolean} props.updateInProgress - Whether a save is in progress
 * @param {Object} props.errors - Errors object ({ updateListingError })
 * @param {Function} props.onSubmit - Save handler; receives the listing update values
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
        saveActionMsg={submitButtonText}
        disabled={disabled}
        ready={ready}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        fetchErrors={errors}
        autoFocus
        onSubmit={values => {
          const { title, location } = values;
          const { selectedPlace } = location || {};
          const { address, origin } = selectedPlace || {};

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
              title,
              location: { search: address, selectedPlace: { address, origin } },
            },
          });

          onSubmit(listingValues);
        }}
      />
    </main>
  );
};

export default EditListingProfilePanel;
