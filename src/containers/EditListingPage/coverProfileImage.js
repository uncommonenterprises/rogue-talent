// A model's cover photo doubles as their profile picture (tester feedback F5, part B).
//
// The cover is the first image of the model's profile listing. When a portfolio save leaves a
// different cover from the one the profile picture was last made from, the app copies the
// cover into the user's profileImage (see syncProfileImageFromCover in EditListingPage.duck.js).
// These pure helpers decide whether that is needed and which image file to copy.

import { isModelUser } from '../../util/accountStatus';
import { getImageKey } from './EditListingWizard/portfolioOrder';

// Key in the user's privateData recording which listing image (UUID string) the current
// profile picture was copied from. Private to the user; a top-level key, so it never touches
// other privateData such as safety_boundaries (top-level keys are merged on update).
export const PROFILE_IMAGE_FROM_COVER_KEY = 'profileImageFromCover';

// The image variant copied into the profile picture: the whole photo scaled to fit 1024px, not
// a crop, so Sharetribe's own square avatar crop works from the full photo (the same as a
// manual profile picture upload would).
export const COVER_SOURCE_VARIANT = 'scaled-large';

// Ask the image CDN for JPEG or PNG. It serves AVIF/WebP to browsers that accept them, and a
// plain JPEG/PNG is the safest format to upload again.
export const COVER_FETCH_ACCEPT = 'image/jpeg,image/png;q=0.9';

/**
 * The cover image of a listing (its first image), or null.
 *
 * @param {Object} listing denormalised listing with `images`
 * @returns {Object|null}
 */
export const getCoverImage = listing => listing?.images?.[0] || null;

/**
 * Whether the model's profile picture should be replaced with the cover photo: only for
 * models, only when there is a cover, and only when the profile picture wasn't already made
 * from this cover (or there is no profile picture at all).
 *
 * @param {Object} currentUser
 * @param {string|null} coverKey image UUID string of the cover (see getImageKey)
 * @returns {boolean}
 */
export const shouldSyncProfileImageFromCover = (currentUser, coverKey) => {
  if (!coverKey || !isModelUser(currentUser)) {
    return false;
  }
  const syncedFrom = currentUser?.attributes?.profile?.privateData?.[PROFILE_IMAGE_FROM_COVER_KEY];
  const hasProfileImage = !!currentUser?.profileImage?.id;
  return !hasProfileImage || syncedFrom !== coverKey;
};

/**
 * URL of the cover image file to copy, from the given variant, or null.
 *
 * @param {Object} image listing image with attributes.variants
 * @param {string} [variantName]
 * @returns {string|null}
 */
export const getCoverImageUrl = (image, variantName = COVER_SOURCE_VARIANT) =>
  image?.attributes?.variants?.[variantName]?.url || null;

/**
 * File name for the copied image, from its content type.
 *
 * @param {string} [contentType]
 * @returns {string}
 */
export const coverFileName = contentType =>
  contentType === 'image/png' ? 'profile-photo.png' : 'profile-photo.jpg';

export { getImageKey };
