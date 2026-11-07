import React, { useEffect, useState } from 'react';

// Import util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { UNIT_CM, UNIT_IN } from '../../../../util/lengthUnits';

// Import modules from this directory
import css from './MeasurementsHelp.module.css';

// The unit choice is a display preference on this device only. It is never saved to the
// marketplace: measurements are always stored in whole centimetres.
const UNIT_STORAGE_KEY = 'rt.measurementUnit';

const readStoredUnit = () => {
  try {
    const stored = window.localStorage.getItem(UNIT_STORAGE_KEY);
    return stored === UNIT_IN || stored === UNIT_CM ? stored : null;
  } catch (e) {
    // Storage can be unavailable (e.g. blocked cookies); fall back to cm.
    return null;
  }
};

const storeUnit = unit => {
  try {
    window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
  } catch (e) {
    // Not remembered, which is fine.
  }
};

/**
 * The cm / inches choice for the Measurements section. Starts as cm (also on the server), then
 * picks up a choice remembered on this device, if any.
 *
 * @returns {[string, Function]} the unit ('cm' or 'in') and a setter that also remembers it
 */
export const useMeasurementUnit = () => {
  const [unit, setUnit] = useState(UNIT_CM);

  useEffect(() => {
    const stored = readStoredUnit();
    if (stored) {
      setUnit(stored);
    }
  }, []);

  const changeUnit = nextUnit => {
    setUnit(nextUnit);
    storeUnit(nextUnit);
  };

  return [unit, changeUnit];
};

const UNIT_OPTIONS = [
  { value: UNIT_CM, labelId: 'EditListingDetailsForm.measurementUnitCm' },
  { value: UNIT_IN, labelId: 'EditListingDetailsForm.measurementUnitIn' },
];

/**
 * A small cm / in switch (design-system rt-segmented: two radios). It isn't a form field, so the
 * choice never reaches the saved listing.
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId id prefix
 * @param {string} props.unit the current unit, 'cm' or 'in'
 * @param {Function} props.onChange called with the chosen unit
 * @returns {JSX.Element}
 */
export const MeasurementUnitSwitch = props => {
  const { formId, unit, onChange } = props;
  const intl = useIntl();
  const groupName = `${formId}.measurementUnit`;
  return (
    <div
      className={css.segmented}
      role="radiogroup"
      aria-label={intl.formatMessage({ id: 'EditListingDetailsForm.measurementUnitLabel' })}
    >
      {UNIT_OPTIONS.map(option => {
        const id = `${groupName}.${option.value}`;
        return (
          <span key={option.value} className={css.segment}>
            <input
              id={id}
              type="radio"
              name={groupName}
              value={option.value}
              checked={unit === option.value}
              onChange={() => onChange(option.value)}
              className={css.segmentInput}
            />
            <label htmlFor={id} className={css.segmentLabel}>
              <FormattedMessage id={option.labelId} />
            </label>
          </span>
        );
      })}
    </div>
  );
};

// One line per measurement, shown only when that field is on the form.
const HOW_TO_MEASURE_ITEMS = [
  {
    key: 'waist_cm',
    termId: 'EditListingDetailsForm.howToMeasureWaistTerm',
    textId: 'EditListingDetailsForm.howToMeasureWaist',
  },
  {
    key: 'hips_cm',
    termId: 'EditListingDetailsForm.howToMeasureHipsTerm',
    textId: 'EditListingDetailsForm.howToMeasureHips',
  },
  {
    key: 'bust_chest_cm',
    termId: 'EditListingDetailsForm.howToMeasureBustTerm',
    textId: 'EditListingDetailsForm.howToMeasureBust',
  },
];

/**
 * "How to measure": a short guide, collapsed until opened.
 *
 * @component
 * @param {Object} props
 * @param {Array<string>} props.fieldKeys keys of the listing fields in the section
 * @returns {JSX.Element}
 */
export const HowToMeasure = props => {
  const { fieldKeys = [] } = props;
  const items = HOW_TO_MEASURE_ITEMS.filter(item => fieldKeys.includes(item.key));
  return (
    <details className={css.howToMeasure}>
      <summary className={css.howToMeasureToggle}>
        <svg
          className={css.chevron}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M4 2.5 7.5 6 4 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <FormattedMessage id="EditListingDetailsForm.howToMeasureToggle" />
      </summary>
      <div className={css.howToMeasureBody}>
        <p className={css.howToMeasureText}>
          <FormattedMessage id="EditListingDetailsForm.howToMeasureIntro" />
        </p>
        {items.length > 0 ? (
          <ul className={css.howToMeasureList}>
            {items.map(item => (
              <li key={item.key} className={css.howToMeasureItem}>
                <strong className={css.howToMeasureTerm}>
                  <FormattedMessage id={item.termId} />
                </strong>{' '}
                <FormattedMessage id={item.textId} />
              </li>
            ))}
          </ul>
        ) : null}
        <p className={css.howToMeasureText}>
          <FormattedMessage id="EditListingDetailsForm.howToMeasureNotSure" />
        </p>
      </div>
    </details>
  );
};
