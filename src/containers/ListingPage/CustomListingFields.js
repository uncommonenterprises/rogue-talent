import React from 'react';

// Utils
import {
  getDetailCustomFieldValue,
  isFieldForCategory,
  isFieldForListingType,
  pickCategoryFields,
  pickCustomFieldProps,
} from '../../util/fieldHelpers.js';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { RATE_LISTING_FIELD_KEYS } from '../EditListingPage/EditListingWizard/rateFields';

import CustomExtendedDataSection from '../../components/CustomExtendedDataSection/CustomExtendedDataSection.js';

const { Money } = sdkTypes;

/**
 * Renders custom listing fields.
 * - SectionDetails is used if schemaType is 'enum', 'long', or 'boolean'
 * - SectionMultiEnum is used if schemaType is 'multi-enum'
 * - SectionText is used if schemaType is 'text'
 *
 * @param {*} props include publicData, metadata, listingFieldConfigs, categoryConfiguration
 * @returns React.Fragment containing aforementioned components
 */
const CustomListingFields = props => {
  const {
    publicData,
    metadata,
    listingFieldConfigs,
    categoryConfiguration,
    marketplaceCurrency,
    intl,
  } = props;

  const { key: categoryPrefix, categories: listingCategoriesConfig } = categoryConfiguration;
  const categoriesObj = pickCategoryFields(publicData, categoryPrefix, 1, listingCategoriesConfig);
  const currentCategories = Object.values(categoriesObj);

  // Fields are shown by default. Set showConfig.displayOnListingPage to false to explicitly hide a field.
  const displayableFieldConfigs = listingFieldConfigs.filter(
    fieldConfig => fieldConfig.showConfig?.displayOnListingPage !== false
  );

  const isFieldForSelectedCategories = fieldConfig => {
    const isTargetCategory = isFieldForCategory(currentCategories, fieldConfig);
    return isTargetCategory;
  };
  const propsForCustomFields =
    pickCustomFieldProps(
      { publicData, metadata },
      displayableFieldConfigs,
      'listingType',
      isFieldForSelectedCategories
    ) || [];

  const sectionDetailsProps = {
    ...props,
    isFieldForCategory: isFieldForSelectedCategories,
    fieldConfigs: displayableFieldConfigs,
    heading: 'ListingPage.detailsTitle',
  };

  const pickExtendedDataFields = (filteredConfigs, config) => {
    const { key, schemaType, enumOptions, showConfig = {} } = config;
    const listingType = publicData.listingType;
    const isTargetListingType = isFieldForListingType(listingType, config);
    const isTargetCategory = isFieldForCategory(currentCategories, config);

    const { isDetail, label } = showConfig;
    const publicDataValue = publicData[key];
    const metadataValue = metadata[key];
    const value = publicDataValue != null ? publicDataValue : metadataValue;

    // Single-value fields (enum/long/boolean/short-text) are shown as detail rows by
    // default. The no-code Console doesn't set `isDetail`, so treat it as opt-out
    // (hidden only when explicitly false) — consistent with displayOnListingPage above.
    if (
      isDetail !== false &&
      isTargetListingType &&
      isTargetCategory &&
      typeof value !== 'undefined'
    ) {
      const detailValue = getDetailCustomFieldValue(
        enumOptions,
        value,
        schemaType,
        key,
        label,
        intl,
        'ListingPage'
      );
      if (!detailValue) {
        return filteredConfigs;
      }

      // Rate fields (half-day/hourly) are stored as subunits like the price, so format them
      // as currency to match the day rate rather than showing a raw number.
      const isMoneyField = RATE_LISTING_FIELD_KEYS.includes(key);
      const finalValue =
        isMoneyField && typeof value === 'number' && marketplaceCurrency
          ? { ...detailValue, value: formatMoney(intl, new Money(value, marketplaceCurrency)) }
          : detailValue;

      return filteredConfigs.concat(finalValue);
    }
    return filteredConfigs;
  };

  return (
    <CustomExtendedDataSection
      sectionDetailsProps={sectionDetailsProps}
      propsForCustomFields={propsForCustomFields}
      idPrefix="listingPage"
      pickExtendedDataFields={pickExtendedDataFields}
    />
  );
};

export default CustomListingFields;
