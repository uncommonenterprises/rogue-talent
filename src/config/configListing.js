/////////////////////////////////////////////////////////
// Configurations related to listing.                  //
// Main configuration here is the extended data config //
/////////////////////////////////////////////////////////

// CONFIG-AS-CODE (Option A) — CODE IS THE SOURCE OF TRUTH.
//
// These listing types + fields are the authoritative definition of the
// Rogue Talent listing model. They were ported from the TEST marketplace
// no-code Console export (config/assets/listing-types.json +
// config/assets/listing-fields.json, 2026-09-19) so the same config ships
// to any environment on deploy.
//
// mergeListingConfig() in src/util/configHelpers.js now prefers this code
// config over the hosted (Console) assets whenever it is non-empty (in every
// environment, not just dev). Console listing-type/field edits therefore have
// NO effect once code defines them. See docs/config-as-code-status.md for the
// backend implications (search-index management + the hasMandatoryConfigs gate).
//
// Shape note: entries here are in the app's INTERNAL config shape (post
// "restructure"), NOT the raw Console asset shape. Key differences vs the
// exported JSON: use `transactionType: { process, alias, unitType }` (not
// `transactionProcess` + top-level `unitType`); use `saveConfig.isRequired`
// (not `saveConfig.required`); labels live inside showConfig/saveConfig/
// filterConfig. Transaction fields on a listing type are the exception — they
// ARE restructured by validListingTypes, so they keep the asset shape
// (`showTo`, `saveConfig.required`).

/**
 * Configuration options for listing fields (custom extended data fields):
 * - key:                           Unique key for the extended data field.
 * - scope (optional):              Scope of the extended data can be 'public', 'private', or 'metadata'.
 *                                  Default value: 'public'.
 *                                  Note: listing doesn't support 'protected' scope atm.
 * - schemaType (optional):         Schema for this extended data field.
 *                                  This is relevant when rendering components and querying listings.
 *                                  Possible values: 'enum', 'multi-enum', 'text', 'long', 'boolean'.
 * - enumOptions (optional):        Options shown for 'enum' and 'multi-enum' extended data.
 *                                  These are used to render options for inputs and filters on
 *                                  EditListingPage, ListingPage, and SearchPage.
 * - listingTypeConfig (optional):  Relationship configuration against listing types.
 *   - limitToListingTypeIds:         Indicator whether this listing field is relevant to a limited set of listing types.
 *   - listingTypeIds:                An array of listing types, for which this custom listing field is
 *                                    relevant and should be added. This is mandatory if limitToListingTypeIds is true.
 * - categoryConfig (optional):     Relationship configuration against categories.
 *   - limitToCategoryIds:            Indicator whether this listing field is relevant to a limited set of categories.
 *   - categoryIds:                   An array of categories, for which this custom listing field is
 *                                    relevant and should be added. This is mandatory if limitToCategoryIds is true.
 * - filterConfig:                  Filter configuration for listings query.
 *    - indexForSearch (optional):    If set as true, it is assumed that the extended data key has
 *                                    search index in place. I.e. the key can be used to filter
 *                                    listing queries (then scope needs to be 'public').
 *                                    Note: Sharetribe CLI can be used to set search index for the key:
 *                                    https://www.sharetribe.com/docs/references/extended-data/#search-schema
 *                                    Read more about filtering listings with public data keys from API Reference:
 *                                    https://www.sharetribe.com/api-reference/marketplace.html#extended-data-filtering
 *                                    Default value: false,
 *   - filterType:                    Sometimes a single schemaType can be rendered with different filter components.
 *                                    For 'enum' schema, filterType can be 'SelectSingleFilter' or 'SelectMultipleFilter'
 *   - label:                         Label for the filter, if the field can be used as query filter
 *   - searchMode (optional):         Search mode for indexed data with multi-enum schema.
 *                                    Possible values: 'has_all' or 'has_any'.
 *   - group:                         SearchPageWithMap has grouped filters. Possible values: 'primary' or 'secondary'.
 * - showConfig:                    Configuration for rendering listing. (How the field should be shown.)
 *   - label:                         Label for the saved data.
 *   - isDetail                       Can be used to hide detail row (of type enum, boolean, or long) from listing page.
 *                                    Default value: true,
 * - saveConfig:                    Configuration for adding and modifying extended data fields.
 *   - label:                         Label for the input field.
 *   - placeholderMessage (optional): Default message for user input.
 *   - isRequired (optional):         Is the field required for providers to fill
 *   - requiredMessage (optional):    Message for those fields, which are mandatory.
 */

