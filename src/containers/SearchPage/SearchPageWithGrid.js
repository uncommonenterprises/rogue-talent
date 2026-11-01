import React, { Component, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { parse } from '../../util/urlHelpers';
import { createResourceLocatorString } from '../../util/routes';
import { formatCurrencyMajorUnit } from '../../util/currency';
import { isMainSearchTypeKeywords, isOriginInUse } from '../../util/search';
import { useIsPhoneLayout } from '../../util/useIsPhoneLayout';
import { getOptionLabel } from '../../util/modelProfile';
import { makeGetListingsByIdSelector } from '../../ducks/marketplaceData.duck';
import { manageDisableScrolling, isScrollingDisabled } from '../../ducks/ui.duck';

import { Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import EmailVerifiedNotice from '../TopbarContainer/EmailVerifiedBanner/EmailVerifiedNotice';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  initialValues,
  validUrlQueryParamsFromProps,
  getDerivedRenderData,
  onResetAll,
  createFilterValueChangeHandler,
  onSortBy,
  getSearchPageResourceLocatorStringParams,
} from './SearchPage.shared';
import {
  CHIP_FILTERS,
  FILTERS_OPEN_BY_DEFAULT,
  getActiveFilterChips,
  getClientSortOptions,
  getPanelFilters,
  getRangeLabelKind,
} from './searchJourney';

import FilterComponent from './FilterComponent';
import SearchResultsPanel from './SearchResultsPanel/SearchResultsPanel';
import SearchPageAccessWrapper from './SearchPageAccessWrapper';
import SearchErrors from './SearchErrors';
import SearchHeader from './SearchJourney/SearchHeader';
import FilterPanel from './SearchJourney/FilterPanel';
import {
  ActiveFilterChips,
  MobileFilterBar,
  SearchEmptyState,
  SortSelect,
} from './SearchJourney/ResultsControls';

import css from './SearchPage.module.css';
import journeyCss from './SearchJourney/SearchJourney.module.css';

const hasMessage = (intl, id) =>
  !!intl?.messages && Object.prototype.hasOwnProperty.call(intl.messages, id);

/**
 * Filter configs as the panel shows them (B02): client-facing labels from en.json where set
 * ("How far they'll travel", "Height"), short option labels ("New face"), and per-group options.
 */
const decorateFilter = (filterConfig, intl, config) => {
  const { key, enumOptions, filterConfig: fc = {} } = filterConfig;
  const labelId = `SearchPage.filterLabel.${key}`;
  const label = hasMessage(intl, labelId) ? intl.formatMessage({ id: labelId }) : fc.label;
  const options = Array.isArray(enumOptions)
    ? enumOptions.map(o => ({ ...o, label: getOptionLabel(intl, config, key, o.option) }))
    : enumOptions;
  return {
    ...filterConfig,
    ...(options ? { enumOptions: options } : {}),
    filterConfig: { ...fc, label },
  };
};

const filterExtraProps = (filterConfig, intl, marketplaceCurrency) => {
  const { key, schemaType } = filterConfig;
  const noteId = `SearchPage.filterNote.${key}`;
  const note = hasMessage(intl, noteId) ? intl.formatMessage({ id: noteId }) : null;
  const chipMode = CHIP_FILTERS[key];
  const isRange = schemaType === 'price' || schemaType === 'long';
  const currencySymbol =
    schemaType === 'price'
      ? formatCurrencyMajorUnit(intl, marketplaceCurrency, 0).replace(/[\d\s.,]/g, '')
      : null;
  return {
    initiallyOpen: FILTERS_OPEN_BY_DEFAULT.includes(key),
    presentation: chipMode ? 'chips' : 'list',
    singleSelect: chipMode === 'single',
    note,
    ...(isRange
      ? {
          rangeLabels: {
            min: intl.formatMessage({
              id: schemaType === 'price' ? 'SearchPage.rangeMin' : 'SearchPage.rangeMinCm',
            }),
            max: intl.formatMessage({
              id: schemaType === 'price' ? 'SearchPage.rangeMax' : 'SearchPage.rangeMaxCm',
            }),
          },
          rangePrefix: currencySymbol,
        }
      : {}),
  };
};

export class SearchPageComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isFilterSheetOpen: false,
      sheetInitialQueryParams: null,
      currentQueryParams: validUrlQueryParamsFromProps(props),
    };

    // Filter functions
    this.resetAll = this.resetAll.bind(this);
    this.getHandleChangedValueFn = this.getHandleChangedValueFn.bind(this);
    this.openFilterSheet = this.openFilterSheet.bind(this);
    this.cancelFilterSheet = this.cancelFilterSheet.bind(this);
    this.applyFilterSheet = this.applyFilterSheet.bind(this);
    this.pushQueryParams = this.pushQueryParams.bind(this);

    // SortBy
    this.handleSortBy = this.handleSortBy.bind(this);
  }

  pushQueryParams(queryParams) {
    const { history, routeConfiguration, location } = this.props;
    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
      routeConfiguration,
      location
    );
    history.push(
      createResourceLocatorString(routeName, routeConfiguration, pathParams, queryParams)
    );
  }

  // Phone filter sheet (B02): closing without "Show N models" restores the results as they were.
  openFilterSheet() {
    this.setState({
      isFilterSheetOpen: true,
      sheetInitialQueryParams: validUrlQueryParamsFromProps(this.props),
    });
  }

  cancelFilterSheet() {
    const initial = this.state.sheetInitialQueryParams;
    this.setState({ isFilterSheetOpen: false, sheetInitialQueryParams: null });
    if (initial) {
      this.setState({ currentQueryParams: initial });
      this.pushQueryParams(initial);
    }
  }

  applyFilterSheet() {
    this.setState({ isFilterSheetOpen: false, sheetInitialQueryParams: null });
  }

  // Reset all filter query parameters
  resetAll() {
    const { history, routeConfiguration, config, location } = this.props;
    onResetAll({
      history,
      routeConfiguration,
      config,
      location,
      urlQueryParams: validUrlQueryParamsFromProps(this.props),
      setState: this.setState.bind(this),
    });
  }

  getHandleChangedValueFn(useHistoryPush) {
    const {
      history,
      routeConfiguration,
      config,
      location,
      params: currentPathParams = {},
    } = this.props;

    return createFilterValueChangeHandler(
      {
        history,
        routeConfiguration,
        config,
        location,
        currentPathParams,
        urlQueryParams: validUrlQueryParamsFromProps(this.props),
        setState: this.setState.bind(this),
        getState: () => this.state,
      },
      useHistoryPush
    );
  }

  handleSortBy(urlParam, values) {
    const { history, routeConfiguration, location } = this.props;
    onSortBy({
      history,
      routeConfiguration,
      location,
      urlQueryParams: validUrlQueryParamsFromProps(this.props),
      urlParam,
      values,
    });
  }

  render() {
    const {
      intl,
      listings = [],
      location,
      onManageDisableScrolling,
      pagination,
      scrollingDisabled,
      searchInProgress,
      searchListingsError,
      searchParams = {},
      routeConfiguration,
      config,
      params: currentPathParams = {},
      currentUser,
      isPhone,
    } = this.props;

    const {
      listingTypePathParam,
      sortConfig,
      validQueryParams,
      availableFilters,
      isValidDatesFilter,
      totalItems,
      listingsAreLoaded,
      title,
      description,
      schema,
      marketplaceCurrency,
      listingCategories,
    } = getDerivedRenderData({
      intl,
      location,
      config,
      routeConfiguration,
      searchParams,
      pagination,
      listings,
      searchInProgress,
      currentPathParams,
      currentUser,
    });

    // B02: the panel's groups, in the design's order, with client-facing labels.
    const panelFilters = getPanelFilters(availableFilters).map(f =>
      decorateFilter(f, intl, config)
    );

    const optionLabel = (key, option) => getOptionLabel(intl, config, key, option);
    const rangeLabel = ({ filter, min, max, lower, upper }) => {
      const isPrice = filter.schemaType === 'price';
      const fmt = n =>
        isPrice
          ? formatCurrencyMajorUnit(intl, marketplaceCurrency, n)
          : filter.key === 'height_cm'
          ? intl.formatMessage({ id: 'ListingPage.valueCm' }, { value: n })
          : `${n}`;
      const kind = getRangeLabelKind({ min, max, lower, upper });
      return kind === 'upTo'
        ? intl.formatMessage({ id: 'SearchPage.chipUpTo' }, { value: fmt(max) })
        : kind === 'from'
        ? intl.formatMessage({ id: 'SearchPage.chipFrom' }, { value: fmt(min) })
        : intl.formatMessage({ id: 'SearchPage.chipRange' }, { min: fmt(min), max: fmt(max) });
    };
    const chips = getActiveFilterChips({
      filters: panelFilters,
      queryParams: validQueryParams,
      optionLabel,
      rangeLabel,
    });

    const handleFilterChange = this.getHandleChangedValueFn(true);
    const hasDates = !!validQueryParams.dates;
    const hasFilters = chips.length > 0 || hasDates;

    // Sorting: Newest, Lowest price, Highest price ("Oldest" is not shown, B01).
    const isKeywordSearchActive =
      isMainSearchTypeKeywords(config) && !!validQueryParams[sortConfig.relevanceFilter];
    const sortOptions = sortConfig.active
      ? getClientSortOptions(sortConfig, isKeywordSearchActive)
      : [];
    const sortValue = validQueryParams[sortConfig.queryParamName];
    const handleSort = value => this.handleSortBy(sortConfig.queryParamName, value);

    // City in the search header: same URL params as the topbar location search used.
    const { address, origin, bounds } = parse(location.search, {
      latlng: ['origin'],
      latlngBounds: ['bounds'],
    });
    const initialLocation =
      address && bounds
        ? { search: address, selectedPlace: { address, origin, bounds } }
        : null;
    const handleSelectPlace = locationValue => {
      const { search, selectedPlace } = locationValue || {};
      const { origin: placeOrigin, bounds: placeBounds } = selectedPlace || {};
      const originMaybe = isOriginInUse(config) ? { origin: placeOrigin } : {};
      const { page, ...rest } = validQueryParams;
      this.pushQueryParams({ ...rest, ...originMaybe, address: search, bounds: placeBounds });
    };

    const resultsCountMessage = searchInProgress ? (
      <FormattedMessage id="SearchPage.loadingResults" />
    ) : (
      <FormattedMessage
        id={hasDates ? 'SearchPage.resultsCountDates' : 'SearchPage.resultsCount'}
        values={{ count: totalItems }}
      />
    );

    const filterGroups = panelFilters.map(filterConfig => {
      const filterId = `SearchFilters.${filterConfig.key.toLowerCase()}`;
      return (
        <FilterComponent
          key={`SearchFilters.${filterConfig.scope || 'built-in'}.${filterConfig.key}`}
          id={filterId}
          config={filterConfig}
          containerId="SearchPage_Filters"
          listingCategories={listingCategories}
          marketplaceCurrency={marketplaceCurrency}
          urlQueryParams={validQueryParams}
          initialValues={initialValues(this.props, this.state.currentQueryParams)}
          getHandleChangedValueFn={this.getHandleChangedValueFn}
          intl={intl}
          liveEdit
          showAsPopup={false}
          isDesktop
          {...filterExtraProps(filterConfig, intl, marketplaceCurrency)}
        />
      );
    });

    const showEmptyState = listingsAreLoaded && totalItems === 0;

    return (
      <Page
        className={journeyCss.pageRoot}
        scrollingDisabled={scrollingDisabled}
        description={description}
        title={title}
        schema={schema}
      >
        <TopbarContainer
          rootClassName={classNames(css.topbar, {
            [css.topbarBehindModal]: this.state.isFilterSheetOpen,
          })}
          currentSearchParams={validQueryParams}
          hideEmailVerifiedNotice
          hideSearchForm
        />
        {/* Screen 05 banner: under the (desktop-fixed) topbar rather than hidden behind it */}
        <EmailVerifiedNotice className={css.emailVerifiedNotice} />
        <div id="main-content" className={journeyCss.page} role="main">
          <SearchHeader
            initialLocation={initialLocation}
            onSelectPlace={handleSelectPlace}
            datesParam={validQueryParams.dates}
            onDatesChange={dates => handleFilterChange({ dates })}
            isPhone={!!isPhone}
            onManageDisableScrolling={onManageDisableScrolling}
          />

          <div className={journeyCss.layout}>
            <FilterPanel
              isOpen={this.state.isFilterSheetOpen}
              onCancel={this.cancelFilterSheet}
              onApply={this.applyFilterSheet}
              onClearAll={this.resetAll}
              resultsCount={totalItems}
              searchInProgress={searchInProgress}
              onManageDisableScrolling={onManageDisableScrolling}
            >
              <div data-testid="filterColumnAside">{filterGroups}</div>
            </FilterPanel>

            <section
              className={journeyCss.results}
              aria-label={intl.formatMessage({ id: 'SearchPage.resultsLabel' })}
            >
              <MobileFilterBar
                activeCount={chips.length}
                onOpenFilters={this.openFilterSheet}
                sortSelect={
                  <SortSelect options={sortOptions} value={sortValue} onChange={handleSort} />
                }
              />
              <div className={journeyCss.resultsBar}>
                <p className={journeyCss.resultsCount} aria-live="polite">
                  {resultsCountMessage}
                </p>
                <SortSelect
                  options={sortOptions}
                  value={sortValue}
                  onChange={handleSort}
                  prefixed
                />
              </div>
              <ActiveFilterChips
                chips={chips}
                onRemove={chip => handleFilterChange({ [chip.paramName]: chip.nextValue })}
                onClearAll={this.resetAll}
              />
              <SearchErrors
                searchListingsError={searchListingsError}
                isValidDatesFilter={isValidDatesFilter}
              />
              {showEmptyState ? (
                <SearchEmptyState hasFilters={hasFilters} onClearFilters={this.resetAll} />
              ) : (
                <div
                  className={classNames({
                    [journeyCss.loading]: !(listingsAreLoaded || searchListingsError),
                  })}
                >
                  <SearchResultsPanel
                    listings={listings}
                    pagination={listingsAreLoaded ? pagination : null}
                    search={parse(location.search)}
                    isMapVariant={false}
                    listingTypeParam={listingTypePathParam}
                    intl={intl}
                    cardVariant="search"
                    showAvailability={hasDates}
                    gridClassName={journeyCss.grid}
                    gridItemClassName={journeyCss.gridItem}
                    paginationClassName={journeyCss.pagination}
                  />
                </div>
              )}
            </section>
          </div>
        </div>
        <FooterContainer />
      </Page>
    );
  }
}

