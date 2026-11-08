import React from 'react';
import '@testing-library/jest-dom';
import Decimal from 'decimal.js';

import { types as sdkTypes } from '../../../util/sdkLoader';
import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import EstimatedCustomerBreakdownMaybe from '../EstimatedCustomerBreakdownMaybe';
import BookingDatesForm from './BookingDatesForm';

const { Money, UUID } = sdkTypes;
const { screen, within, fireEvent, waitFor } = testingLibrary;

const lineItems = [
  {
    code: 'line-item/night',
    unitPrice: new Money(1099, 'USD'),
    quantity: new Decimal(2),
    includeFor: ['customer', 'provider'],
    lineTotal: new Money(2198, 'USD'),
    reversal: false,
  },
];

describe('EstimatedCustomerBreakdownMaybe', () => {
  it('renders nothing if nightly is missing start and end date', () => {
    const tree = render(
      <EstimatedCustomerBreakdownMaybe
        lineItems={lineItems}
        currency="USD"
        marketplaceName="MarketplaceX"
        processName="default-booking"
      />
    );
    expect(tree.asFragment().firstChild).toBeFalsy();
  });

  it('renders nothing if nightly is missing end date', () => {
    const data = {
      startDate: new Date(),
    };
    const tree = render(
      <EstimatedCustomerBreakdownMaybe
        breakdownData={data}
        lineItems={lineItems}
        currency="USD"
        marketplaceName="MarketplaceX"
        processName="default-booking"
      />
    );
    expect(tree.asFragment().firstChild).toBeFalsy();
  });

  it('renders breakdown with correct transaction data', () => {
    const startDate = new Date(Date.UTC(2017, 3, 14, 0, 0, 0));
    const endDate = new Date(Date.UTC(2017, 3, 16, 0, 0, 0));
    const props = {
      breakdownData: {
        startDate,
        endDate,
      },
      lineItems,
      currency: 'USD',
      timeZone: 'Etc/UTC',
      marketplaceName: 'MarketplaceX',
      processName: 'default-booking',
    };

    render(<EstimatedCustomerBreakdownMaybe {...props} />);

    const bookingStart = screen.getByText('OrderBreakdown.bookingStart');
    expect(bookingStart).toBeInTheDocument();
    const bookingStartInfo = within(bookingStart.parentNode.parentNode);
    expect(bookingStartInfo.getByText('Friday')).toBeInTheDocument();
    expect(bookingStartInfo.getByText('Apr 14')).toBeInTheDocument();

    const bookingEnd = screen.getByText('OrderBreakdown.bookingEnd');
    expect(bookingEnd).toBeInTheDocument();
    const bookingEndInfo = within(bookingEnd.parentNode.parentNode);
    expect(bookingEndInfo.getByText('Sunday')).toBeInTheDocument();
    expect(bookingEndInfo.getByText('Apr 16')).toBeInTheDocument();

    const baseUnitNight = screen.getByText('OrderBreakdown.baseUnitNight');
    expect(baseUnitNight).toBeInTheDocument();
    const baseUnitNightInfo = within(baseUnitNight.parentNode.parentNode);
    expect(baseUnitNightInfo.getByText('$21.98')).toBeInTheDocument();

    const total = screen.getByText('OrderBreakdown.total');
    expect(total).toBeInTheDocument();
    const totalPayIn = within(total.parentNode.parentNode);
    expect(totalPayIn.getByText('$21.98')).toBeInTheDocument();
  });
});

// B03b: a free date clicked on the profile's availability calendar opens the existing date
// picker with that date as the start date.
describe('BookingDatesForm: date handed over from the availability calendar', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const utcKey = d => d.toISOString().slice(0, 10);
  const today = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const pickedKey = utcKey(new Date(startOfTodayUtc.getTime() + 10 * DAY_MS));
  const slotStart = new Date(startOfTodayUtc.getTime() + DAY_MS);
  const slotEnd = new Date(startOfTodayUtc.getTime() + 60 * DAY_MS);
  const timeSlots = [
    {
      id: new UUID('ts-1'),
      type: 'timeSlot',
      attributes: { start: slotStart, end: slotEnd, seats: 1 },
    },
  ];
  const monthKey = d => d.toISOString().slice(0, 7);
  const monthlyTimeSlots = [0, 1, 2].reduce((acc, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1));
    return { ...acc, [monthKey(d)]: { timeSlots, fetchTimeSlotsInProgress: false } };
  }, {});

  const formProps = {
    formId: 'TestBookingDatesForm',
    price: new Money(38000, 'GBP'),
    listingId: new UUID('listing-1'),
    isOwnListing: false,
    lineItemUnitType: 'line-item/day',
    monthlyTimeSlots,
    onFetchTimeSlots: jest.fn(),
    onFetchTransactionLineItems: jest.fn(),
    fetchLineItemsInProgress: false,
    lineItems: null,
    timeZone: 'Etc/UTC',
    dayCountAvailableForBooking: 90,
    marketplaceName: 'MarketplaceX',
    modelName: 'Imogen',
    onSubmit: jest.fn(),
  };

  it('desktop: clicking a date in the preview sets it as the start and opens the picker in place', async () => {
    const onDatesChange = jest.fn();
    const { container } = render(
      <BookingDatesForm
        {...formProps}
        layout="popover"
        onDatesChange={onDatesChange}
        renderAvailabilityPreview={onPickDate => (
          <button type="button" onClick={() => onPickDate(pickedKey)}>
            preview-free-day
          </button>
        )}
      />
    );
    // Before: the preview shows, the picker does not
    expect(screen.getByText('BookingDatesForm.startLabel')).toBeInTheDocument();
    expect(screen.queryByText('BookingDatesForm.done')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('preview-free-day'));

    await waitFor(() => {
      // The picker has replaced the preview, with the start date chosen and no end date yet
      expect(screen.queryByText('preview-free-day')).not.toBeInTheDocument();
      expect(screen.getByText('BookingDatesForm.done')).toBeInTheDocument();
      const cell = container.querySelector(`td[data-date="${pickedKey}"]`);
      expect(cell).toHaveAttribute('aria-selected', 'true');
      // End field still empty: the client picks an end day (or the same day again)
      const endButton = container.querySelector('#TestBookingDatesForm\\.bookingEndDate');
      expect(endButton.textContent).toContain('BookingDatesForm.addDate');
      const startButton = container.querySelector('#TestBookingDatesForm\\.bookingStartDate');
      expect(startButton.textContent).not.toContain('BookingDatesForm.addDate');
    });
    expect(onDatesChange).toHaveBeenCalledWith(false);
  });

  it('phone: a date tapped in the profile section becomes the start date in the dates sheet', async () => {
    const { container, rerender } = render(<BookingDatesForm {...formProps} layout="stack" />);
    expect(container.querySelector('td[aria-selected="true"]')).toBeNull();

    rerender(
      <BookingDatesForm {...formProps} layout="stack" pickedStart={{ dayKey: pickedKey, seq: 1 }} />
    );

    await waitFor(() => {
      const cell = container.querySelector(`td[data-date="${pickedKey}"]`);
      expect(cell).toHaveAttribute('aria-selected', 'true');
    });
    // Only a start date: the sheet's button still asks for dates
    expect(screen.getByText('BookingDatesForm.selectYourDates')).toBeInTheDocument();
  });
});

