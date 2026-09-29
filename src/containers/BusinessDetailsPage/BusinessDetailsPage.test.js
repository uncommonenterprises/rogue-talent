import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import {
  FIELD_BUSINESS_TYPE,
  FIELD_COMPANY_NAME,
  FIELD_REGISTRATION_NUMBER,
  FIELD_BUSINESS_ADDRESS,
  FIELD_BUSINESS_PHONE,
  FIELD_INDUSTRY,
  FIELD_WEBSITE,
  getRequiredFields,
  validateBusinessDetails,
  getInitialValues,
  getBusinessDetailsPayload,
  isValidPhone,
} from './BusinessDetailsPage.helpers';
import { getAfterSubmitRouteName } from './BusinessDetailsPage';
import BusinessDetailsForm from './BusinessDetailsForm/BusinessDetailsForm';

const { screen, userEvent } = testingLibrary;

const LTD = 'limited_company';
const SOLE = 'sole_trader';

const address = text => ({ search: text, predictions: [], selectedPlace: { address: text } });

const messages = {
  [FIELD_BUSINESS_TYPE]: 'type required',
  [FIELD_COMPANY_NAME]: 'name required',
  [FIELD_REGISTRATION_NUMBER]: 'crn required',
  [FIELD_BUSINESS_ADDRESS]: 'address required',
  [FIELD_BUSINESS_PHONE]: 'phone required',
  [FIELD_WEBSITE]: 'website required',
  addressNotChosen: 'choose an address',
  phoneInvalid: 'phone invalid',
};

const completeLtd = {
  [FIELD_BUSINESS_TYPE]: LTD,
  [FIELD_COMPANY_NAME]: ' Northside Studio ',
  [FIELD_REGISTRATION_NUMBER]: '12345678',
  [FIELD_BUSINESS_ADDRESS]: address('1 High Street, London'),
  [FIELD_BUSINESS_PHONE]: '020 7946 0000',
  [FIELD_INDUSTRY]: 'photography',
  [FIELD_WEBSITE]: '',
};

const completeSole = {
  [FIELD_BUSINESS_TYPE]: SOLE,
  [FIELD_COMPANY_NAME]: 'Alex Chen Photography',
  [FIELD_REGISTRATION_NUMBER]: '87654321', // left over from choosing "Limited company" first
  [FIELD_BUSINESS_ADDRESS]: address('2 Low Road, Leeds'),
  [FIELD_BUSINESS_PHONE]: '07700 900000',
  [FIELD_INDUSTRY]: '',
  [FIELD_WEBSITE]: 'instagram.com/alexchenphoto',
};

describe('BusinessDetailsPage: business type switches the required fields (screen 18)', () => {
  it('limited company: registration number required, website optional', () => {
    const required = getRequiredFields(LTD);
    expect(required).toContain(FIELD_REGISTRATION_NUMBER);
    expect(required).not.toContain(FIELD_WEBSITE);
    expect(required).toEqual(
      expect.arrayContaining([FIELD_COMPANY_NAME, FIELD_BUSINESS_ADDRESS, FIELD_BUSINESS_PHONE])
    );
  });

  it('sole trader: no registration number; website or social link required', () => {
    const required = getRequiredFields(SOLE);
    expect(required).not.toContain(FIELD_REGISTRATION_NUMBER);
    expect(required).toContain(FIELD_WEBSITE);
    expect(required).toEqual(
      expect.arrayContaining([FIELD_COMPANY_NAME, FIELD_BUSINESS_ADDRESS, FIELD_BUSINESS_PHONE])
    );
  });

  it('validation follows the business type', () => {
    expect(validateBusinessDetails(completeLtd, messages)).toEqual({});
    expect(validateBusinessDetails(completeSole, messages)).toEqual({});

    const ltdWithoutCrn = { ...completeLtd, [FIELD_REGISTRATION_NUMBER]: ' ' };
    expect(validateBusinessDetails(ltdWithoutCrn, messages)).toEqual({
      [FIELD_REGISTRATION_NUMBER]: 'crn required',
    });
    // The same values are fine for a sole trader, who instead needs the website/social link.
    const soleWithoutWebsite = { ...ltdWithoutCrn, [FIELD_BUSINESS_TYPE]: SOLE };
    expect(validateBusinessDetails(soleWithoutWebsite, messages)).toEqual({
      [FIELD_WEBSITE]: 'website required',
    });
  });

  it('an address must be chosen from the suggestions, not just typed', () => {
    const typedOnly = {
      ...completeLtd,
      [FIELD_BUSINESS_ADDRESS]: { search: '1 High St', predictions: [], selectedPlace: null },
    };
    expect(validateBusinessDetails(typedOnly, messages)).toEqual({
      [FIELD_BUSINESS_ADDRESS]: 'choose an address',
    });
    const empty = { ...completeLtd, [FIELD_BUSINESS_ADDRESS]: null };
    expect(validateBusinessDetails(empty, messages)).toEqual({
      [FIELD_BUSINESS_ADDRESS]: 'address required',
    });
  });

  it('checks the phone number lightly', () => {
    expect(isValidPhone('020 7946 0000')).toBe(true);
    expect(isValidPhone('+44 (0)7700-900000')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('call me')).toBe(false);
    const badPhone = { ...completeLtd, [FIELD_BUSINESS_PHONE]: 'abc' };
    expect(validateBusinessDetails(badPhone, messages)).toEqual({
      [FIELD_BUSINESS_PHONE]: 'phone invalid',
    });
  });
});

