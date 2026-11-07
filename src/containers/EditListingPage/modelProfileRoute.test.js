import { types as sdkTypes } from '../../util/sdkLoader';
import { createImage, createOwnListing } from '../../util/testData';
import {
  LISTING_STATE_CLOSED,
  LISTING_STATE_DRAFT,
  LISTING_STATE_PENDING_APPROVAL,
  LISTING_STATE_PUBLISHED,
} from '../../util/types';
import { listingTypes } from '../../config/configListing';

import {
  DETAILS,
  PHOTOS,
  PRICING,
  PROFILE,
  REVIEW,
  getResumeTab,
} from './EditListingWizard/wizardSteps';
import { getModelEditProfileRoute, getModelProfileRoute } from './modelProfileRoute';

const { Money } = sdkTypes;

const modelProfileType = listingTypes.find(t => t.listingType === 'model-profile');

// One required "Your profile" field and one required "Your rates" field are enough to prove each
// step is checked with its own fields.
const requiredEnum = key => ({
  key,
  scope: 'public',
  schemaType: 'enum',
  enumOptions: [{ option: 'a' }, { option: 'b' }],
  saveConfig: { isRequired: true },
});
const config = {
  listing: {
    listingTypes: [modelProfileType],
    listingFields: [requiredEnum('gender'), requiredEnum('travel_fee_policy')],
  },
  categoryConfiguration: { key: 'categoryLevel', categories: [] },
};

const threePhotos = { images: [createImage('i1'), createImage('i2'), createImage('i3')] };

// "About you" done: the draft exists with the display name and city.
const aboutYouDone = {
  title: 'Ava C',
  price: null,
  publicData: {
    listingType: 'model-profile',
    transactionProcessAlias: 'default-booking/release-1',
    unitType: 'day',
    location: { address: 'Manchester, UK' },
  },
};
const profileDone = {
  ...aboutYouDone,
  publicData: { ...aboutYouDone.publicData, gender: 'a' },
};
const ratesDone = {
  ...profileDone,
  price: new Money(30000, 'GBP'),
  publicData: { ...profileDone.publicData, travel_fee_policy: 'b' },
};

const draft = (attributes, includes = {}) =>
  createOwnListing('draft-1', { state: LISTING_STATE_DRAFT, ...attributes }, includes);

describe('getResumeTab: where a model picks up their draft', () => {
  it('starts on "About you" when the city is missing', () => {
    const listing = draft({ ...aboutYouDone, geolocation: null });
    expect(getResumeTab(listing, config)).toEqual(PROFILE);
  });

  it('goes to "Your profile" once "About you" is done', () => {
    expect(getResumeTab(draft(aboutYouDone), config)).toEqual(DETAILS);
  });

  it('goes to "Your rates" once the profile fields are filled', () => {
    expect(getResumeTab(draft(profileDone), config)).toEqual(PRICING);
  });

  it('goes to "Your portfolio" while it has fewer than three photos', () => {
    const twoPhotos = { images: [createImage('i1'), createImage('i2')] };
    expect(getResumeTab(draft(ratesDone, twoPhotos), config)).toEqual(PHOTOS);
  });

  it('goes to "Review & submit" when all four steps are complete', () => {
    expect(getResumeTab(draft(ratesDone, threePhotos), config)).toEqual(REVIEW);
  });

  it('returns the first incomplete step, not a later one', () => {
    // Photos uploaded but "Your rates" not finished: rates comes first.
    expect(getResumeTab(draft(profileDone, threePhotos), config)).toEqual(PRICING);
  });
});

describe('getModelProfileRoute: where "my profile" is for a model (run-through finding 1)', () => {
  it('no listing: the new-profile flow', () => {
    expect(getModelProfileRoute({ profileListing: null, config, flagEnabled: true })).toEqual({
      name: 'NewListingPage',
    });
  });

  it('draft: the draft itself, at its resume step, never a blank new profile', () => {
    const route = getModelProfileRoute({
      profileListing: draft(profileDone),
      config,
      flagEnabled: true,
    });
    expect(route).toEqual({
      name: 'EditListingPage',
      params: { id: 'draft-1', slug: 'ava-c', type: 'draft', tab: PRICING },
    });
  });

  it('draft with every step complete: Review & submit', () => {
    const route = getModelProfileRoute({
      profileListing: draft(ratesDone, threePhotos),
      config,
      flagEnabled: false,
    });
    expect(route.name).toEqual('EditListingPage');
    expect(route.params.tab).toEqual(REVIEW);
  });

  it('submitted (pending approval): account status with the flag on', () => {
    const profileListing = createOwnListing('l1', { state: LISTING_STATE_PENDING_APPROVAL });
    expect(getModelProfileRoute({ profileListing, config, flagEnabled: true })).toEqual({
      name: 'AccountStatusPage',
    });
  });

  it('submitted (pending approval): the "Your profile" dashboard with the flag off', () => {
    const profileListing = createOwnListing('l1', { state: LISTING_STATE_PENDING_APPROVAL });
    expect(getModelProfileRoute({ profileListing, config, flagEnabled: false })).toEqual({
      name: 'ManageListingsPage',
    });
  });

  it('published: account status (flag on) or the dashboard (flag off)', () => {
    const profileListing = createOwnListing('l1', { state: LISTING_STATE_PUBLISHED });
    expect(getModelProfileRoute({ profileListing, config, flagEnabled: true }).name).toEqual(
      'AccountStatusPage'
    );
    expect(getModelProfileRoute({ profileListing, config, flagEnabled: false }).name).toEqual(
      'ManageListingsPage'
    );
  });

  it('closed counts as submitted too, so it never offers a new profile', () => {
    const profileListing = createOwnListing('l1', { state: LISTING_STATE_CLOSED });
    expect(getModelProfileRoute({ profileListing, config, flagEnabled: true }).name).toEqual(
      'AccountStatusPage'
    );
  });
});

describe('getModelEditProfileRoute: a model\'s "Edit profile" links (F5 part C)', () => {
  it('no listing: the new-profile flow, which starts on "About you"', () => {
    expect(getModelEditProfileRoute({ profileListing: null })).toEqual({ name: 'NewListingPage' });
    expect(getModelEditProfileRoute()).toEqual({ name: 'NewListingPage' });
  });

  it('draft: the draft\'s "About you" step', () => {
    expect(getModelEditProfileRoute({ profileListing: draft(profileDone) })).toEqual({
      name: 'EditListingPage',
      params: { id: 'draft-1', slug: 'ava-c', type: 'draft', tab: PROFILE },
    });
  });

  it('submitted or live: the edit wizard\'s "About you" step, never Profile settings', () => {
    const profileListing = createOwnListing('l1', {
      state: LISTING_STATE_PUBLISHED,
      title: 'Ava C',
    });
    expect(getModelEditProfileRoute({ profileListing })).toEqual({
      name: 'EditListingPage',
      params: { id: 'l1', slug: 'ava-c', type: 'edit', tab: PROFILE },
    });
  });
});
