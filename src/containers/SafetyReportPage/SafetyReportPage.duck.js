import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { submitSafetyReport } from '../../util/api';

// ================ Async Thunks ================ //

// SAF-29: submit an in-app safety concern report via the app's own server
// endpoint (NOT the Marketplace API, and NOT the booking dispute flow).
export const sendSafetyReport = createAsyncThunk(
  'safetyReportPage/sendSafetyReport',
  (values, { rejectWithValue }) => {
    return submitSafetyReport(values)
      .then(response => response)
      .catch(e => rejectWithValue(storableError(e)));
  }
);

// ================ Slice ================ //

const safetyReportPageSlice = createSlice({
  name: 'safetyReportPage',
  initialState: {
    submitInProgress: false,
    submitError: null,
    reportSubmitted: false,
  },
  reducers: {
    clearSafetyReportState: state => {
      state.submitInProgress = false;
      state.submitError = null;
      state.reportSubmitted = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(sendSafetyReport.pending, state => {
        state.submitInProgress = true;
        state.submitError = null;
        state.reportSubmitted = false;
      })
      .addCase(sendSafetyReport.fulfilled, state => {
        state.submitInProgress = false;
        state.reportSubmitted = true;
      })
      .addCase(sendSafetyReport.rejected, (state, action) => {
        state.submitInProgress = false;
        state.submitError = action.payload;
      });
  },
});

export const { clearSafetyReportState } = safetyReportPageSlice.actions;

export default safetyReportPageSlice.reducer;
