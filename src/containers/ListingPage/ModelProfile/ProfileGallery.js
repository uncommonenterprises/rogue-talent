import React, { useRef, useState } from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { Modal, ResponsiveImage, RtIcon } from '../../../components';

import ImageCarousel from '../ImageCarousel/ImageCarousel';

import css from './ModelProfile.module.css';

const IMAGE_VARIANTS = ['scaled-small', 'scaled-medium', 'scaled-large', 'scaled-xlarge'];
const VIEW_ALL_BUTTON_ID = 'profileViewAllPhotos';
const MOSAIC_COUNT = 5;

/**
 * Portfolio gallery, first on the model profile (B03). Phones: a swipeable strip, one photo per
 * screen width, with a "1 / 6" counter. Desktop: a 1 + 4 mosaic with "View all photos (N)",
 * which opens the full-screen carousel.
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.images listing images
 * @param {string} props.title model name, for alt text
 * @param {Function} props.onManageDisableScrolling
 * @returns {JSX.Element|null}
 */
const ProfileGallery = props => {
  const { images = [], title, onManageDisableScrolling } = props;
  const intl = useIntl();
  const [current, setCurrent] = useState(1);
  const [isCarouselOpen, setCarouselOpen] = useState(false);
  const trackRef = useRef(null);

  if (images.length === 0) {
    return null;
  }

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) {
      return;
    }
    const index = Math.round(el.scrollLeft / el.clientWidth) + 1;
    if (index !== current) {
      setCurrent(Math.min(Math.max(index, 1), images.length));
    }
  };

  const alt = index =>
    intl.formatMessage({ id: 'ListingPage.galleryImageAlt' }, { name: title, index });

  const mosaicImages = images.slice(0, MOSAIC_COUNT);

  return (
    <section
      className={css.gallery}
      aria-label={intl.formatMessage({ id: 'ListingPage.galleryLabel' })}
    >
      <div className={css.galleryTrack} ref={trackRef} onScroll={handleScroll}>
        {images.map((image, i) => (
          <div className={css.galleryItem} key={image.id.uuid}>
            <ResponsiveImage
              rootClassName={css.galleryImage}
              alt={alt(i + 1)}
              image={image}
              variants={IMAGE_VARIANTS}
              sizes="100vw"
            />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <span className={css.galleryCount} aria-hidden="true">
          <FormattedMessage
            id="ListingPage.galleryCount"
            values={{ current, total: images.length }}
          />
        </span>
      ) : null}

      <div
        className={css.galleryMosaic}
        data-count={Math.min(images.length, MOSAIC_COUNT)}
        onClick={() => setCarouselOpen(true)}
      >
        {mosaicImages.map((image, i) => (
          <div className={i === 0 ? css.mosaicBig : css.mosaicCell} key={image.id.uuid}>
            <ResponsiveImage
              rootClassName={css.galleryImage}
              alt={alt(i + 1)}
              image={image}
              variants={IMAGE_VARIANTS}
              sizes={i === 0 ? '640px' : '320px'}
            />
          </div>
        ))}
      </div>
      <button
        id={VIEW_ALL_BUTTON_ID}
        type="button"
        className={css.galleryAll}
        onClick={() => setCarouselOpen(true)}
      >
        <RtIcon name="image" size="sm" />
        <FormattedMessage id="ListingPage.viewAllPhotos" values={{ count: images.length }} />
      </button>

      <Modal
        id="ListingPage.profileImageCarousel"
        scrollLayerClassName={css.carouselModalScrollLayer}
        containerClassName={css.carouselModalContainer}
        lightCloseButton
        isOpen={isCarouselOpen}
        onClose={() => setCarouselOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={VIEW_ALL_BUTTON_ID}
      >
        <ImageCarousel images={images} imageVariants={IMAGE_VARIANTS} />
      </Modal>
    </section>
  );
};

export default ProfileGallery;
