import React, { useRef, useState } from 'react';
import classNames from 'classnames';
import { Field } from 'react-final-form';

import { HelpText, OutsideClickHandler, ValidationError } from '../../components';

import css from './FieldMultiSelectDropdown.module.css';

/**
 * @typedef {Object} MultiSelectOption
 * @property {string} key the stored value
 * @property {string} label the visible option text
 */

const IconTick = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M2 6l2.5 2.5L10 3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// A disclosure button that looks like the design-system select (rt-select), opening a panel of
// rt-check tick boxes. The tick boxes are native checkboxes, so inside the open panel Tab moves
// between options and Space toggles them. Escape closes the panel and returns focus to the
// button; ArrowDown on the button opens it and focuses the first option. Clicking outside, or
// tabbing away from the control, also closes it.
const FieldMultiSelectDropdownRenderer = props => {
  const {
    rootClassName,
    className,
    id,
    label,
    helpText,
    placeholder,
    options = [],
    input,
    meta,
  } = props;
  const { value, onChange, onBlur, onFocus } = input;
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const rootRef = useRef(null);

  const selected = Array.isArray(value) ? value : [];
  const selectedLabels = options.filter(o => selected.includes(o.key)).map(o => o.label);
  const hasSelection = selectedLabels.length > 0;

  const labelId = `${id}.label`;
  const valueId = `${id}.value`;
  const panelId = `${id}.options`;

  const focusFirstOption = () => {
    // Wait for the panel to be un-hidden before moving focus into it.
    window.setTimeout(() => {
      const first = panelRef.current?.querySelector('input');
      if (first) {
        first.focus();
      }
    }, 0);
  };

  const open = () => {
    setIsOpen(true);
    onFocus();
  };

  const close = ({ returnFocus = false } = {}) => {
    setIsOpen(false);
    // Closing the panel counts as leaving the field: this is when a required error may show.
    onBlur();
    if (returnFocus && buttonRef.current) {
      buttonRef.current.focus();
    }
  };

  const toggleOption = key => {
    const next = selected.includes(key) ? selected.filter(v => v !== key) : [...selected, key];
    onChange(next);
  };

  const handleKeyDown = e => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      close({ returnFocus: true });
    }
  };

  const handleButtonKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        open();
      }
      focusFirstOption();
    }
  };

  // Tabbing out of the control closes it. A null relatedTarget (e.g. Safari doesn't focus a
  // clicked checkbox) is left to the outside-click handler instead.
  const handleBlur = e => {
    const next = e.relatedTarget;
    if (isOpen && next && rootRef.current && !rootRef.current.contains(next)) {
      close();
    }
  };

  const classes = classNames(rootClassName || css.root, className);
  const hasError = meta.touched && meta.invalid && meta.error;

  return (
    <OutsideClickHandler
      rootClassName={classes}
      onOutsideClick={() => {
        if (isOpen) {
          close();
        }
      }}
    >
      <div ref={rootRef} onKeyDown={handleKeyDown} onBlur={handleBlur}>
        {label ? (
          <label id={labelId} htmlFor={id} className={css.label}>
            {label}
          </label>
        ) : null}
        {/* Help text sits directly under the label, above the control. */}
        <HelpText helpText={helpText} />
        <div className={css.control}>
          <button
            ref={buttonRef}
            id={id}
            type="button"
            className={classNames(css.button, { [css.buttonError]: hasError })}
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-labelledby={label ? `${labelId} ${valueId}` : valueId}
            onClick={() => (isOpen ? close() : open())}
            onKeyDown={handleButtonKeyDown}
          >
            <span
              id={valueId}
              className={classNames(css.value, { [css.placeholder]: !hasSelection })}
            >
              {hasSelection ? selectedLabels.join(', ') : placeholder}
            </span>
          </button>
          <div ref={panelRef} id={panelId} className={css.panel} hidden={!isOpen}>
            <ul className={css.list}>
              {options.map(option => {
                const optionId = `${id}.${option.key}`;
                return (
                  <li key={optionId} className={css.item}>
                    <input
                      id={optionId}
                      className={css.input}
                      type="checkbox"
                      value={option.key}
                      checked={selected.includes(option.key)}
                      onChange={() => toggleOption(option.key)}
                    />
                    <label htmlFor={optionId} className={css.option}>
                      <span className={css.box}>
                        <IconTick className={css.tick} />
                      </span>
                      <span>{option.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <ValidationError fieldMeta={meta} />
      </div>
    </OutsideClickHandler>
  );
};

/**
 * Final Form field for a multi-select (e.g. a multi-enum listing field) shown as a full-width
 * dropdown. Closed, it reads "Select all that apply" (the placeholder) or the chosen labels;
 * open, it shows a list of tick boxes. The value is an array of option keys.
 *
 * @component
 * @param {Object} props
 * @param {string} props.name the field name
 * @param {string} props.id id for the dropdown button; each option gets `${id}.${option.key}`
 * @param {ReactNode} [props.label] the field label
 * @param {string} [props.helpText] hint shown under the label
 * @param {string} props.placeholder text shown while nothing is selected
 * @param {Array<MultiSelectOption>} props.options e.g. [{ key, label }]
 * @param {Function} [props.validate] Final Form field validator
 * @param {string} [props.className] add more style rules in addition to css.root
 * @param {string} [props.rootClassName] overwrite css.root
 * @returns {JSX.Element} Final Form field containing a multi-select dropdown
 */
const FieldMultiSelectDropdown = props => (
  <Field component={FieldMultiSelectDropdownRenderer} {...props} />
);

export default FieldMultiSelectDropdown;
