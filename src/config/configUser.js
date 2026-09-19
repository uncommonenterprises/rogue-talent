/////////////////////////////////////////////////////////
// Configurations related to user.                     //
/////////////////////////////////////////////////////////

// CONFIG-AS-CODE (Option A) — CODE IS THE SOURCE OF TRUTH.
//
// These user types + fields are the authoritative definition of the Rogue
// Talent model/client accounts. They were ported from the TEST marketplace
// no-code Console export (config/assets/user-types.json +
// config/assets/user-fields.json, 2026-09-19) so the same config ships to any
// environment on deploy.
//
// mergeUserConfig() in src/util/configHelpers.js now prefers this code config
// over the hosted (Console) assets whenever it is non-empty (in every
// environment, not just dev). Console user-type/field edits therefore have NO
// effect once code defines them. See docs/config-as-code-status.md.
//
// Shape note: entries here are in the app's INTERNAL config shape (post
// "restructure"), NOT the raw Console asset shape. Key differences vs the
// exported JSON: user types use `userType` (not `id`); user fields use
// `saveConfig.isRequired` (not `saveConfig.required`) and labels live inside
// showConfig/saveConfig. Because validUserSaveConfig defaults isRequired AND
// displayInSignUp to `true`, both are set explicitly on every field below.

/**
 * Configuration options for user fields (custom extended data fields):
 * - key:                           Unique key for the extended data field.
 * - scope (optional):              Scope of the extended data can be either 'public', 'protected', or 'private'.
 *                                  Default value: 'public'.
 * - schemaType (optional):         Schema for this extended data field.
 *                                  This is relevant when rendering components.
 *                                  Possible values: 'enum', 'multi-enum', 'text', 'long', 'boolean'.
 * - enumOptions (optional):        Options shown for 'enum' and 'multi-enum' extended data.
 *                                  These are used to render options for inputs on
 *                                  ProfileSettingsPage and AuthenticationPage.
 * - showConfig:                    Configuration for rendering user information. (How the field should be shown.)
 *   - label:                         Label for the saved data.
 *   - displayInProfile (optional):   Can be used to hide field content from profile page.
 *                                    Default value: true.
 * - saveConfig:                    Configuration for adding and modifying extended data fields.
 *   - label:                         Label for the input field.
 *   - placeholderMessage (optional): Default message for user input.
 *   - isRequired (optional):         Is the field required for users to fill
 *   - requiredMessage (optional):    Message for mandatory fields.
 *   - displayInSignUp (optional):    Can be used to show field input on sign up page.
 *                                    Default value: true.
 * - userTypeConfig:                Configuration for limiting user field to specific user types.
 *   - limitToUserTypeIds:            Can be used to determine whether to limit the field to certain user types.
 *   - userTypeIds:                   An array of user types for which the extended
 *   (optional)                       data is relevant and should be added.
 */
