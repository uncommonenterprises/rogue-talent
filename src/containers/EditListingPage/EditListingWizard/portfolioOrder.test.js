import { types as sdkTypes } from '../../../util/sdkLoader';
import { createImage } from '../../../util/testData';

import { applyImageOrder, getImageKey, moveItem, moveToCover } from './portfolioOrder';

const { UUID } = sdkTypes;

describe('portfolioOrder', () => {
  describe('getImageKey', () => {
    it('uses the image UUID of a listing image', () => {
      expect(getImageKey(createImage('img-1'))).toEqual('img-1');
    });

    it('uses the uploaded image UUID of a finished upload, not its temporary id', () => {
      const upload = { id: 'photo.jpg_123_1', imageId: new UUID('uploaded-1'), file: {} };
      expect(getImageKey(upload)).toEqual('uploaded-1');
    });

    it('uses the temporary id while an upload is in flight', () => {
      expect(getImageKey({ id: 'photo.jpg_123_1', file: {} })).toEqual('photo.jpg_123_1');
    });

    it('returns null for a missing image', () => {
      expect(getImageKey(null)).toBeNull();
      expect(getImageKey({})).toBeNull();
    });
  });

  describe('moveItem', () => {
    it('moves an item later', () => {
      expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    });

    it('moves an item earlier', () => {
      expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('does not change the input array', () => {
      const list = ['a', 'b', 'c'];
      moveItem(list, 0, 2);
      expect(list).toEqual(['a', 'b', 'c']);
    });

    it('keeps the order for out-of-range or equal indexes', () => {
      expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
      expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
      expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
      expect(moveItem(null, 0, 1)).toEqual([]);
    });
  });

  describe('moveToCover', () => {
    it('moves the chosen photo to the front and keeps the others in order', () => {
      expect(moveToCover(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'a', 'b', 'd']);
    });

    it('leaves the order alone when the photo is already the cover', () => {
      expect(moveToCover(['a', 'b', 'c'], 0)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('applyImageOrder', () => {
    const a = createImage('a');
    const b = createImage('b');
    const c = createImage('c');

    it('returns the images as they are without an order', () => {
      const images = [a, b, c];
      expect(applyImageOrder(images, null)).toBe(images);
      expect(applyImageOrder(images, [])).toBe(images);
    });

    it('puts the images in the chosen order', () => {
      expect(applyImageOrder([a, b, c], ['c', 'a', 'b'])).toEqual([c, a, b]);
    });

    it('puts images missing from the order (e.g. new uploads) after the ordered ones', () => {
      const upload = { id: 'new.jpg_1_1', imageId: new UUID('d'), file: {} };
      expect(applyImageOrder([a, b, c, upload], ['b', 'a'])).toEqual([b, a, c, upload]);
    });

    it('ignores keys of images that are no longer there (e.g. removed photos)', () => {
      expect(applyImageOrder([a, c], ['c', 'b', 'a'])).toEqual([c, a]);
    });

    it('returns an empty array when there are no images', () => {
      expect(applyImageOrder(undefined, ['a'])).toEqual([]);
    });
  });
});
