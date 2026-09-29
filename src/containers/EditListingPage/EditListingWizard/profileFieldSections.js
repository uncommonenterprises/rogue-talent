// "Your profile" (sign-up journey screen 09): which listing fields go in which labelled section,
// and how a few of them are shown. Keys are the listing-field keys in configListing.js.
//
// To move a field, just move its key. A field that isn't listed in any section still renders:
// it's added to the end of DEFAULT_PROFILE_SECTION_ID, so a new field never disappears.
// Pricing-tab fields (rateFields.js) never reach this step.

import { SCHEMA_TYPE_MULTI_ENUM, SCHEMA_TYPE_TEXT } from '../../../util/types';

export const PROFILE_FIELD_SECTIONS = [
  {
    id: 'basics',
    labelId: 'EditListingDetailsForm.sectionBasics',
    keys: ['gender', 'height_cm'],
  },
  {
    id: 'measurements',
    labelId: 'EditListingDetailsForm.sectionMeasurements',
    keys: ['waist_cm', 'hips_cm', 'bust_chest_cm', 'shoe_size_uk'],
  },
  {
    id: 'style',
    labelId: 'EditListingDetailsForm.sectionStyle',
    keys: ['hair_colour', 'eye_colour', 'ethnicity', 'experience_level', 'modelling_categories'],
  },
  {
    id: 'links',
    labelId: 'EditListingDetailsForm.sectionLinks',
    keys: ['model_website_url', 'instagram_url'],
  },
];

// Where unmapped fields go.
export const DEFAULT_PROFILE_SECTION_ID = 'style';

// Fields laid out two to a row on wider screens, except these, which take the full width.
// Multi-select and long-text fields are always full width, listed or not.
export const FULL_WIDTH_PROFILE_FIELD_KEYS = [
  'ethnicity',
  'experience_level',
  'modelling_categories',
];

// Alternative controls (CustomExtendedDataField `displayAs`):
// - ethnicity: a full-width dropdown that allows several choices (revision 3, Neil 29/09).
// - modelling categories: every option as a pill, all visible at once (no "+N more").
export const PROFILE_FIELD_DISPLAY = {
  ethnicity: 'dropdown',
  modelling_categories: 'chips',
};

/**
 * Whether a field takes the full row width in its section.
 *
 * @param {Object} fieldConfig listing-field config
 * @returns {boolean}
 */
export const isFullWidthProfileField = fieldConfig =>
  FULL_WIDTH_PROFILE_FIELD_KEYS.includes(fieldConfig?.key) ||
  [SCHEMA_TYPE_MULTI_ENUM, SCHEMA_TYPE_TEXT].includes(fieldConfig?.schemaType);

/**
 * Group the step's listing fields into the configured sections, in section order and, within a
 * section, in the listed key order. Unlisted fields are appended (in config order) to the
 * default section; if that section isn't configured they get a section of their own. Empty
 * sections are left out.
 *
 * @param {Array<Object>} fields the eligible listing-field configs for this step
 * @param {Array<Object>} [sections] section config (defaults to PROFILE_FIELD_SECTIONS)
 * @param {string} [defaultSectionId] where unlisted fields go
 * @returns {Array<{ id: string, labelId: string, fields: Array<Object> }>}
 */
export const groupProfileFields = (
  fields = [],
  sections = PROFILE_FIELD_SECTIONS,
  defaultSectionId = DEFAULT_PROFILE_SECTION_ID
) => {
  const byKey = new Map(fields.map(f => [f.key, f]));
  const mappedKeys = new Set(sections.flatMap(s => s.keys));
  const unmapped = fields.filter(f => !mappedKeys.has(f.key));

  const grouped = sections.map(section => ({
    id: section.id,
    labelId: section.labelId,
    fields: section.keys.map(k => byKey.get(k)).filter(Boolean),
  }));

  if (unmapped.length > 0) {
    const defaultSection = grouped.find(s => s.id === defaultSectionId);
    if (defaultSection) {
      defaultSection.fields = [...defaultSection.fields, ...unmapped];
    } else {
      grouped.push({
        id: defaultSectionId,
        labelId: 'EditListingDetailsForm.sectionMore',
        fields: unmapped,
      });
    }
  }

  return grouped.filter(s => s.fields.length > 0);
};
