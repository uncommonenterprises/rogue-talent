import React from 'react';
import '@testing-library/jest-dom';

import { types as sdkTypes } from '../../../util/sdkLoader';
import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import {
  VIEWER_CHECK_STATUS,
  VIEWER_DATES,
  VIEWER_LOGGED_OUT,
  VIEWER_OWN,
  VIEWER_PENDING,
} from '../availabilityViewer';
import AvailabilityCalendar from './AvailabilityCalendar';
import ProfileAvailability from './ProfileAvailability';

const { screen, fireEvent } = testingLibrary;
const { UUID } = sdkTypes;

const TZ = 'Europe/London';
// Mock "today" as in the B03b mockup: Sun 1 Nov 2026, 16:20 UK time.
const NOW = new Date('2026-11-01T16:20:00Z');

const slot = (id, from, to) => ({
  id: new UUID(`ts-${id}`),
  type: 'timeSlot',
  attributes: {
    start: new Date(`${from}T00:00:00Z`),
    end: new Date(`${to}T00:00:00Z`),
    seats: 1,
  },
});

const monthly = novemberSlots => ({
  '2026-11': { timeSlots: novemberSlots, fetchTimeSlotsInProgress: false },
  '2026-12': { timeSlots: [slot(4, '2026-12-01', '2027-01-01')], fetchTimeSlotsInProgress: false },
});

// Free from 2 Nov except 9 to 11 Nov.
const healthy = monthly([slot(1, '2026-11-02', '2026-11-09'), slot(2, '2026-11-12', '2026-12-01')]);

const baseProps = {
  timeZone: TZ,
  noticeKey: '48-hours',
  dayCountAvailableForBooking: 90,
  listingId: new UUID('listing-1'),
  modelName: 'Imogen',
  now: NOW,
};

const dayButton = (container, dayKey) =>
  container.querySelector(`button[data-date="${dayKey}"]:not([class*="chip"])`);
const dayCell = (container, dayKey) => container.querySelector(`[data-date="${dayKey}"]`);

describe('AvailabilityCalendar (B03b)', () => {
  it('hands a clicked free date to the booking form', () => {
    const onPickDate = jest.fn();
    const { container } = render(
      <AvailabilityCalendar
        {...baseProps}
        monthlyTimeSlots={healthy}
        onFetchTimeSlots={jest.fn()}
        onPickDate={onPickDate}
      />
    );
    fireEvent.click(dayButton(container, '2026-11-04'));
    expect(onPickDate).toHaveBeenCalledWith('2026-11-04');
  });

  it('greys out today and the notice window: those days cannot be clicked', () => {
    const { container } = render(
      <AvailabilityCalendar
        {...baseProps}
        monthlyTimeSlots={healthy}
        onFetchTimeSlots={jest.fn()}
        onPickDate={jest.fn()}
      />
    );
    ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10'].forEach(dayKey => {
      expect(dayButton(container, dayKey)).toBeNull();
    });
    expect(dayCell(container, '2026-11-01')).toHaveAttribute('data-status', 'today');
    expect(dayCell(container, '2026-11-02')).toHaveAttribute('data-status', 'notice');
    expect(dayCell(container, '2026-11-03')).toHaveAttribute('data-status', 'notice');
    expect(dayCell(container, '2026-11-10')).toHaveAttribute('data-status', 'unavailable');
    expect(dayButton(container, '2026-11-04')).not.toBeNull();
  });

  it('starts the week on Monday', () => {
    const { container } = render(
      <AvailabilityCalendar {...baseProps} monthlyTimeSlots={healthy} onPickDate={jest.fn()} />
    );
    // 1 Nov 2026 is a Sunday: six blanks, then the 1st in the seventh column
    const grid = container.querySelector('[role="group"]');
    expect(grid.children[6]).toHaveAttribute('data-date', '2026-11-01');
  });

  it("the read-only preview (model's own view) has no clickable days and no chips", () => {
    const onPickDate = jest.fn();
    const { container } = render(
      <AvailabilityCalendar
        {...baseProps}
        monthlyTimeSlots={healthy}
        readOnly
        onPickDate={onPickDate}
        nextFreeMode="always"
      />
    );
    expect(container.querySelectorAll('button[data-date]')).toHaveLength(0);
    expect(dayCell(container, '2026-11-04')).toHaveAttribute('data-status', 'free');
    expect(screen.queryByText('AvailabilityCalendar.nextFree')).not.toBeInTheDocument();
  });

  it('a fully booked month says so and links to the next month with a free date', () => {
    render(
      <AvailabilityCalendar
        {...baseProps}
        monthlyTimeSlots={monthly([])}
        onFetchTimeSlots={jest.fn()}
        onPickDate={jest.fn()}
      />
    );
    expect(screen.getByText('AvailabilityCalendar.emptyMonth')).toBeInTheDocument();
    // Desktop shows the "Next free" chips when the month is empty
    expect(screen.getByText('AvailabilityCalendar.nextFree')).toBeInTheDocument();
    fireEvent.click(screen.getByText('AvailabilityCalendar.seeMonth'));
    expect(screen.getByText('December 2026')).toBeInTheDocument();
  });

  it('a "Next free" chip hands its date over too', () => {
    const onPickDate = jest.fn();
    const { container } = render(
      <AvailabilityCalendar
        {...baseProps}
        monthlyTimeSlots={healthy}
        onPickDate={onPickDate}
        nextFreeMode="always"
      />
    );
    const chip = container.querySelector('button[class*="chip"][data-date="2026-11-04"]');
    fireEvent.click(chip);
    expect(onPickDate).toHaveBeenCalledWith('2026-11-04');
  });

  it('desktop hides the chips when the month has plenty of free dates', () => {
    render(
      <AvailabilityCalendar {...baseProps} monthlyTimeSlots={healthy} onPickDate={jest.fn()} />
    );
    expect(screen.queryByText('AvailabilityCalendar.nextFree')).not.toBeInTheDocument();
  });

  it('shows a skeleton while the month loads, and a retry when it fails', () => {
    const onFetchTimeSlots = jest.fn();
    const { rerender } = render(
      <AvailabilityCalendar
        {...baseProps}
        monthlyTimeSlots={{ '2026-11': { fetchTimeSlotsInProgress: true } }}
        onFetchTimeSlots={onFetchTimeSlots}
      />
    );
    expect(screen.getByText('AvailabilityCalendar.loading')).toBeInTheDocument();

    rerender(
      <AvailabilityCalendar
        {...baseProps}
        monthlyTimeSlots={{ '2026-11': { fetchTimeSlotsInProgress: false } }}
        onFetchTimeSlots={onFetchTimeSlots}
      />
    );
    expect(screen.getByText('AvailabilityCalendar.loadError')).toBeInTheDocument();
    onFetchTimeSlots.mockClear();
    fireEvent.click(screen.getByText('AvailabilityCalendar.retry'));
    expect(onFetchTimeSlots).toHaveBeenCalledTimes(1);
    expect(onFetchTimeSlots.mock.calls[0][0]).toEqual(baseProps.listingId);
  });
});