describe('BusinessDetailsPage: where the data is stored', () => {
  const now = new Date('2026-09-30T10:00:00.000Z');

  it('the business phone is only ever written to privateData, never public', () => {
    const submitted = getBusinessDetailsPayload(completeLtd, { submit: true, now });
    const saved = getBusinessDetailsPayload(completeLtd, { submit: false });
    [submitted, saved].forEach(payload => {
      expect(payload.privateData.business_phone).toEqual('020 7946 0000');
      expect(payload.publicData).not.toHaveProperty('business_phone');
      expect(payload.protectedData).not.toHaveProperty('business_phone');
      expect(JSON.stringify(payload.publicData)).not.toContain('7946');
    });
  });

  it('submit records the Gate A submission and writes each field to its scope', () => {
    expect(getBusinessDetailsPayload(completeLtd, { submit: true, now })).toEqual({
      publicData: {
        company_name: 'Northside Studio',
        company_registration_number: '12345678',
        industry: 'photography',
        client_website_url: null,
      },
      protectedData: { business_type: LTD },
      privateData: {
        business_address: '1 High Street, London',
        business_phone: '020 7946 0000',
        businessDetailsSubmittedAt: '2026-09-30T10:00:00.000Z',
      },
    });
  });

  it('a sole trader submission clears any registration number saved earlier', () => {
    const payload = getBusinessDetailsPayload(completeSole, { submit: true, now });
    expect(payload.publicData.company_registration_number).toBeNull();
    expect(payload.publicData.client_website_url).toEqual('instagram.com/alexchenphoto');
    expect(payload.protectedData.business_type).toEqual(SOLE);
  });

  it('"Save & exit" never submits and never wipes saved values with blanks', () => {
    const partial = {
      [FIELD_BUSINESS_TYPE]: LTD,
      [FIELD_COMPANY_NAME]: 'Northside Studio',
      [FIELD_REGISTRATION_NUMBER]: '',
      [FIELD_BUSINESS_ADDRESS]: null,
      [FIELD_BUSINESS_PHONE]: '',
      [FIELD_INDUSTRY]: '',
      [FIELD_WEBSITE]: '',
    };
    expect(getBusinessDetailsPayload(partial, { submit: false })).toEqual({
      publicData: { company_name: 'Northside Studio' },
      protectedData: { business_type: LTD },
      privateData: {},
    });
  });

  it('pre-fills from sign-up and from anything saved before', () => {
    const currentUser = {
      id: { uuid: 'u1' },
      attributes: {
        profile: {
          publicData: { userType: 'client', company_name: 'Northside Studio' },
          protectedData: { business_type: SOLE },
          privateData: { business_address: '2 Low Road, Leeds', business_phone: '07700 900000' },
        },
      },
    };
    const values = getInitialValues(currentUser);
    expect(values[FIELD_COMPANY_NAME]).toEqual('Northside Studio');
    expect(values[FIELD_BUSINESS_TYPE]).toEqual(SOLE);
    expect(values[FIELD_BUSINESS_ADDRESS].selectedPlace.address).toEqual('2 Low Road, Leeds');
    expect(values[FIELD_BUSINESS_PHONE]).toEqual('07700 900000');
    // Defaults to limited company when nothing is saved yet.
    expect(getInitialValues({ attributes: { profile: {} } })[FIELD_BUSINESS_TYPE]).toEqual(LTD);
  });

  it('after submitting, goes to the account-status page only when the lifecycle is on', () => {
    expect(getAfterSubmitRouteName(true)).toEqual('AccountStatusPage');
    expect(getAfterSubmitRouteName(false)).toEqual('SearchPage');
  });
});

