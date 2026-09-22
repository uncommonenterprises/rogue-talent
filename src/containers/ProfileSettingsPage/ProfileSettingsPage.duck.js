import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { LISTING_STATE_DRAFT } from '../../util/types';
import { fetchCurrentUser, setCurrentUser } from '../../ducks/user.duck';

// ================ Async Thunks ================ //

//////////////////
// Upload Image //
//////////////////
export const uploadImageThunk = createAsyncThunk(
  'ProfileSettingsPage/uploadImage',
  ({ id, file }, { rejectWithValue, extra: sdk }) => {
    const bodyParams = {
      image: file,
    };
    const queryParams = {
      expand: true,
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    };

    return sdk.images
      .upload(bodyParams, queryParams)
      .then(resp => {
        const uploadedImage = resp.data.data;
        return { id, uploadedImage };
      })
      .catch(e => {
        return rejectWithValue({ id, error: storableError(e) });
      });
  }
);
// Backward compatible wrapper for the uploadImage thunk
export const uploadImage = actionPayload => dispatch => {
  return dispatch(uploadImageThunk(actionPayload));
};

////////////////////
// Update Profile //
////////////////////
export const updateProfileThunk = createAsyncThunk(
  'ProfileSettingsPage/updateProfile',
  (actionPayload, { dispatch, rejectWithValue, extra: sdk }) => {
    const queryParams = {
      expand: true,
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    };

    return sdk.currentUser
      .updateProfile(actionPayload, queryParams)
      .then(response => {
        const entities = denormalisedResponseEntities(response);
        if (entities.length !== 1) {
          throw new Error('Expected a resource in the sdk.currentUser.updateProfile response');
        }
        const currentUser = entities[0];

        // Update current user in state.user.currentUser through user.duck.js
        dispatch(setCurrentUser(currentUser));
        return response;
      })
      .catch(e => {
        return rejectWithValue(storableError(e));
      });
  }
);
// Backward compatible wrapper for the updateProfile thunk
export const updateProfile = actionPayload => dispatch => {
  return dispatch(updateProfileThunk(actionPayload));
};

/////////////////////////////
// Fetch own model listing //
/////////////////////////////
// Loads the current user's own model-profile listing so the account-status badge on this
// page can read the Gate-A submission signal (listing state 'pendingApproval'/'published').
// Without it a submitted-but-not-yet-approved model reads as "Draft". Non-critical: a failure
// leaves ownListing null (badge falls back to Draft) and never blocks the page.
export const fetchOwnListingThunk = createAsyncThunk(
  'ProfileSettingsPage/fetchOwnListing',
  (_, { rejectWithValue, extra: sdk }) => {
    return sdk.ownListings
      .query({})
      .then(response => {
        const listings = denormalisedResponseEntities(response);
        // Single-profile-per-model marketplace: the same listing advances
        // draft → pendingApproval → published. Prefer a submitted (non-draft) listing so a
        // stray draft can't mask submission; otherwise fall back to the first listing.
        const submitted = listings.find(l => l?.attributes?.state !== LISTING_STATE_DRAFT);
        return submitted || listings[0] || null;
      })
      .catch(e => {
        return rejectWithValue(storableError(e));
      });
  }
);
// Backward compatible wrapper for the thunk
export const fetchOwnListing = () => dispatch => {
  return dispatch(fetchOwnListingThunk());
};

// ================ Slice ================ //

const profileSettingsPageSlice = createSlice({
  name: 'ProfileSettingsPage',
  initialState: {
    image: null,
    uploadImageError: null,
    uploadInProgress: false,
    updateInProgress: false,
    updateProfileError: null,
    ownListing: null,
  },
  reducers: {
    clearUpdatedForm: state => {
      state.updateProfileError = null;
      state.uploadImageError = null;
    },
  },
  extraReducers: builder => {
    builder
      // uploadImage cases
      .addCase(uploadImageThunk.pending, (state, action) => {
        const { id, file } = action.meta.arg;
        state.image = { id, file };
        state.uploadInProgress = true;
        state.uploadImageError = null;
      })
      .addCase(uploadImageThunk.fulfilled, (state, action) => {
        const { id, uploadedImage } = action.payload;
        const { file } = state.image || {};
        state.image = { id, imageId: uploadedImage.id, file, uploadedImage };
        state.uploadInProgress = false;
      })
      .addCase(uploadImageThunk.rejected, (state, action) => {
        state.image = null;
        state.uploadInProgress = false;
        state.uploadImageError = action.payload.error;
      })
      // updateProfile cases
      .addCase(updateProfileThunk.pending, state => {
        state.updateInProgress = true;
        state.updateProfileError = null;
      })
      .addCase(updateProfileThunk.fulfilled, state => {
        state.image = null;
        state.updateInProgress = false;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.image = null;
        state.updateInProgress = false;
        state.updateProfileError = action.payload;
      })
      // fetchOwnListing cases (account-status badge submission signal)
      .addCase(fetchOwnListingThunk.fulfilled, (state, action) => {
        state.ownListing = action.payload;
      })
      .addCase(fetchOwnListingThunk.rejected, state => {
        // Non-critical: leave ownListing null so the badge falls back to Draft.
        state.ownListing = null;
      });
  },
});

export const { clearUpdatedForm } = profileSettingsPageSlice.actions;
export default profileSettingsPageSlice.reducer;

// ================ loadData ================ //

// SSR-safe: resolves currentUser (for the badge's Gate-B/verification read) and the user's
// own model-profile listing (for the Gate-A submission signal). Both dispatches are awaited so
// the badge is accurate on the server-rendered first paint. Never throws to the caller — a
// listing-query failure is swallowed above and simply yields a Draft badge.
export const loadData = (params, search, config) => dispatch => {
  return Promise.all([dispatch(fetchCurrentUser()), dispatch(fetchOwnListing())]);
};
