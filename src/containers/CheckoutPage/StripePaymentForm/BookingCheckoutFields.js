import React from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import * as validators from '../../../util/validators';

import {
  CustomExtendedDataField,
  FieldSelect,
  FieldTextInput,
  NamedLink,
  Notice,
  ValidationError,
} from '../../../components';

import css from './BookingCheckout.module.css';

const SHOOT_TYPE = 'shoot_type';
const SHOOT_DESCRIPTION = 'shoot_description';
const LOCATION_TYPE = 'location_type';
const SHOOT_ADDRESS = 'shoot_address';
const PRIVATE_RESIDENCE = 'private-residence';
const KNOWN_KEYS = [SHOOT_TYPE, SHOOT_DESCRIPTION, LOCATION_TYPE, SHOOT_ADDRESS];

const hasMessage = (intl, id) =>
  !!intl?.messages && Object.prototype.hasOwnProperty.call(intl.messages, id);

/**
 * Numbered section heading (B06): ink circle + Bricolage title.
 */
export const SectionHead = ({ number, titleId, id }) => (
  <div className={css.sectionHead}>
    <span className={css.sectionNumber} aria-hidden="true">
      {number}
    </span>
    <h2 className={css.sectionTitle} id={id}>
      <FormattedMessage id={titleId} />
    </h2>
  </div>
);

/**
 * Location type as a radio list (B06): "Private residence" is a visible, deliberate choice.
 */
const LocationTypeField = props => {
  const { name, options, formId, label, validate } = props;
  const intl = useIntl();
  return (
    <fieldset className={css.fieldset}>
      <legend className={css.label}>{label}</legend>
      <div className={css.radioList} role="radiogroup">
        {options.map(o => {
          const labelId = `BookingCheckout.locationType.${o.option}`;
          const optionLabel = hasMessage(intl, labelId)
            ? intl.formatMessage({ id: labelId })
            : o.label;
          const id = `${formId}.${name}.${o.option}`;
          return (
            <Field key={o.option} name={name} type="radio" value={o.option} validate={validate}>
              {({ input }) => (
                <label
                  htmlFor={id}
                  className={classNames(css.radioCard, { [css.radioCardChecked]: input.checked })}
                >
                  <input id={id} className={css.radioInput} {...input} />
                  <span className={css.radioCircle} aria-hidden="true" />
                  <span>{optionLabel}</span>
                </label>
              )}
            </Field>
          );
        })}
      </div>
      <Field name={name} subscription={{ touched: true, error: true }}>
        {({ meta }) => <ValidationError fieldMeta={meta} />}
      </Field>
    </fieldset>
  );
};

/**
 * Section 1, "Shoot details" (B06): the dates (read-only, with Change), shoot type, what is being
 * shot, where (radio list, with the private-residence note), the address, and an optional note.
 * Any transaction field the design does not know about is still rendered, generically.
 *
 * @component
 */
