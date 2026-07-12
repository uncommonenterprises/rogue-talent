// ⚠️ If you modify the styling of this component and you're using the SectionListings component in your marketplace (featured listings)
// please reflect those changes in the calculateCarouselHeight function in SectionListing.js to avoid layout issues
import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';

import { useIntl } from '../../util/reactIntl';
import { requireListingImage } from '../../util/configHelpers';
import { lazyLoadWithDimensions } from '../../util/uiHelpers';
import { createSlug } from '../../util/urlHelpers';

import {
  AspectRatioWrapper,
  NamedLink,
  ResponsiveImage,
  ListingCardThumbnail,
  VerifiedBadge,
  isUserVerified,
} from '../../components';

import { getListingCardTranslations, getTalentCardData } from './ListingCard.helpers';

import css from './ListingCard.module.css';

const LazyImage = lazyLoadWithDimensions(ResponsiveImage, { loadAfterInitialRendering: 3000 });

/**
 * ListingCardImage
 * Component responsible for rendering the image part of the listing card.
 * It either renders the first image from the listing's images array with lazy loading,
 * or a stylized placeholder if images are disabled for the listing type.
 * Also wraps the image in a fixed aspect ratio container for consistent layout.
 * @component
 * @param {Object} props
 * @param {Object} props.listing listing entity with image data
 * @param {Function?} props.setActivePropsMaybe mouse enter/leave handlers for map highlighting
 * @param {string} props.title listing title for alt text
 * @param {string} props.renderSizes img/srcset size rules
 * @param {number} props.aspectWidth aspect ratio width
 * @param {number} props.aspectHeight aspect ratio height
 * @param {string} props.variantPrefix image variant prefix (e.g. "listing-card")
 * @param {boolean} props.showListingImage whether to show actual listing image or not
 * @param {Object?} props.style the background color for the listing card with no image
 * @returns {JSX.Element} listing image with fixed aspect ratio or fallback preview
 */
const ListingCardImage = props => {
  const {
    listing,
    setActivePropsMaybe,
    title,
    renderSizes,
    aspectWidth,
    aspectHeight,
    variantPrefix,
    aspectRatioClassName,
    lazyLoadImage,
  } = props;

  const firstImage = listing?.images?.[0] || null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const aspectRatioClass = aspectRatioClassName || css.aspectRatioWrapper;
  const ImageComponent = lazyLoadImage ? LazyImage : ResponsiveImage;

  return (
    <AspectRatioWrapper
      className={aspectRatioClass}
      width={aspectWidth}
      height={aspectHeight}
      {...setActivePropsMaybe}
    >
      <ImageComponent
        rootClassName={css.rootForImage}
        alt={title}
        image={firstImage}
        variants={variants}
        sizes={renderSizes}
      />
    </AspectRatioWrapper>
  );
};

/**
 * ListingCard
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.aspectRatioClassName custom className for AspectRatioWrapper component
 * @param {Object} props.listing API entity: listing or ownListing
 * @param {string?} props.renderSizes for img/srcset
 * @param {Function?} props.setActiveListing
 * @param {boolean?} props.showAuthorInfo
 * @returns {JSX.Element} listing card to be used in search result panel etc.
 */
export const ListingCard = props => {
  const config = useConfiguration();
  const intl = props.intl || useIntl();

  const {
    className,
    rootClassName,
    aspectRatioClassName,
    darkMode,
    listing,
    renderSizes,
    setActiveListing,
    lazyLoadImage = true,
  } = props;

  const translations = getListingCardTranslations(listing, config, intl);
  const { titlePlain, cardAriaLabel, showPrice, priceTooltip } = translations;

  const classes = classNames(rootClassName || css.root, className);

  const id = listing?.id?.uuid;
  const { title = '', publicData } = listing?.attributes || {};
  const slug = createSlug(title);

  const { listingType, cardStyle } = publicData || {};
  const validListingTypes = config.listing.listingTypes || [];
  const foundListingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);
  // Render the listing image only if listing images are enabled in the listing type
  const showListingImage = requireListingImage(foundListingTypeConfig);

  const { variantPrefix = 'listing-card' } = config.layout.listingImage;

  // Sets the listing as active in the search map when hovered (if the search map is enabled)
  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => setActiveListing(listing?.id),
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  // Talent-card (rt-talent) data — model attributes now live on the listing.
  const { author, location, metaParts, categories, formattedPrice } = getTalentCardData(
    listing,
    config,
    intl
  );
  const verified = isUserVerified(author);
  // Portrait 4:5 photo — the editorial fashion shape (design system §9).
  const photoAspectWidth = 4;
  const photoAspectHeight = 5;

  return (
    <NamedLink
      className={classes}
      name="ListingPage"
      params={{ id, slug }}
      ariaLabel={cardAriaLabel}
    >
      <div className={css.photo}>
        {showListingImage ? (
          <ListingCardImage
            renderSizes={renderSizes}
            title={titlePlain}
            listing={listing}
            setActivePropsMaybe={setActivePropsMaybe}
            aspectWidth={photoAspectWidth}
            aspectHeight={photoAspectHeight}
            variantPrefix={variantPrefix}
            aspectRatioClassName={aspectRatioClassName}
            lazyLoadImage={lazyLoadImage}
          />
        ) : (
          <ListingCardThumbnail
            style={cardStyle}
            listingTitle={title}
            className={aspectRatioClassName}
            width={photoAspectWidth}
            height={photoAspectHeight}
            setActivePropsMaybe={setActivePropsMaybe}
          />
        )}
        {verified ? <VerifiedBadge className={css.photoBadge} user={author} /> : null}
      </div>

      <div className={css.body}>
        {location ? (
          <div className={css.loc}>
            <span className={css.eyebrow}>{location}</span>
          </div>
        ) : null}

        <div className={classNames(css.name, { [css.lightText]: darkMode })}>{titlePlain}</div>

        {metaParts.length > 0 ? (
          <div className={classNames(css.meta, { [css.lightText]: darkMode })}>
            {metaParts.join(' · ')}
          </div>
        ) : null}

        {categories.length > 0 ? (
          <div className={css.tags}>
            {categories.slice(0, 3).map(cat => (
              <span key={cat} className={css.tag}>
                {cat}
              </span>
            ))}
          </div>
        ) : null}

        <div className={css.rule} />

        <div className={css.foot}>
          {showPrice && formattedPrice ? (
            <div className={css.rate} title={priceTooltip}>
              {formattedPrice}
              <small>{intl.formatMessage({ id: 'ListingCard.perDay' })}</small>
            </div>
          ) : (
            <span />
          )}
          <span className={css.viewBtn}>
            {intl.formatMessage({ id: 'ListingCard.viewProfile' })}
          </span>
        </div>
      </div>
    </NamedLink>
  );
};

export default ListingCard;
