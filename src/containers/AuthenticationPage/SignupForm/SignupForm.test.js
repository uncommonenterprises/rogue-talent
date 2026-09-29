import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';
import { fakeIntl } from '../../../util/testData';
import {
  userTypes as rogueUserTypes,
  userFields as rogueUserFields,
} from '../../../config/configUser';

import TermsAndConditions from '../TermsAndConditions/TermsAndConditions';
import SignupForm from './SignupForm';

const { screen, fireEvent, userEvent } = testingLibrary;

const noop = () => null;

const userTypes = [
  {
    userType: 'a',
    label: 'Seller',
  },
  {
    userType: 'b',
    label: 'Buyer',
  },
  {
    userType: 'c',
    label: 'Guest',
  },
  {
    userType: 'd',
    label: 'Host',
  },
];

const userFields = [
  {
    key: 'enumField1',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'o1', label: 'l1' },
      { option: 'o2', label: 'l2' },
      { option: 'o3', label: 'l3' },
    ],
    saveConfig: {
      label: 'Enum Field 1',
      displayInSignUp: true,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
    },
  },
  {
    key: 'enumField2',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'o1', label: 'l1' },
      { option: 'o2', label: 'l2' },
      { option: 'o3', label: 'l3' },
    ],
    saveConfig: {
      label: 'Enum Field 2',
      displayInSignUp: true,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: true,
      userTypeIds: ['c', 'd'],
    },
  },
  {
    key: 'textField',
    scope: 'private',
    schemaType: 'text',
    saveConfig: {
      label: 'Text Field',
      displayInSignUp: true,
      isRequired: true,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
    },
  },
  {
    key: 'booleanField',
    scope: 'protected',
    schemaType: 'boolean',
    saveConfig: {
      label: 'Boolean Field',
      displayInSignUp: false,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
    },
  },
];

const AGE_LABEL = 'AuthenticationPage.ageConfirmationLabel';
const TERMS_LABEL = /AuthenticationPage.termsAndConditionsAcceptText/i;

// Fill in the default (email sign-up) fields. Labels carry a required asterisk, hence regexes.
const fillDefaultFields = async user => {
  await user.type(screen.getByRole('textbox', { name: /SignupForm.firstNameLabel/ }), 'Joe');
  await user.type(screen.getByRole('textbox', { name: /SignupForm.lastNameLabel/ }), 'Dunphy');
  await user.type(
    screen.getByRole('textbox', { name: /SignupForm.emailLabel/ }),
    'joe@example.com'
  );
  await user.type(screen.getByLabelText(/SignupForm.passwordLabel/), 'secret-password');
};

