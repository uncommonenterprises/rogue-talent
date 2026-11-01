import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
import { fetchCurrentUserProfileListing } from '../../ducks/user.duck';
export const TOS_ASSET_NAME = 'terms-of-service';
export const PRIVACY_POLICY_ASSET_NAME = 'privacy-policy';

export const loadData = (params, search) => dispatch => {
  const pageAsset = {
    termsOfService: `content/pages/${TOS_ASSET_NAME}.json`,
    privacyPolicy: `content/pages/${PRIVACY_POLICY_ASSET_NAME}.json`,
  };
  // A logged-in model who opens /signup is sent to their profile, so refresh their own listing
  // (a no-op for anyone who isn't a known model).
  return Promise.all([
    dispatch(fetchPageAssets(pageAsset, true)),
    dispatch(fetchCurrentUserProfileListing()),
  ]).then(([pageAssets]) => pageAssets);
};
