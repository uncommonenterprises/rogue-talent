import { types as sdkTypes } from '../../util/sdkLoader';
import { createCurrentUser, createImage } from '../../util/testData';

import {
  PROFILE_IMAGE_FROM_COVER_KEY,
  coverFileName,
  getCoverImage,
  getCoverImageUrl,
  shouldSyncProfileImageFromCover,
} from './coverProfileImage';
import { syncProfileImageFromCover } from './EditListingPage.duck';

const { UUID } = sdkTypes;

const modelUser = ({ syncedFrom, hasProfileImage = true, userType = 'model' } = {}) =>
  createCurrentUser(
    'model-1',
    {
      profile: {
        displayName: 'Model',
        abbreviatedName: 'M',
        publicData: { userType },
        privateData: syncedFrom ? { [PROFILE_IMAGE_FROM_COVER_KEY]: syncedFrom } : {},
      },
    },
    hasProfileImage ? { profileImage: createImage('old-profile-image') } : {}
  );

describe('coverProfileImage helpers', () => {
  it('getCoverImage returns the first listing image', () => {
    const cover = createImage('cover');
    expect(getCoverImage({ images: [cover, createImage('second')] })).toBe(cover);
    expect(getCoverImage({ images: [] })).toBeNull();
    expect(getCoverImage(null)).toBeNull();
  });

  describe('shouldSyncProfileImageFromCover', () => {
    it('syncs a model whose profile picture was made from another cover', () => {
      expect(shouldSyncProfileImageFromCover(modelUser({ syncedFrom: 'old' }), 'new')).toBe(true);
    });

    it('syncs a model who has never had a cover-made profile picture', () => {
      expect(shouldSyncProfileImageFromCover(modelUser(), 'cover')).toBe(true);
    });

    it('syncs a model without a profile picture, even for the same cover', () => {
      const user = modelUser({ syncedFrom: 'cover', hasProfileImage: false });
      expect(shouldSyncProfileImageFromCover(user, 'cover')).toBe(true);
    });

    it('does nothing when the profile picture already comes from this cover', () => {
      const user = modelUser({ syncedFrom: 'cover' });
      expect(shouldSyncProfileImageFromCover(user, 'cover')).toBe(false);
    });

    it('never touches clients', () => {
      const user = modelUser({ userType: 'client', hasProfileImage: false });
      expect(shouldSyncProfileImageFromCover(user, 'cover')).toBe(false);
    });

    it('does nothing without a cover or a user', () => {
      expect(shouldSyncProfileImageFromCover(modelUser(), null)).toBe(false);
      expect(shouldSyncProfileImageFromCover(null, 'cover')).toBe(false);
    });
  });

  it('getCoverImageUrl reads the scaled-large variant by default', () => {
    const image = {
      attributes: { variants: { 'scaled-large': { url: 'https://img.example/large.jpg' } } },
    };
    expect(getCoverImageUrl(image)).toEqual('https://img.example/large.jpg');
    expect(getCoverImageUrl(image, 'listing-card')).toBeNull();
    expect(getCoverImageUrl(null)).toBeNull();
  });

  it('coverFileName follows the content type', () => {
    expect(coverFileName('image/png')).toEqual('profile-photo.png');
    expect(coverFileName('image/jpeg')).toEqual('profile-photo.jpg');
    expect(coverFileName(undefined)).toEqual('profile-photo.jpg');
  });
});

describe('syncProfileImageFromCover', () => {
  const listingId = new UUID('listing-1');
  const coverId = new UUID('cover-1');
  const savedListing = { id: listingId, type: 'ownListing', images: [{ id: coverId }] };

  const showResponse = {
    data: {
      data: {
        id: listingId,
        type: 'ownListing',
        attributes: {},
        relationships: { images: { data: [{ id: coverId, type: 'image' }] } },
      },
      included: [
        {
          id: coverId,
          type: 'image',
          attributes: {
            variants: { 'scaled-large': { name: 'scaled-large', url: 'https://img/cover.jpg' } },
          },
        },
      ],
    },
  };
  const uploadResponse = {
    data: { data: { id: new UUID('new-profile-image'), type: 'image', attributes: {} } },
  };
  const updateProfileResponse = {
    data: {
      data: { id: new UUID('model-1'), type: 'currentUser', attributes: { profile: {} } },
      included: [],
    },
  };

  const makeSdk = () => ({
    ownListings: { show: jest.fn(() => Promise.resolve(showResponse)) },
    images: { upload: jest.fn(() => Promise.resolve(uploadResponse)) },
    currentUser: { updateProfile: jest.fn(() => Promise.resolve(updateProfileResponse)) },
  });

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const run = (currentUser, sdk) => {
    const dispatch = jest.fn();
    const getState = () => ({ user: { currentUser } });
    return syncProfileImageFromCover(savedListing)(dispatch, getState, sdk).then(result => ({
      result,
      dispatch,
    }));
  };

  it('copies a new cover into the profile picture and records where it came from', () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['jpeg'], { type: 'image/jpeg' })),
      })
    );
    const sdk = makeSdk();

    return run(modelUser({ syncedFrom: 'old-cover' }), sdk).then(({ result, dispatch }) => {
      expect(global.fetch).toHaveBeenCalledWith('https://img/cover.jpg', {
        headers: { Accept: 'image/jpeg,image/png;q=0.9' },
      });
      const uploaded = sdk.images.upload.mock.calls[0][0].image;
      expect(uploaded.name).toEqual('profile-photo.jpg');
      expect(uploaded.type).toEqual('image/jpeg');
      expect(sdk.currentUser.updateProfile.mock.calls[0][0]).toEqual({
        profileImageId: new UUID('new-profile-image'),
        privateData: { [PROFILE_IMAGE_FROM_COVER_KEY]: 'cover-1' },
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(result.id.uuid).toEqual('model-1');
    });
  });

  it('does nothing when the profile picture already comes from this cover', () => {
    global.fetch = jest.fn();
    const sdk = makeSdk();
    return run(modelUser({ syncedFrom: 'cover-1' }), sdk).then(({ result }) => {
      expect(result).toBeNull();
      expect(sdk.ownListings.show).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('does nothing for clients', () => {
    global.fetch = jest.fn();
    const sdk = makeSdk();
    return run(modelUser({ userType: 'client' }), sdk).then(({ result }) => {
      expect(result).toBeNull();
      expect(sdk.ownListings.show).not.toHaveBeenCalled();
    });
  });

  it('never throws: a failed download leaves the profile alone', () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 403 }));
    const sdk = makeSdk();
    return run(modelUser(), sdk).then(({ result, dispatch }) => {
      expect(result).toBeNull();
      expect(sdk.images.upload).not.toHaveBeenCalled();
      expect(sdk.currentUser.updateProfile).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
