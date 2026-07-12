import React, { useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';

// Import shared components
import { H3 } from '../../../../components';

// Import modules from this directory
import { PROFILE_LISTING_FIELD_KEYS } from '../profileFields';
import EditListingProfileForm from './EditListingProfileForm';
import css from './EditListingProfilePanel.module.css';

// The model-attribute listing fields collected on this step (measurements, appearance,
// experience, categories, links). They live on the LISTING so they are searchable and
// display natively on the listing page.
const getProfileFields = config =>
  (config?.listing?.listingFields || []).filter(f => PROFILE_LISTING_FIELD_KEYS.includes(f.key));

const namespacedKey = field =>
  field.scope === 'private' ? `priv_${field.key}` : `pub_${field.key}`;

// Namespaced form initial values for the profile fields, read from the listing's data.
const getProfileFieldInitialValues = (listing, profileFields) => {
  const { publicData, privateData } = listing?.attributes || {};
  return profileFields.reduce((acc, field) => {
    const source = field.scope === 'private' ? privateData : publicData;
    return { ...acc, [namespacedKey(field)]: source?.[field.key] };
  }, {});
};

// Split submitted (namespaced) profile-field values back into listing public/private data.
const pickProfileFieldData = (values, profileFields) => {
  const publicData = {};
  const privateData = {};
  profileFields.forEach(field => {
    const ns = namespacedKey(field);
    if (field.scope === 'private') {
      privateData[field.key] = values[ns];
    } else {
      publicData[field.key] = values[ns];
    }
  });
  return { publicData, privateData };
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
  const { config, listing } = props;
  const profileFields = getProfileFields(config);

  // Display name is the listing title; location is stored on the listing
  // (geolocation + publicData.location.address).
  const { title, geolocation, publicData: listingPublicData } = listing?.attributes || {};
  const address = listingPublicData?.location?.address;
  const locationFieldsPresent = address && geolocation;

  return {
    title,
    ...getProfileFieldInitialValues(listing, profileFields),
    location: locationFieldsPresent
      ? { search: address, selectedPlace: { address, origin: geolocation } }
      : null,
  };
};

/**
 * The EditListingProfilePanel — the "About you" wizard step (the first step). It collects
 * the model's display name, the city they're based in, and their profile attributes
 * (measurements, appearance, experience, categories, links). All of it saves to the
 * LISTING: the display name becomes the title (and creates the draft), the city becomes
 * the geolocation, and the attributes are listing custom fields — so they're searchable
 * and display natively on the listing page. The parent persists the returned listing
 * values via onSubmit.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing (source of all values here)
 * @param {Object} props.config - The marketplace config (provides config.listing.listingFields)
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
  const profileFields = getProfileFields(config);

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
        profileFields={profileFields}
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

          const { publicData: profilePublic, privateData: profilePrivate } = pickProfileFieldData(
            rest,
            profileFields
          );

          const listingValues = {
            title: title.trim(),
            geolocation: origin,
            publicData: {
              ...getListingTypeValues(listing, config),
              location: { address },
              ...profilePublic,
            },
            ...(Object.keys(profilePrivate).length > 0 ? { privateData: profilePrivate } : {}),
          };

          // Persist chosen place so the autocomplete keeps it through re-renders.
          setState({
            initialValues: {
              ...rest,
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
