import React, { useState } from 'react';

// Import config and utils
import { useIntl } from '../../util/reactIntl';
import {
  SCHEMA_TYPE_ENUM,
  SCHEMA_TYPE_MULTI_ENUM,
  SCHEMA_TYPE_SHORT_TEXT,
  SCHEMA_TYPE_TEXT,
  SCHEMA_TYPE_LONG,
  SCHEMA_TYPE_BOOLEAN,
  SCHEMA_TYPE_YOUTUBE,
} from '../../util/types';
import {
  required,
  nonEmptyArray,
  validateInteger,
  validateYoutubeURL,
} from '../../util/validators';
import {
  UNIT_IN,
  formatCmAsInches,
  maxInchesForCm,
  minInchesForCm,
  parseInchesToCm,
  swapLabelUnit,
  swapUnitWord,
} from '../../util/lengthUnits';
// Import shared components
import {
  FieldCheckboxGroup,
  FieldChipGroup,
  FieldMultiSelectDropdown,
  FieldSelect,
  FieldTextInput,
  FieldBoolean,
} from '../../components';
// Import modules from this directory
import css from './CustomExtendedDataField.module.css';

// Optional alternative controls for enum / multi-enum fields (the `displayAs` prop).
// Without `displayAs`, enums render as a select and multi-enums as a checkbox group.
export const DISPLAY_AS_CHIPS = 'chips';
export const DISPLAY_AS_DROPDOWN = 'dropdown';

const createFilterOptions = options => options.map(o => ({ key: `${o.option}`, label: o.label }));

// Units we can name in the friendlier min/max messages, keyed by the abbreviation the field
// label shows in brackets at its end, e.g. "Hips (cm)". Anything else (e.g. "Shoe size (UK)")
// falls back to the plain message, so we never guess at what a bracket means.
const UNIT_NAME_MESSAGE_IDS = {
  cm: 'CustomExtendedDataField.unitCentimetres',
  mm: 'CustomExtendedDataField.unitMillimetres',
  kg: 'CustomExtendedDataField.unitKilograms',
  in: 'CustomExtendedDataField.unitInches',
};

const getUnitNameMessageId = label => {
  const match = typeof label === 'string' ? label.match(/\(([^()]+)\)\s*$/) : null;
  const unit = match ? match[1].trim().toLowerCase() : null;
  return unit ? UNIT_NAME_MESSAGE_IDS[unit] || null : null;
};

const getLabel = (fieldConfig, intl) => {
  const label = fieldConfig?.saveConfig?.label || fieldConfig?.label;
  const isRequired = !!fieldConfig?.saveConfig?.isRequired;
  if (!label) {
    return label;
  }
  // Make required vs optional legible at a glance: required fields get the design-system
  // cobalt required indicator (asterisk, --accent-500); optional fields keep the muted
  // "(optional)" suffix. Colour alone isn't sufficient for accessibility, so the visible
  // glyph is aria-hidden and paired with a visually-hidden "required" for screen readers.
  return isRequired ? (
    <>
      {label}{' '}
      <span className={css.req} aria-hidden="true">
        *
      </span>
      <span className={css.srOnly}>
        {intl.formatMessage({ id: 'CustomExtendedDataField.requiredIndicator' })}
      </span>
    </>
  ) : (
    `${label} (optional)`
  );
};

const CustomFieldEnum = props => {
  const {
    name,
    fieldConfig,
    defaultRequiredMessage,
    formId,
    intl,
    fieldClassName,
    displayAs,
    hintBelowInput,
  } = props;
  const { enumOptions = [], saveConfig } = fieldConfig || {};
  const { placeholderMessage, isRequired, requiredMessage } = saveConfig || {};
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage ||
    intl.formatMessage({ id: 'CustomExtendedDataField.placeholderSingleSelect' });
  const filterOptions = createFilterOptions(enumOptions);

  const label = getLabel(fieldConfig, intl);

  // Single choice shown as rt-chip pills (radios) instead of a select.
  if (displayAs === DISPLAY_AS_CHIPS) {
    return (
      <FieldChipGroup
        className={fieldClassName || css.customField}
        id={formId ? `${formId}.${name}` : name}
        name={name}
        label={label}
        helpText={fieldConfig?.helpText}
        options={filterOptions}
        {...validateMaybe}
      />
    );
  }

  return filterOptions ? (
    <FieldSelect
      className={fieldClassName || css.customField}
      name={name}
      id={formId ? `${formId}.${name}` : name}
      label={label}
      helpText={fieldConfig?.helpText}
      hintBelowInput={hintBelowInput}
      {...validateMaybe}
    >
      <option disabled value="">
        {placeholder}
      </option>
      {filterOptions.map(optionConfig => {
        const key = optionConfig.key;
        return (
          <option key={key} value={key}>
            {optionConfig.label}
          </option>
        );
      })}
    </FieldSelect>
  ) : null;
};

