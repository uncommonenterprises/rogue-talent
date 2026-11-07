import { types as sdkTypes } from '../../../../util/sdkLoader';

import {
  defaultDisplayName,
  getInitialValues,
  getProfileBioUpdate,
  getProfileDisplayNameUpdate,
  getProfileListingValues,
  getProfileUpdate,
} from './EditListingProfilePanel';
import { BIO_MAX_LENGTH, bioLengthValidator } from './EditListingProfileForm';

const { LatLng } = sdkTypes;

const userNamed = (firstName, lastName) => ({
  attributes: { profile: { firstName, lastName } },
});

describe('EditListingProfilePanel display-name pre-fill (sign-up journey screen 08)', () => {
  it('suggests first name + last initial', () => {
    expect(defaultDisplayName(userNamed('Jane', 'Doe'))).toEqual('Jane D.');
    expect(defaultDisplayName(userNamed('  jane ', ' doe'))).toEqual('jane D.');
  });

  it('falls back to the first name, or nothing, when a name part is missing', () => {
    expect(defaultDisplayName(userNamed('Jane', ''))).toEqual('Jane');
    expect(defaultDisplayName(userNamed('', 'Doe'))).toEqual('');
    expect(defaultDisplayName(null)).toEqual('');
  });

  it('pre-fills the display name when the listing has no title yet', () => {
    const values = getInitialValues({ listing: null, currentUser: userNamed('Jane', 'Doe') });
    expect(values.title).toEqual('Jane D.');
    expect(values.location).toBeNull();
  });

  it('keeps a saved display name (the model may use a professional name)', () => {
    const listing = {
      attributes: {
        title: 'Janey',
        geolocation: new LatLng(51.5072, -0.1276),
        publicData: { location: { address: 'London, UK' } },
      },
    };
    const values = getInitialValues({ listing, currentUser: userNamed('Jane', 'Doe') });
    expect(values.title).toEqual('Janey');
    expect(values.location.search).toEqual('London, UK');
  });
});

const config = {
  listing: {
    listingTypes: [
      {
        listingType: 'model-profile',
        transactionType: {
          process: 'default-booking',
          alias: 'default-booking/release-1',
          unitType: 'day',
        },
      },
    ],
  },
};

const formValues = {
  title: '  Lucy S.  ',
  address: 'London, UK',
  origin: new LatLng(51.5072, -0.1276),
};

describe('EditListingProfilePanel getProfileListingValues', () => {
  it('creates the draft payload with the available-by-default plan (RT-FB-10)', () => {
    expect(getProfileListingValues(formValues, null, config)).toEqual({
      title: 'Lucy S.',
      geolocation: new LatLng(51.5072, -0.1276),
      availabilityPlan: {
        type: 'availability-plan/time',
        timezone: 'Europe/London',
        entries: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(dayOfWeek => ({
          dayOfWeek,
          startTime: '00:00',
          endTime: '00:00',
          seats: 1,
        })),
      },
      publicData: {
        listingType: 'model-profile',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
        location: { address: 'London, UK' },
      },
    });
  });

  it('does not touch the availability plan of a listing that already has one', () => {
    const listing = {
      id: { uuid: 'listing-1' },
      attributes: {
        availabilityPlan: { type: 'availability-plan/time', timezone: 'Etc/UTC', entries: [] },
        publicData: {
          listingType: 'model-profile',
          transactionProcessAlias: 'default-booking/release-1',
          unitType: 'day',
        },
      },
    };
    const values = getProfileListingValues(formValues, listing, config);
    expect(values).not.toHaveProperty('availabilityPlan');
    expect(values.title).toEqual('Lucy S.');
  });
});

describe('EditListingProfilePanel optional bio (tester F, F4)', () => {
  const userWithBio = bio => ({ attributes: { profile: { firstName: 'Jane', bio } } });

  it('pre-fills the bio saved on the user profile', () => {
    expect(getInitialValues({ listing: null, currentUser: userWithBio('Hello') }).bio).toEqual(
      'Hello'
    );
    expect(getInitialValues({ listing: null, currentUser: userWithBio(null) }).bio).toEqual('');
  });

  it('only saves the bio when it changed, trimmed', () => {
    expect(getProfileBioUpdate('Hello', userWithBio('Hello'))).toBeNull();
    expect(getProfileBioUpdate(' Hello \n', userWithBio('Hello'))).toBeNull();
    expect(getProfileBioUpdate(undefined, userWithBio(null))).toBeNull();
    expect(getProfileBioUpdate('  New bio ', userWithBio('Hello'))).toEqual({ bio: 'New bio' });
    expect(getProfileBioUpdate('', userWithBio('Hello'))).toEqual({ bio: '' });
  });

  it('limits the bio length, without blocking an untouched longer bio', () => {
    const long = 'a'.repeat(BIO_MAX_LENGTH + 1);
    expect(bioLengthValidator('too long')('a'.repeat(BIO_MAX_LENGTH))).toBeUndefined();
    expect(bioLengthValidator('too long')(long)).toEqual('too long');
    expect(bioLengthValidator('too long', long)(long)).toBeUndefined();
    expect(bioLengthValidator('too long', long)(`${long}b`)).toEqual('too long');
    expect(bioLengthValidator('too long')(undefined)).toBeUndefined();
  });
});

describe('EditListingProfilePanel display name kept in sync with the user (tester F, F5 part C)', () => {
  const userOf = (userType, profile = {}) => ({
    attributes: {
      profile: {
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Jane D.',
        bio: 'Hello',
        publicData: { userType },
        ...profile,
      },
    },
  });

  it("copies a changed display name to the model's user profile, trimmed", () => {
    expect(getProfileDisplayNameUpdate('  Janey  ', userOf('model'))).toEqual({
      displayName: 'Janey',
    });
  });

  it('skips the save when the names already match (so a retry never saves twice)', () => {
    expect(getProfileDisplayNameUpdate('Jane D.', userOf('model'))).toBeNull();
    expect(getProfileDisplayNameUpdate(' Jane D. ', userOf('model'))).toBeNull();
  });

  it('syncs an existing model whose two names differ on their next save', () => {
    const existing = userOf('model', { displayName: 'Jane D.' });
    expect(getProfileDisplayNameUpdate('Jane Doe Models', existing)).toEqual({
      displayName: 'Jane Doe Models',
    });
  });

  it('never sends an empty name, and never touches non-models', () => {
    expect(getProfileDisplayNameUpdate('   ', userOf('model'))).toBeNull();
    expect(getProfileDisplayNameUpdate(undefined, userOf('model'))).toBeNull();
    expect(getProfileDisplayNameUpdate('Janey', userOf('client'))).toBeNull();
    expect(getProfileDisplayNameUpdate('Janey', null)).toBeNull();
  });

  it('combines the bio and display name into one profile save, or none', () => {
    const model = userOf('model');
    expect(getProfileUpdate({ title: 'Jane D.', bio: 'Hello' }, model)).toBeNull();
    expect(getProfileUpdate({ title: 'Janey', bio: 'Hello' }, model)).toEqual({
      displayName: 'Janey',
    });
    expect(getProfileUpdate({ title: 'Jane D.', bio: 'New' }, model)).toEqual({ bio: 'New' });
    expect(getProfileUpdate({ title: 'Janey', bio: 'New' }, model)).toEqual({
      bio: 'New',
      displayName: 'Janey',
    });
  });
});