export const userFields = [
  {
    key: 'company_name',
    scope: 'public',
    schemaType: 'shortText',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['client'],
    },
    showConfig: {
      label: 'Company/Agency name',
    },
    saveConfig: {
      label: 'Company/Agency name',
      displayInSignUp: true,
      isRequired: false,
    },
  },
  {
    key: 'client_website_url',
    scope: 'public',
    schemaType: 'shortText',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['client'],
    },
    showConfig: {
      label: 'Website',
    },
    saveConfig: {
      label: 'Website',
      displayInSignUp: false,
      isRequired: false,
    },
  },
  {
    key: 'date_of_birth',
    scope: 'private',
    schemaType: 'shortText',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['model'],
    },
    helpText: '(DD/MM/YYYY)',
    showConfig: {
      label: 'Date of birth',
    },
    saveConfig: {
      label: 'Date of birth',
      displayInSignUp: false,
      isRequired: false,
    },
  },
  {
    key: 'id_verified',
    scope: 'metadata',
    schemaType: 'enum',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['model'],
    },
    enumOptions: [
      { option: 'pending', label: 'Pending' },
      { option: 'verified', label: 'Verified' },
      { option: 'rejected', label: 'Rejected' },
    ],
    showConfig: {
      label: 'ID verified',
    },
    saveConfig: {
      label: 'ID verified',
      displayInSignUp: false,
      isRequired: false,
    },
  },
  {
    key: 'industry',
    scope: 'public',
    schemaType: 'enum',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['client'],
    },
    enumOptions: [
      { option: 'fashion-brand', label: 'Fashion brand' },
      { option: 'e-commerce', label: 'E-commerce' },
      { option: 'photography', label: 'Photography' },
      { option: 'advertising-agency', label: 'Advertising agency' },
      { option: 'events', label: 'Events' },
      { option: 'film-tv', label: 'Film/TV' },
      { option: 'other', label: 'Other' },
    ],
    showConfig: {
      label: 'Industry',
    },
    saveConfig: {
      label: 'Industry',
      displayInSignUp: false,
      isRequired: false,
    },
  },
  {
    key: 'typical_projects',
    scope: 'public',
    schemaType: 'multi-enum',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['client'],
    },
    enumOptions: [
      { option: 'lookbook', label: 'Lookbook' },
      { option: 'campaign', label: 'Campaign' },
      { option: 'e-commerce', label: 'E-commerce' },
      { option: 'editorial', label: 'Editorial' },
      { option: 'events', label: 'Events' },
      { option: 'social-content', label: 'Social content' },
      { option: 'catalogue', label: 'Catalogue' },
      { option: 'tfp', label: 'TFP' },
    ],
    showConfig: {
      label: 'Typical project types',
      unselectedOptions: false,
    },
    saveConfig: {
      label: 'Typical project types',
      displayInSignUp: false,
      isRequired: false,
    },
  },
  {
    key: 'vat_number',
    scope: 'private',
    schemaType: 'shortText',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['client'],
    },
    showConfig: {
      label: 'VAT number',
    },
    saveConfig: {
      label: 'VAT number',
      displayInSignUp: false,
      isRequired: false,
    },
  },
  {
    key: 'id_verified_client',
    scope: 'public',
    schemaType: 'enum',
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['client'],
    },
    enumOptions: [
      { option: 'pending', label: 'Pending' },
      { option: 'verified', label: 'Verified' },
      { option: 'rejected', label: 'Rejected' },
    ],
    showConfig: {
      label: 'ID verified (client)',
    },
    saveConfig: {
      label: 'ID verified (client)',
      displayInSignUp: false,
      isRequired: false,
    },
  },
];

/////////////////////////////////////
// User type configuration         //
/////////////////////////////////////
/**
 * User types define the roles (provider/customer), which default account links
 * and default user fields are shown, and the sign-up settings for phone number
 * and display name. Ported from config/assets/user-types.json.
 *
 * Shape note: use `userType` (the Console asset uses `id`). All other keys
 * (roles, accountLinksVisibility, defaultUserFields, phoneNumberSettings,
 * displayNameSettings) match the asset and are passed through unchanged.
 */

export const userTypes = [
  {
    userType: 'model',
    label: 'Model',
    roles: {
      provider: true,
      customer: false,
    },
    accountLinksVisibility: {
      postListings: true,
      payoutDetails: true,
      paymentMethods: false,
    },
    defaultUserFields: {
      email: true,
      payoutDetails: true,
      profileImage: true,
      paymentMethods: true,
      password: true,
      displayName: false,
      firstName: true,
      bio: true,
      lastName: true,
      phoneNumber: true,
    },
    phoneNumberSettings: {
      displayInSignUp: true,
      required: false,
    },
    displayNameSettings: {
      displayInSignUp: true,
      required: true,
    },
  },
  {
    userType: 'client',
    label: 'Client',
    roles: {
      provider: false,
      customer: true,
    },
    accountLinksVisibility: {
      postListings: false,
      payoutDetails: false,
      paymentMethods: true,
    },
    defaultUserFields: {
      email: true,
      payoutDetails: true,
      profileImage: true,
      paymentMethods: true,
      password: true,
      displayName: false,
      firstName: true,
      bio: true,
      lastName: true,
      phoneNumber: true,
    },
    phoneNumberSettings: {
      displayInSignUp: true,
      required: true,
    },
    displayNameSettings: {
      displayInSignUp: true,
      required: true,
    },
  },
];
