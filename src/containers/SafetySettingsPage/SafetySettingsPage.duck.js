import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { fetchCurrentUser, setCurrentUser } from '../../ducks/user.duck';

// ================ Async thunks ================ //

// Saves the model's safety boundaries (SAF-13) to their user profile. The payload is built by
// getSafetyBoundariesUpdate (safetyBoundaries.js), i.e. only privateData.safety_boundaries.
// Sharetribe merges top-level privateData keys, so other private data is left as it is.
export const saveSafetyBoundariesThunk = createAsyncThunk(
  'SafetySettingsPage/saveSafetyBoundaries',
  (payload, { dispatch, rejectWithValue, extra: sdk }) => {
    const queryParams = {
      expand: true,
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    };

    return sdk.currentUser
      .updateProfile(payload, queryParams)
      .then(response => {
        const entities = denormalisedResponseEntities(response);
        if (entities.length !== 1) {
          throw new Error('Expected a resource in the sdk.currentUser.updateProfile response');
        }
        // Update current user in state.user.currentUser through user.duck.js
        dispatch(setCurrentUser(entities[0]));
        return entities[0];
      })
      .catch(e => {
        return rejectWithValue(storableError(e));
      });
  }
);
// Backward compatible wrapper for the thunk
export const saveSafetyBoundaries = payload => dispatch => {
  return dispatch(saveSafetyBoundariesThunk(payload)).unwrap();
};

// ================ Slice ================ //

const safetySettingsPageSlice = createSlice({
  name: 'SafetySettingsPage',
  initialState: {
    saveInProgress: false,
    saveError: null,
    saved: false,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(saveSafetyBoundariesThunk.pending, state => {
        state.saveInProgress = true;
        state.saveError = null;
        state.saved = false;
      })
      .addCase(saveSafetyBoundariesThunk.fulfilled, state => {
        state.saveInProgress = false;
        state.saved = true;
      })
      .addCase(saveSafetyBoundariesThunk.rejected, (state, action) => {
        state.saveInProgress = false;
        state.saveError = action.payload;
      });
  },
});

export default safetySettingsPageSlice.reducer;

// ================ Load data ================ //

// The boundary is read from the current user's privateData, so make sure it is fresh (SSR-safe).
export const loadData = () => {
  return fetchCurrentUser();
};
