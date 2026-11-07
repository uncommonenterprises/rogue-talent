import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import { ReviewQueuePageComponent } from './ReviewQueuePage';

const { screen, userEvent } = testingLibrary;

const queue = {
  items: [
    {
      userId: 'm1',
      type: 'model',
      name: 'Chloe Whitaker',
      initials: 'CW',
      place: 'Leeds',
      submittedAt: '2026-10-30T12:00:00.000Z',
      overdue: true,
      verification: 'verified',
      resubmission: false,
      anomaly: null,
    },
    {
      userId: 'c1',
      type: 'client',
      name: 'Hannah Reeve',
      initials: 'HR',
      place: 'Northlight Studio Ltd',
      submittedAt: '2026-11-01T12:00:00.000Z',
      overdue: false,
      verification: 'not-started',
      resubmission: true,
      anomaly: null,
    },
  ],
  counts: { all: 2, models: 1, clients: 1 },
  recentlyDecided: [],
  recentlyDecidedAvailable: false,
};

const renderPage = props =>
  render(
    <ReviewQueuePageComponent
      scrollingDisabled={false}
      fetchInProgress={false}
      onRetry={() => {}}
      {...props}
    />,
    { messages: enMessages }
  );

describe('ReviewQueuePage', () => {
  it('shows only "You don\'t have access to this page" for the no-access response', () => {
    renderPage({ queue: null, fetchError: { error: 'not-found', status: 404 } });
    expect(
      screen.getByRole('heading', { name: "You don't have access to this page" })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toBeInTheDocument();
    expect(screen.queryByText('Review queue', { selector: 'h1' })).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('lists people oldest first with type, verification and resubmission', () => {
    renderPage({ queue });
    expect(screen.getByRole('heading', { name: 'Review queue' })).toBeInTheDocument();
    const links = screen
      .getAllByRole('link')
      .filter(a => a.getAttribute('href')?.startsWith('/review/'));
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/review/m1', '/review/c1']);
    expect(screen.getByText('Chloe Whitaker')).toBeInTheDocument();
    expect(screen.getByText('Northlight Studio Ltd')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('Resubmission')).toBeInTheDocument();
    expect(screen.getByText('30/10/2026')).toBeInTheDocument();
    // Only the overdue row (Chloe) carries the amber marker's screen-reader text.
    expect(screen.getAllByText(/\(waiting more than 1 working day\)/)).toHaveLength(1);
  });

  it('filters by tab, and Recently decided explains it comes in the next stage', async () => {
    const user = userEvent.setup();
    renderPage({ queue });
    await user.click(screen.getByRole('tab', { name: /Clients/ }));
    expect(screen.queryByText('Chloe Whitaker')).toBeNull();
    expect(screen.getByText('Hannah Reeve')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Recently decided/ }));
    expect(screen.getByText('Recently decided comes in the next stage')).toBeInTheDocument();
  });

  it('shows the empty state when nothing is waiting', () => {
    renderPage({ queue: { ...queue, items: [], counts: { all: 0, models: 0, clients: 0 } } });
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument();
  });

  it('offers a retry when busy', () => {
    renderPage({ queue: null, fetchError: { error: 'busy', status: 503 } });
    expect(screen.getByRole('alert')).toHaveTextContent('busy or unavailable');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
