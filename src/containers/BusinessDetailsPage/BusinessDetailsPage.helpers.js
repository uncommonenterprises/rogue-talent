import {
  BUSINESS_TYPE_LIMITED_COMPANY,
  BUSINESS_TYPE_SOLE_TRADER,
  BUSINESS_TYPES,
  BUSINESS_DETAILS_SUBMITTED_AT_KEY,
} from '../../util/clientBusinessDetails';

/**
 * Client "Your business details" step (sign-up journey screen 18): form values <-> user profile.
 *
 * Where each value is stored (user fields defined in src/config/configUser.js):
 *   publicData     company_name, company_registration_number, industry, client_website_url
 *   protectedData  business_type
 *   privateData    business_address, business_phone, businessDetailsSubmittedAt
 *
 * business_phone is only ever written to privateData: it is never public and never shared with a
 * model through a transaction (the form promises "Never shown to models").
 */

// Form field names.
export const FIELD_BUSINESS_TYPE = 'businessType';
export const FIELD_COMPANY_NAME = 'companyName';
export const FIELD_REGISTRATION_NUMBER = 'companyRegistrationNumber';
export const FIELD_BUSINESS_ADDRESS = 'businessAddress';
export const FIELD_BUSINESS_PHONE = 'businessPhone';
export const FIELD_INDUSTRY = 'industry';
export const FIELD_WEBSITE = 'website';

// Phone: digits plus the usual separators, and at least 7 digits. Deliberately light: the
// operator checks it by hand, and UK and international formats vary.
const PHONE_ALLOWED_CHARS = /^[+\d\s()-]+$/;
const PHONE_MIN_DIGITS = 7;

const trimmed = value => (typeof value === 'string' ? value.trim() : '');

/**
 * Is this a sole trader (vs a limited company)?
 * @param {string} businessType
 * @returns {boolean}
 */
export const isSoleTrader = businessType => businessType === BUSINESS_TYPE_SOLE_TRADER;

/**
 * The required form fields for a business type. Limited companies need a registration number
 * (and the website is optional); sole traders have no Companies House number, so a website or
 * social media link is required instead.
 *
 * @param {string} businessType - 'limited_company' | 'sole_trader'
 * @returns {Array<string>} form field names
 */
export const getRequiredFields = businessType =>
  isSoleTrader(businessType)
    ? [
        FIELD_BUSINESS_TYPE,
        FIELD_COMPANY_NAME,
        FIELD_BUSINESS_ADDRESS,
        FIELD_WEBSITE,
        FIELD_BUSINESS_PHONE,
      ]
    : [
        FIELD_BUSINESS_TYPE,
        FIELD_COMPANY_NAME,
        FIELD_REGISTRATION_NUMBER,
        FIELD_BUSINESS_ADDRESS,
        FIELD_BUSINESS_PHONE,
      ];

/**
 * Is the phone number plausible?
 * @param {string} value
 * @returns {boolean}
 */
export const isValidPhone = value => {
  const phone = trimmed(value);
  const digits = phone.replace(/\D/g, '');
  return PHONE_ALLOWED_CHARS.test(phone) && digits.length >= PHONE_MIN_DIGITS;
};

// An address counts once one of the autocomplete suggestions has been chosen (typing again
// clears the chosen place). A saved address re-hydrates as a chosen place.
const getSelectedAddress = value => {
  const address = value?.selectedPlace?.address;
  return typeof address === 'string' && address.trim().length > 0 ? address.trim() : null;
};

const isFilled = (fieldName, values) => {
  if (fieldName === FIELD_BUSINESS_ADDRESS) {
    return !!getSelectedAddress(values[FIELD_BUSINESS_ADDRESS]);
  }
  if (fieldName === FIELD_BUSINESS_TYPE) {
    return BUSINESS_TYPES.includes(values[FIELD_BUSINESS_TYPE]);
  }
  return trimmed(values[fieldName]).length > 0;
};

/**
 * Final Form record-level validation for the business details form. The required set depends on
 * the business type, so validation lives at form level rather than on each field.
 *
 * @param {Object} values - form values
 * @param {Object} messages - error messages keyed by form field name, plus:
 *   `addressNotChosen` (typed but no suggestion chosen) and `phoneInvalid`
 * @returns {Object} errors keyed by form field name (empty when valid)
 */
