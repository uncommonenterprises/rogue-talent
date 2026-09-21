import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { types as sdkTypes, createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { updatedEntities, denormalisedEntities } from '../../util/data';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

const { UUID } = sdkTypes;

// Image variants needed to render the parties' avatars + the listing image on
// the contract.
const getImageVariants = (listingImageConfig = {}) => {
  const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } = listingImageConfig;
  const aspectRatio = aspectHeight / aspectWidth;
  return {
    'fields.image': [
      'variants.square-small',
      'variants.square-small2x',
      `variants.${variantPrefix}`,
      `variants.${variantPrefix}-2x`,
    ],
    ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
    ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
  };
};

// ================ Async Thunks ================ //

// Contracts v1 — fetch the transaction that backs the contract. The Marketplace
// API only returns the transaction to its own customer/provider (and operator),
// so access control is enforced server-side; a non-party request rejects.
export const fetchContractTransaction = createAsyncThunk(
  'ContractPage/fetchContractTransaction',
  ({ id, config }, { dispatch, rejectWithValue, extra: sdk }) => {
    return sdk.transactions
      .show(
        {
          id: new UUID(id),
          include: [
            'customer',
            'customer.profileImage',
            'provider',
            'provider.profileImage',
            'listing',
            'listing.images',
            'booking',
          ],
          ...getImageVariants(config?.layout?.listingImage),
        },
        { expand: true }
      )
      .then(response => {
        const listingId = response.data.data.relationships.listing.data.id;
        const entities = updatedEntities({}, response.data);
        const listingRef = { id: listingId, type: 'listing' };
        const transactionRef = { id: new UUID(id), type: 'transaction' };
        const [, transaction] = denormalisedEntities(entities, [listingRef, transactionRef]);

        const listingFields = config?.listing?.listingFields;
        dispatch(addMarketplaceEntities(response, { listingFields }));

        return transaction?.id;
      })
      .catch(e => rejectWithValue(storableError(e)));
  }
);

// ================ Slice ================ //

const contractPageSlice = createSlice({
  name: 'ContractPage',
  initialState: {
    fetchInProgress: false,
    fetchError: null,
    transactionRef: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchContractTransaction.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
        state.transactionRef = null;
      })
      .addCase(fetchContractTransaction.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.transactionRef = action.payload ? { id: action.payload, type: 'transaction' } : null;
      })
      .addCase(fetchContractTransaction.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload;
      });
  },
});

export default contractPageSlice.reducer;

// ================ loadData ================ //

export const loadData = (params, search, config) => dispatch => {
  const { id } = params;
  return dispatch(fetchContractTransaction({ id, config }));
};
