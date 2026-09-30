import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { resubmitForReview } from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Async Thunks ================ //

//////////////////////////////
// Save the business details //
//////////////////////////////
// Writes the client's business details to their own user profile (publicData,
// protectedData and privateData; see BusinessDetailsPage.helpers.js for which key goes where),
// then re-fetches currentUser with its usual includes so the store never holds a currentUser
// without its permission set / Stripe account. A failed re-fetch doesn't fail the save.
//
// resubmit: true (a declined client submitting again, account-status flag on) also asks the
// server to clear the 'declined' review decision AFTER the details are saved, so the account
// returns to Pending approval with the updated details. If that call fails the save still
// stands, the error is shown, and submitting again retries both.
export const saveBusinessDetailsThunk = createAsyncThunk(
  'BusinessDetailsPage/saveBusinessDetails',
  ({ payload, resubmit = false }, { dispatch, rejectWithValue, extra: sdk }) => {
    return sdk.currentUser
      .updateProfile(payload)
      .then(response => (resubmit ? resubmitForReview().then(() => response) : response))
      .then(response =>
        dispatch(fetchCurrentUser({ enforce: true }))
          .catch(() => null)
          .then(() => response)
      )
      .catch(e => rejectWithValue(storableError(e)));
  }
);
// Backward compatible wrapper for the thunk
export const saveBusinessDetails = (payload, { resubmit = false } = {}) => dispatch => {
  return dispatch(saveBusinessDetailsThunk({ payload, resubmit })).unwrap();
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