describe('BusinessDetailsForm', () => {
  const industryOptions = [{ option: 'photography', label: 'Photography' }];

  it('switching to sole trader swaps the registration number for a website or social link', async () => {
    const user = userEvent.setup();
    render(
      <BusinessDetailsForm
        initialValues={{
          [FIELD_BUSINESS_TYPE]: LTD,
          [FIELD_COMPANY_NAME]: 'Northside Studio',
          [FIELD_BUSINESS_ADDRESS]: null,
        }}
        onSubmit={() => {}}
        onSaveAndExit={() => {}}
        industryOptions={industryOptions}
      />
    );

    expect(
      screen.getByLabelText(/BusinessDetailsForm.registrationNumberLabel/)
    ).toBeInTheDocument();
    expect(screen.getByText('BusinessDetailsForm.companyNameHint')).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/BusinessDetailsForm.websiteOrSocialLabel/)
    ).not.toBeInTheDocument();
    expect(screen.getByText('BusinessDetailsForm.registeredOfficeLabel')).toBeInTheDocument();
    expect(screen.getByText('BusinessDetailsForm.submit')).toBeInTheDocument();

    await user.click(screen.getByLabelText('BusinessDetailsForm.businessTypeSoleTrader'));

    expect(
      screen.queryByLabelText(/BusinessDetailsForm.registrationNumberLabel/)
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/BusinessDetailsForm.tradingNameLabel/)).toHaveValue(
      'Northside Studio'
    );
    expect(screen.getByText('BusinessDetailsForm.tradingNameHint')).toBeInTheDocument();
    expect(screen.getByLabelText(/BusinessDetailsForm.websiteOrSocialLabel/)).toBeInTheDocument();
    expect(screen.getByText('BusinessDetailsForm.businessAddressLabel')).toBeInTheDocument();
  });

  it('never shows VAT number or typical project types (real copy)', () => {
    render(
      <BusinessDetailsForm
        initialValues={{ [FIELD_BUSINESS_TYPE]: LTD }}
        onSubmit={() => {}}
        onSaveAndExit={() => {}}
        industryOptions={industryOptions}
      />,
      { messages: enMessages }
    );
    expect(screen.getByText('Tell us about your business')).toBeInTheDocument();
    expect(screen.queryByText(/VAT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/project types/i)).not.toBeInTheDocument();
  });

  it('"Save & exit" hands over the current values without validating', async () => {
    const user = userEvent.setup();
    const onSaveAndExit = jest.fn();
    render(
      <BusinessDetailsForm
        initialValues={{ [FIELD_BUSINESS_TYPE]: LTD, [FIELD_COMPANY_NAME]: 'Northside' }}
        onSubmit={() => {}}
        onSaveAndExit={onSaveAndExit}
        industryOptions={industryOptions}
      />
    );
    await user.click(screen.getByText('BusinessDetailsForm.saveAndExit'));
    expect(onSaveAndExit).toHaveBeenCalledWith(
      expect.objectContaining({ [FIELD_COMPANY_NAME]: 'Northside' })
    );
  });
});
