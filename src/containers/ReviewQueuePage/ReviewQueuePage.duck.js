import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchReviewQueue } from '../../util/api';
import { toReviewError } from '../../util/reviewTool';

// ================ Async Thunks ================ //

///////////////////////////
// Fetch the review queue //
///////////////////////////
// Review tool stage 1 (R01). The server checks the caller's reviewer role / admin status on
// every request; anyone else gets the identical "not-found" error and the page shows "You don't
// have access to this page".
export const fetchQueueThunk = createAsyncThunk(
  'ReviewQueuePage/fetchQueue',
  (_, { rejectWithValue }) => {
    return fetchReviewQueue().catch(e => rejectWithValue(toReviewError(e)));
  }
);
// Backward compatible wrapper for the thunk
export const fetchQueue = () => dispatch => {
  return dispatch(fetchQueueThunk());
};

// ================ Slice ================ //

const reviewQueuePageSlice = createSlice({
  name: 'ReviewQueuePage',
  initialState: {
    queue: null,
    fetchInProgress: false,
    fetchError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchQueueThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(fetchQueueThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.queue = action.payload;
      })
      .addCase(fetchQueueThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.queue = null;
        state.fetchError = action.payload || { error: null, status: null };
      });
  },
});

export default reviewQueuePageSlice.reducer;

// ================ loadData ================ //

// The route is auth-only, so SSR skips this and it runs in the browser (like AccountStatusPage).
export const loadData = () => dispatch => {
  return dispatch(fetchQueue());
};