const CustomFieldMultiEnum = props => {
  const {
    name,
    fieldConfig,
    defaultRequiredMessage,
    formId,
    intl,
    fieldClassName,
    displayAs,
  } = props;
  const { enumOptions = [], saveConfig } = fieldConfig || {};
  const { isRequired, requiredMessage } = saveConfig || {};
  const label = getLabel(fieldConfig, intl);
  const validateMaybe = isRequired
    ? { validate: nonEmptyArray(requiredMessage || defaultRequiredMessage) }
    : {};
  const commonProps = {
    className: fieldClassName || css.customField,
    id: formId ? `${formId}.${name}` : name,
    name,
    label,
    helpText: fieldConfig?.helpText,
    options: createFilterOptions(enumOptions),
    ...validateMaybe,
  };

  // Every option as an rt-chip pill (checkboxes), all visible at once.
  if (enumOptions && displayAs === DISPLAY_AS_CHIPS) {
    return <FieldChipGroup {...commonProps} isMulti />;
  }
  // A full-width dropdown with a list of tick boxes.
  if (enumOptions && displayAs === DISPLAY_AS_DROPDOWN) {
    return (
      <FieldMultiSelectDropdown
        {...commonProps}
        placeholder={intl.formatMessage({
          id: 'CustomExtendedDataField.placeholderMultiSelect',
        })}
      />
    );
  }

  return enumOptions ? (
    <FieldCheckboxGroup
      className={fieldClassName || css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      label={label}
      helpText={fieldConfig?.helpText}
      options={createFilterOptions(enumOptions)}
      {...validateMaybe}
    />
  ) : null;
};

const CustomFieldShortText = props => {
  const {
    name,
    fieldConfig,
    defaultRequiredMessage,
    formId,
    intl,
    fieldClassName,
    hintBelowInput,
  } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(fieldConfig, intl);
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderText' });

  return (
    <FieldTextInput
      className={fieldClassName || css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="text"
      maxLength={70}
      label={label}
      helpText={fieldConfig?.helpText}
      hintBelowInput={hintBelowInput}
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldText = props => {
  const {
    name,
    fieldConfig,
    defaultRequiredMessage,
    formId,
    intl,
    fieldClassName,
    hintBelowInput,
  } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(fieldConfig, intl);
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderText' });

  return (
    <FieldTextInput
      className={fieldClassName || css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="textarea"
      label={label}
      helpText={fieldConfig?.helpText}
      hintBelowInput={hintBelowInput}
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

// Field config with the visible unit swapped from centimetres to inches: "Waist (cm)" ->
// "Waist (in)", and "centimetres" -> "inches" in the help text. Console is unchanged.
const withInchesWording = (fieldConfig, intl) => {
  const { label, helpText, saveConfig } = fieldConfig || {};
  const centimetres = intl.formatMessage({ id: 'CustomExtendedDataField.unitCentimetres' });
  const inches = intl.formatMessage({ id: 'CustomExtendedDataField.unitInches' });
  const saveConfigMaybe = saveConfig
    ? { saveConfig: { ...saveConfig, label: swapLabelUnit(saveConfig.label, UNIT_IN) } }
    : {};
  return {
    ...fieldConfig,
    label: swapLabelUnit(label, UNIT_IN),
    helpText: swapUnitWord(helpText, centimetres, inches),
    ...saveConfigMaybe,
  };
};

const CustomFieldLong = props => {
  const {
    name,
    fieldConfig: fieldConfigRaw,
    defaultRequiredMessage,
    formId,
    intl,
    fieldClassName,
    hintBelowInput,
    displayInInches = false,
  } = props;
  // In inches mode the input shows inches but the form value stays whole centimetres, so what
  // is saved (and searched on) never changes. `inchesDraft` keeps exactly what was typed (e.g.
  // "32.5") so the input doesn't jump to the re-converted value while the user is typing.
  const [inchesDraft, setInchesDraft] = useState(null);
  const fieldConfig = displayInInches ? withInchesWording(fieldConfigRaw, intl) : fieldConfigRaw;
  const { minimum, maximum, saveConfig } = fieldConfig;
  const { placeholderMessage, isRequired, requiredMessage } = saveConfig || {};
  const label = getLabel(fieldConfig, intl);
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderLong' });
  // Plain-English min/max messages. If the label ends in a unit we can name, e.g. "(cm)",
  // the message mentions it ("too small for centimetres"). The limits themselves come from
  // Console; nothing here suggests a typical range. In inches mode the limits are still checked
  // in cm, but the message gives them in inches ("the lowest we accept is 16").
  const unitNameMessageId = getUnitNameMessageId(saveConfig?.label || fieldConfig?.label);
  const unit = unitNameMessageId ? intl.formatMessage({ id: unitNameMessageId }) : null;
  const minShown = displayInInches ? minInchesForCm(minimum) : minimum;
  const maxShown = displayInInches ? maxInchesForCm(maximum) : maximum;
  const numberTooSmallMessage = unit
    ? intl.formatMessage(
        { id: 'CustomExtendedDataField.numberTooSmallWithUnit' },
        { min: minShown, unit }
      )
    : intl.formatMessage({ id: 'CustomExtendedDataField.numberTooSmall' }, { min: minShown });
  const numberTooBigMessage = unit
    ? intl.formatMessage(
        { id: 'CustomExtendedDataField.numberTooBigWithUnit' },
        { max: maxShown, unit }
      )
    : intl.formatMessage({ id: 'CustomExtendedDataField.numberTooBig' }, { max: maxShown });

  // Field with schema type 'long' will always be validated against min & max
  const validate = (value, min, max) => {
    const requiredMsg = requiredMessage || defaultRequiredMessage;
    return isRequired && value == null
      ? requiredMsg
      : validateInteger(value, max, min, numberTooSmallMessage, numberTooBigMessage);
  };

  const parseCm = value => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const inchesProps = displayInInches
    ? {
        step: '0.5',
        inputMode: 'decimal',
        parse: value => {
          setInchesDraft(value);
          return parseInchesToCm(value);
        },
        // Show the typed text while it still matches the stored cm value; otherwise (e.g. the
        // value was set in cm mode) show the stored value converted to the nearest half inch.
        format: value => {
          const cm = value == null || value === '' ? null : value;
          return inchesDraft != null && parseInchesToCm(inchesDraft) === cm
            ? inchesDraft
            : formatCmAsInches(cm);
        },
      }
    : { step: '1', parse: parseCm };

  return (
    <FieldTextInput
      className={fieldClassName || css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="number"
      helpText={fieldConfig?.helpText}
      hintBelowInput={hintBelowInput}
      {...inchesProps}
      label={label}
      placeholder={placeholder}
      validate={value => validate(value, minimum, maximum)}
      onWheel={e => {
        // fix: number input should not change value on scroll
        if (e.target === document.activeElement) {
          // Prevent the input value change, because we prefer page scrolling
          e.target.blur();

          // Refocus immediately, on the next tick (after the current function is done)
          setTimeout(() => {
            e.target.focus();
          }, 0);
        }
      }}
    />
  );
};

const CustomFieldBoolean = props => {
  const {
    name,
    fieldConfig,
    defaultRequiredMessage,
    formId,
    intl,
    fieldClassName,
    hintBelowInput,
  } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(fieldConfig, intl);
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderBoolean' });

  return (
    <FieldBoolean
      className={fieldClassName || css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      label={label}
      helpText={fieldConfig?.helpText}
      hintBelowInput={hintBelowInput}
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldYoutube = props => {
  const {
    name,
    fieldConfig,
    defaultRequiredMessage,
    formId,
    intl,
    fieldClassName,
    hintBelowInput,
  } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(fieldConfig, intl);
  const placeholder =
    placeholderMessage ||
    intl.formatMessage({ id: 'CustomExtendedDataField.placeholderYoutubeVideoURL' });

  const notValidUrlMessage = intl.formatMessage({
    id: 'CustomExtendedDataField.notValidYoutubeVideoURL',
  });

  const validate = value => {
    const requiredMsg = requiredMessage || defaultRequiredMessage;
    return isRequired && value == null
      ? requiredMsg
      : validateYoutubeURL(value, notValidUrlMessage);
  };

  return (
    <FieldTextInput
      className={fieldClassName || css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="text"
      label={label}
      helpText={fieldConfig?.helpText}
      hintBelowInput={hintBelowInput}
      placeholder={placeholder}
      validate={value => validate(value)}
    />
  );
};

/**
 * Return Final Form field for each configuration according to schema type.
 *
 * These custom extended data fields are for generating input fields from configuration defined
 * in marketplace-custom-config.js. Other panels in EditListingWizard might add more extended data
 * fields (e.g. shipping fee), but these are independently customizable.
 *
 * Optional props (all opt-in; without them the field renders exactly as before):
 * - className: replaces the default root class (css.customField, which carries the margins).
 * - displayAs: 'chips' renders an enum or multi-enum as rt-chip pills; 'dropdown' renders a
 *   multi-enum as a full-width dropdown of tick boxes.
 * - hintBelowInput: for single-input fields (select, text, number), show the help text under
 *   the input instead of under the label, with any validation error on its own line below it.
 *   Groups (chips, checkboxes, dropdown) keep it under the label.
 * - displayInInches: for a number (long) field stored in whole centimetres, show and accept
 *   inches instead. The saved value stays whole cm (converted on input, nearest cm) and the cm
 *   min/max still apply; the label's "(cm)" and the help text's "centimetres" read as inches.
 *   Ignored by every other schema type.
 *
 * @param {Object} props should contain fieldConfig that defines schemaType, enumOptions?, and
 * saveConfig for the field.
 */
const CustomExtendedDataField = props => {
  const intl = useIntl();
  const { className, displayAs, hintBelowInput = false, displayInInches, ...rest } = props;
  const { enumOptions = [], schemaType } = props?.fieldConfig || {};
  const defaultRequiredMessage = intl.formatMessage({
    id: 'CustomExtendedDataField.required',
  });

  const FieldComponent =
    schemaType === SCHEMA_TYPE_ENUM && enumOptions
      ? CustomFieldEnum
      : schemaType === SCHEMA_TYPE_MULTI_ENUM && enumOptions
      ? CustomFieldMultiEnum
      : schemaType === SCHEMA_TYPE_SHORT_TEXT
      ? CustomFieldShortText
      : schemaType === SCHEMA_TYPE_TEXT
      ? CustomFieldText
      : schemaType === SCHEMA_TYPE_LONG
      ? CustomFieldLong
      : schemaType === SCHEMA_TYPE_BOOLEAN
      ? CustomFieldBoolean
      : schemaType === SCHEMA_TYPE_YOUTUBE
      ? CustomFieldYoutube
      : null;

  if (!FieldComponent) {
    return null;
  }

  // Groups (chips, checkboxes, dropdown) keep their help text under the label.
  const isGroupControl = schemaType === SCHEMA_TYPE_MULTI_ENUM || displayAs === DISPLAY_AS_CHIPS;
  // Only number fields can be shown in inches.
  const displayInInchesMaybe =
    schemaType === SCHEMA_TYPE_LONG && displayInInches ? { displayInInches: true } : {};

  return (
    <FieldComponent
      {...rest}
      fieldClassName={className}
      displayAs={displayAs}
      hintBelowInput={hintBelowInput && !isGroupControl}
      {...displayInInchesMaybe}
      defaultRequiredMessage={defaultRequiredMessage}
      intl={intl}
    />
  );
};

export default CustomExtendedDataField;
