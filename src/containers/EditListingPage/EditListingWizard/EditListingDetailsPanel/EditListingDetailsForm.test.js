import React from 'react';
import '@testing-library/jest-dom';

import { listingFields } from '../../../../config/configListing';
import { pickCategoryFields } from '../../../../util/fieldHelpers';
import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import { isPricingListingField } from '../rateFields';
import EditListingDetailsForm from './EditListingDetailsForm';

const { screen, userEvent } = testingLibrary;

const noop = () => null;

describe('EditListingDetailsForm', () => {
  it('Check that shipping fees can be given and submit button activates', async () => {
    const user = userEvent.setup();
    const saveActionMsg = 'Save details';

    const selectableListingTypes = [
      {
        listingType: 'sell-bicycles',
        transactionProcessAlias: 'default-purchase/release-1',
        unitType: 'item',
      },
    ];

    const listingFieldsConfig = [
      {
        key: 'clothing',
        scope: 'public',
        listingTypeConfig: {
          limitToListingTypeIds: true,
          listingTypeIds: ['sell-bicycles'],
        },
        schemaType: 'enum',
        enumOptions: [
          { option: 'men', label: 'Men' },
          { option: 'women', label: 'Women' },
          { option: 'kids', label: 'Kids' },
        ],
        filterConfig: {
          showFilter: true,
          label: 'Clothing',
        },
        showConfig: {
          label: 'Clothing',
          isDetail: true,
        },
        saveConfig: {
          label: 'Clothing',
        },
      },
      {
        key: 'amenities',
        scope: 'public',
        listingTypeConfig: {
          limitToListingTypeIds: true,
          listingTypeIds: ['rent-bicycles-daily', 'rent-bicycles-nightly', 'rent-bicycles-hourly'],
        },
        schemaType: 'multi-enum',
        enumOptions: [
          { option: 'towels', label: 'Towels' },
          { option: 'bathroom', label: 'Bathroom' },
          { option: 'swimming_pool', label: 'Swimming pool' },
          { option: 'barbeque', label: 'Barbeque' },
        ],
        filterConfig: {
          showFilter: true,
          label: 'Amenities',
        },
        showConfig: {
          label: 'Amenities',
        },
        saveConfig: {
          label: 'Amenities',
        },
      },
    ];

    render(
      <EditListingDetailsForm
        intl={fakeIntl}
        dispatch={noop}
        onListingTypeChange={noop}
        onSubmit={v => v}
        saveActionMsg={saveActionMsg}
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
        listingFieldsConfig={listingFieldsConfig}
        categoryPrefix="categoryLevel"
        selectableCategories={[]}
        pickSelectedCategories={values => pickCategoryFields(values, 'categoryLevel', 1, [])}
        selectableListingTypes={selectableListingTypes}
        hasExistingListingType={true}
        initialValues={selectableListingTypes[0]}
        marketplaceCurrency="EUR"
      />
    );

    // Pickup fields
    const title = 'EditListingDetailsForm.title';
    expect(screen.getByText(title)).toBeInTheDocument();

    const description = 'EditListingDetailsForm.description';
    expect(screen.getByText(description)).toBeInTheDocument();

    // Test that save button is disabled at first
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeDisabled();

    // Fill mandatory attributes
    await user.type(screen.getByRole('textbox', { name: title }), 'My Listing');
    await user.type(screen.getByRole('textbox', { name: description }), 'Lorem ipsum');

    // Fill custom listing field (optional fields render with an "(optional)" label suffix)
    await user.selectOptions(screen.getByLabelText('Clothing (optional)'), 'kids');

    // Test that save button is enabled
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeEnabled();
  });
});

