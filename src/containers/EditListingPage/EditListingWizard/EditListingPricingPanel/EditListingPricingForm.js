import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import configs and util modules
import appSettings from '../../../../config/settings';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import * as validators from '../../../../util/validators';
import { formatMoney } from '../../../../util/currency';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { FIXED, isBookingProcess } from '../../../../transactions/transaction';

// Import shared components
import { Button, Form, FieldCurrencyInput, CustomExtendedDataField } from '../../../../components';

// Import modules from parent directory
import {
  PRICING_FIELD_COPY_OVERRIDES,
  PRICING_FIELD_DISPLAY,
  isRateListingField,
} from '../rateFields';
import { WizardActions, wizardPrimaryButtonClassName } from '../WizardShell/WizardShell';

// Import modules from this directory
import BookingPriceVariants from './BookingPriceVariants';
import StartTimeInterval from './StartTimeInverval';
import css from './EditListingPricingForm.module.css';

const { Money } = sdkTypes;

const namespacedPricingKey = field =>
  field.scope === 'private' ? `priv_${field.key}` : `pub_${field.key}`;

// Apply the model-facing label / hint overrides for a pricing-tab field (rateFields.js).
const withCopyOverrides = (field, intl) => {
  const { labelId, hintId } = PRICING_FIELD_COPY_OVERRIDES[field.key] || {};
  if (!labelId && !hintId) {
    return field;
  }
  return {
    ...field,
    ...(hintId ? { helpText: intl.formatMessage({ id: hintId }) } : {}),
    saveConfig: {
      ...field.saveConfig,
      ...(labelId ? { label: intl.formatMessage({ id: labelId }) } : {}),
    },
  };
};

// Label with the design-system required marker (cobalt asterisk + screen-reader text).
const RequiredLabel = ({ children, intl }) => (
  <>
    {children}{' '}
    <span className={css.req} aria-hidden="true">
      *
    </span>
    <span className={css.srOnly}>
      {intl.formatMessage({ id: 'CustomExtendedDataField.requiredIndicator' })}
    </span>
  </>
);

// Optional rate label: "Half-day rate (optional)".
const OptionalLabel = ({ children, intl }) =>
  intl.formatMessage({ id: 'EditListingPricingForm.optionalLabel' }, { label: children });

// "How the fee works" (sign-up journey screen 11): the commercial model in one place.
const FeeCallout = props => {
  const { price, intl } = props;
  const hasPrice = price instanceof Money && price.amount > 0;
  return (
    <div className={css.callout}>
      <h2 className={css.calloutTitle}>
        <FormattedMessage id="EditListingPricingForm.feeCalloutTitle" />
      </h2>
      <p className={css.calloutText}>
        {hasPrice ? (
          <FormattedMessage
            id="EditListingPricingForm.feeCalloutText"
            values={{ dayRate: formatMoney(intl, price) }}
          />
        ) : (
          <FormattedMessage id="EditListingPricingForm.feeCalloutTextNoRate" />
        )}
      </p>
    </div>
  );
};

const getPriceValidators = (listingMinimumPriceSubUnits, marketplaceCurrency, intl) => {
  const priceRequiredMsgId = { id: 'EditListingPricingForm.priceRequired' };
  const priceRequiredMsg = intl.formatMessage(priceRequiredMsgId);
  const priceRequired = validators.required(priceRequiredMsg);

  const minPriceRaw = new Money(listingMinimumPriceSubUnits, marketplaceCurrency);
  const minPrice = formatMoney(intl, minPriceRaw);
  const priceTooLowMsgId = { id: 'EditListingPricingForm.priceTooLow' };
  const priceTooLowMsg = intl.formatMessage(priceTooLowMsgId, { minPrice });
  const minPriceRequired = validators.moneySubUnitAmountAtLeast(
    priceTooLowMsg,
    listingMinimumPriceSubUnits
  );

  return listingMinimumPriceSubUnits
    ? validators.composeValidators(priceRequired, minPriceRequired)
    : priceRequired;
};

const ErrorMessages = props => {
  const { fetchErrors } = props;
  const { updateListingError, showListingsError } = fetchErrors || {};

  return (
    <>
      {updateListingError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingPricingForm.updateFailed" />
        </p>
      ) : null}
      {showListingsError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingPricingForm.showListingFailed" />
        </p>
      ) : null}
    </>
  );
};

/**
 * The EditListingPricingForm component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.formId] - The form id
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} props.unitType - The unitType from listing.attributes.publicData
 * @param {Object} [props.listingTypeConfig] - The listing type config that matches with listingType on publicData.
 * @param {Object} [props.listingTypeConfig.priceVariations] - The price variations config.
 * @param {boolean} props.listingTypeConfig.priceVariations.enabled - Whether the price variations are enabled.
 * @param {Object} [props.listingTypeConfig.transactionType] - The transaction type config.
 * @param {string} props.listingTypeConfig.transactionType.process - The transaction process config.
 * @param {string} props.marketplaceCurrency - The marketplace currency
 * @param {number} [props.listingMinimumPriceSubUnits] - The listing minimum price sub units
 * @param {boolean} [props.autoFocus] - Whether the input should be focused
 * @param {boolean} [props.disabled] - Whether the form is disabled
 * @param {boolean} [props.ready] - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {boolean} [props.invalid] - Whether the form is invalid
 * @param {boolean} [props.pristine] - Whether the form is pristine
 * @param {string} props.saveActionMsg - The save action message
 * @param {Object} [props.backLinkProps] - NamedLink props for the wizard's "Back" link
 * @param {Array<Object>} [props.pricingFields] - The pricing-tab listing fields, in order
 * @param {boolean} [props.updated] - Whether the form is updated
 * @param {boolean} [props.updateInProgress] - Whether the form is updating
 * @param {Object} [props.fetchErrors] - The fetch errors
 * @returns {JSX.Element}
 */
