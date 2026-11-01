/**
 * Search page helpers for the discovery journey (B01/B02). Pure functions, no React.
 */
import { constructQueryParamName, parseSelectFilterOptions } from '../../util/search';
import { SCHEMA_TYPE_ENUM, SCHEMA_TYPE_LONG, SCHEMA_TYPE_MULTI_ENUM } from '../../util/types';

// Order of the filter groups in the panel (B02 inventory). Ethnicity stays last (open question 6).
export const FILTER_ORDER = [
  'modelling_categories',
  'price',
  'gender',
  'experience_level',
  'height_cm',
  'hair_colour',
  'eye_colour',
  'availability_radius',
  'ethnicity',
];
// Open by default (B01); the rest start collapsed.
export const FILTERS_OPEN_BY_DEFAULT = ['modelling_categories', 'price', 'gender'];
// Chips (rt-chip) and whether one or several values can be chosen. Everything else that is an
// enum renders as a tick-box list (travel range, ethnicity: longer lists, match any).
export const CHIP_FILTERS = {
  modelling_categories: 'multi',
  gender: 'single',
  experience_level: 'single',
  hair_colour: 'single',
  eye_colour: 'single',
};
// Not in the panel: city and dates moved to the search header; keyword search is not part of
// the design; rates other than the day rate, travel costs and minimum notice are shown on the
// profile, not filtered on (B02 "What clients can filter by").
export const FILTERS_NOT_IN_PANEL = [
  'dates',
  'keywords',
  'half_day_rate',
  'hourly_rate',
  'travel_fee_policy',
  'min_booking_notice',
];
// Sort options shown to clients. "Oldest" has no use for a client (B01).
export const HIDDEN_SORT_KEYS = ['-createdAt'];

const LAST_KEY = FILTER_ORDER[FILTER_ORDER.length - 1];

/**
 * The filters to show in the panel, in the design's order. Filters the design does not list (and
 * does not exclude) keep showing, just before the last group, so ethnicity is always last.
 *
 * @param {Array<Object>} availableFilters filter configs from getDerivedRenderData
 * @returns {Array<Object>}
 */
export const getPanelFilters = (availableFilters = []) => {
  const inPanel = availableFilters.filter(f => !FILTERS_NOT_IN_PANEL.includes(f.key));
  const ordered = FILTER_ORDER.filter(k => k !== LAST_KEY)
    .map(k => inPanel.find(f => f.key === k))
    .filter(Boolean);
  const others = inPanel.filter(f => !FILTER_ORDER.includes(f.key));
  const last = inPanel.find(f => f.key === LAST_KEY);
  return [...ordered, ...others, ...(last ? [last] : [])];
};

const parseRange = value => {
  const [min, max] = typeof value === 'string' ? value.split(',').map(v => parseInt(v, 10)) : [];
  return Number.isInteger(min) && Number.isInteger(max) ? { min, max } : null;
};

const getQueryParamName = filter =>
  filter.schemaType === 'price' ? 'price' : constructQueryParamName(filter.key, filter.scope);

const rangeLimits = filter =>
  filter.schemaType === 'price'
    ? { lower: filter.min, upper: filter.max }
    : {
        lower: filter.minimum ?? filter.numberConfig?.minimum,
        upper: filter.maximum ?? filter.numberConfig?.maximum,
      };

/**
 * The active filter values as removable chips (B01, under the results count), in panel order.
 * Each chip says which query param to set, and to what, when it is removed.
 *
 * @param {Object} params
 * @param {Array<Object>} params.filters panel filters (getPanelFilters)
 * @param {Object} params.queryParams current URL query params
 * @param {Function} params.optionLabel (filterKey, option) => label
 * @param {Function} params.rangeLabel ({ filter, min, max, lower, upper }) => label
 * @returns {Array<{ id: string, label: string, paramName: string, nextValue: string|null }>}
 */
export const getActiveFilterChips = ({ filters = [], queryParams = {}, optionLabel, rangeLabel }) =>
  filters.reduce((chips, filter) => {
    const paramName = getQueryParamName(filter);
    const raw = queryParams[paramName];
    if (raw == null || raw === '') {
      return chips;
    }
    const { schemaType } = filter;

    if ([SCHEMA_TYPE_ENUM, SCHEMA_TYPE_MULTI_ENUM].includes(schemaType)) {
      const prefixMatch = `${raw}`.match(/^(has_all:|has_any:)/);
      const prefix = prefixMatch ? prefixMatch[1] : '';
      const selected = parseSelectFilterOptions(`${raw}`).filter(Boolean);
      const valueChips = selected.map(option => {
        const rest = selected.filter(o => o !== option);
        return {
          id: `${paramName}:${option}`,
          label: optionLabel(filter.key, option),
          paramName,
          nextValue: rest.length > 0 ? `${prefix}${rest.join(',')}` : null,
        };
      });
      return [...chips, ...valueChips];
    }

    if (schemaType === 'price' || schemaType === SCHEMA_TYPE_LONG) {
      const range = parseRange(raw);
      if (!range) {
        return chips;
      }
      const { lower, upper } = rangeLimits(filter);
      return [
        ...chips,
        {
          id: paramName,
          label: rangeLabel({ filter, ...range, lower, upper }),
          paramName,
          nextValue: null,
        },
      ];
    }

    return chips;
  }, []);

/**
 * Which kind of range label to show: "Up to £500", "From £100" or "£100 to £500".
 *
 * @param {Object} range { min, max, lower, upper }
 * @returns {'upTo'|'from'|'range'}
 */
export const getRangeLabelKind = ({ min, max, lower, upper }) => {
  const atLower = lower == null || min <= lower;
  const atUpper = upper == null || max >= upper;
  return atLower && !atUpper ? 'upTo' : !atLower && atUpper ? 'from' : 'range';
};

/**
 * Sort options shown to clients (B01: Newest, Lowest price, Highest price).
 *
 * @param {Object} sortConfig config.search.sortConfig
 * @param {boolean} isKeywordSearchActive relevance only makes sense with keywords
 * @returns {Array<Object>}
 */
export const getClientSortOptions = (sortConfig, isKeywordSearchActive = false) =>
  (sortConfig?.options || []).filter(
    o =>
      !HIDDEN_SORT_KEYS.includes(o.key) &&
      (o.key !== sortConfig.relevanceKey || isKeywordSearchActive)
  );
