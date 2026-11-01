import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { parseSelectFilterOptions } from '../../../util/search';
import { SCHEMA_TYPE_ENUM, SCHEMA_TYPE_MULTI_ENUM } from '../../../util/types';

import { FieldCheckbox } from '../../../components';

import FilterPlain from '../FilterPlain/FilterPlain';
import FilterPopup from '../FilterPopup/FilterPopup';

import css from './SelectMultipleFilter.module.css';

// SelectMultipleFilter doesn't need array mutators since it doesn't require validation.
// TODO: Live edit didn't work with FieldCheckboxGroup
//       There's a mutation problem: formstate.dirty is not reliable with it.
const GroupOfFieldCheckboxes = props => {
  const { id, className, name, options, legend, presentation = 'chips' } = props;
  const isList = presentation === 'list';
  return (
    <fieldset className={className}>
      {legend ? <legend className={css.accessibilityLegend}>{legend}</legend> : null}
      <ul className={isList ? css.checkList : css.list}>
        {options.map(optionConfig => {
          const { option, label } = optionConfig;
          const fieldId = `${id}.${option}`;
          return (
            <li key={fieldId} className={isList ? css.checkItem : css.item}>
              <FieldCheckbox
                className={isList ? css.check : css.chip}
                id={fieldId}
                name={name}
                label={label}
                value={option}
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
};

const getQueryParamName = queryParamNames => {
  return Array.isArray(queryParamNames) ? queryParamNames[0] : queryParamNames;
};

// Format URI component's query param: { pub_key: 'has_all:a,b,c' }
const format = (selectedOptions, queryParamName, schemaType, searchMode) => {
  const hasOptionsSelected = selectedOptions && selectedOptions.length > 0;
  const mode = schemaType === SCHEMA_TYPE_MULTI_ENUM && searchMode ? `${searchMode}:` : '';
  const value = hasOptionsSelected ? `${mode}${selectedOptions.join(',')}` : null;
  return { [queryParamName]: value };
};

/**
 * SelectMultipleFilter component
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that extends the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} props.id - The id
 * @param {string} props.name - The name
 * @param {node} props.label - The label
 * @param {Function} props.getAriaLabel - The function to retrieve the aria label for the component
 * @param {Array<string>} props.queryParamNames - The query param names
 * @param {Object} props.initialValues - The initial values
 * @param {Function} props.onSubmit - The function to handle the submit
 * @param {Array<Object>} props.options - The options
 * @param {SCHEMA_TYPE_ENUM | SCHEMA_TYPE_MULTI_ENUM} props.schemaType - The schema type
 * @param {'has_all' | 'has_any'} props.searchMode - The search mode
 * @param {boolean} [props.showAsPopup] - Whether to show as popup
 * @param {number} [props.contentPlacementOffset] - The content placement offset
 * @param {'chips'|'list'} [props.presentation] - Pills (default) or a tick-box list (B02)
 * @param {boolean} [props.singleSelect] - Keep only the option just tapped (B02 single-select chips)
 * @param {React.ReactNode} [props.note] - Small note under the options
 * @returns {JSX.Element}
 */
const SelectMultipleFilter = props => {
  const intl = useIntl();
  const {
    rootClassName,
    className,
    id,
    name,
    label,
    getAriaLabel,
    options,
    initialValues,
    contentPlacementOffset = 0,
    onSubmit,
    queryParamNames,
    schemaType,
    searchMode,
    showAsPopup,
    presentation,
    singleSelect = false,
    note,
    ...rest
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const queryParamName = getQueryParamName(queryParamNames);
  const hasInitialValues = !!initialValues && !!initialValues[queryParamName];
  // Parse options from param strings like "has_all:a,b,c" or "a,b,c"
  const selectedOptions = hasInitialValues
    ? parseSelectFilterOptions(initialValues[queryParamName])
    : [];

  const labelForPopup = hasInitialValues
    ? intl.formatMessage(
        { id: 'SelectMultipleFilter.labelSelected' },
        { labelText: label, count: selectedOptions.length }
      )
    : label;

  // pass the initial values with the name key so that
  // they can be passed to the correct field
  const namedInitialValues = { [name]: selectedOptions };

  const handleSubmit = values => {
    const raw = values ? values[name] : values;
    // Single-select chips (B02: gender, experience, hair, eye colour): keep only the option just
    // tapped. Tapping the selected chip again clears it.
    const usedValue =
      singleSelect && Array.isArray(raw) && raw.length > 1
        ? [raw.filter(o => !selectedOptions.includes(o)).pop() || raw[raw.length - 1]]
        : raw;
    onSubmit(format(usedValue, queryParamName, schemaType, searchMode));
  };

  return showAsPopup ? (
    <FilterPopup
      className={classes}
      rootClassName={rootClassName}
      label={labelForPopup}
      ariaLabel={getAriaLabel(label, selectedOptions.join(', '))}
      isSelected={hasInitialValues}
      id={`${id}.popup`}
      showAsPopup
      contentPlacementOffset={contentPlacementOffset}
      onSubmit={handleSubmit}
      initialValues={namedInitialValues}
      keepDirtyOnReinitialize
      {...rest}
    >
      <GroupOfFieldCheckboxes
        className={css.fieldGroup}
        name={name}
        id={`${id}-checkbox-group`}
        options={options}
        legend={label}
      />
    </FilterPopup>
  ) : (
    <FilterPlain
      className={className}
      rootClassName={rootClassName}
      label={label}
      selectedCount={selectedOptions.length}
      ariaLabel={getAriaLabel(label, selectedOptions.join(', '))}
      isSelected={hasInitialValues}
      id={`${id}.plain`}
      liveEdit
      onSubmit={handleSubmit}
      initialValues={namedInitialValues}
      {...rest}
    >
      <GroupOfFieldCheckboxes
        className={css.fieldGroupPlain}
        name={name}
        id={`${id}-checkbox-group`}
        options={options}
        legend={label}
        presentation={presentation}
      />
      {note ? <p className={css.note}>{note}</p> : null}
    </FilterPlain>
  );
};

export default SelectMultipleFilter;
