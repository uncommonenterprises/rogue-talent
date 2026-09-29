import { listingFields, listingTypes } from '../../../config/configListing';

import { isOnboardingShellFlow, tabsForListingType } from './EditListingWizard';
import { AVAILABILITY, DETAILS, PHOTOS, PRICING, PROFILE, REVIEW } from './EditListingWizardTab';
import {
  MIN_BOOKING_NOTICE_KEY,
  PRICING_LISTING_FIELD_KEYS,
  TRAVEL_RADIUS_KEY,
  getOrderedPricingFields,
  isPricingListingField,
  isRateListingField,
} from './rateFields';
import { MIN_PORTFOLIO_PHOTOS, countUploadedImages, hasMinimumPortfolio } from './portfolioRules';

const modelProfileConfig = listingTypes.find(t => t.listingType === 'model-profile');

describe('EditListingWizard tabsForListingType (RT-FB-10)', () => {
  it('new-listing (onboarding) flow for model-profile has no availability step', () => {
    expect(tabsForListingType('default-booking', modelProfileConfig, true)).toEqual([
      PROFILE,
      DETAILS,
      PRICING,
      PHOTOS,
      REVIEW,
    ]);
  });

  it('onboarding ends on "Review & submit" (the publish step), after the portfolio', () => {
    const tabs = tabsForListingType('default-booking', modelProfileConfig, true);
    expect(tabs[tabs.length - 1]).toEqual(REVIEW);
    expect(tabs[tabs.length - 2]).toEqual(PHOTOS);
    expect(tabs).not.toContain(AVAILABILITY);
  });

  it('edit mode has no review step', () => {
    expect(tabsForListingType('default-booking', modelProfileConfig, false)).not.toContain(REVIEW);
  });

  it('edit mode keeps the calendar reachable, as the last tab', () => {
    expect(tabsForListingType('default-booking', modelProfileConfig, false)).toEqual([
      PROFILE,
      DETAILS,
      PRICING,
      PHOTOS,
      AVAILABILITY,
    ]);
  });

  it('defaults to edit-mode tabs when the flow flag is omitted', () => {
    expect(tabsForListingType('default-booking', modelProfileConfig)).toContain(AVAILABILITY);
  });
});

describe('minimum booking notice lives on "Your rates" (RT-FB-10)', () => {
  const minNoticeField = listingFields.find(f => f.key === MIN_BOOKING_NOTICE_KEY);

  it('is still a required model-profile listing field', () => {
    expect(minNoticeField?.saveConfig?.isRequired).toBe(true);
  });

  it('is a pricing-tab field, so "Your rates" renders + requires it and "Your profile" skips it', () => {
    expect(PRICING_LISTING_FIELD_KEYS).toContain('min_booking_notice');
    expect(isPricingListingField(minNoticeField)).toBe(true);
    expect(isRateListingField(minNoticeField)).toBe(false); // an enum, not a money input
  });
});

describe('"How far you\'ll travel" (availability_radius) lives on "Your rates" (revision 3)', () => {
  const radiusField = listingFields.find(f => f.key === TRAVEL_RADIUS_KEY);

  it('is still the required availability_radius listing field', () => {
    expect(TRAVEL_RADIUS_KEY).toEqual('availability_radius');
    expect(radiusField?.saveConfig?.isRequired).toBe(true);
  });

  it('is validated on Pricing, not on "Your profile"', () => {
    // tabCompleted(PRICING) validates isPricingListingField fields; tabCompleted(DETAILS) and
    // the Details form use the complement, so the field moves wholesale to "Your rates".
    expect(PRICING_LISTING_FIELD_KEYS).toContain('availability_radius');
    expect(isPricingListingField(radiusField)).toBe(true);
    expect(isRateListingField(radiusField)).toBe(false);
  });

  it('renders directly below travel costs and above minimum booking notice', () => {
    const keys = getOrderedPricingFields(listingFields).map(f => f.key);
    expect(keys).toEqual([
      'half_day_rate',
      'hourly_rate',
      'travel_fee_policy',
      'availability_radius',
      'min_booking_notice',
    ]);
  });
});

describe('portfolio minimum (Neil, 29/09/2026)', () => {
  const attached = id => ({ id: { uuid: id }, type: 'image', attributes: { variants: {} } });
  const uploading = { id: 'local-file', file: {} };
  const uploaded = { id: 'local-file-2', file: {}, imageId: { uuid: 'img' } };

  it('needs at least 3 finished uploads', () => {
    expect(MIN_PORTFOLIO_PHOTOS).toEqual(3);
    expect(hasMinimumPortfolio([attached('a'), attached('b')])).toBe(false);
    expect(hasMinimumPortfolio([attached('a'), attached('b'), attached('c')])).toBe(true);
  });

  it('does not count a photo that is still uploading', () => {
    expect(countUploadedImages([attached('a'), uploaded, uploading])).toEqual(2);
    expect(hasMinimumPortfolio([attached('a'), uploaded, uploading])).toBe(false);
  });
});

describe('isOnboardingShellFlow', () => {
  const config = { listing: { listingTypes: [modelProfileConfig] } };

  it('is on for the new and draft model-profile flow', () => {
    expect(isOnboardingShellFlow({ type: 'new' }, null, config)).toBe(true);
    expect(isOnboardingShellFlow({ type: 'draft' }, null, config)).toBe(true);
  });

  it('is off in edit mode', () => {
    expect(isOnboardingShellFlow({ type: 'edit' }, null, config)).toBe(false);
  });
});