describe('SignupForm', () => {
  // Terms and conditions component passed in as props
  const termsAndConditions = (
    <TermsAndConditions onOpenTermsOfService={noop} onOpenPrivacyPolicy={noop} intl={fakeIntl} />
  );

  // // If snapshot testing is preferred, this could be used
  // // However, this form starts to be too big DOM structure to be snapshot tested nicely
  // it('matches snapshot', () => {
  //   const tree = render(
  //     <SignupForm intl={fakeIntl} termsAndConditions={termsAndConditions} onSubmit={noop} />
  //   );
  //   expect(tree.asFragment()).toMatchSnapshot();
  // });

  it('enables Sign up button when required fields are filled', async () => {
    const user = userEvent.setup();
    render(
      <SignupForm
        intl={fakeIntl}
        termsAndConditions={termsAndConditions}
        userTypes={userTypes}
        userFields={userFields}
        preselectedUserType="a"
        onSubmit={noop}
      />
    );

    // Test that sign up button is disabled at first
    expect(screen.getByRole('button', { name: 'SignupForm.signUp' })).toBeDisabled();

    // Type the values to the sign up form
    await fillDefaultFields(user);
    await user.type(screen.getByLabelText(/Text Field/), 'Text value');

    // Test that sign up button is still disabled before clicking the checkboxes
    expect(screen.getByRole('button', { name: 'SignupForm.signUp' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(AGE_LABEL));
    fireEvent.click(screen.getByLabelText(TERMS_LABEL));

    // Test that sign up button is enabled after typing the values
    expect(screen.getByRole('button', { name: 'SignupForm.signUp' })).toBeEnabled();
  });

  it('shows custom user fields according to configuration', () => {
    render(
      <SignupForm
        intl={fakeIntl}
        termsAndConditions={termsAndConditions}
        userTypes={userTypes}
        userFields={userFields}
        preselectedUserType="a"
        onSubmit={noop}
      />
    );

    // Show user fields that have not been limited to type and have displayInSignUp: true
    expect(screen.getByText(/Enum Field 1/)).toBeInTheDocument();
    expect(screen.getByText(/Text Field/)).toBeInTheDocument();

    // Don't show user fields that have displayInSignUp: false
    expect(screen.queryByText(/Boolean Field/)).toBeNull();

    // Don't show user fields that are limited to other user types
    expect(screen.queryByText(/Enum Field 2/)).toBeNull();
  });
});

describe('SignupForm - Rogue Talent sign-up (stage 1)', () => {
  const termsAndConditions = (
    <TermsAndConditions onOpenTermsOfService={noop} onOpenPrivacyPolicy={noop} intl={fakeIntl} />
  );

  const renderForRole = (userType, fields = rogueUserFields, onSubmit = noop) =>
    render(
      <SignupForm
        intl={fakeIntl}
        termsAndConditions={termsAndConditions}
        userTypes={rogueUserTypes}
        userFields={fields}
        preselectedUserType={userType}
        onSubmit={onSubmit}
      />
    );

  it('requires the "I confirm I\'m 18 or over" tick box, separately from the terms', async () => {
    const user = userEvent.setup();
    renderForRole('model');
    const submit = screen.getByRole('button', { name: 'SignupForm.signUpModel' });

    await fillDefaultFields(user);

    // Terms alone is not enough
    fireEvent.click(screen.getByLabelText(TERMS_LABEL));
    expect(submit).toBeDisabled();

    // Ticking and unticking the age box shows its own validation message
    const ageCheckbox = screen.getByLabelText(AGE_LABEL);
    fireEvent.click(ageCheckbox);
    expect(submit).toBeEnabled();
    fireEvent.click(ageCheckbox);
    expect(submit).toBeDisabled();
    expect(screen.getByText('AuthenticationPage.ageConfirmationRequired')).toBeInTheDocument();
  });

  it('submits the ticked age confirmation', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderForRole('model', rogueUserFields, onSubmit);

    await fillDefaultFields(user);
    fireEvent.click(screen.getByLabelText(AGE_LABEL));
    fireEvent.click(screen.getByLabelText(TERMS_LABEL));
    await user.click(screen.getByRole('button', { name: 'SignupForm.signUpModel' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values.ageConfirmation).toEqual(['confirmed-18-plus']);
    expect(values.date_of_birth).toBeUndefined();
  });

  it('does not render a phone number field at sign-up for either role', () => {
    const { unmount } = renderForRole('model');
    expect(screen.queryByLabelText(/SignupForm.phoneNumberLabel/)).not.toBeInTheDocument();
    unmount();

    renderForRole('client');
    expect(screen.queryByLabelText(/SignupForm.phoneNumberLabel/)).not.toBeInTheDocument();
    // Company name stays on the sign-up form
    expect(screen.getByLabelText(/Company\/Agency name/)).toBeInTheDocument();
  });

  it('asks clients only for the company name: registration number and business details come later', () => {
    renderForRole('client');
    // Company name is required at sign-up (sign-up stage 3)
    expect(screen.getByLabelText(/Company\/Agency name/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Company\/Agency name/, { selector: 'input' })
    ).toBeInTheDocument();
    // Moved to "Your business details" (screen 18)
    expect(screen.queryByLabelText(/Company registration number/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Business phone number/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Business address/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Business type/)).not.toBeInTheDocument();
    // Removed (Neil, 29/09/2026)
    expect(screen.queryByText(/VAT number/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Typical project types/)).not.toBeInTheDocument();
  });

  it('does not render date of birth at sign-up, even if a field config asks for it', () => {
    // Worst case: a (hosted or code) config that shows date_of_birth at sign-up.
    const fieldsWithDobInSignup = rogueUserFields.map(f =>
      f.key === 'date_of_birth'
        ? { ...f, saveConfig: { ...f.saveConfig, displayInSignUp: true, isRequired: true } }
        : f
    );
    const { container } = renderForRole('model', fieldsWithDobInSignup);

    expect(screen.queryByText(/Date of birth/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/SignupForm.dateOfBirthLabel/)).not.toBeInTheDocument();
    expect(container.querySelector('input[type="date"]')).toBeNull();
    expect(container.querySelector('[name="date_of_birth"]')).toBeNull();
    expect(container.querySelector('[name="priv_date_of_birth"]')).toBeNull();
  });
});
