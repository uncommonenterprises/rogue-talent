import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { RtIcon } from '../../../components';

import css from './SearchJourney.module.css';

/**
 * Native sort select (rt-select). Options follow the configured sort options without "Oldest".
 */
export const SortSelect = props => {
  const { options, value, onChange, prefixed = false, className, id } = props;
  const intl = useIntl();
  if (!options || options.length < 2) {
    return null;
  }
  const current = value || options[0].key;
  return (
    <select
      id={id}
      className={classNames(css.sortSelect, className)}
      value={current}
      aria-label={intl.formatMessage({ id: 'SearchPage.sortLabel' })}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => {
        const label = o.labelTranslationKey
          ? intl.formatMessage({ id: o.labelTranslationKey })
          : o.label;
        return (
          <option key={o.key} value={o.key}>
            {prefixed ? intl.formatMessage({ id: 'SearchPage.sortOption' }, { label }) : label}
          </option>
        );
      })}
    </select>
  );
};

/**
 * Phone filter bar (B01, below 900px, sticky): "Filters" with the number of active values, and
 * the sort select.
 */
export const MobileFilterBar = props => {
  const { activeCount, onOpenFilters, sortSelect } = props;
  return (
    <div className={css.mobileFilterBar}>
      <button
        type="button"
        className={css.filtersButton}
        onClick={onOpenFilters}
        aria-controls="SearchPage.filters"
      >
        <RtIcon name="sliders" />
        <FormattedMessage id="SearchPage.filtersButton" />
        {activeCount > 0 ? <span className={css.countBadge}>{activeCount}</span> : null}
      </button>
      {sortSelect}
    </div>
  );
};

/**
 * Active filters as removable chips (B01). On phones they sit in one sideways-scrolling row so
 * the first row of models stays on the first screen.
 */
export const ActiveFilterChips = props => {
  const { chips, onRemove, onClearAll } = props;
  const intl = useIntl();
  if (!chips || chips.length === 0) {
    return null;
  }
  return (
    <div
      className={css.activeChips}
      aria-label={intl.formatMessage({ id: 'SearchPage.activeFiltersLabel' })}
    >
      {chips.map(chip => (
        <button
          key={chip.id}
          type="button"
          className={css.activeChip}
          onClick={() => onRemove(chip)}
          aria-label={intl.formatMessage(
            { id: 'SearchPage.removeFilter' },
            { label: chip.label }
          )}
        >
          {chip.label}
          <RtIcon name="close" size="sm" />
        </button>
      ))}
      <button type="button" className={css.clearLink} onClick={onClearAll}>
        <FormattedMessage id="SearchPage.clearAll" />
      </button>
    </div>
  );
};

/**
 * Empty state (B01 "no results"). With filters active it offers "Clear filters".
 */
export const SearchEmptyState = props => {
  const { hasFilters, onClearFilters } = props;
  return (
    <section className={css.emptyState}>
      <span className={css.eyebrow}>
        <FormattedMessage id="SearchPage.emptyEyebrow" />
      </span>
      <h2 className={css.emptyTitle}>
        <FormattedMessage
          id={hasFilters ? 'SearchPage.emptyTitle' : 'SearchPage.emptyTitleNoFilters'}
        />
      </h2>
      <p className={css.emptyText}>
        <FormattedMessage
          id={hasFilters ? 'SearchPage.emptyText' : 'SearchPage.emptyTextNoFilters'}
        />
      </p>
      {hasFilters ? (
        <button type="button" className={css.secondaryButton} onClick={onClearFilters}>
          <FormattedMessage id="SearchPage.clearFilters" />
        </button>
      ) : null}
    </section>
  );
};
