import React, { act } from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { fakeIntl } from '../../util/testData';

import AuthenticationPage from './AuthenticationPage';

const { screen, waitFor, userEvent } = testingLibrary;

const noop = () => null;

const props = {
  tab: 'login',
  isAuthenticated: false,
  authInProgress: false,
  scrollingDisabled: false,
  onLogout: noop,
  onManageDisableScrolling: noop,
  onResendVerificationEmail: noop,
  submitLogin: noop,
  submitSignup: noop,
  sendVerificationEmailInProgress: false,

  location: { state: { from: '/protected' } },

  intl: fakeIntl,
};

describe('AuthenticationPage', () => {
  beforeEach(() => {
    // This is not defined by default on test env. AuthenticationPage needs it.
    window.scrollTo = jest.fn();

    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });
  });

  afterAll(() => {
    // Remove window.scrollTo
    jest.clearAllMocks();
  });

  it('has just email and password inputs in login tab if social logins are not enabled', async () => {
    // We want to make sure that during the test the env variables
    // for social logins are as we expect them to be
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });

    await act(async () => {
      render(<AuthenticationPage {...props} />);
    });

    expect(screen.getByRole('textbox', { name: 'LoginForm.emailLabel' })).toBeInTheDocument();
    expect(screen.getByLabelText('LoginForm.passwordLabel')).toBeInTheDocument();

    // The standard getBy methods throw an error when they can't find an element,
    // so if you want to make an assertion that an element is not present in the DOM,
    // you can use queryBy APIs instead:
    expect(
      screen.queryByRole('button', { name: 'AuthenticationPage.loginWithFacebook' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'AuthenticationPage.loginWithGoogle' })
    ).not.toBeInTheDocument();
  });

  it('changes the login form to sign up form by clicking "Sign up" ', async () => {
    // We want to make sure that during the test the env variables
    // for social logins are as we expect them to be
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });
    const user = userEvent.setup();

    render(<AuthenticationPage {...props} />);

    // First we can check that login button is in the document
    expect(screen.getByRole('button', { name: 'LoginForm.logIn' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'AuthenticationPage.signupLinkText' }));

    // Then we can check that login sign up button is in the document
    waitFor(() =>
      expect(screen.findByRole('button', { name: 'SignupForm.signUp' })).toBeInTheDocument()
    );
  });
});

describe('AuthenticationPage sign-up journey (stage 1)', () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('shows the two role cards instead of a user type dropdown on /signup', () => {
    render(<AuthenticationPage {...props} tab="signup" location={{ state: {} }} params={{}} />);

    expect(screen.getByRole('heading', { name: 'ChooseRole.title' })).toBeInTheDocument();
    const modelCard = screen.getByRole('heading', { name: 'ChooseRole.model.title' }).closest('a');
    const clientCard = screen
      .getByRole('heading', { name: 'ChooseRole.client.title' })
      .closest('a');
    expect(modelCard).toHaveAttribute('href', '/signup/model');
    expect(clientCard).toHaveAttribute('href', '/signup/client');

    // No user type dropdown and no sign-up form until a role is chosen
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('SignupForm.passwordLabel')).not.toBeInTheDocument();
  });

  it('asks a user with no session to "Log in to finish verifying" (screen 05, State B)', () => {
    render(
      <AuthenticationPage {...props} location={{ state: { from: '/verify-email?t=abc123' } }} />
    );

    expect(
      screen.getByRole('heading', { name: 'AuthenticationPage.verifyLoginTitle' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'AuthenticationPage.verifyLoginSubmit' })
    ).toBeInTheDocument();
    // A normal email + password login: the email is never pre-filled from the URL
    expect(screen.getByRole('textbox', { name: 'LoginForm.emailLabel' })).toHaveValue('');
  });

  it('shows the normal log in heading otherwise', () => {
    render(<AuthenticationPage {...props} />);
    expect(
      screen.getByRole('heading', { name: 'AuthenticationPage.loginTitle' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'AuthenticationPage.verifyLoginTitle' })
    ).not.toBeInTheDocument();
  });
});

describe('AuthenticationPage with SSO', () => {
  beforeEach(() => {
    // This is not defined by default on test env. AuthenticationPage needs it.
    window.scrollTo = jest.fn();
  });

  afterAll(() => {
    // Remove window.scrollTo
    jest.clearAllMocks();
  });

  it('has social login buttons on login tab when the env variables are in place', () => {
    // We want to make sure that during the test the env variables
    // for social logins are as we expect them to be
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: 'test-fb' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: 'test-google' });

    render(<AuthenticationPage {...props} />);

    expect(
      screen.getByRole('button', { name: 'AuthenticationPage.loginWithFacebook' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'AuthenticationPage.loginWithGoogle' })
    ).toBeInTheDocument();
  });
});
