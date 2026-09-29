import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../util/errors';
import { fetchCurrentUser } from './user.duck';
import { locationChanged } from './routing.duck';

// Screen 05 "Your email is verified." banner. It shows once, on the first page the user lands on
// after verifying (models: the profile wizard, clients: Browse models), and goes away when
// dismissed or when they move on to another page. These paths are only hops on the way to that
// destination (the verify page itself and the /l/new redirect), so they never claim the banner.
const VERIFIED_NOTICE_PASS_THROUGH_PATHS = ['/verify-email', '/l/new'];

// ================ Async Thunk ================ //

export const verifyEmail = createAsyncThunk(
  'emailVerification/verifyEmail',
  (verificationToken, { dispatch, rejectWithValue, extra: sdk }) => {
    return sdk.currentUser
      .verifyEmail({ verificationToken })
      .then(() => {
        // Dispatch fetchCurrentUser after successful verification
        dispatch(fetchCurrentUser({ enforce: true }));
        return true;
      })
      .catch(e => {
        return rejectWithValue(storableError(e));
      });
  },
  {
    condition: (verificationToken, { getState }) => {
      const state = getState();
      if (state.emailVerification.verificationInProgress) {
        return false; // Don't dispatch if verification is already in progress
      }
      return true;
    },
  }
);

// Backward compatible wrapper for the thunk
export const verify = verificationToken => (dispatch, getState, sdk) => {
  return dispatch(verifyEmail(verificationToken));
};

// ================ Slice ================ //

const emailVerificationSlice = createSlice({
  name: 'emailVerification',
  initialState: {
    isVerified: false,
    verificationError: null,
    verificationInProgress: false,
    // Screen 05 success banner: shown once after a successful verification.
    verifiedNoticeVisible: false,
    // The pathname the banner was first shown on; null until the user lands on a destination.
    verifiedNoticePathname: null,
  },
  reducers: {
    dismissVerifiedNotice: state => {
      state.verifiedNoticeVisible = false;
      state.verifiedNoticePathname = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(verifyEmail.pending, state => {
        state.verificationInProgress = true;
        state.verificationError = null;
      })
      .addCase(verifyEmail.fulfilled, state => {
        state.verificationInProgress = false;
        state.isVerified = true;
        state.verifiedNoticeVisible = true;
        state.verifiedNoticePathname = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.verificationInProgress = false;
        state.verificationError = action.payload;
      })
      .addCase(locationChanged, (state, action) => {
        if (!state.verifiedNoticeVisible) {
          return;
        }
        const pathname = action.payload?.location?.pathname;
        if (!pathname || VERIFIED_NOTICE_PASS_THROUGH_PATHS.includes(pathname)) {
          return;
        }
        if (state.verifiedNoticePathname == null) {
          // First real destination after verifying: the banner belongs to this page.
          state.verifiedNoticePathname = pathname;
        } else if (state.verifiedNoticePathname !== pathname) {
          // The user has moved on: the banner was a one-off.
          state.verifiedNoticeVisible = false;
          state.verifiedNoticePathname = null;
        }
      });
  },
});

export const { dismissVerifiedNotice } = emailVerificationSlice.actions;

/**
 * Whether the one-off "Your email is verified." banner should show on the given page.
 *
 * @param {Object} state Redux state
 * @param {string} pathname current location pathname
 * @returns {boolean}
 */
export const showVerifiedNoticeOnPath = (state, pathname) => {
  const { verifiedNoticeVisible, verifiedNoticePathname } = state?.emailVerification || {};
  return !!verifiedNoticeVisible && !!pathname && verifiedNoticePathname === pathname;
};

export default emailVerificationSlice.reducer;
