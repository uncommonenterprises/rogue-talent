import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchReviewProfile } from '../../util/api';
import { toReviewError } from '../../util/reviewTool';

// ================ Async Thunks ================ //

////////////////////////////////////
// Fetch one person for the review //
////////////////////////////////////
// Review tool stage 1 (R02 model / R04 client). Read-only: the server returns an allow-listed
// copy of the profile ({ kind: 'model' | 'client' | 'not-waiting' }) for reviewers and admins,
// and the identical "not-found" error to everyone else, for real and made-up ids alike.
export const fetchProfileThunk = createAsyncThunk(
  'ReviewProfilePage/fetchProfile',
  (userId, { rejectWithValue }) => {
    return fetchReviewProfile(userId).catch(e => rejectWithValue(toReviewError(e)));
  }
);
// Backward compatible wrapper for the thunk
export const fetchProfile = userId => dispatch => {
  return dispatch(fetchProfileThunk(userId));
};

// ================ Slice ================ //

const reviewProfilePageSlice = createSlice({
  name: 'ReviewProfilePage',
  initialState: {
    userId: null,
    profile: null,
    fetchInProgress: false,
    fetchError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchProfileThunk.pending, (state, action) => {
        state.userId = action.meta.arg;
        state.profile = null;
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload || { error: null, status: null };
      });
  },
});

export default reviewProfilePageSlice.reducer;

// ================ loadData ================ //

// The route is auth-only, so SSR skips this and it runs in the browser (like AccountStatusPage).
export const loadData = params => dispatch => {
  return dispatch(fetchProfile(params?.userId));
};