// All model-attribute fields are limited to the single model-profile listing type.
const MODEL_PROFILE_ONLY = {
  limitToListingTypeIds: true,
  listingTypeIds: ['model-profile'],
};

export const listingFields = [
  {
    key: 'gender',
    scope: 'public',
    schemaType: 'enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    enumOptions: [
      { option: 'female', label: 'Female' },
      { option: 'male', label: 'Male' },
      { option: 'non-binary', label: 'Non-binary' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Gender',
    },
    showConfig: {
      label: 'Gender',
    },
    saveConfig: {
      label: 'Gender',
      isRequired: true,
    },
  },
  {
    key: 'height_cm',
    scope: 'public',
    schemaType: 'long',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    numberConfig: {
      minimum: 100,
      maximum: 250,
    },
    helpText: 'Your height in centimetres, measured without shoes.',
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Height (cm)',
    },
    showConfig: {
      label: 'Height (cm)',
    },
    saveConfig: {
      label: 'Height (cm)',
      isRequired: true,
    },
  },
  {
    key: 'waist_cm',
    scope: 'public',
    schemaType: 'long',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    numberConfig: {
      minimum: 40,
      maximum: 200,
    },
    helpText: 'Your natural waistline in centimetres.',
    filterConfig: {
      indexForSearch: false,
      label: 'Waist (cm)',
    },
    showConfig: {
      label: 'Waist (cm)',
    },
    saveConfig: {
      label: 'Waist (cm)',
      isRequired: true,
    },
  },
  {
    key: 'hips_cm',
    scope: 'public',
    schemaType: 'long',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    numberConfig: {
      minimum: 50,
      maximum: 200,
    },
    helpText: 'The fullest part of your hips in centimetres.',
    filterConfig: {
      indexForSearch: false,
      label: 'Hips (cm)',
    },
    showConfig: {
      label: 'Hips (cm)',
    },
    saveConfig: {
      label: 'Hips (cm)',
      isRequired: true,
    },
  },
  {
    key: 'bust_chest_cm',
    scope: 'public',
    schemaType: 'long',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    numberConfig: {
      minimum: 50,
      maximum: 200,
    },
    helpText: 'Around the fullest part of your bust/chest in centimetres.',
    filterConfig: {
      indexForSearch: false,
      showFilter: false,
      label: 'Bust/Chest (cm)',
    },
    showConfig: {
      label: 'Bust/Chest (cm)',
    },
    saveConfig: {
      label: 'Bust/Chest (cm)',
      isRequired: true,
    },
  },
  {
    key: 'shoe_size_uk',
    scope: 'public',
    schemaType: 'long',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    numberConfig: {
      minimum: 1,
      maximum: 20,
    },
    helpText: 'Your UK shoe size.',
    filterConfig: {
      indexForSearch: false,
      label: 'Shoe size (UK)',
    },
    showConfig: {
      label: 'Shoe size (UK)',
    },
    saveConfig: {
      label: 'Shoe size (UK)',
      isRequired: true,
    },
  },
  {
    key: 'hair_colour',
    scope: 'public',
    schemaType: 'enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'Your current hair colour — pick "Other" if it changes often.',
    enumOptions: [
      { option: 'black', label: 'Black' },
      { option: 'brown', label: 'Brown' },
      { option: 'blonde', label: 'Blonde' },
      { option: 'red', label: 'Red' },
      { option: 'auburn', label: 'Auburn' },
      { option: 'grey-white', label: 'Grey/White' },
      { option: 'other', label: 'Other' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Hair colour',
    },
    showConfig: {
      label: 'Hair colour',
    },
    saveConfig: {
      label: 'Hair colour',
      isRequired: true,
    },
  },
  {
    key: 'eye_colour',
    scope: 'public',
    schemaType: 'enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'Your natural eye colour.',
    enumOptions: [
      { option: 'brown', label: 'Brown' },
      { option: 'blue', label: 'Blue' },
      { option: 'green', label: 'Green' },
      { option: 'hazel', label: 'Hazel' },
      { option: 'grey', label: 'Grey' },
      { option: 'other', label: 'Other' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Eye colour',
    },
    showConfig: {
      label: 'Eye colour',
    },
    saveConfig: {
      label: 'Eye colour',
      isRequired: true,
    },
  },
  {
    key: 'ethnicity',
    scope: 'public',
    schemaType: 'multi-enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'Helps clients cast for specific briefs. Select all that apply.',
    enumOptions: [
      { option: 'asian', label: 'Asian' },
      { option: 'black', label: 'Black' },
      { option: 'hispanic-latino', label: 'Hispanic/Latino' },
      { option: 'middle-eastern', label: 'Middle Eastern' },
      { option: 'mixed', label: 'Mixed' },
      { option: 'white', label: 'White' },
      { option: 'other', label: 'Other' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Ethnicity',
    },
    showConfig: {
      label: 'Ethnicity',
      unselectedOptions: false,
    },
    saveConfig: {
      label: 'Ethnicity',
      isRequired: true,
    },
  },
  {
    key: 'experience_level',
    scope: 'public',
    schemaType: 'enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'Be honest — clients book at every level, and new faces are in demand.',
    enumOptions: [
      { option: 'new-face', label: 'New Face (just starting out — building your first portfolio)' },
      {
        option: 'some-experience',
        label: 'Some experience (a handful of shoots or jobs so far)',
      },
      {
        option: 'experienced',
        label: 'Experienced (regular bookings and a strong, varied portfolio)',
      },
      {
        option: 'professional',
        label: 'Professional (full-time model with extensive credits and experience)',
      },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Experience level',
    },
    showConfig: {
      label: 'Experience level',
    },
    saveConfig: {
      label: 'Experience level',
      isRequired: true,
    },
  },
  {
    key: 'modelling_categories',
    scope: 'public',
    schemaType: 'multi-enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    categoryConfig: {
      limitToCategoryIds: false,
    },
    helpText: 'The types of work you do and want to be booked for. Select all that apply.',
    enumOptions: [
      { option: 'fashion', label: 'Fashion' },
      { option: 'commercial', label: 'Commercial' },
      { option: 'editorial', label: 'Editorial' },
      { option: 'fitness', label: 'Fitness' },
      { option: 'lifestyle', label: 'Lifestyle' },
      { option: 'beauty', label: 'Beauty' },
      { option: 'lingerie', label: 'Lingerie' },
      { option: 'swimwear', label: 'Swimwear' },
      { option: 'plus-size', label: 'Plus-size' },
      { option: 'petite', label: 'Petite' },
      { option: 'parts', label: 'Parts (hands/feet)' },
      { option: 'hair', label: 'Hair' },
      { option: 'promotional-events', label: 'Promotional/Events' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Modelling categories',
    },
    showConfig: {
      label: 'Modelling categories',
      unselectedOptions: false,
    },
    saveConfig: {
      label: 'Modelling categories',
      isRequired: true,
    },
  },
  {
    key: 'availability_radius',
    scope: 'public',
    schemaType: 'enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: "How far you'll travel from your base city for a booking.",
    enumOptions: [
      { option: 'local', label: 'Local only (25 mi)' },
      { option: 'regional', label: 'Regional (50 mi)' },
      { option: 'national', label: 'National' },
      { option: 'international', label: 'International' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Availability radius',
    },
    showConfig: {
      label: 'Availability radius',
    },
    saveConfig: {
      label: 'Availability radius',
      isRequired: true,
    },
  },
  {
    key: 'model_website_url',
    scope: 'public',
    schemaType: 'shortText',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'A link to your portfolio site or comp card.',
    filterConfig: {
      indexForSearch: false,
      label: 'Website',
    },
    showConfig: {
      label: 'Website',
    },
    saveConfig: {
      label: 'Website',
      isRequired: false,
    },
  },
  {
    key: 'instagram_url',
    scope: 'public',
    schemaType: 'shortText',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'Your handle, so clients can see more of your work.',
    filterConfig: {
      indexForSearch: false,
      label: 'Instagram Handle',
    },
    showConfig: {
      label: 'Instagram Handle',
    },
    saveConfig: {
      label: 'Instagram Handle',
      isRequired: false,
    },
  },
  {
    key: 'half_day_rate',
    scope: 'public',
    schemaType: 'long',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    numberConfig: {
      minimum: 0,
      maximum: 10000,
    },
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Half-day rate (if offered) ',
    },
    showConfig: {
      label: 'Half-day rate (if offered) ',
    },
    saveConfig: {
      label: 'Half-day rate (if offered) ',
      isRequired: false,
    },
  },
  {
    key: 'hourly_rate',
    scope: 'public',
    schemaType: 'long',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    numberConfig: {
      minimum: 0,
      maximum: 5000,
    },
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'primary',
      label: 'Hourly rate (if offered) ',
    },
    showConfig: {
      label: 'Hourly rate (if offered) ',
    },
    saveConfig: {
      label: 'Hourly rate (if offered) ',
      isRequired: false,
    },
  },
  {
    key: 'travel_fee_policy',
    scope: 'public',
    schemaType: 'enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'Whether travel costs are included in your rate or charged separately.',
    enumOptions: [
      { option: 'included', label: 'Included in rate' },
      { option: 'charged-separately', label: 'Charged' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'secondary',
      label: 'Travel costs',
    },
    showConfig: {
      label: 'Travel costs',
    },
    saveConfig: {
      label: 'Travel costs',
      isRequired: true,
    },
  },
  {
    key: 'min_booking_notice',
    scope: 'public',
    schemaType: 'enum',
    listingTypeConfig: MODEL_PROFILE_ONLY,
    helpText: 'The least notice you need before a shoot.',
    enumOptions: [
      { option: 'same-day', label: 'Same day' },
      { option: '24-hours', label: '24 hours' },
      { option: '48-hours', label: '48 hours' },
      { option: '1-week', label: '1 week' },
      { option: '2-weeks', label: '2 weeks' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      group: 'secondary',
      label: 'Minimum booking notice',
    },
    showConfig: {
      label: 'Minimum booking notice',
    },
    saveConfig: {
      label: 'Minimum booking notice',
      isRequired: true,
    },
  },
];

///////////////////////////////////////////////////////////////////////
// Configurations related to listing types and transaction processes //
///////////////////////////////////////////////////////////////////////

// A presets of supported listing configurations
//
// Note: transaction type is part of listing type. It defines what transaction process and units
//       are used when transaction is created against a specific listing.

/**
 * Configuration options for listing experience:
 * - listingType:         Unique string. This will be saved to listing's public data on
 *                        EditListingWizard.
 * - label                Label for the listing type. Used as microcopy for options to select
 *                        listing type in EditListingWizard.
 * - transactionType      Set of configurations how this listing type will behave when transaction is
 *                        created.
 *   - process              Transaction process.
 *                          The process must match one of the processes that this client app can handle
 *                          (check src/util/transactions/transaction.js) and the process must also exists in correct
 *                          marketplace environment.
 *   - alias                Valid alias for the aforementioned process. This will be saved to listing's
 *                          public data as transctionProcessAlias and transaction is initiated with this.
 *   - unitType             Unit type is mainly used as pricing unit. This will be saved to
 *                          transaction's protected data.
 *                          Recommendation: don't use same unit types in completely different processes
 *                          ('item' sold should not be priced the same as 'item' booked).
 * - stockType            This is relevant only to listings using default-purchase process.
 *                        If set to 'oneItem', stock management is not showed and the listing is
 *                        considered unique (stock = 1).
 *                        Possible values: 'oneItem', 'multipleItems', 'infiniteOneItem', and 'infiniteMultipleItems'.
 *                        Default: 'multipleItems'.
 * - availabilityType     This is relevant only to listings using default-booking process.
 *                        If set to 'oneSeat', seat management is not showed and the listing is
 *                        considered per person (seat = 1).
 *                        Possible values: 'oneSeat' and 'multipleSeats'.
 *                        Default: 'oneSeat'.
 * - priceVariations      This is relevant only to listings using default-booking process.
 *   - enabled:             If set to true, price variations are enabled.
 *                          Default: false.
 * - defaultListingFields These are tied to transaction processes. Different processes have different flags.
 *                        E.g. default-inquiry can toggle price and location to true/false value to indicate,
 *                        whether price (or location) tab should be shown. If defaultListingFields.price is not
 *                        explicitly set to _false_, price will be shown.
 *                        If the location or pickup is not used, listing won't be returned with location search.
 *                        Use keyword search as main search type if location is not enforced.
 *                        The payoutDetails flag allows provider to bypass setting of payout details.
 *                        Note: customers can't order listings, if provider has not set payout details! Monitor
 *                        providers who have not set payout details and contact them to ensure that they add the details.
 * - transactionFields    You can define an array of custom transaction fields for each listing type. Each transaction field
 *                        should have the following attributes:
 *                        - key (string)
 *                        - label (string)
 *                        - showTo (string, options: 'customer', 'provider'). Option 'provider' is only used for negotiation process.
 *                        - schemaType (string, options: 'enum', 'multi-enum', 'text', 'long', 'boolean', 'youtubeVideoUrl')
 *                        - saveConfig (object, optional,  { required: true })
 *                        - schema specific attributes:
 *                          - numberConfig (object, for schemaType: 'long'): { minimum: number, maximum: number }
 *                          - enumOptions (array, for schemaType: 'enum', 'multi-enum'): [{ label: string, option: string }]
 * - messagingOptions     Options for the messaging experience
 *  - fileAttachments:    - if set to true, uploading file attachments to messages is enabled. Marketplace level access control
 *                          configuration may still disable uploading and downloading files, even if enabled in the listing type.
 */

export const listingTypes = [
  {
    listingType: 'model-profile',
    label: 'Model Profile',
    transactionType: {
      process: 'default-booking',
      alias: 'default-booking/release-1',
      unitType: 'day',
    },
    availabilityType: 'oneSeat',
    priceVariations: {
      enabled: false,
    },
    messagingOptions: {
      fileAttachments: false,
    },
    defaultListingFields: {
      description: false,
      availability: true,
      payoutDetails: true,
      images: true,
      pickup: false,
      title: true,
      shipping: false,
      location: true,
      price: true,
      stock: false,
    },
    // Transaction fields keep the Console asset shape (showTo, saveConfig.required);
    // validListingTypes restructures them before validation.
    transactionFields: [
      {
        key: 'shoot_description',
        label: 'Shoot description',
        schemaType: 'text',
        showTo: 'customer',
        saveConfig: {
          required: true,
        },
      },
      {
        key: 'shoot_type',
        label: 'Shoot type',
        schemaType: 'enum',
        showTo: 'customer',
        saveConfig: {
          required: true,
        },
        enumOptions: [
          { option: 'fashion', label: 'Fashion' },
          { option: 'commercial', label: 'Commercial' },
          { option: 'editorial', label: 'Editorial' },
          { option: 'e-commerce', label: 'E-commerce' },
          { option: 'lookbook', label: 'Lookbook' },
          { option: 'fitness', label: 'Fitness' },
          { option: 'beauty', label: 'Beauty' },
          { option: 'lingerie', label: 'Lingerie' },
          { option: 'swimwear', label: 'Swimwear' },
          { option: 'events-promo', label: 'Events/Promo' },
          { option: 'social-content', label: 'Social content' },
          { option: 'tfp', label: 'TFP' },
        ],
      },
      {
        key: 'location_type',
        label: 'Location type',
        schemaType: 'enum',
        showTo: 'customer',
        saveConfig: {
          required: true,
        },
        enumOptions: [
          { option: 'professional-studio', label: 'Professional studio' },
          { option: 'brand-office-showroom', label: 'Brand office/showroom' },
          { option: 'outdoor-public', label: 'Outdoor/public' },
          { option: 'private-residence', label: 'Private residence' },
          { option: 'other', label: 'Other' },
        ],
      },
      {
        key: 'shoot_address',
        label: 'Shoot address',
        schemaType: 'shortText',
        showTo: 'customer',
        saveConfig: {
          required: true,
        },
      },
      // ── Image-usage-rights (contracts v1) ─────────────────────────────────
      // Customer-role fields collected at checkout; they freeze onto the tx
      // protectedData via the existing request-payment step (no EDN change) and
      // form the "image usage licence" the model agrees to by accepting the
      // booking. The enum options are a DEFAULT taxonomy — safe to refine later
      // (keep option keys stable once bookings exist so past contracts resolve).
      // See docs/spikes/contracts-usage-rights.md + src/util/contracts.js.
      // NOTE: these must also exist as transaction/protected-data fields in the
      // Sharetribe Console (same as the shoot_* fields).
      {
        key: 'usage_duration',
        label: 'Image usage duration',
        schemaType: 'enum',
        showTo: 'customer',
        saveConfig: {
          required: true,
        },
        enumOptions: [
          { option: '6-months', label: '6 months' },
          { option: '1-year', label: '1 year' },
          { option: '2-years', label: '2 years' },
          { option: '3-years', label: '3 years' },
          { option: 'perpetual', label: 'Perpetual (buyout)' },
        ],
      },
      {
        key: 'usage_channels',
        label: 'Image usage channels',
        schemaType: 'multi-enum',
        showTo: 'customer',
        saveConfig: {
          required: true,
        },
        enumOptions: [
          { option: 'social-media', label: 'Social media' },
          { option: 'website-digital', label: 'Website & digital' },
          { option: 'print', label: 'Print' },
          { option: 'broadcast-tv', label: 'Broadcast (TV)' },
          { option: 'out-of-home', label: 'Out-of-home' },
          { option: 'all-media', label: 'All media' },
        ],
      },
      {
        key: 'usage_territory',
        label: 'Image usage territory',
        schemaType: 'enum',
        showTo: 'customer',
        saveConfig: {
          required: true,
        },
        enumOptions: [
          { option: 'uk', label: 'UK' },
          { option: 'europe', label: 'Europe' },
          { option: 'worldwide', label: 'Worldwide' },
          { option: 'other', label: 'Other' },
        ],
      },
    ],
  },
];

// SearchPage can enforce listing query to only those listings with valid listingType
// However, it only works if you have set 'enum' type search schema for the public data fields
//   - listingType
//
//  Similar setup could be expanded to 2 other extended data fields:
//   - transactionProcessAlias
//   - unitType
//
// Read More:
// https://www.sharetribe.com/docs/how-to/manage-search-schemas-with-flex-cli/#adding-listing-search-schemas
export const enforceValidListingType = false;
