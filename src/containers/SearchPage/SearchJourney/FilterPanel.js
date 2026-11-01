import React, { useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { RtIcon } from '../../../components';

import css from './SearchJourney.module.css';

const SCROLL_LOCK_ID = 'SearchPage.filterSheet';

/**
 * Filter panel (B02): one panel, two presentations. From 900px it is the sidebar (results update
 * as filters change, no footer). Below 900px it is a full-height sheet with "Clear all" and a
 * 44px close button in the header and the single cobalt action, "Show N models", in the footer.
 * Closing (cross or Esc) leaves the results as they were; "Show N models" keeps the changes.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen phone sheet open
 * @param {Function} props.onCancel close without keeping changes
 * @param {Function} props.onApply close keeping changes
 * @param {Function} props.onClearAll
 * @param {number} props.resultsCount live result count for the footer
 * @param {boolean} props.searchInProgress
 * @param {Function} props.onManageDisableScrolling
 * @param {React.ReactNode} props.children the filter groups
 * @returns {JSX.Element}
 */
const FilterPanel = props => {
  const {
    isOpen,
    onCancel,
    onApply,
    onClearAll,
    resultsCount,
    searchInProgress,
    onManageDisableScrolling,
    children,
  } = props;
  const intl = useIntl();

  useEffect(() => {
    if (onManageDisableScrolling) {
      onManageDisableScrolling(SCROLL_LOCK_ID, isOpen);
    }
    if (!isOpen || typeof window === 'undefined') {
      return undefined;
    }
    const onKey = e => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const noResults = !searchInProgress && resultsCount === 0;

  return (
    <aside
      className={classNames(css.filterPanel, { [css.filterPanelOpen]: isOpen })}
      id="SearchPage.filters"
      aria-label={intl.formatMessage({ id: 'SearchPage.filtersTitle' })}
      {...(isOpen ? { role: 'dialog', 'aria-modal': true } : {})}
    >
      <div className={css.filterHead}>
        <h2 className={css.filterTitle}>
          <FormattedMessage id="SearchPage.filtersTitle" />
        </h2>
        <div className={css.filterHeadActions}>
          <button type="button" className={css.clearLink} onClick={onClearAll}>
            <FormattedMessage id="SearchPage.clearAll" />
          </button>
          <button
            type="button"
            className={classNames(css.iconButton, css.filterClose)}
            onClick={onCancel}
            aria-label={intl.formatMessage({ id: 'SearchPage.closeFilters' })}
          >
            <RtIcon name="close" />
          </button>
        </div>
      </div>
      <div className={css.filterBody}>{children}</div>
      <div className={css.filterFoot}>
        {noResults ? (
          <button type="button" className={css.secondaryButton} disabled>
            <FormattedMessage id="SearchPage.noModelsMatch" />
          </button>
        ) : (
          <button type="button" className={css.primaryButton} onClick={onApply}>
            <FormattedMessage id="SearchPage.showModels" values={{ count: resultsCount }} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default FilterPanel;