describe('EditListingDetailsForm "Your profile" step (sign-up journey screen 09)', () => {
  const modelProfileType = {
    listingType: 'model-profile',
    transactionProcessAlias: 'default-booking/release-1',
    unitType: 'day',
  };
  // The real model-profile fields, minus the ones collected on "Your rates".
  const profileFields = listingFields.filter(f => !isPricingListingField(f));

  const renderProfileForm = (fields = profileFields, onSubmit = v => v) =>
    render(
      <EditListingDetailsForm
        intl={fakeIntl}
        dispatch={noop}
        onListingTypeChange={noop}
        onSubmit={onSubmit}
        saveActionMsg="Continue"
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
        listingFieldsConfig={fields}
        categoryPrefix="categoryLevel"
        selectableCategories={[]}
        pickSelectedCategories={values => pickCategoryFields(values, 'categoryLevel', 1, [])}
        selectableListingTypes={[modelProfileType]}
        hasPredefinedListingType
        hasExistingTitle
        initialValues={{ ...modelProfileType, title: 'Jane D.' }}
        marketplaceCurrency="GBP"
      />
    );

  it('groups the fields into Basics, Measurements, Style & experience and Your links', () => {
    renderProfileForm();
    const headings = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(headings).toEqual([
      'EditListingDetailsForm.sectionBasics',
      'EditListingDetailsForm.sectionMeasurements',
      'EditListingDetailsForm.sectionStyle',
      'EditListingDetailsForm.sectionLinks',
    ]);
  });

  it('does not ask for "How far you\'ll travel" (availability_radius), now on Your rates', () => {
    renderProfileForm();
    expect(screen.queryByLabelText(/Availability radius/)).not.toBeInTheDocument();
    expect(document.getElementById('field-pub_availability_radius')).toBeNull();
  });

  it('shows ethnicity as a multi-select dropdown and saves several choices', async () => {
    const user = userEvent.setup();
    renderProfileForm();

    const ethnicity = screen.getByRole('button', { name: /Ethnicity/ });
    expect(ethnicity).toHaveTextContent('CustomExtendedDataField.placeholderMultiSelect');
    expect(ethnicity).toHaveAttribute('aria-expanded', 'false');

    await user.click(ethnicity);
    await user.click(screen.getByRole('checkbox', { name: 'Mixed' }));
    await user.click(screen.getByRole('checkbox', { name: 'White' }));
    await user.keyboard('{Escape}');
    expect(ethnicity).toHaveTextContent('Mixed, White');
  });

  it('shows all 13 modelling categories as pills from the start', () => {
    renderProfileForm();
    const group = screen.getByRole('group', { name: /Modelling categories/ });
    expect(group.querySelectorAll('input[type="checkbox"]')).toHaveLength(13);
    expect(screen.getByRole('checkbox', { name: 'Promotional/Events' })).toBeInTheDocument();
  });

  it('puts a field with no section into Style & experience instead of dropping it', () => {
    const unmapped = {
      key: 'languages',
      scope: 'public',
      schemaType: 'shortText',
      saveConfig: { label: 'Languages', isRequired: false },
    };
    renderProfileForm([...profileFields, unmapped]);
    const styleSection = screen
      .getByRole('heading', { name: 'EditListingDetailsForm.sectionStyle' })
      .closest('section');
    expect(styleSection).toContainElement(screen.getByLabelText('Languages (optional)'));
  });

  it('has a collapsed "How to measure" guide in Measurements', () => {
    renderProfileForm();
    const measurements = screen
      .getByRole('heading', { name: 'EditListingDetailsForm.sectionMeasurements' })
      .closest('section');
    const toggle = screen.getByText('EditListingDetailsForm.howToMeasureToggle');
    expect(measurements).toContainElement(toggle);
    const details = toggle.closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(details).toHaveTextContent('EditListingDetailsForm.howToMeasureWaist');
    expect(details).toHaveTextContent('EditListingDetailsForm.howToMeasureHips');
    expect(details).toHaveTextContent('EditListingDetailsForm.howToMeasureBust');
  });

  it('switches waist, hips and bust/chest to inches, leaving height and shoe size alone', async () => {
    const user = userEvent.setup();
    renderProfileForm();

    const cm = screen.getByRole('radio', { name: 'EditListingDetailsForm.measurementUnitCm' });
    const inches = screen.getByRole('radio', { name: 'EditListingDetailsForm.measurementUnitIn' });
    expect(cm).toBeChecked();
    expect(screen.getByLabelText(/^Waist \(cm\)/)).toBeInTheDocument();

    await user.click(inches);

    expect(inches).toBeChecked();
    expect(screen.getByLabelText(/^Waist \(in\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Hips \(in\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Bust\/Chest \(in\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Height \(cm\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Shoe size \(UK\)/)).toBeInTheDocument();

    await user.click(cm);
    expect(screen.getByLabelText(/^Waist \(cm\)/)).toBeInTheDocument();
  });

  it('keeps the value in cm when switching units', async () => {
    const user = userEvent.setup();
    renderProfileForm();

    await user.click(
      screen.getByRole('radio', { name: 'EditListingDetailsForm.measurementUnitIn' })
    );
    await user.type(screen.getByLabelText(/^Waist \(in\)/), '30');
    await user.click(
      screen.getByRole('radio', { name: 'EditListingDetailsForm.measurementUnitCm' })
    );

    // 30 in = 76.2 cm, saved as 76
    expect(screen.getByLabelText(/^Waist \(cm\)/)).toHaveValue(76);
  });

  it('leaves out the switch and guide when there are no length measurements', () => {
    const lengthKeys = ['waist_cm', 'hips_cm', 'bust_chest_cm'];
    renderProfileForm(profileFields.filter(f => !lengthKeys.includes(f.key)));
    expect(
      screen.queryByRole('radio', { name: 'EditListingDetailsForm.measurementUnitIn' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('EditListingDetailsForm.howToMeasureToggle')).not.toBeInTheDocument();
    // Shoe size still has its Measurements section.
    expect(
      screen.getByRole('heading', { name: 'EditListingDetailsForm.sectionMeasurements' })
    ).toBeInTheDocument();
  });
});
