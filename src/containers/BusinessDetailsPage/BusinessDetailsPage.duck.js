import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Async Thunks ================ //

//////////////////////////////
// Save the business details //
//////////////////////////////
// Writes the client's business details to their own user profile (publicData,
// protectedData and privateData; see BusinessDetailsPage.helpers.js for which key goes where),
// then re-fetches currentUser with its usual includes so the store never holds a currentUser
// without its permission set / Stripe account. A failed re-fetch doesn't fail the save.
export const saveBusinessDetailsThunk = createAsyncThunk(
  'BusinessDetailsPage/saveBusinessDetails',
  (payload, { dispatch, rejectWithValue, extra: sdk }) => {
    return sdk.currentUser
      .updateProfile(payload)
      .then(response =>
        dispatch(fetchCurrentUser({ enforce: true }))
          .catch(() => null)
          .then(() => response)
      )
      .catch(e => rejectWithValue(storableError(e)));
  }
);
// Backward compatible wrapper for the thunk
export const saveBusinessDetails = payload => dispatch => {
  return dispatch(saveBusinessDetailsThunk(payload)).unwrap();
};

// ================ Slice ================ //

const businessDetailsPageSlice = createSlice({
  name: 'BusinessDetailsPage',
  initialState: {
    saveInProgress: false,
    saveError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(saveBusinessDetailsThunk.pending, state => {
        state.saveInProgress = true;
        state.saveError = null;
      })
      .addCase(saveBusinessDetailsThunk.fulfilled, state => {
        state.saveInProgress = false;
      })
      .addCase(saveBusinessDetailsThunk.rejected, (state, action) => {
        state.saveInProgress = false;
        state.saveError = action.payload || null;
      });
  },
});

export default businessDetailsPageSlice.reducer;

// ================ loadData ================ //

// The form is pre-filled from currentUser (company name from sign-up, plus anything saved
// before), so the page only needs a fresh currentUser.
export const loadData = () => dispatch => {
  return dispatch(fetchCurrentUser());
};
