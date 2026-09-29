import {
  AGE_CONFIRMATION_OPTION,
  getAgeConfirmationData,
  getHandleSubmitConfirm,
  getHandleSubmitSignup,
  omitSignupHiddenUserFields,
} from './AuthenticationPage.helpers';

const userTypes = [{ userType: 'model' }, { userType: 'client' }];
const userFields = [
  {
    key: 'company_name',
    scope: 'public',
    schemaType: 'shortText',
    userTypeConfig: { limitToUserTypeIds: true, userTypeIds: ['client'] },
    saveConfig: { displayInSignUp: true, isRequired: false },
  },
];

describe('AuthenticationPage.helpers - 18+ confirmation (RT-FB-03)', () => {
  it('getAgeConfirmationData returns an audit record only when the box is ticked', () => {
    const now = new Date('2026-09-29T10:15:00.000Z');
    expect(getAgeConfirmationData([AGE_CONFIRMATION_OPTION], now)).toEqual({
      ageConfirmed18Plus: true,
      ageConfirmed18PlusAt: '2026-09-29T10:15:00.000Z',
    });
    expect(getAgeConfirmationData([], now)).toEqual({});
    expect(getAgeConfirmationData(undefined, now)).toEqual({});
  });

  it('getHandleSubmitSignup saves the confirmation to protectedData', () => {
    const submitSignup = jest.fn();
    getHandleSubmitSignup({ submitSignup, userFields, userTypes })({
      userType: 'model',
      email: 'jane@example.com',
      password: 'secret-password',
      fname: ' Jane ',
      lname: 'Doe',
      ageConfirmation: [AGE_CONFIRMATION_OPTION],
      terms: ['tos-and-privacy'],
    });

    expect(submitSignup).toHaveBeenCalledTimes(1);
    const params = submitSignup.mock.calls[0][0];
    expect(params.firstName).toBe('Jane');
    expect(params.publicData.userType).toBe('model');
    expect(params.protectedData.ageConfirmed18Plus).toBe(true);
    expect(typeof params.protectedData.ageConfirmed18PlusAt).toBe('string');
    expect(new Date(params.protectedData.ageConfirmed18PlusAt).toISOString()).toBe(
      params.protectedData.ageConfirmed18PlusAt
    );
    // The raw tick box value is not stored alongside the audit record
    expect(params.protectedData.ageConfirmation).toBeUndefined();
    // No date of birth is collected at sign-up any more
    expect(params.protectedData.date_of_birth).toBeUndefined();
  });

  it('getHandleSubmitConfirm (SSO) saves the confirmation to protectedData', () => {
    const submitSingupWithIdp = jest.fn();
    getHandleSubmitConfirm({
      authInfo: {
        idpToken: 'token',
        idpId: 'google',
        email: 'alex@example.com',
        firstName: 'Alex',
        lastName: 'Chen',
      },
      submitSingupWithIdp,
      userFields,
      userTypes,
    })({
      userType: 'client',
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Chen',
      ageConfirmation: [AGE_CONFIRMATION_OPTION],
      terms: ['tos-and-privacy'],
    });

    const params = submitSingupWithIdp.mock.calls[0][0];
    expect(params.protectedData.ageConfirmed18Plus).toBe(true);
    expect(params.protectedData.ageConfirmation).toBeUndefined();
  });
});

describe('AuthenticationPage.helpers - fields hidden at sign-up', () => {
  it('omitSignupHiddenUserFields drops date_of_birth', () => {
    const picked = [
      { key: 'pub_company_name', fieldConfig: { key: 'company_name' } },
      { key: 'priv_date_of_birth', fieldConfig: { key: 'date_of_birth' } },
    ];
    expect(omitSignupHiddenUserFields(picked).map(p => p.key)).toEqual(['pub_company_name']);
  });
});
