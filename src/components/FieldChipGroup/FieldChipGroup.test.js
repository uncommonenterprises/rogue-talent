import React from 'react';
import '@testing-library/jest-dom';
import { Form as FinalForm } from 'react-final-form';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import FieldChipGroup from './FieldChipGroup';

const { screen, userEvent } = testingLibrary;

const categoryOptions = [
  'Fashion',
  'Commercial',
  'Editorial',
  'Fitness',
  'Lifestyle',
  'Beauty',
  'Lingerie',
  'Swimwear',
  'Plus-size',
  'Petite',
  'Parts (hands/feet)',
  'Hair',
  'Promotional/Events',
].map(label => ({ key: label.toLowerCase(), label }));

const renderGroup = (fieldProps, onValues) =>
  render(
    <FinalForm
      onSubmit={() => null}
      render={({ handleSubmit, values }) => {
        onValues(values);
        return (
          <form onSubmit={handleSubmit}>
            <FieldChipGroup {...fieldProps} />
          </form>
        );
      }}
    />
  );

describe('FieldChipGroup', () => {
  it('multi-select: shows every option at once and toggles several', async () => {
    const user = userEvent.setup();
    let values = {};
    renderGroup(
      {
        id: 'form.pub_modelling_categories',
        name: 'pub_modelling_categories',
        label: 'Modelling categories',
        options: categoryOptions,
        isMulti: true,
      },
      v => (values = v)
    );

    // All 13 options visible from the start, no "+N more".
    expect(screen.getAllByRole('checkbox')).toHaveLength(13);
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Fashion' }));
    await user.click(screen.getByRole('checkbox', { name: 'Editorial' }));
    expect(values.pub_modelling_categories).toEqual(['fashion', 'editorial']);
    expect(screen.getByRole('checkbox', { name: 'Fashion' })).toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Fashion' }));
    expect(values.pub_modelling_categories).toEqual(['editorial']);
  });

  it('single choice: behaves as a radio group', async () => {
    const user = userEvent.setup();
    let values = {};
    renderGroup(
      {
        id: 'form.pub_travel_fee_policy',
        name: 'pub_travel_fee_policy',
        label: 'Travel costs',
        options: [
          { key: 'included', label: 'Included in rate' },
          { key: 'charged-separately', label: 'Charged separately' },
        ],
      },
      v => (values = v)
    );

    expect(screen.getByRole('group', { name: 'Travel costs' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Included in rate' }));
    await user.click(screen.getByRole('radio', { name: 'Charged separately' }));
    expect(values.pub_travel_fee_policy).toEqual('charged-separately');
    expect(screen.getByRole('radio', { name: 'Included in rate' })).not.toBeChecked();
  });
});