// Open question 12 ("enforced in the picker, still decided by the model"): today and every day
// inside the model's minimum notice can't be picked, as a start or an end date.
describe('BookingDatesForm: minimum notice is enforced in the picker', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const today = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const keyIn = days =>
    new Date(startOfTodayUtc.getTime() + days * DAY_MS).toISOString().slice(0, 10);
  // Free every day from today for 60 days, so only the notice rule can block a day
  const timeSlots = [
    {
      id: new UUID('ts-notice'),
      type: 'timeSlot',
      attributes: {
        start: startOfTodayUtc,
        end: new Date(startOfTodayUtc.getTime() + 60 * DAY_MS),
        seats: 1,
      },
    },
  ];
  const monthlyTimeSlots = [0, 1, 2].reduce((acc, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1));
    return {
      ...acc,
      [d.toISOString().slice(0, 7)]: { timeSlots, fetchTimeSlotsInProgress: false },
    };
  }, {});
  const props = {
    formId: 'NoticeBookingDatesForm',
    price: new Money(38000, 'GBP'),
    listingId: new UUID('listing-notice'),
    isOwnListing: false,
    lineItemUnitType: 'line-item/day',
    monthlyTimeSlots,
    onFetchTimeSlots: jest.fn(),
    onFetchTransactionLineItems: jest.fn(),
    fetchLineItemsInProgress: false,
    lineItems: null,
    timeZone: 'Etc/UTC',
    dayCountAvailableForBooking: 90,
    marketplaceName: 'MarketplaceX',
    modelName: 'Imogen',
    onSubmit: jest.fn(),
    layout: 'stack',
  };
  const cell = (container, key) => container.querySelector(`td[data-date="${key}"]`);

  it('48 hours: today, tomorrow and the day after are blocked; three days out is free', () => {
    const { container } = render(<BookingDatesForm {...props} minNoticeKey="48-hours" />);
    [0, 1, 2].forEach(d =>
      expect(cell(container, keyIn(d))).toHaveAttribute('aria-disabled', 'true')
    );
    expect(cell(container, keyIn(3))).toHaveAttribute('aria-disabled', 'false');
  });

  it('a day inside the notice cannot be picked as a start or an end', () => {
    const { container } = render(<BookingDatesForm {...props} minNoticeKey="48-hours" />);
    // Start inside the notice: nothing is selected
    fireEvent.click(cell(container, keyIn(1)));
    expect(container.querySelector('td[aria-selected="true"]')).toBeNull();
    // Start outside it, then try to end (or restart) inside it: still only the start
    fireEvent.click(cell(container, keyIn(5)));
    fireEvent.click(cell(container, keyIn(2)));
    const selected = container.querySelectorAll('td[aria-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAttribute('data-date', keyIn(5));
  });

  it('1 week: every day up to a week out is blocked', () => {
    const { container } = render(<BookingDatesForm {...props} minNoticeKey="1-week" />);
    expect(cell(container, keyIn(6))).toHaveAttribute('aria-disabled', 'true');
    expect(cell(container, keyIn(8))).toHaveAttribute('aria-disabled', 'false');
  });

  it('same-day notice still blocks today, and no longer shows the old "you can still send" warning', () => {
    const { container } = render(<BookingDatesForm {...props} minNoticeKey="same-day" />);
    expect(cell(container, keyIn(0))).toHaveAttribute('aria-disabled', 'true');
    expect(cell(container, keyIn(1))).toHaveAttribute('aria-disabled', 'false');
    expect(container.textContent).not.toContain('BookingDatesForm.minimumNotice');
  });
});
