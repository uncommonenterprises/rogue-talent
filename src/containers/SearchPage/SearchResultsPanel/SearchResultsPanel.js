import React from 'react';
import classNames from 'classnames';

import { propTypes } from '../../../util/types';
import { ListingCard, PaginationLinks } from '../../../components';

import css from './SearchResultsPanel.module.css';

/**
 * SearchResultsPanel component
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that extends the default class for the root element
 * @param {Array<propTypes.listing>} props.listings - The listings
 * @param {propTypes.pagination} props.pagination - The pagination
 * @param {Object} props.search - The search
 * @param {Function} props.setActiveListing - The function to handle the active listing
 * @param {boolean} [props.isMapVariant] - Whether the map variant is enabled
 * @param {'search'} [props.cardVariant] - ListingCard variant (compact card on phones, B01)
 * @param {boolean} [props.showAvailability] - Show "Free on your dates" (a date range is set)
 * @param {string} [props.gridClassName] - Overrides the results list class
 * @param {string} [props.gridItemClassName] - Overrides the result item class
 * @param {string} [props.paginationClassName] - Overrides the pagination class
 * @returns {JSX.Element}
 */
const SearchResultsPanel = props => {
  const {
    className,
    rootClassName,
    listings = [],
    pagination,
    search,
    setActiveListing,
    isMapVariant = true,
    listingTypeParam,
    intl,
    cardVariant,
    showAvailability = false,
    gridClassName,
    gridItemClassName,
    paginationClassName,
  } = props;
  const classes = classNames(rootClassName || css.root, className);
  const pageName = listingTypeParam ? 'SearchPageWithListingType' : 'SearchPage';

  const paginationLinks =
    pagination && pagination.totalPages > 1 ? (
      <PaginationLinks
        className={paginationClassName || css.pagination}
        pageName={pageName}
        pagePathParams={{ listingType: listingTypeParam }}
        pageSearchParams={search}
        pagination={pagination}
        aria-label={intl.formatMessage({ id: 'SearchResultsPanel.screenreader.pagination' })}
      />
    ) : null;

  const cardRenderSizes = isMapVariant => {
    if (cardVariant === 'search') {
      // B01 grid: 2-up below 600px, 3-up to 899px, then 2-up / 3-up beside the 272px sidebar
      return [
        '(max-width: 599px) 50vw',
        '(max-width: 899px) 33vw',
        '(max-width: 1179px) 40vw',
        '400px',
      ].join(', ');
    }
    if (isMapVariant) {
      // Panel width relative to the viewport
      const panelMediumWidth = 50;
      const panelLargeWidth = 62.5;
      return [
        '(max-width: 767px) 100vw',
        `(max-width: 1023px) ${panelMediumWidth}vw`,
        `(max-width: 1920px) ${panelLargeWidth / 2}vw`,
        `${panelLargeWidth / 3}vw`,
      ].join(', ');
    } else {
      // Panel width relative to the viewport
      const panelMediumWidth = 50;
      const panelLargeWidth = 62.5;
      return [
        '(max-width: 549px) 100vw',
        '(max-width: 767px) 50vw',
        `(max-width: 1439px) 26vw`,
        `(max-width: 1920px) 18vw`,
        `14vw`,
      ].join(', ');
    }
  };

  return (
    <div className={classes}>
      <ul
        className={gridClassName || (isMapVariant ? css.listingCardsMapVariant : css.listingCards)}
      >
        {listings.map(l => (
          <li key={l.id.uuid} className={gridItemClassName || css.resultItem}>
            <ListingCard
              className={css.listingCard}
              listing={l}
              renderSizes={cardRenderSizes(isMapVariant)}
              setActiveListing={setActiveListing}
              variant={cardVariant}
              showAvailability={showAvailability}
            />
          </li>
        ))}
        {props.children}
      </ul>
      {paginationLinks}
    </div>
  );
};

export default SearchResultsPanel;
