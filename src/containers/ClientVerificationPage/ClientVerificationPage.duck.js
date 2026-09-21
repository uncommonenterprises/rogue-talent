import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { createIdentitySession } from '../../util/api';

// ================ Async Thunks ================ //

// SAF-03: ask our server to create a Stripe Identity VerificationSession for the
// logged-in client. Returns { clientSecret, sessionId, url, status } or
// { alreadyVerified: true }. Until Neil provisions STRIPE_SECRET_KEY the server
// responds 503 (`identity-verification-not-configured`) and this rejects — the UI
// shows a "not available yet" state rather than crashing.
export const createSession = createAsyncThunk(
  'clientVerificationPage/createSession',
  (_, { rejectWithValue }) => {
    return createIdentitySession()
      .then(response => response)
      .catch(e => {
        const storable = storableError(e);
        // Preserve the not-configured signal so the UI can distinguish it.
        return rejectWithValue({ ...storable, code: e?.code || null });
      });
  }
);

// ================ Slice ================ //

const clientVerificationPageSlice = createSlice({
  name: 'clientVerificationPage',
  initialState: {
    createSessionInProgress: false,
    createSessionError: null,
    session: null,
    alreadyVerified: false,
  },
  reducers: {
    clearVerificationState: state => {
      state.createSessionInProgress = false;
      state.createSessionError = null;
      state.session = null;
      state.alreadyVerified = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(createSession.pending, state => {
        state.createSessionInProgress = true;
        state.createSessionError = null;
        state.session = null;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.createSessionInProgress = false;
        if (action.payload?.alreadyVerified) {
          state.alreadyVerified = true;
        } else {
          state.session = action.payload;
        }
      })
      .addCase(createSession.rejected, (state, action) => {
        state.createSessionInProgress = false;
        state.createSessionError = action.payload;
      });
  },
});

export const { clearVerificationState } = clientVerificationPageSlice.actions;

export default clientVerificationPageSlice.reducer;
