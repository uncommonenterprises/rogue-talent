import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { LISTING_STATE_DRAFT } from '../../util/types';
import { isAccountStatusFlowEnabled, isModelUser } from '../../util/accountStatus';
import { reconcileOwnListing } from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Async Thunks ================ //

/////////////////////////////
// Fetch own model listing //
/////////////////////////////
// The model's own profile listing: its state is the model's Gate A submission signal
// (util/accountStatus.js isAccountSubmitted), and screen 16 links to it. Non-critical: a failure
// leaves ownListing null.
export const fetchOwnListingThunk = createAsyncThunk(
  'AccountStatusPage/fetchOwnListing',
  (_, { rejectWithValue, extra: sdk }) => {
    return sdk.ownListings
      .query({})
      .then(response => {
        const listings = denormalisedResponseEntities(response);
        // One profile per model: prefer a submitted (non-draft) listing so a stray draft can't
        // mask submission; otherwise the first listing.
        const submitted = listings.find(l => l?.attributes?.state !== LISTING_STATE_DRAFT);
        return submitted || listings[0] || null;
      })
      .catch(e => rejectWithValue(storableError(e)));
  }
);
// Backward compatible wrapper for the thunk
export const fetchOwnListing = () => dispatch => {
  return dispatch(fetchOwnListingThunk());
};

// ================ Slice ================ //

const accountStatusPageSlice = createSlice({
  name: 'AccountStatusPage',
  initialState: {
    ownListing: null,
    ownListingFetched: false,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchOwnListingThunk.pending, state => {
        state.ownListingFetched = false;
      })
      .addCase(fetchOwnListingThunk.fulfilled, (state, action) => {
        state.ownListing = action.payload;
        state.ownListingFetched = true;
      })
      .addCase(fetchOwnListingThunk.rejected, state => {
        state.ownListing = null;
        state.ownListingFetched = true;
      });
  },
});

export default accountStatusPageSlice.reducer;

// ================ loadData ================ //

// With the account-status flag OFF the page only forwards people to today's destinations, so
// it needs nothing beyond currentUser.
//
// With the flag ON, for models: first ask the server to reconcile the model's listing
// visibility to their live Verified state (the same fail-safe, browser-only trigger the "Your
// profile" dashboard uses, see ManageListingsPage.duck.js), then load the listing. Waiting for
// the reconcile means an approved-and-verified model sees their profile as live on this load.
// A reconcile failure is ignored; it never blocks the page.
export const loadData = () => dispatch => {
  return dispatch(fetchCurrentUser()).then(currentUser => {
    if (!isAccountStatusFlowEnabled() || !isModelUser(currentUser)) {
      return currentUser;
    }
    const reconcileMaybe =
      typeof window !== 'undefined' ? reconcileOwnListing().catch(() => null) : Promise.resolve();
    return reconcileMaybe.then(() => dispatch(fetchOwnListing()));
  });
};
