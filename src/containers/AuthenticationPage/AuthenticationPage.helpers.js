import Cookies from 'js-cookie';

import { isEmpty } from '../../util/common';
import { pickUserFieldsData, addScopePrefix } from '../../util/userHelpers';
import { pickReferralData } from '../../util/webStorageHelpers';

// RT-FB-03 (decided 28/09/2026): date of birth is no longer asked at sign-up; the "I confirm I'm
// 18 or over" tick box replaces it (SAF-38's real gate is the ID-verified 18+ check). These user
// fields never render at sign-up (email or SSO), whatever their displayInSignUp setting in code
// or Console.
export const SIGNUP_HIDDEN_USER_FIELD_KEYS = ['date_of_birth'];

/**
 * Drops user fields that must never be asked at sign-up (see SIGNUP_HIDDEN_USER_FIELD_KEYS).
 *
 * @param {Array<{ fieldConfig: Object }>} userFieldProps - from getPropsForCustomUserFieldInputs
 * @returns {Array<{ fieldConfig: Object }>}
 */
export const omitSignupHiddenUserFields = userFieldProps =>
  (userFieldProps || []).filter(
    ({ fieldConfig }) => !SIGNUP_HIDDEN_USER_FIELD_KEYS.includes(fieldConfig?.key)
  );

// The sign-up "I confirm I'm 18 or over" tick box (RT-FB-03): form field name + option key.
export const AGE_CONFIRMATION_FIELD = 'ageConfirmation';
export const AGE_CONFIRMATION_OPTION = 'confirmed-18-plus';

/**
 * Turns the sign-up age tick box into an audit record for the new user's protectedData:
 * `ageConfirmed18Plus: true` plus the ISO timestamp of the confirmation. It is self-declared;
 * the real 18+ gate is the ID-verified check at Stripe verification (SAF-38).
 *
 * @param {Array<string>|undefined} ageConfirmation - the tick box value (FieldCheckboxGroup array)
 * @param {Date} [now] - time of confirmation (defaults to the moment of submit)
 * @returns {{ ageConfirmed18Plus: true, ageConfirmed18PlusAt: string } | {}}
 */
export const getAgeConfirmationData = (ageConfirmation, now = new Date()) =>
  Array.isArray(ageConfirmation) && ageConfirmation.includes(AGE_CONFIRMATION_OPTION)
    ? { ageConfirmed18Plus: true, ageConfirmed18PlusAt: now.toISOString() }
    : {};

// Returns full userType config based on selected userType
const getUserTypeConfig = (userType, userTypes) => {
  return userTypes.find(config => {
    return config.userType === userType;
  });
};

/**
 * Filters out configured user-field entries, returning only the remaining key/value pairs.
 *
 * The signup and IdP confirm flows destructure a set of known identity fields from the form submit
 * values and handles the remaining fields as `protectedData`.
 * This helper picks those key/value pairs that are not configured as user fields.
 *
 * @param {Object} values - submit values from the form
 * @param {Array<{ scope: string, key: string }>} userFieldConfigs - Configured user field definitions.
 * @returns {Object} Remaining key/value pairs (non-user-field entries).
 */
export const getNonUserFieldParams = (values, userFieldConfigs) => {
  const userFieldKeys = userFieldConfigs.map(({ scope, key }) => addScopePrefix(scope, key));

  return Object.entries(values).reduce((picked, [key, value]) => {
    const isUserFieldKey = userFieldKeys.includes(key);

    return isUserFieldKey
      ? picked
      : {
          ...picked,
          [key]: value,
        };
  }, {});
};

/**
 * Builds extended data (public/private/protected) for the created currentUser entity.
 *
 * Returns an empty object when no extended data is provided.
 *
 * @param {Object} submitValues - Unhandled form submit values
 * @param {string} userType - The user type
 * @param {Array} userFields - User field configurations
 * @returns {{ publicData: Object, privateData: Object, protectedData: Object } | {}}
 */
