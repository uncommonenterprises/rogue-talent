import { displayPrice, isPriceVariationsEnabled } from '../../util/configHelpers';
import { formatMoney } from '../../util/currency';
import { richText } from '../../util/richText';
import { isBookingProcessAlias } from '../../transactions/transaction';

import css from './ListingCard.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 10;

const priceData = (price, currency, intl) => {
  if (price && price.currency === currency) {
    const formattedPrice = formatMoney(intl, price);
    return { formattedPrice, priceTooltip: formattedPrice };
  } else if (price) {
    return {
      formattedPrice: intl.formatMessage(
        { id: 'ListingCard.unsupportedPrice' },
        { currency: price.currency }
      ),
      priceTooltip: intl.formatMessage(
        { id: 'ListingCard.unsupportedPriceTitle' },
        { currency: price.currency }
      ),
    };
  }
  return {};
};

/**
 * Returns all translated and formatted strings for ListingCard so the
 * presentational component can stay simple and aria-labels use the same copy.
 *
 * @param {Object} listing - API entity: listing or ownListing
 * @param {Object} config - app configuration (e.g. from useConfiguration())
 * @param {Object} intl - React Intl instance (e.g. from useIntl())
 * @returns {Object} translations and derived values:
 *   - titlePlain: raw title string (for aria/alt)
 *   - titleFormatted: React nodes from richText(title) for display
 *   - showPrice: whether to show the price block
 *   - priceTooltip: string for the price element's title attribute (tooltip on hover)
 *   - priceMessage: string or null for the price block content (same translation as used in cardAriaLabel when shown)
 *   - cardAriaLabel: ready-to-use aria-label for the card link (listing title + price line when shown)
 *   - authorName: "ListingCard.author" string containing author's display name
 */
export const getListingCardTranslations = (listing, config, intl) => {
  const { title = '', price, publicData } = listing?.attributes || {};

  const authorDisplayName = listing?.author?.attributes?.profile?.displayName;
  const authorName = intl.formatMessage(
    { id: 'ListingCard.author' },
    { authorName: authorDisplayName }
  );

  const validListingTypes = config.listing.listingTypes || [];
  const { listingType } = publicData || {};
  const listingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);

  const showPrice = displayPrice(listingTypeConfig);
  const { formattedPrice, priceTooltip } = priceData(price, config.currency, intl);

  const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);
  const hasMultiplePriceVariants = isPriceVariationsInUse && publicData?.priceVariants?.length > 1;
  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);

  const priceMessageId = hasMultiplePriceVariants
    ? 'ListingCard.priceStartingFrom'
    : 'ListingCard.price';

  const perUnitString = isBookable
    ? intl.formatMessage({ id: 'ListingCard.perUnit' }, { unitType: publicData?.unitType })
    : '';

  // Single formatted price line (amount + per-unit if applicable); used for both card aria and price block
  const priceValue = <span className={css.priceValue}>{formattedPrice}</span>;
  const pricePerUnit = isBookable ? <span className={css.perUnit}>{perUnitString}</span> : '';
  const priceMessage =
    showPrice && formattedPrice != null
      ? intl.formatMessage({ id: priceMessageId }, { priceValue, pricePerUnit })
      : '';

  const cardAriaLabel =
    priceMessage.length > 0
      ? intl.formatMessage(
          { id: 'ListingCard.screenreader.label' },
          { listingTitle: title, formattedPrice: priceMessage }
        )
      : title;

  return {
    titlePlain: title,
    titleFormatted: richText(title, {
      longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
      longWordClass: css.longWord,
    }),
    authorName,
    showPrice,
    priceTooltip,
    priceMessage,
    cardAriaLabel,
  };
};

const findListingField = (config, key) =>
  (config?.listing?.listingFields || []).find(f => f.key === key);

const enumLabel = (fieldConfig, value) =>
  fieldConfig?.enumOptions?.find(o => `${o.option}` === `${value}`)?.label || value;

/**
 * Extract the model-attribute data shown on the talent card (rt-talent): the model's
 * location, a short meta line (gender · height · experience), their categories, and the
 * formatted day rate. Reads the attributes off the listing's publicData (config maps enum
 * values to labels).
 *
 * @param {Object} listing - listing API entity
 * @param {Object} config - app configuration
 * @param {Object} intl - React Intl instance
 * @returns {Object} { author, location, metaParts: string[], categories: string[], formattedPrice }
 */
export const getTalentCardData = (listing, config, intl) => {
  const { price, publicData } = listing?.attributes || {};
  const location = publicData?.location?.address || null;

  const gender = publicData?.gender
    ? enumLabel(findListingField(config, 'gender'), publicData.gender)
    : null;
  const height = typeof publicData?.height_cm === 'number' ? `${publicData.height_cm}cm` : null;
  const experience = publicData?.experience_level
    ? enumLabel(findListingField(config, 'experience_level'), publicData.experience_level)
    : null;
  const metaParts = [gender, height, experience].filter(Boolean);

  const catField = findListingField(config, 'modelling_categories');
  const categories = Array.isArray(publicData?.modelling_categories)
    ? publicData.modelling_categories.map(v => enumLabel(catField, v)).filter(Boolean)
    : [];

  const { formattedPrice } = priceData(price, config.currency, intl);

  return {
    author: listing?.author,
    location,
    metaParts,
    categories,
    formattedPrice,
  };
};