export const validateBusinessDetails = (values = {}, messages = {}) => {
  const errors = {};
  getRequiredFields(values[FIELD_BUSINESS_TYPE]).forEach(fieldName => {
    if (!isFilled(fieldName, values)) {
      const typedAddress =
        fieldName === FIELD_BUSINESS_ADDRESS && trimmed(values[FIELD_BUSINESS_ADDRESS]?.search);
      errors[fieldName] = typedAddress ? messages.addressNotChosen : messages[fieldName];
    }
  });
  if (!errors[FIELD_BUSINESS_PHONE] && !isValidPhone(values[FIELD_BUSINESS_PHONE])) {
    errors[FIELD_BUSINESS_PHONE] = messages.phoneInvalid;
  }
  return errors;
};

/**
 * Initial form values from the current user. The company name comes from sign-up; anything saved
 * on this step before is restored. Business type defaults to limited company (as in the mockup).
 *
 * @param {Object} currentUser - currentUser API entity
 * @returns {Object} form values
 */
export const getInitialValues = currentUser => {
  const profile = currentUser?.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const protectedData = profile.protectedData || {};
  const privateData = profile.privateData || {};
  const savedType = protectedData.business_type;
  const savedAddress = privateData.business_address;

  return {
    [FIELD_BUSINESS_TYPE]: BUSINESS_TYPES.includes(savedType)
      ? savedType
      : BUSINESS_TYPE_LIMITED_COMPANY,
    [FIELD_COMPANY_NAME]: publicData.company_name || '',
    [FIELD_REGISTRATION_NUMBER]: publicData.company_registration_number || '',
    [FIELD_BUSINESS_ADDRESS]: savedAddress
      ? { search: savedAddress, predictions: [], selectedPlace: { address: savedAddress } }
      : null,
    [FIELD_BUSINESS_PHONE]: privateData.business_phone || '',
    [FIELD_INDUSTRY]: publicData.industry || '',
    [FIELD_WEBSITE]: publicData.client_website_url || '',
  };
};

// Drop empty values so a partial "Save & exit" never wipes something saved earlier.
const withoutEmpty = data =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== ''));

/**
 * The updateProfile payload for the business details.
 *
 * - submit: true ("Submit for approval", after validation) writes every field, removes a stale
 *   registration number when the business is a sole trader, and records the Gate A submission
 *   timestamp (privateData.businessDetailsSubmittedAt).
 * - submit: false ("Save & exit") writes only what has been filled in and never records a
 *   submission.
 *
 * @param {Object} values - form values
 * @param {Object} [options]
 * @param {boolean} [options.submit] - true for "Submit for approval"
 * @param {Date} [options.now] - submission time (defaults to now)
 * @returns {{ publicData: Object, protectedData: Object, privateData: Object }}
 */
export const getBusinessDetailsPayload = (values = {}, options = {}) => {
  const { submit = false, now = new Date() } = options;
  const businessType = BUSINESS_TYPES.includes(values[FIELD_BUSINESS_TYPE])
    ? values[FIELD_BUSINESS_TYPE]
    : null;
  const soleTrader = isSoleTrader(businessType);

  const publicData = {
    company_name: trimmed(values[FIELD_COMPANY_NAME]) || null,
    // Sole traders have no Companies House number: clear any number saved while "Limited
    // company" was selected so the operator never checks a stale one.
    company_registration_number: soleTrader
      ? null
      : trimmed(values[FIELD_REGISTRATION_NUMBER]) || null,
    industry: values[FIELD_INDUSTRY] || null,
    client_website_url: trimmed(values[FIELD_WEBSITE]) || null,
  };
  const protectedData = { business_type: businessType };
  const privateData = {
    business_address: getSelectedAddress(values[FIELD_BUSINESS_ADDRESS]),
    business_phone: trimmed(values[FIELD_BUSINESS_PHONE]) || null,
  };

  if (submit) {
    return {
      publicData,
      protectedData,
      privateData: { ...privateData, [BUSINESS_DETAILS_SUBMITTED_AT_KEY]: now.toISOString() },
    };
  }

  return {
    publicData: withoutEmpty(publicData),
    protectedData: withoutEmpty(protectedData),
    privateData: withoutEmpty(privateData),
  };
};
