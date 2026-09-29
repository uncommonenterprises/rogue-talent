import React from 'react';

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
// Import shared components
import {
  FieldCheckboxGroup,
  FieldChipGroup,
  FieldMultiSelectDropdown,
  FieldSelect,
  FieldTextInput,
  FieldBoolean,
  HelpText,
} from '../../components';
// Import modules from this directory
import css from './CustomExtendedDataField.module.css';

// Optional alternative controls for enum / multi-enum fields (the `displayAs` prop).
// Without `displayAs`, enums render as a select and multi-enums as a checkbox group.
export const DISPLAY_AS_CHIPS = 'chips';
export const DISPLAY_AS_DROPDOWN = 'dropdown';

const createFilterOptions = options => options.map(o => ({ key: `${o.option}`, label: o.label }));

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
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldClassName } = props;
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
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldText = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldClassName } = props;
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
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldLong = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldClassName } = props;
  const { minimum, maximum, saveConfig } = fieldConfig;
  const { placeholderMessage, isRequired, requiredMessage } = saveConfig || {};
  const label = getLabel(fieldConfig, intl);
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderLong' });
  const numberTooSmallMessage = intl.formatMessage(
    { id: 'CustomExtendedDataField.numberTooSmall' },
    { min: minimum }
  );
  const numberTooBigMessage = intl.formatMessage(
    { id: 'CustomExtendedDataField.numberTooBig' },
    { max: maximum }
  );

  // Field with schema type 'long' will always be validated against min & max
  const validate = (value, min, max) => {
    const requiredMsg = requiredMessage || defaultRequiredMessage;
    return isRequired && value == null
      ? requiredMsg
      : validateInteger(value, max, min, numberTooSmallMessage, numberTooBigMessage);
  };

  return (
    <FieldTextInput
      className={fieldClassName || css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="number"
      step="1"
      helpText={fieldConfig?.helpText}
      parse={value => {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
      }}
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
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldClassName } = props;
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
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldYoutube = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldClassName } = props;
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
 *   the input instead of under the label. Groups (chips, checkboxes, dropdown) keep it under
 *   the label.
 *
 * @param {Object} props should contain fieldConfig that defines schemaType, enumOptions?, and
 * saveConfig for the field.
 */
const CustomExtendedDataField = props => {
  const intl = useIntl();
  const { className, displayAs, hintBelowInput = false, ...rest } = props;
  const { enumOptions = [], schemaType, helpText } = props?.fieldConfig || {};
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

  const isGroupControl = schemaType === SCHEMA_TYPE_MULTI_ENUM || displayAs === DISPLAY_AS_CHIPS;
  if (hintBelowInput && helpText && !isGroupControl) {
    return (
      <div className={className || css.customField}>
        <FieldComponent
          {...rest}
          fieldConfig={{ ...rest.fieldConfig, helpText: undefined }}
          fieldClassName={css.fieldWithHintBelow}
          displayAs={displayAs}
          defaultRequiredMessage={defaultRequiredMessage}
          intl={intl}
        />
        <HelpText rootClassName={css.hintBelow} helpText={helpText} />
      </div>
    );
  }

  return (
    <FieldComponent
      {...rest}
      fieldClassName={className}
      displayAs={displayAs}
      defaultRequiredMessage={defaultRequiredMessage}
      intl={intl}
    />
  );
};

export default CustomExtendedDataField;