export const getExtendedDataMaybe = (submitValues, userType, userFields, extraData) => {
  const { publicData, privateData, protectedData } = extraData;

  return !isEmpty(submitValues) || !isEmpty(protectedData)
    ? {
        publicData: {
          ...publicData,
          userType,
          ...pickUserFieldsData(submitValues, 'public', userType, userFields),
        },
        privateData: {
          ...privateData,
          ...pickUserFieldsData(submitValues, 'private', userType, userFields),
        },
        protectedData: {
          ...protectedData,
          ...pickUserFieldsData(submitValues, 'protected', userType, userFields),
          // If the form has any additional values, pass them forward as user's protected data
          ...getNonUserFieldParams(submitValues, userFields),
        },
      }
    : {};
};

/**
 * Creates a submit handler for the signup form.
 * I.e. the handler dispatches the signup thunk action.
 *
 * @param {Object} params
 * @param {Function} params.submitSignup
 * @param {Array} params.userFields
 * @returns {(values: Object) => void}
 */
export const getHandleSubmitSignup = ({ submitSignup, userFields, userTypes }) => values => {
  const {
    userType,
    email,
    password,
    fname,
    lname,
    displayName,
    [AGE_CONFIRMATION_FIELD]: ageConfirmation,
    ...rest
  } = values;
  const displayNameMaybe = displayName ? { displayName: displayName.trim() } : {};

  // Set referral to user private data if it exists and is valid
  const userTypeConfig = getUserTypeConfig(userType, userTypes);
  const extraPrivateData = pickReferralData(userTypeConfig);

  const submitParams = {
    email,
    password,
    firstName: fname.trim(),
    lastName: lname.trim(),
    ...displayNameMaybe,
    ...getExtendedDataMaybe(rest, userType, userFields, {
      privateData: extraPrivateData,
      protectedData: getAgeConfirmationData(ageConfirmation),
    }),
  };

  submitSignup(submitParams);
};

/**
 * Creates a submit handler for confirming signup data after SSO.
 * I.e. the handler dispatches the signupWithIdp thunk action.
 *
 * @param {Object} params
 * @param {Object} params.authInfo
 * @param {Function} params.submitSingupWithIdp
 * @param {Array} params.userFields
 * @returns {(values: Object) => void}
 */
export const getHandleSubmitConfirm = ({
  authInfo,
  submitSingupWithIdp,
  userFields,
  userTypes,
}) => values => {
  const { idpToken, email, firstName, lastName, idpId } = authInfo;

  const {
    userType,
    email: newEmail,
    firstName: newFirstName,
    lastName: newLastName,
    displayName,
    [AGE_CONFIRMATION_FIELD]: ageConfirmation,
    ...rest
  } = values;

  const displayNameMaybe = displayName ? { displayName: displayName.trim() } : {};

  // Pass email, fistName or lastName to Marketplace API only if user has edited them
  // and they can't be fetched directly from idp provider (e.g. Facebook)
  const authParams = {
    ...(newEmail !== email && { email: newEmail }),
    ...(newFirstName !== firstName && { firstName: newFirstName }),
    ...(newLastName !== lastName && { lastName: newLastName }),
  };

  // Set referral to user private data if it exists and is valid
  const userTypeConfig = getUserTypeConfig(userType, userTypes);
  const extraPrivateData = pickReferralData(userTypeConfig);

  // Pass other values as extended data according to user field configuration
  const extendedDataMaybe = getExtendedDataMaybe(rest, userType, userFields, {
    privateData: extraPrivateData,
    protectedData: getAgeConfirmationData(ageConfirmation),
  });

  submitSingupWithIdp({
    idpToken,
    idpId,
    ...authParams,
    ...displayNameMaybe,
    ...extendedDataMaybe,
  });
};

/**
 * Reads authentication info persisted in `st-authinfo` cookie.
 *
 * @returns {Object | null}
 */
export const getAuthInfoFromCookies = () => {
  return Cookies.get('st-authinfo')
    ? JSON.parse(Cookies.get('st-authinfo').replace('j:', ''))
    : null;
};

/**
 * Reads authentication error persisted in `st-autherror` cookie.
 *
 * @returns {Object | null}
 */
export const getAuthErrorFromCookies = () => {
  return Cookies.get('st-autherror')
    ? JSON.parse(Cookies.get('st-autherror').replace('j:', ''))
    : null;
};