/**
 * SearchPage "container" (grid layout): selects Redux state and dispatch handlers, then passes the
 * same prop surface as before to `SearchPageComponent` via `SearchPageAccessWrapper`.
 *
 * @param {Object} props - Router / route props from `routeConfiguration.js` and `Routes.js`
 * @returns {JSX.Element}
 */
const SearchPage = props => {
  const dispatch = useDispatch();
  const selectListingsById = useMemo(makeGetListingsByIdSelector, []);
  const isPhone = useIsPhoneLayout();

  const currentUser = useSelector(state => state.user?.currentUser);
  const { pagination, searchInProgress, searchListingsError, searchParams } = useSelector(
    state => state.SearchPage
  );
  const listings = useSelector(state =>
    selectListingsById(state, state.SearchPage.currentPageResultIds)
  );
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) =>
      dispatch(manageDisableScrolling(componentId, disableScrolling)),
    [dispatch]
  );

  return (
    <SearchPageAccessWrapper
      {...props}
      PageComponent={SearchPageComponent}
      currentUser={currentUser}
      listings={listings}
      pagination={pagination}
      scrollingDisabled={scrollingDisabled}
      searchInProgress={searchInProgress}
      searchListingsError={searchListingsError}
      searchParams={searchParams}
      onManageDisableScrolling={onManageDisableScrolling}
      isPhone={isPhone}
    />
  );
};

export default SearchPage;
