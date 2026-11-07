import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import { ReviewProfilePageComponent } from './ReviewProfilePage';

const { screen, userEvent } = testingLibrary;

const clientProfile = (business = {}) => ({
  kind: 'client',
  userId: 'c1',
  status: { decision: null, waiting: true },
  submittedAt: '2026-11-01T17:42:00.000Z',
  overdue: true,
  resubmission: false,
  person: { name: 'Hannah Reeve', initials: 'HR' },
  business: {
    businessType: 'limited_company',
    companyName: 'Northlight Studio Ltd',
    companyNumber: '01234567',
    industry: 'fashion-brand',
    website: 'northlight.example',
    address: 'Unit 4, Mill Lane, Leeds',
    ...business,
  },
  identity: {
    status: 'not-started',
    verified18Plus: false,
    ageCheckFailed: false,
    declared18Plus: true,
  },
  transactionRights: 'denied',
  account: { createdAt: '2026-11-01T09:00:00.000Z', emailVerified: true },
});

const modelProfile = {
  kind: 'model',
  userId: 'm1',
  status: { decision: null, waiting: true },
  submittedAt: '2026-11-02T12:00:00.000Z',
  overdue: true,
  resubmission: false,
  stripe: { identity: 'verified', bank: 'in-progress' },
  listing: {
    id: 'l1',
    state: 'pendingApproval',
    title: 'Imogen Hart',
    price: { amount: 38000, currency: 'GBP' },
    publicData: {
      listingType: 'model-profile',
      height_cm: 175,
      location: { address: 'Manchester, UK' },
    },
    images: [],
  },
  author: { displayName: 'Imogen H', bio: null },
  account: { createdAt: '2026-11-01T09:00:00.000Z', emailVerified: true },
};

const renderPage = props =>
  render(
    <ReviewProfilePageComponent
      scrollingDisabled={false}
      fetchInProgress={false}
      params={{ userId: 'c1' }}
      onRetry={() => {}}
      onManageDisableScrolling={() => {}}
      {...props}
    />,
    { messages: enMessages }
  );

describe('ReviewProfilePage', () => {
  it('no access: the same plain page, nothing about the person', () => {
    renderPage({ profile: null, fetchError: { error: 'not-found', status: 404 } });
    expect(
      screen.getByRole('heading', { name: "You don't have access to this page" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Review/, { selector: 'h1,h2' })).toBeNull();
  });

  it('not waiting (unknown id, deleted, not submitted): R07 state 4', () => {
    renderPage({ profile: { kind: 'not-waiting' } });
    expect(
      screen.getByRole('heading', { name: "This isn't waiting for review" })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the queue' })).toHaveAttribute(
      'href',
      '/review'
    );
  });

  it('client: company facts, Companies House link, flags and booking rights', () => {
    renderPage({ profile: clientProfile() });
    expect(screen.getByRole('heading', { name: 'Hannah Reeve' })).toBeInTheDocument();
    expect(screen.getByText('01234567')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search Companies House' })).toHaveAttribute(
      'href',
      'https://find-and-update.company-information.service.gov.uk/search/companies?q=01234567'
    );
    expect(screen.getByText('Registered office')).toBeInTheDocument();
    expect(screen.getByText('Cannot book yet')).toBeInTheDocument();
    expect(screen.getByText('18+ from ID check')).toBeInTheDocument();
    expect(screen.getByText('Company number found on Companies House')).toBeInTheDocument();
  });

  it('sole trader: no Companies House check, sole-trader checklist', () => {
    renderPage({ profile: clientProfile({ businessType: 'sole_trader', companyNumber: null }) });
    expect(screen.getByText('Not applicable')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Search Companies House' })).toBeNull();
    expect(screen.getByText('Website or social link shows a real business')).toBeInTheDocument();
  });

  it('under-18 ID result is shown as a warning', () => {
    const profile = clientProfile();
    profile.identity.ageCheckFailed = true;
    renderPage({ profile });
    expect(screen.getByRole('alert')).toHaveTextContent('under 18');
  });

  it('checklist ticks locally; Approve and Decline stay disabled in stage 1', async () => {
    const user = userEvent.setup();
    renderPage({ profile: clientProfile() });
    const approve = screen.getByRole('button', { name: 'Approve client' });
    const decline = screen.getByRole('button', { name: 'Decline' });
    expect(approve).toBeDisabled();
    expect(decline).toBeDisabled();
    expect(screen.getByText(/come in the next stage/)).toBeInTheDocument();
    await user.click(screen.getByLabelText('Company name matches what they entered'));
    expect(screen.getByText('1 of 5 checked')).toBeInTheDocument();
    expect(approve).toBeDisabled();
  });

  it('model: profile as clients see it, with the review panel and Stripe checks', () => {
    renderPage({ profile: modelProfile, params: { userId: 'm1' } });
    expect(screen.getByRole('heading', { name: 'Imogen Hart', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/as clients will see it/)).toBeInTheDocument();
    expect(screen.getAllByText('Pending approval').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In progress').length).toBeGreaterThan(0);
    expect(screen.getByText('No nudity in photos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve profile' })).toBeDisabled();
    // Reviews and "Checked before going live" are left out of the reviewer view.
    expect(screen.queryByText(enMessages['ListingPage.checkedTitle'])).toBeNull();
  });

  it('already decided: says so and hides the checklist', () => {
    renderPage({
      profile: { ...clientProfile(), status: { decision: 'approved', waiting: false } },
    });
    expect(screen.getByText(/Already decided: approved/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve client' })).toBeNull();
  });
});
