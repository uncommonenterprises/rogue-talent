import React from 'react';
import classNames from 'classnames';
import { Field } from 'react-final-form';

import { HelpText, ValidationError } from '../../components';

import css from './FieldChipGroup.module.css';

/**
 * @typedef {Object} ChipGroupOption
 * @property {string} key the stored value
 * @property {string} label the visible chip text
 */

// The group renderer. Every option is a real (visually hidden) checkbox or radio input, so the
// group is keyboard accessible out of the box: Tab between checkboxes and Space to toggle, or
// arrow keys between radios. The label next to each input is the visible rt-chip.
const FieldChipGroupRenderer = props => {
  const {
    rootClassName,
    className,
    id,
    label,
    helpText,
    options = [],
    isMulti = false,
    input,
    meta,
  } = props;
  const { name, value, onChange, onBlur } = input;

  const selected = isMulti ? (Array.isArray(value) ? value : []) : value;
  const isSelected = key => (isMulti ? selected.includes(key) : selected === key);

  const handleChange = key => {
    if (isMulti) {
      const next = selected.includes(key) ? selected.filter(v => v !== key) : [...selected, key];
      onChange(next);
    } else {
      onChange(key);
    }
    // Mark the group touched straight away so a required-field error clears (or shows) as
    // soon as the user interacts, like FieldCheckbox does.
    onBlur();
  };

  const classes = classNames(rootClassName || css.root, className);
  const Tag = label ? 'fieldset' : 'div';

  return (
    <Tag className={classes} id={id}>
      {label ? <legend className={css.legend}>{label}</legend> : null}
      {/* Help text sits directly under the group label, above the options. */}
      <HelpText helpText={helpText} />
      <ul className={css.list}>
        {options.map(option => {
          const optionId = `${id}.${option.key}`;
          return (
            <li key={optionId} className={css.item}>
              <input
                id={optionId}
                className={css.input}
                type={isMulti ? 'checkbox' : 'radio'}
                name={name}
                value={option.key}
                checked={isSelected(option.key)}
                onChange={() => handleChange(option.key)}
              />
              <label htmlFor={optionId} className={css.chip}>
                {option.label}
              </label>
            </li>
          );
        })}
      </ul>
      <ValidationError fieldMeta={meta} />
    </Tag>
  );
};

/**
 * Final Form field that renders a set of options as design-system rt-chip pills (selected =
 * ink-900). Set `isMulti` for a multi-select (value is an array of keys, like a multi-enum
 * listing field); otherwise it's a single choice (value is one key, like an enum field).
 *
 * All options are always visible (no "+N more"). Each chip has at least a 44px tall touch
 * area on small screens.
 *
 * @component
 * @param {Object} props
 * @param {string} props.name the field name
 * @param {string} props.id id for the group; each option gets `${id}.${option.key}`
 * @param {ReactNode} [props.label] the group label (rendered as a fieldset legend)
 * @param {string} [props.helpText] hint shown under the label
 * @param {Array<ChipGroupOption>} props.options e.g. [{ key, label }]
 * @param {boolean} [props.isMulti] multi-select (checkboxes) instead of single (radios)
 * @param {Function} [props.validate] Final Form field validator
 * @param {string} [props.className] add more style rules in addition to css.root
 * @param {string} [props.rootClassName] overwrite css.root
 * @returns {JSX.Element} Final Form field containing a chip group
 */
const FieldChipGroup = props => <Field component={FieldChipGroupRenderer} {...props} />;

export default FieldChipGroup;
