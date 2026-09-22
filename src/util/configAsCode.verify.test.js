import { mergeConfig } from './configHelpers';
import defaultConfig from '../config/configDefault';

// Simulate hosted assets that DIFFER from code, to prove code wins (Option A).
const hostedConfigAsset = {
  listingTypes: {
    listingTypes: [
      {
        id: 'hosted-should-be-ignored',
        label: 'Hosted type',
        unitType: 'day',
        transactionProcess: { name: 'default-booking', alias: 'default-booking/release-1' },
      },
    ],
  },
  listingFields: {
    listingFields: [
      { key: 'hosted_field_should_be_ignored', scope: 'public', schemaType: 'shortText' },
    ],
  },
  userTypes: {
    userTypes: [{ id: 'hosted-user', label: 'Hosted user', roles: { customer: true } }],
  },
  userFields: {
    userFields: [{ key: 'hosted_user_field', scope: 'public', schemaType: 'shortText' }],
  },
  transactionSize: { listingMinimumPrice: { amount: 500, currency: 'GBP' } },
  localization: { currency: 'GBP' },
  // Mirror the live config/assets/listing-search.json so mergeSearchConfig takes
  // the realistic hosted branch (dateRangeFilter/priceFilter must be present).
  search: {
    mainSearch: { searchType: 'location' },
    listingTypeFilter: { enabled: false, schemaType: 'listingType' },
    categoryFilter: { enabled: true, schemaType: 'category' },
    dateRangeFilter: {
      enabled: true,
      schemaType: 'dates',
      dateRangeMode: 'day',
      availability: 'time-full',
    },
    priceFilter: { enabled: true, schemaType: 'price', min: 0, max: 10000 },
    keywordsFilter: { enabled: true },
    seatsFilter: { enabled: false, schemaType: 'seats' },
  },
};

describe('config-as-code (Option A) merge precedence', () => {
  const merged = mergeConfig(hostedConfigAsset, defaultConfig);

  test('listingTypes come from code, hosted ignored', () => {
    const ids = merged.listing.listingTypes.map(lt => lt.listingType);
    expect(ids).toEqual(['model-profile']);
    expect(ids).not.toContain('hosted-should-be-ignored');
  });

  test('all 18 listing fields resolve from code', () => {
    const keys = merged.listing.listingFields.map(f => f.key);
    expect(keys).toHaveLength(18);
    expect(keys).toContain('gender');
    expect(keys).toContain('half_day_rate');
    expect(keys).toContain('min_booking_notice');
    expect(keys).not.toContain('hosted_field_should_be_ignored');
  });

  test('model-profile transaction fields resolve (shoot details only)', () => {
    const mp = merged.listing.listingTypes.find(lt => lt.listingType === 'model-profile');
    // Contracts (v1) capture NO per-booking usage-rights fields — the standard
    // licence applies to every booking, so only the shoot-detail fields remain.
    expect(mp.transactionFields.map(f => f.key)).toEqual([
      'shoot_description',
      'shoot_type',
      'location_type',
      'shoot_address',
    ]);
  });

  test('required flag survives restructure/validation', () => {
    const gender = merged.listing.listingFields.find(f => f.key === 'gender');
    expect(gender.saveConfig.isRequired).toBe(true);
    const half = merged.listing.listingFields.find(f => f.key === 'half_day_rate');
    expect(half.saveConfig.isRequired).toBe(false);
  });

  test('indexForSearch filters survive (gender indexed, waist not)', () => {
    const gender = merged.listing.listingFields.find(f => f.key === 'gender');
    expect(gender.filterConfig.indexForSearch).toBe(true);
    const waist = merged.listing.listingFields.find(f => f.key === 'waist_cm');
    expect(waist.filterConfig.indexForSearch).toBe(false);
  });

  test('userTypes come from code (model + client)', () => {
    const ids = merged.user.userTypes.map(ut => ut.userType);
    expect(ids).toEqual(['model', 'client']);
    const model = merged.user.userTypes.find(ut => ut.userType === 'model');
    expect(model.roles.provider).toBe(true);
    expect(model.displayNameSettings.required).toBe(true);
  });

  test('all 9 user fields resolve and are limited to correct user types', () => {
    const keys = merged.user.userFields.map(f => f.key);
    expect(keys).toHaveLength(9);
    const dob = merged.user.userFields.find(f => f.key === 'date_of_birth');
    expect(dob.userTypeConfig.userTypeIds).toEqual(['model']);
    const company = merged.user.userFields.find(f => f.key === 'company_name');
    expect(company.userTypeConfig.userTypeIds).toEqual(['client']);
    // Step 3: company registration number for the manual Companies House check.
    const companyReg = merged.user.userFields.find(f => f.key === 'company_registration_number');
    expect(companyReg.userTypeConfig.userTypeIds).toEqual(['client']);
    expect(companyReg.scope).toEqual('public');
    expect(keys).not.toContain('hosted_user_field');
  });

  test('user fields are NOT force-required by the isRequired default', () => {
    merged.user.userFields.forEach(f => {
      expect(f.saveConfig.isRequired).toBe(false);
    });
  });

  test('falls back to hosted assets when code config is empty', () => {
    const emptyCodeConfig = {
      ...defaultConfig,
      listing: { listingTypes: [], listingFields: [], enforceValidListingType: false },
      user: { userTypes: [], userFields: [] },
    };
    const mergedFallback = mergeConfig(hostedConfigAsset, emptyCodeConfig);
    // hosted user field should now appear (fallback path)
    expect(mergedFallback.user.userFields.map(f => f.key)).toContain('hosted_user_field');
  });
});
