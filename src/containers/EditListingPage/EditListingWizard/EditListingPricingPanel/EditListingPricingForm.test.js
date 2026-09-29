import React from 'react';
import '@testing-library/jest-dom';

import { listingFields } from '../../../../config/configListing';
import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import { getOrderedPricingFields } from '../rateFields';
import EditListingPricingForm from './EditListingPricingForm';

const { screen, userEvent, fireEvent } = testingLibrary;

const noop = () => null;

describe('EditListingDeliveryForm', () => {
  it('Check that price can be given and submit button activates', async () => {
    const user = userEvent.setup();
    const saveActionMsg = 'Save price';
    render(
      <EditListingPricingForm
        intl={fakeIntl}
        dispatch={noop}
        onSubmit={v => v}
        marketplaceCurrency="USD"
        unitType="day"
        listingMinimumPriceSubUnits={0}
        saveActionMsg={saveActionMsg}
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
      />
    );

    // Test that save button is disabled at first
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeDisabled();

    // Fill mandatory attributes (the label carries the required marker)
    const price = /EditListingPricingForm.pricePerProduct/;
    await user.type(screen.getByRole('textbox', { name: price }), '10');

    // Test that save button is enabled
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeEnabled();
  });
});

describe('EditListingPricingForm "Your rates" (sign-up journey screen 11)', () => {
  const pricingFields = getOrderedPricingFields(listingFields);

  const renderRatesForm = () =>
    render(
      <EditListingPricingForm
        intl={fakeIntl}
        dispatch={noop}
        onSubmit={v => v}
        marketplaceCurrency="GBP"
        unitType="day"
        listingMinimumPriceSubUnits={0}
        pricingFields={pricingFields}
        saveActionMsg="Continue"
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
      />
    );

  it('orders the fields: day rate, half-day + hourly, travel costs, how far, notice', () => {
    const { container } = renderRatesForm();
    const labelledControls = [
      screen.getByRole('textbox', { name: /EditListingPricingForm.pricePerProduct/ }),
      // (Test messages are keys, so both optional rates read "...optionalLabel" here.)
      container.querySelector('[id="EditListingPricingForm.pub_half_day_rate"]'),
      container.querySelector('[id="EditListingPricingForm.pub_hourly_rate"]'),
      screen.getByRole('group', { name: /Travel costs/ }),
      screen.getByRole('combobox', { name: /EditListingPricingForm.travelRadiusLabel/ }),
      screen.getByRole('combobox', { name: /Minimum booking notice/ }),
      screen.getByText('EditListingPricingForm.feeCalloutTitle'),
    ];
    labelledControls.slice(1).forEach((el, i) => {
      expect(
        labelledControls[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
    // "How far you'll travel" is the availability_radius field, with the model-facing hint.
    expect(container.querySelector('select[name="pub_availability_radius"]')).not.toBeNull();
    expect(screen.getByText('EditListingPricingForm.travelRadiusHint')).toBeInTheDocument();
    expect(screen.getByText('EditListingPricingForm.minBookingNoticeHint')).toBeInTheDocument();
  });

  it('keeps Continue disabled until travel costs, how far and notice are chosen', async () => {
    const user = userEvent.setup();
    renderRatesForm();
    const submit = screen.getByRole('button', { name: 'Continue' });

    await user.type(
      screen.getByRole('textbox', { name: /EditListingPricingForm.pricePerProduct/ }),
      '450'
    );
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Included in rate' }));
    expect(submit).toBeDisabled();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /EditListingPricingForm.travelRadiusLabel/ }),
      'national'
    );
    expect(submit).toBeDisabled();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Minimum booking notice/ }),
      '48-hours'
    );
    expect(submit).toBeEnabled();
  });
});