describe('ProfileAvailability (B03b viewer states)', () => {
  const props = { ...baseProps, monthlyTimeSlots: healthy, onFetchTimeSlots: jest.fn() };

  it('an approved client sees the calendar, legend and the honest note', () => {
    const { container } = render(
      <ProfileAvailability {...props} viewerState={VIEWER_DATES} onPickDate={jest.fn()} />
    );
    expect(screen.getByText('ProfileAvailability.title')).toBeInTheDocument();
    expect(screen.getByText('ProfileAvailability.note')).toBeInTheDocument();
    expect(dayButton(container, '2026-11-04')).not.toBeNull();
  });

  [VIEWER_LOGGED_OUT, VIEWER_PENDING, VIEWER_CHECK_STATUS].forEach(viewerState => {
    it(`${viewerState}: a line in the same place, and no dates at all`, () => {
      const { container } = render(<ProfileAvailability {...props} viewerState={viewerState} />);
      expect(container.querySelectorAll('[data-date]')).toHaveLength(0);
      expect(container.textContent).toContain('ProfileAvailability.locked');
    });
  });

  it('works out the viewer itself from the account when not told: logged out sees no dates', () => {
    const { container } = render(
      <ProfileAvailability {...props} isAuthenticated={false} currentUser={null} />
    );
    expect(screen.getByText('ProfileAvailability.lockedLoggedOut')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-date]')).toHaveLength(0);
  });

  it('the model\'s own view: read-only preview, own note and "Edit your availability"', () => {
    const { container } = render(
      <ProfileAvailability
        {...props}
        viewerState={VIEWER_OWN}
        onPickDate={jest.fn()}
        editParams={{ id: 'listing-1', slug: 'imogen', type: 'edit', tab: 'details' }}
      />
    );
    expect(screen.getByText('ProfileAvailability.titleOwn')).toBeInTheDocument();
    expect(screen.getByText('ProfileAvailability.ownNote')).toBeInTheDocument();
    const edit = screen.getByText('ProfileAvailability.editAvailability').closest('a');
    expect(edit.getAttribute('href')).toContain('/availability');
    expect(container.querySelectorAll('button[data-date]')).toHaveLength(0);
  });

  it('hides the calendar but not the "no dates" line when asked (layout not known yet)', () => {
    const { container, rerender } = render(
      <ProfileAvailability {...props} viewerState={VIEWER_DATES} hideCalendar />
    );
    expect(container.firstChild).toBeNull();
    rerender(<ProfileAvailability {...props} viewerState={VIEWER_LOGGED_OUT} hideCalendar />);
    expect(screen.getByText('ProfileAvailability.lockedLoggedOut')).toBeInTheDocument();
  });
});
