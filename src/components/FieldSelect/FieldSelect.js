import React from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';
import { ValidationError, HelpText } from '../../components';

import css from './FieldSelect.module.css';

const FieldSelectComponent = props => {
  const {
    rootClassName,
    className,
    selectClassName,
    labelClassName,
    id,
    label,
    helpText,
    hintBelowInput,
    input,
    meta,
    children,
    onChange,
    showLabelAsDisabled,
    ...rest
  } = props;

  if (label && !id) {
    throw new Error('id required when a label is given');
  }

  const { valid, invalid, touched, error } = meta;

  // Error message and input error styles are only shown if the
  // field has been touched and the validation has failed.
  const hasError = touched && invalid && error;

  const selectClasses = classNames({
    [selectClassName]: selectClassName,
    [css.selectError]: hasError,
  });
  const handleChange = e => {
    input.onChange(e);
    if (onChange) {
      onChange(e.currentTarget.value);
    }
  };

  const selectProps = { className: selectClasses, id, ...input, onChange: handleChange, ...rest };

  const labelClasses = classNames({
    [css.labelDisabled]: showLabelAsDisabled,
    [labelClassName]: !!labelClassName,
  });

  const classes = classNames(rootClassName || css.root, className);
  return (
    <div className={classes}>
      {label ? (
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      ) : null}
      {/* Help text sits directly under the field label, above the input, unless
          hintBelowInput moves it under the input (with the error on its own line below). */}
      {hintBelowInput ? null : <HelpText helpText={helpText} />}
      <select {...selectProps}>{children}</select>
      {hintBelowInput ? <HelpText rootClassName={css.hintBelow} helpText={helpText} /> : null}
      <ValidationError
        className={hintBelowInput ? css.validationErrorInFlow : css.validationError}
        fieldMeta={meta}
      />
    </div>
  );
};

/**
 * Final Form Field wrapping <select> input
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.selectClassName add more style rules to <select> component
 * @param {string} props.name Name of the input in Final Form
 * @param {string} props.id Label is optional, but if it is given, an id is also required so the label can reference the input in the `for` attribute
 * @param {ReactNode} props.label
 * @param {ReactNode} props.children
 * @param {string?} props.helpText Muted help text, shown under the label by default
 * @param {boolean?} props.hintBelowInput Show the help text under the select instead, with the
 * validation error in normal flow on its own line below it (so the two never overlap)
 * @param {boolean} props.disabled Whether the select element is disabled
 * @param {boolean} props.showLabelAsDisabled Whether the label is disabled
 * @returns {JSX.Element} Final Form Field containing <select> input
 */
const FieldSelect = props => {
  return <Field component={FieldSelectComponent} {...props} />;
};

export default FieldSelect;
