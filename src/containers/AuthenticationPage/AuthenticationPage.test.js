import React, { act } from 'react';
import '@testing-library/jest-dom';
import { Route } from 'react-router-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { createCurrentUser, createOwnListing, fakeIntl } from '../../util/testData';
import {
  LISTING_STATE_DRAFT,
  LISTING_STATE_PENDING_APPROVAL,
  LISTING_STATE_PUBLISHED,
} from '../../util/types';

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

// Run-through 01/11/2026, finding 1: a logged-in model who opens /signup must go to their
// existing profile, never a blank new one.
describe('AuthenticationPage: a logged-in model visiting /signup', () => {
  const originalFlag = process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED;

  beforeEach(() => {
    window.scrollTo = jest.fn();
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });
  });

  afterEach(() => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = originalFlag;
  });

  const model = () => {
    const user = createCurrentUser('model-1');
    return {
      ...user,
      attributes: {
        ...user.attributes,
        profile: { ...user.attributes.profile, publicData: { userType: 'model' } },
      },
    };
  };

  const LocationProbe = () => (
    <Route render={({ location }) => <p data-testid="location">{location.pathname}</p>} />
  );

  const renderSignup = (profileListing, { fetched = true, inProgress = false } = {}) =>
    render(
      <>
        <AuthenticationPage {...props} tab="signup" location={{ state: {} }} params={{}} />
        <LocationProbe />
      </>,
      {
        initialState: {
          auth: { isAuthenticated: true },
          user: {
            currentUser: model(),
            currentUserProfileListing: profileListing,
            currentUserProfileListingFetched: fetched,
            currentUserProfileListingInProgress: inProgress,
          },
        },
      }
    );

  it('no listing: goes to create a new profile', () => {
    renderSignup(null);
    expect(screen.getByTestId('location')).toHaveTextContent('/l/new');
  });

  it('draft: goes back to that draft', () => {
    const draft = createOwnListing('draft-1', { state: LISTING_STATE_DRAFT, title: 'Ava C' });
    renderSignup(draft);
    expect(screen.getByTestId('location').textContent).toMatch(/^\/l\/ava-c\/draft-1\/draft\//);
  });

  it('submitted: goes to account status with the flag on', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'true';
    renderSignup(createOwnListing('l1', { state: LISTING_STATE_PENDING_APPROVAL }));
    expect(screen.getByTestId('location')).toHaveTextContent('/account-status');
  });

  it('published: goes to the Your profile dashboard with the flag off', () => {
    process.env.REACT_APP_ACCOUNT_STATUS_FLOW_ENABLED = 'false';
    renderSignup(createOwnListing('l1', { state: LISTING_STATE_PUBLISHED }));
    expect(screen.getByTestId('location')).toHaveTextContent('/listings');
  });

  it('waits rather than guessing while the listing is still being looked up', () => {
    renderSignup(null, { fetched: false });
    expect(screen.getByTestId('location').textContent).toBe('/');
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
