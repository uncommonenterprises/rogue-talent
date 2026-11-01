import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { Form, LocationAutocompleteInput, RtIcon } from '../../../components';

import SearchDates from './SearchDates';

import css from './SearchJourney.module.css';

// City search suggests cities only (run-through finding 4), as on the "About you" step.
const CITY_PLACE_TYPES = ['(cities)'];
const identity = v => v;
const CitySearchIcon = () => <RtIcon name="search" />;

const CityField = props => {
  const { intl, onSelectPlace } = props;
  return (
    <Field
      name="location"
      format={identity}
      render={({ input, meta }) => {
        const { onChange, ...restInput } = input;
        const handleChange = value => {
          onChange(value);
          if (value?.selectedPlace) {
            onSelectPlace(value);
          }
        };
        return (
          <LocationAutocompleteInput
            id="SearchPage.city"
            className={css.city}
            iconClassName={css.cityIcon}
            CustomIcon={CitySearchIcon}
            inputClassName={css.cityInput}
            predictionsClassName={css.cityPredictions}
            placeholder={intl.formatMessage({ id: 'SearchPage.cityPlaceholder' })}
            ariaLabel={intl.formatMessage({ id: 'SearchPage.cityLabel' })}
            useDefaultPredictions={false}
            placeTypes={CITY_PLACE_TYPES}
            scrollIntoViewOnFocus
            closeOnBlur
            input={{ ...restInput, onChange: handleChange }}
            meta={meta}
          />
        );
      }}
    />
  );
};

/**
 * Search header (B01): "Find your model.", the trust line, then the two search criteria that
 * matter most, city and dates, always visible above the results on every screen size.
 *
 * @component
 * @param {Object} props
 * @param {Object} [props.initialLocation] { search, selectedPlace } from the URL
 * @param {Function} props.onSelectPlace (location) => void
 * @param {string} [props.datesParam]
 * @param {Function} props.onDatesChange (datesParam|null) => void
 * @param {boolean} props.isPhone
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element}
 */
const SearchHeader = props => {
  const {
    initialLocation,
    onSelectPlace,
    datesParam,
    onDatesChange,
    isPhone,
    onManageDisableScrolling,
  } = props;
  const intl = useIntl();

  return (
    <section className={css.header} aria-label={intl.formatMessage({ id: 'SearchPage.searchLabel' })}>
      <h1 className={css.title}>
        <FormattedMessage
          id="SearchPage.heading"
          values={{ accent: text => <span className={css.accent}>{text}</span> }}
        />
      </h1>
      <p className={css.trustLine}>
        <RtIcon name="check" className={css.trustIcon} />
        <span>
          <FormattedMessage id="SearchPage.trustLine" />
        </span>
      </p>
      <div className={css.controls}>
        <FinalForm
          onSubmit={() => {}}
          initialValues={initialLocation ? { location: initialLocation } : {}}
          render={({ handleSubmit }) => (
            <Form className={css.cityForm} onSubmit={handleSubmit} role="search">
              <CityField intl={intl} onSelectPlace={onSelectPlace} />
            </Form>
          )}
        />
        <SearchDates
          datesParam={datesParam}
          onChange={onDatesChange}
          isPhone={isPhone}
          onManageDisableScrolling={onManageDisableScrolling}
        />
      </div>
    </section>
  );
};

export default SearchHeader;
