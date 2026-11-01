import {
  getPanelFilters,
  getActiveFilterChips,
  getRangeLabelKind,
  getClientSortOptions,
} from './searchJourney';

const f = (key, schemaType, extra = {}) => ({ key, schemaType, scope: 'public', ...extra });

describe('search journey helpers', () => {
  describe('getPanelFilters', () => {
    const available = [
      f('dates', 'dates'),
      f('price', 'price', { min: 0, max: 10000 }),
      f('keywords', 'keywords'),
      f('gender', 'enum'),
      f('height_cm', 'long'),
      f('hair_colour', 'enum'),
      f('eye_colour', 'enum'),
      f('ethnicity', 'multi-enum'),
      f('experience_level', 'enum'),
      f('modelling_categories', 'multi-enum'),
      f('availability_radius', 'enum'),
      f('half_day_rate', 'long'),
      f('hourly_rate', 'long'),
      f('new_console_field', 'enum'),
      f('travel_fee_policy', 'enum'),
      f('min_booking_notice', 'enum'),
    ];

    it('follows the design order, keeps unknown filters and puts ethnicity last', () => {
      expect(getPanelFilters(available).map(x => x.key)).toEqual([
        'modelling_categories',
        'price',
        'gender',
        'experience_level',
        'height_cm',
        'hair_colour',
        'eye_colour',
        'availability_radius',
        'new_console_field',
        'ethnicity',
      ]);
    });
  });

  describe('getActiveFilterChips', () => {
    const filters = [
      f('modelling_categories', 'multi-enum'),
      f('price', 'price', { min: 0, max: 10000 }),
      f('gender', 'enum'),
      f('height_cm', 'long', { minimum: 100, maximum: 250 }),
    ];
    const optionLabel = (key, option) => `${key}:${option}`;
    const rangeLabel = ({ filter, min, max, lower, upper }) =>
      `${filter.key} ${getRangeLabelKind({ min, max, lower, upper })} ${min}-${max}`;

    it('makes one chip per selected value, in panel order, with the value left after removal', () => {
      const chips = getActiveFilterChips({
        filters,
        queryParams: {
          pub_gender: 'female',
          price: '0,500',
          pub_modelling_categories: 'has_any:fashion,editorial',
          pub_height_cm: '170,250',
          address: 'Manchester',
        },
        optionLabel,
        rangeLabel,
      });
      expect(chips.map(c => [c.label, c.paramName, c.nextValue])).toEqual([
        ['modelling_categories:fashion', 'pub_modelling_categories', 'has_any:editorial'],
        ['modelling_categories:editorial', 'pub_modelling_categories', 'has_any:fashion'],
        ['price upTo 0-500', 'price', null],
        ['gender:female', 'pub_gender', null],
        ['height_cm from 170-250', 'pub_height_cm', null],
      ]);
    });

    it('ignores empty or malformed values', () => {
      const chips = getActiveFilterChips({
        filters,
        queryParams: { pub_gender: '', price: 'abc' },
        optionLabel,
        rangeLabel,
      });
      expect(chips).toEqual([]);
    });
  });

  describe('getRangeLabelKind', () => {
    it('picks up to / from / range', () => {
      expect(getRangeLabelKind({ min: 0, max: 500, lower: 0, upper: 10000 })).toEqual('upTo');
      expect(getRangeLabelKind({ min: 100, max: 10000, lower: 0, upper: 10000 })).toEqual('from');
      expect(getRangeLabelKind({ min: 100, max: 500, lower: 0, upper: 10000 })).toEqual('range');
    });
  });

  describe('getClientSortOptions', () => {
    const sortConfig = {
      relevanceKey: 'relevance',
      options: [
        { key: 'createdAt' },
        { key: '-createdAt' },
        { key: '-price' },
        { key: 'price' },
        { key: 'relevance' },
      ],
    };
    it('drops "Oldest", and relevance unless a keyword search is active', () => {
      expect(getClientSortOptions(sortConfig).map(o => o.key)).toEqual([
        'createdAt',
        '-price',
        'price',
      ]);
      expect(getClientSortOptions(sortConfig, true).map(o => o.key)).toEqual([
        'createdAt',
        '-price',
        'price',
        'relevance',
      ]);
    });
  });
});
