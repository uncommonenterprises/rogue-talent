// Portfolio photo order ("Your portfolio", tester feedback F5).
//
// The order of the listing's `images` is the order clients see, and the first image is the
// cover (search cards, the profile page and, for models, their profile picture). These pure
// helpers move photos around; the photos form keeps the chosen order in the EditListingPage
// duck and it is saved with the existing photos save (updateListing with the images array).

/**
 * A stable key for an image in the photos form, as a string.
 * - listing images: the image UUID (`image.id`)
 * - uploads this session: the uploaded image UUID (`image.imageId`) once finished, or the
 *   temporary string id while the upload is still in flight
 *
 * @param {Object} image
 * @returns {string|null}
 */
export const getImageKey = image => {
  const id = image?.imageId || image?.id;
  if (!id) {
    return null;
  }
  return typeof id === 'string' ? id : id.uuid || null;
};

/**
 * Move one item of a list to a new position. Returns a new array; the input is not changed.
 * Out-of-range indexes leave the order as it was (still a new array).
 *
 * @param {Array} list
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {Array}
 */
export const moveItem = (list, fromIndex, toIndex) => {
  const items = Array.isArray(list) ? [...list] : [];
  const isValidIndex = i => Number.isInteger(i) && i >= 0 && i < items.length;
  if (!isValidIndex(fromIndex) || !isValidIndex(toIndex) || fromIndex === toIndex) {
    return items;
  }
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return items;
};

/**
 * Make the item at `index` the cover: it moves to the front and the others keep their order.
 *
 * @param {Array} list
 * @param {number} index
 * @returns {Array}
 */
export const moveToCover = (list, index) => moveItem(list, index, 0);

/**
 * Put images into a saved order of image keys. Images named in `order` come first, in that
 * order; any others (e.g. uploads that finished after the order was chosen) follow in their
 * existing order. Without an order the images are returned as they are.
 *
 * @param {Array<Object>} images
 * @param {Array<string>|null} order image keys (see getImageKey)
 * @returns {Array<Object>}
 */
export const applyImageOrder = (images, order) => {
  if (!Array.isArray(images)) {
    return [];
  }
  if (!Array.isArray(order) || order.length === 0) {
    return images;
  }
  const byKey = new Map(images.map(image => [getImageKey(image), image]));
  const ordered = order.map(key => byKey.get(key)).filter(Boolean);
  const orderedSet = new Set(ordered);
  const rest = images.filter(image => !orderedSet.has(image));
  return [...ordered, ...rest];
};