export const EditListingPricingForm = props => (
  <FinalForm
    mutators={{ ...arrayMutators }}
    {...props}
    render={formRenderProps => {
      const {
        formId = 'EditListingPricingForm',
        form: formApi,
        autoFocus,
        className,
        rootClassName,
        disabled,
        ready,
        handleSubmit,
        marketplaceCurrency,
        unitType,
        pricingFields = [],
        listingTypeConfig,
        isPriceVariationsInUse,
        listingMinimumPriceSubUnits = 0,
        invalid,
        pristine,
        saveActionMsg,
        backLinkProps,
        updated,
        updateInProgress = false,
        fetchErrors,
        initialValues: formInitialValues,
        values: formValues,
      } = formRenderProps;

      const intl = useIntl();
      const rateFields = pricingFields.filter(isRateListingField);
      const termFields = pricingFields.filter(f => !isRateListingField(f));
      const priceValidators = getPriceValidators(
        listingMinimumPriceSubUnits,
        marketplaceCurrency,
        intl
      );

      const classes = classNames(rootClassName || css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;
      const { transactionType } = listingTypeConfig || {};
      const { process } = transactionType || {};
      const isBooking = isBookingProcess(process);

      const isFixedLengthBooking = isBooking && unitType === FIXED;
      const isBookingPriceVariationsInUse = isBooking && isPriceVariationsInUse;
      const isUsingPriceVariants = isFixedLengthBooking || isBookingPriceVariationsInUse;

      return (
        <Form onSubmit={handleSubmit} className={classes}>
          <ErrorMessages fetchErrors={fetchErrors} />

          {isUsingPriceVariants ? (
            <BookingPriceVariants
              formId={formId}
              formApi={formApi}
              autoFocus={autoFocus}
              className={css.input}
              marketplaceCurrency={marketplaceCurrency}
              unitType={unitType}
              isPriceVariationsInUse={isBookingPriceVariationsInUse}
              initialLengthOfPriceVariants={formInitialValues?.priceVariants?.length || 0}
              listingMinimumPriceSubUnits={listingMinimumPriceSubUnits}
            />
          ) : (
            <div className={css.field}>
              <FieldCurrencyInput
                id={`${formId}price`}
                name="price"
                autoFocus={autoFocus}
                label={
                  <RequiredLabel intl={intl}>
                    {intl.formatMessage(
                      { id: 'EditListingPricingForm.pricePerProduct' },
                      { unitType }
                    )}
                  </RequiredLabel>
                }
                placeholder={intl.formatMessage({
                  id: 'EditListingPricingForm.priceInputPlaceholder',
                })}
                currencyConfig={appSettings.getCurrencyFormatting(marketplaceCurrency)}
                validate={priceValidators}
              />
              <p className={css.hint}>
                <FormattedMessage id="EditListingPricingForm.dayRateHint" />
              </p>
            </div>
          )}

          {isFixedLengthBooking ? (
            <StartTimeInterval
              name="startTimeInterval"
              idPrefix={`${formId}_startTimeInterval`}
              formValues={formValues}
              pristine={pristine}
            />
          ) : null}

          {/* Pricing-tab fields, grouped with the day rate (sign-up journey screen 11). The
              monetary rates (half-day, hourly) sit in a row on wider screens and render as
              currency inputs to match the day-rate formatting (stored as subunits). Then, one
              under the other: travel costs (pills), how far you'll travel, minimum notice. */}
          {rateFields.length > 0 ? (
            <div className={css.rateRow}>
              {rateFields.map(field => {
                const namespacedKey = namespacedPricingKey(field);
                const copy = withCopyOverrides(field, intl);
                return (
                  <FieldCurrencyInput
                    key={namespacedKey}
                    id={`${formId}.${namespacedKey}`}
                    name={namespacedKey}
                    className={css.rateField}
                    label={
                      copy.saveConfig?.isRequired ? (
                        <RequiredLabel intl={intl}>{copy.saveConfig?.label}</RequiredLabel>
                      ) : (
                        <OptionalLabel intl={intl}>
                          {copy.saveConfig?.label || copy.label}
                        </OptionalLabel>
                      )
                    }
                    placeholder={intl.formatMessage({
                      id: 'EditListingPricingForm.priceInputPlaceholder',
                    })}
                    currencyConfig={appSettings.getCurrencyFormatting(marketplaceCurrency)}
                  />
                );
              })}
            </div>
          ) : null}

          {termFields.map(field => {
            const namespacedKey = namespacedPricingKey(field);
            return (
              <CustomExtendedDataField
                key={namespacedKey}
                className={css.field}
                name={namespacedKey}
                fieldConfig={withCopyOverrides(field, intl)}
                formId={formId}
                displayAs={PRICING_FIELD_DISPLAY[field.key]}
                hintBelowInput
              />
            );
          })}

          <FeeCallout price={formValues?.price} intl={intl} />

          <WizardActions backLinkProps={backLinkProps}>
            <Button
              className={wizardPrimaryButtonClassName}
              type="submit"
              inProgress={submitInProgress}
              disabled={submitDisabled}
              ready={submitReady}
            >
              {saveActionMsg}
            </Button>
          </WizardActions>
        </Form>
      );
    }}
  />
);

export default EditListingPricingForm;
