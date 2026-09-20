import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import * as log from '../../util/log';
import { storableError } from '../../util/errors';
import { createImageVariantConfig } from '../../util/sdkLoader';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

// How many real published models to surface in the homepage "Featured talent" strip.
const FEATURED_TALENT_COUNT = 4;

// ================ Async thunk ================ //

/**
 * Query real, published `model-profile` listings to populate the homepage
 * "Featured talent" section. Results are added to the shared marketplaceData
 * entities; only the listing ids are kept in this page's slice.
 */
export const fetchFeaturedTalent = createAsyncThunk(
  'GeneralLandingPage/fetchFeaturedTalent',
  async (config, thunkAPI) => {
    const { extra: sdk, dispatch, rejectWithValue } = thunkAPI;
    const {
      aspectWidth = 4,
      aspectHeight = 5,
      variantPrefix = 'listing-card',
    } = config?.layout?.listingImage || {};
    const aspectRatio = aspectHeight / aspectWidth;

    try {
      const response = await sdk.listings.query({
        pub_listingType: 'model-profile',
        perPage: FEATURED_TALENT_COUNT,
        page: 1,
        include: ['author', 'images'],
        'fields.listing': ['title', 'geolocation', 'price', 'publicData', 'state', 'deleted'],
        'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'profile.metadata'],
        'fields.image': [
          'variants.listing-card',
          'variants.listing-card-2x',
          'variants.scaled-small',
          'variants.scaled-medium',
        ],
        ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
        ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
        'limit.images': 1,
      });

      dispatch(addMarketplaceEntities(response));
      const listingIds = response.data.data.map(listing => listing.id);
      return { listingIds };
    } catch (error) {
      log.error(error, 'general-landing-page-featured-talent-fetch-failed');
      return rejectWithValue(storableError(error));
    }
  }
);

// ================ Slice ================ //

const generalLandingPageSlice = createSlice({
  name: 'GeneralLandingPage',
  initialState: {
    featuredTalentIds: [],
    fetchFeaturedTalentInProgress: false,
    fetchFeaturedTalentError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFeaturedTalent.pending, state => {
        state.fetchFeaturedTalentInProgress = true;
        state.fetchFeaturedTalentError = null;
      })
      .addCase(fetchFeaturedTalent.fulfilled, (state, action) => {
        state.fetchFeaturedTalentInProgress = false;
        state.featuredTalentIds = action.payload.listingIds;
      })
      .addCase(fetchFeaturedTalent.rejected, (state, action) => {
        state.fetchFeaturedTalentInProgress = false;
        state.fetchFeaturedTalentError = action.payload;
      });
  },
});

export default generalLandingPageSlice.reducer;

// ================ loadData ================ //

export const loadData = (params, search, config) => dispatch => {
  return dispatch(fetchFeaturedTalent(config));
};
