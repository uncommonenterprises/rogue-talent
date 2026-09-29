// Portfolio ("Your portfolio") rules shared by the wizard's step gating and the photos form.
//
// Decided by Neil (29/09/2026): a model needs at least 3 photos before they can continue to
// "Review & submit". Enough to judge quality and range, low enough not to put off newer models.
export const MIN_PORTFOLIO_PHOTOS = 3;

// An image in the photos form counts once its upload has finished: it's either already
// attached to the listing (has attributes) or has been uploaded and given an imageId. Images
// still uploading (a local file with neither) don't count yet.
const isUploadedImage = image => !!(image && (image.attributes || image.imageId));

/**
 * Number of finished uploads in a list of images (listing images and/or form images).
 *
 * @param {Array<Object>} images
 * @returns {number}
 */
export const countUploadedImages = images =>
  Array.isArray(images) ? images.filter(isUploadedImage).length : 0;

/**
 * Whether a list of images meets the portfolio minimum.
 *
 * @param {Array<Object>} images
 * @returns {boolean}
 */
export const hasMinimumPortfolio = images => countUploadedImages(images) >= MIN_PORTFOLIO_PHOTOS;
