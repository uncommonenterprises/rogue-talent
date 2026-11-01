import { configureStore } from '@reduxjs/toolkit';

import { createCurrentUser, createOwnListing } from '../util/testData';
import { LISTING_STATE_DRAFT, LISTING_STATE_PENDING_APPROVAL } from '../util/types';

import userReducer, { fetchCurrentUserProfileListing, pickProfileListing } from './user.duck';

const withUserType = userType => {
  const user = createCurrentUser('u1');
  return {
    ...user,
    attributes: {
      ...user.attributes,
      profile: { ...user.attributes.profile, publicData: { userType } },
    },
  };
};

const makeStore = (currentUser, listings = []) => {
  const query = jest.fn(() =>
    Promise.resolve({ data: { data: listings.map(l => ({ ...l })), included: [] } })
  );
  const store = configureStore({
    reducer: { user: userReducer },
    preloadedState: { user: { ...userReducer(undefined, { type: '@@init' }), currentUser } },
    middleware: getDefault =>
      getDefault({
        serializableCheck: false,
        thunk: { extraArgument: { ownListings: { query } } },
      }),
  });
  return { store, query };
};

describe('pickProfileListing (one profile per model)', () => {
  it('prefers a submitted listing over a stray draft', () => {
    const draft = createOwnListing('d', { state: LISTING_STATE_DRAFT });
    const pending = createOwnListing('p', { state: LISTING_STATE_PENDING_APPROVAL });
    expect(pickProfileListing([draft, pending])).toBe(pending);
  });

  it('falls back to the draft, then null', () => {
    const draft = createOwnListing('d', { state: LISTING_STATE_DRAFT });
    expect(pickProfileListing([draft])).toBe(draft);
    expect(pickProfileListing([])).toBeNull();
  });
});

describe('fetchCurrentUserProfileListing', () => {
  it("stores a model's own listing and marks it fetched", async () => {
    const { store, query } = makeStore(withUserType('model'), []);
    await store.dispatch(fetchCurrentUserProfileListing());
    expect(query).toHaveBeenCalledTimes(1);
    expect(store.getState().user.currentUserProfileListingFetched).toBe(true);
    expect(store.getState().user.currentUserProfileListing).toBeNull();
  });

  it('does nothing (and never claims "no profile") for a user who is not a known model', async () => {
    const { store, query } = makeStore(null);
    await store.dispatch(fetchCurrentUserProfileListing());
    expect(query).not.toHaveBeenCalled();
    expect(store.getState().user.currentUserProfileListingFetched).toBe(false);

    const client = makeStore(withUserType('client'));
    await client.store.dispatch(fetchCurrentUserProfileListing());
    expect(client.query).not.toHaveBeenCalled();
  });

  it('uses the user passed in when the store has none yet (fetchCurrentUser case)', async () => {
    const { store, query } = makeStore(null);
    await store.dispatch(fetchCurrentUserProfileListing(withUserType('model')));
    expect(query).toHaveBeenCalledTimes(1);
    expect(store.getState().user.currentUserProfileListingFetched).toBe(true);
  });
});