export const ShootDetailsSection = props => {
  const intl = useIntl();
  const {
    formId,
    modelName,
    datesLabel,
    dayCountLabel,
    listingLinkParams,
    transactionFieldsProps = [],
    showTransactionFields,
    showInitialMessageInput,
    values = {},
  } = props;

  const byKey = key => transactionFieldsProps.find(p => p.fieldConfig?.key === key);
  const shootType = byKey(SHOOT_TYPE);
  const description = byKey(SHOOT_DESCRIPTION);
  const locationType = byKey(LOCATION_TYPE);
  const address = byKey(SHOOT_ADDRESS);
  const others = transactionFieldsProps.filter(p => !KNOWN_KEYS.includes(p.fieldConfig?.key));
  const isPrivateResidence = locationType && values[locationType.name] === PRIVATE_RESIDENCE;
  const required = (id, vals) => validators.required(intl.formatMessage({ id }, vals));
  const requiredLabel = (id, vals) => (
    <>
      <FormattedMessage id={id} values={vals} /> <span className={css.req}>*</span>
    </>
  );

  return (
    <section className={css.section} aria-labelledby={`${formId}-shoot`}>
      <SectionHead number={1} titleId="BookingCheckout.shootTitle" id={`${formId}-shoot`} />
      <p className={css.lede}>
        <FormattedMessage id="BookingCheckout.shootLede" values={{ name: modelName }} />
      </p>

      {datesLabel ? (
        <div className={css.fixedRow}>
          <div className={css.fixedRowMain}>
            <b>{datesLabel}</b>
            {dayCountLabel ? <span>{dayCountLabel}</span> : null}
          </div>
          {listingLinkParams ? (
            <NamedLink name="ListingPage" params={listingLinkParams} className={css.ghostLink}>
              <FormattedMessage id="BookingCheckout.changeDates" />
            </NamedLink>
          ) : null}
        </div>
      ) : null}

      {showTransactionFields && shootType ? (
        <FieldSelect
          rootClassName={css.fieldRoot}
          id={`${formId}.${shootType.name}`}
          name={shootType.name}
          className={css.field}
          label={requiredLabel('BookingCheckout.shootTypeLabel')}
          validate={required('BookingCheckout.shootTypeRequired')}
        >
          <option value="" disabled>
            {intl.formatMessage({ id: 'BookingCheckout.shootTypePlaceholder' })}
          </option>
          {(shootType.fieldConfig.enumOptions || []).map(o => (
            <option key={o.option} value={o.option}>
              {o.label}
            </option>
          ))}
        </FieldSelect>
      ) : null}

      {showTransactionFields && description ? (
        <div className={css.field}>
          <FieldTextInput
            rootClassName={css.fieldRoot}
            type="textarea"
            id={`${formId}.${description.name}`}
            name={description.name}
            label={requiredLabel('BookingCheckout.descriptionLabel')}
            placeholder={intl.formatMessage({ id: 'BookingCheckout.descriptionPlaceholder' })}
            validate={required('BookingCheckout.descriptionRequired', { name: modelName })}
          />
          <p className={css.hint}>
            <FormattedMessage id="BookingCheckout.descriptionHint" />
          </p>
        </div>
      ) : null}

      {showTransactionFields && locationType ? (
        <LocationTypeField
          name={locationType.name}
          formId={formId}
          options={locationType.fieldConfig.enumOptions || []}
          label={requiredLabel('BookingCheckout.locationTypeLabel')}
          validate={required('BookingCheckout.locationTypeRequired')}
        />
      ) : null}

      {isPrivateResidence ? (
        <Notice>
          <p>
            <FormattedMessage
              id="BookingCheckout.privateResidenceNote"
              values={{ name: modelName, strong: text => <strong>{text}</strong> }}
            />
          </p>
          <p>
            <FormattedMessage id="BookingCheckout.privateResidenceAddress" />
          </p>
        </Notice>
      ) : null}

      {showTransactionFields && address ? (
        <div className={css.field}>
          <FieldTextInput
            rootClassName={css.fieldRoot}
            type="text"
            id={`${formId}.${address.name}`}
            name={address.name}
            autoComplete="street-address"
            label={requiredLabel('BookingCheckout.addressLabel')}
            placeholder={intl.formatMessage({ id: 'BookingCheckout.addressPlaceholder' })}
            validate={required('BookingCheckout.addressRequired')}
          />
          <p className={css.hint}>
            <FormattedMessage id="BookingCheckout.addressHint" values={{ name: modelName }} />
          </p>
        </div>
      ) : null}

      {showTransactionFields
        ? others.map(({ key, ...fieldProps }) => (
            <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
          ))
        : null}

      {showInitialMessageInput ? (
        <FieldTextInput
          rootClassName={css.fieldRoot}
          type="textarea"
          id={`${formId}-message`}
          name="initialMessage"
          className={css.field}
          label={
            <>
              <FormattedMessage id="BookingCheckout.messageLabel" values={{ name: modelName }} />{' '}
              <span className={css.opt}>
                <FormattedMessage id="StripePaymentForm.messageOptionalText" />
              </span>
            </>
          }
          placeholder={intl.formatMessage({ id: 'StripePaymentForm.messagePlaceholder' })}
        />
      ) : null}
    </section>
  );
};

/**
 * "What happens next" (B06 summary). The cancellation line is held until the Terms are
 * rewritten to the two-tier policy (open question 8).
 */
export const WhatHappensNext = ({ modelName }) => (
  <ol className={css.nextList}>
    <li>
      <span>
        <FormattedMessage
          id="BookingCheckout.next1"
          values={{ name: modelName, strong: text => <strong>{text}</strong> }}
        />
      </span>
    </li>
    <li>
      <span>
        <FormattedMessage
          id="BookingCheckout.next2"
          values={{ name: modelName, strong: text => <strong>{text}</strong> }}
        />
      </span>
    </li>
  </ol>
);
