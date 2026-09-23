import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './NoSearchResultsMaybe.module.css';

const NoSearchResultsMaybe = props => {
  const { listingsAreLoaded, totalItems, location, resetAll, showCreateListingsLink } = props;
  const hasNoResult = listingsAreLoaded && totalItems === 0;
  const hasSearchParams = location.search?.length > 0;

  const createListingLinkMaybe = showCreateListingsLink ? (
    <NamedLink className={css.createListingLink} name="NewListingPage">
      <FormattedMessage id="SearchPage.createListing" />
    </NamedLink>
  ) : null;

  return hasNoResult ? (
    <div className={css.noSearchResults}>
      <span className={css.eyebrow}>
        <FormattedMessage id="SearchPage.noResultsEyebrow" />
      </span>
      <p className={css.message}>
        <FormattedMessage id="SearchPage.noResults" />
      </p>
      {hasSearchParams ? (
        <button className={css.resetAllFiltersButton} onClick={e => resetAll(e)}>
          <FormattedMessage id={'SearchPage.resetAllFilters'} />
        </button>
      ) : null}
      {createListingLinkMaybe ? <p className={css.createListing}>{createListingLinkMaybe}</p> : null}
    </div>
  ) : null;
};

export default NoSearchResultsMaybe;
