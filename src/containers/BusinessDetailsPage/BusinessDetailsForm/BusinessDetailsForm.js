import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import {
  BUSINESS_TYPE_LIMITED_COMPANY,
  BUSINESS_TYPE_SOLE_TRADER,
} from '../../../util/clientBusinessDetails';

// Import shared components
import {
  Button,
  Form,
  FieldLocationAutocompleteInput,
  FieldSelect,
  FieldTextInput,
  NamedLink,
} from '../../../components';

// Import modules from parent directory
import {
  FIELD_BUSINESS_TYPE,
  FIELD_COMPANY_NAME,
  FIELD_REGISTRATION_NUMBER,
  FIELD_BUSINESS_ADDRESS,
  FIELD_BUSINESS_PHONE,
  FIELD_INDUSTRY,
  FIELD_WEBSITE,
  isSoleTrader,
  validateBusinessDetails,
} from '../BusinessDetailsPage.helpers';

// Import modules from this directory
import css from './BusinessDetailsForm.module.css';

const identity = v => v;

// Field label with the design-system required marker: a cobalt asterisk (aria-hidden) plus a
// visually hidden "required" for screen readers, as on the model wizard.
const RequiredLabel = ({ children }) => {
  const intl = useIntl();
  return (
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
};

const OptionalLabel = ({ children }) => (
  <>
    {children}{' '}
    <span className={css.optional}>
      <FormattedMessage id="BusinessDetailsForm.optional" />
    </span>
  </>
);

// Map pin inside the address field (same look as the city field on screen 08).
const IconPin = () => (
  <svg
    className={css.pinSvg}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 14s5-4.2 5-8a5 5 0 10-10 0c0 3.8 5 8 5 8z"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <circle cx="8" cy="6" r="1.6" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

/**
 * Business type choice (design-system rt-segmented): two radios styled as a segmented control.
 * Below 480px the two options stack as full-width rows (screen 18 mobile pass).
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId - id prefix
 * @param {Array<{ value: string, label: string }>} props.options
 * @returns {JSX.Element}
 */
const FieldBusinessType = props => {
  const { formId, options } = props;
  return (
    <fieldset className={css.fieldset}>
      <legend className={css.legend}>
        <RequiredLabel>
          <FormattedMessage id="BusinessDetailsForm.businessTypeLabel" />
        </RequiredLabel>
      </legend>
      <div className={css.segmented}>
        {options.map(option => {
          const id = `${formId}.businessType.${option.value}`;
          return (
            <span key={option.value} className={css.segment}>
              <Field
                id={id}
                name={FIELD_BUSINESS_TYPE}
                component="input"
                type="radio"
                value={option.value}
                className={css.segmentInput}
              />
              <label htmlFor={id} className={css.segmentLabel}>
                {option.label}
              </label>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
};

/**
 * The client "Your business details" form (sign-up journey screen 18). The fields change with
 * the business type: limited companies give a registration number and registered office
 * address; sole traders give a business address and a website or social media link. Both give
 * a business phone number. Validation is record-level (see validateBusinessDetails).
 *
 * The slim top bar ("Rogue." + "Save & exit") is rendered inside the form so "Save & exit" can
 * save whatever has been entered so far, without validation and without submitting.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.formId]
 * @param {Object} props.initialValues
 * @param {Function} props.onSubmit - "Submit for approval" (validated values)
 * @param {Function} props.onSaveAndExit - "Save & exit" (current values, unvalidated)
 * @param {Array<{ option: string, label: string }>} props.industryOptions
 * @param {boolean} [props.inProgress]
 * @param {Object} [props.saveError]
 * @returns {JSX.Element}
 */
const BusinessDetailsForm = props => {
  const intl = useIntl();
  const {
    formId = 'BusinessDetailsForm',
    onSaveAndExit,
    industryOptions = [],
    inProgress = false,
    saveError,
    ...rest
  } = props;

  const messages = {
    [FIELD_BUSINESS_TYPE]: intl.formatMessage({ id: 'BusinessDetailsForm.businessTypeRequired' }),
    [FIELD_COMPANY_NAME]: intl.formatMessage({ id: 'BusinessDetailsForm.companyNameRequired' }),
    [FIELD_REGISTRATION_NUMBER]: intl.formatMessage({
      id: 'BusinessDetailsForm.registrationNumberRequired',
    }),
    [FIELD_BUSINESS_ADDRESS]: intl.formatMessage({ id: 'BusinessDetailsForm.addressRequired' }),
    [FIELD_BUSINESS_PHONE]: intl.formatMessage({ id: 'BusinessDetailsForm.phoneRequired' }),
    [FIELD_WEBSITE]: intl.formatMessage({ id: 'BusinessDetailsForm.websiteOrSocialRequired' }),
    addressNotChosen: intl.formatMessage({ id: 'BusinessDetailsForm.addressNotChosen' }),
    phoneInvalid: intl.formatMessage({ id: 'BusinessDetailsForm.phoneInvalid' }),
  };

  const businessTypeOptions = [
    {
      value: BUSINESS_TYPE_LIMITED_COMPANY,
      label: intl.formatMessage({ id: 'BusinessDetailsForm.businessTypeLimitedCompany' }),
    },
    {
      value: BUSINESS_TYPE_SOLE_TRADER,
      label: intl.formatMessage({ id: 'BusinessDetailsForm.businessTypeSoleTrader' }),
    },
  ];

  return (
    <FinalForm
      {...rest}
      validate={values => validateBusinessDetails(values, messages)}
      render={formRenderProps => {
        const { handleSubmit, invalid, values } = formRenderProps;
        const soleTrader = isSoleTrader(values[FIELD_BUSINESS_TYPE]);
        const submitDisabled = invalid || inProgress;

        return (
          <Form className={css.root} onSubmit={handleSubmit}>
            <nav
              className={css.topbar}
              aria-label={intl.formatMessage({ id: 'BusinessDetailsForm.navLabel' })}
            >
              <NamedLink name="LandingPage" className={css.brand}>
                <FormattedMessage id="BusinessDetailsForm.brand" />
                <span className={css.brandDot}>.</span>
              </NamedLink>
              <button
                type="button"
                className={css.exitButton}
                onClick={() => onSaveAndExit(values)}
                disabled={inProgress}
              >
                <FormattedMessage id="BusinessDetailsForm.saveAndExit" />
              </button>
            </nav>

            <div className={css.main}>
              <div className={css.stepperMobile}>
                <span className={css.stepperMobileLabel}>
                  <FormattedMessage id="BusinessDetailsForm.stepLabel" />
                </span>
                <div className={css.stepperBar} aria-hidden="true">
                  <span className={css.stepperBarFill} />
                </div>
              </div>

              <div className={css.header}>
                <span className={css.eyebrow}>
                  <FormattedMessage id="BusinessDetailsForm.eyebrow" />
                </span>
                <h1 className={css.title}>
                  <FormattedMessage id="BusinessDetailsForm.title" />
                </h1>
                <p className={css.guidance}>
                  <FormattedMessage id="BusinessDetailsForm.guidance" />
                </p>
              </div>

              <div className={css.fields}>
                <FieldBusinessType formId={formId} options={businessTypeOptions} />

                <div className={css.field}>
                  <FieldTextInput
                    id={`${formId}.companyName`}
                    name={FIELD_COMPANY_NAME}
                    type="text"
                    autoComplete="organization"
                    label={
                      <RequiredLabel>
                        <FormattedMessage
                          id={
                            soleTrader
                              ? 'BusinessDetailsForm.tradingNameLabel'
                              : 'BusinessDetailsForm.companyNameLabel'
                          }
                        />
                      </RequiredLabel>
                    }
                  />
                  <p className={css.hint}>
                    <FormattedMessage
                      id={
                        soleTrader
                          ? 'BusinessDetailsForm.tradingNameHint'
                          : 'BusinessDetailsForm.companyNameHint'
                      }
                    />
                  </p>
                </div>

                {soleTrader ? null : (
                  <div className={css.field}>
                    <FieldTextInput
                      id={`${formId}.companyRegistrationNumber`}
                      name={FIELD_REGISTRATION_NUMBER}
                      type="text"
                      placeholder={intl.formatMessage({
                        id: 'BusinessDetailsForm.registrationNumberPlaceholder',
                      })}
                      label={
                        <RequiredLabel>
                          <FormattedMessage id="BusinessDetailsForm.registrationNumberLabel" />
                        </RequiredLabel>
                      }
                    />
                    <p className={css.hint}>
                      <FormattedMessage id="BusinessDetailsForm.registrationNumberHint" />
                    </p>
                  </div>
                )}

                <div className={css.field}>
                  <FieldLocationAutocompleteInput
                    rootClassName={css.location}
                    inputClassName={css.locationAutocompleteInput}
                    iconClassName={css.locationAutocompleteInputIcon}
                    CustomIcon={IconPin}
                    predictionsClassName={css.predictionsRoot}
                    useDarkText
                    name={FIELD_BUSINESS_ADDRESS}
                    id={`${formId}.businessAddress`}
                    label={
                      <RequiredLabel>
                        <FormattedMessage
                          id={
                            soleTrader
                              ? 'BusinessDetailsForm.businessAddressLabel'
                              : 'BusinessDetailsForm.registeredOfficeLabel'
                          }
                        />
                      </RequiredLabel>
                    }
                    placeholder={intl.formatMessage({
                      id: 'BusinessDetailsForm.addressPlaceholder',
                    })}
                    useDefaultPredictions={false}
                    format={identity}
                    valueFromForm={values[FIELD_BUSINESS_ADDRESS]}
                  />
                  <p className={css.hint}>
                    <FormattedMessage id="BusinessDetailsForm.addressHint" />
                  </p>
                </div>

                {soleTrader ? (
                  <div className={css.field}>
                    <FieldTextInput
                      id={`${formId}.website`}
                      name={FIELD_WEBSITE}
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder={intl.formatMessage({
                        id: 'BusinessDetailsForm.websiteOrSocialPlaceholder',
                      })}
                      label={
                        <RequiredLabel>
                          <FormattedMessage id="BusinessDetailsForm.websiteOrSocialLabel" />
                        </RequiredLabel>
                      }
                    />
                    <p className={css.hint}>
                      <FormattedMessage id="BusinessDetailsForm.websiteOrSocialHint" />
                    </p>
                  </div>
                ) : null}

                <div className={css.field}>
                  <FieldTextInput
                    id={`${formId}.businessPhone`}
                    name={FIELD_BUSINESS_PHONE}
                    type="tel"
                    autoComplete="tel"
                    placeholder={intl.formatMessage({
                      id: 'BusinessDetailsForm.phonePlaceholder',
                    })}
                    label={
                      <RequiredLabel>
                        <FormattedMessage id="BusinessDetailsForm.phoneLabel" />
                      </RequiredLabel>
                    }
                  />
                  <p className={css.hint}>
                    <FormattedMessage id="BusinessDetailsForm.phoneHint" />
                  </p>
                </div>

                <FieldSelect
                  id={`${formId}.industry`}
                  name={FIELD_INDUSTRY}
                  label={
                    <OptionalLabel>
                      <FormattedMessage id="BusinessDetailsForm.industryLabel" />
                    </OptionalLabel>
                  }
                >
                  <option value="">
                    {intl.formatMessage({ id: 'BusinessDetailsForm.industryPlaceholder' })}
                  </option>
                  {industryOptions.map(o => (
                    <option key={o.option} value={o.option}>
                      {o.label}
                    </option>
                  ))}
                </FieldSelect>

                {soleTrader ? null : (
                  <FieldTextInput
                    id={`${formId}.website`}
                    name={FIELD_WEBSITE}
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    placeholder={intl.formatMessage({
                      id: 'BusinessDetailsForm.websitePlaceholder',
                    })}
                    label={
                      <OptionalLabel>
                        <FormattedMessage id="BusinessDetailsForm.websiteLabel" />
                      </OptionalLabel>
                    }
                  />
                )}
              </div>

              {saveError ? (
                <p className={css.error} role="alert">
                  <FormattedMessage id="BusinessDetailsForm.saveFailed" />
                </p>
              ) : null}

              <div className={css.actions}>
                <Button
                  className={css.submitButton}
                  type="submit"
                  inProgress={inProgress}
                  disabled={submitDisabled}
                >
                  <FormattedMessage id="BusinessDetailsForm.submit" />
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    />
  );
};

export default BusinessDetailsForm;
