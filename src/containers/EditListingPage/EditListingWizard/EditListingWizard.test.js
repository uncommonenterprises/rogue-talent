import { listingFields, listingTypes } from '../../../config/configListing';

import { tabsForListingType } from './EditListingWizard';
import { AVAILABILITY, DETAILS, PHOTOS, PRICING, PROFILE } from './EditListingWizardTab';
import {
  MIN_BOOKING_NOTICE_KEY,
  PRICING_LISTING_FIELD_KEYS,
  isPricingListingField,
  isRateListingField,
} from './rateFields';

const modelProfileConfig = listingTypes.find(t => t.listingType === 'model-profile');

describe('EditListingWizard tabsForListingType (RT-FB-10)', () => {
  it('new-listing (onboarding) flow for model-profile has no availability step', () => {
    expect(tabsForListingType('default-booking', modelProfileConfig, true)).toEqual([
      PROFILE,
      DETAILS,
      PRICING,
      PHOTOS,
    ]);
  });

  it('onboarding ends on the portfolio step, so it stays the publish ("submit") step', () => {
    const tabs = tabsForListingType('default-booking', modelProfileConfig, true);
    expect(tabs[tabs.length - 1]).toEqual(PHOTOS);
    expect(tabs).not.toContain(AVAILABILITY);
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
