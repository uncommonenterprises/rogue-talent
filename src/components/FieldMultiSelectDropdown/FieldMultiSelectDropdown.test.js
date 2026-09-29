import React from 'react';
import '@testing-library/jest-dom';
import { Form as FinalForm } from 'react-final-form';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { nonEmptyArray } from '../../util/validators';

import FieldMultiSelectDropdown from './FieldMultiSelectDropdown';

const { screen, userEvent, waitFor } = testingLibrary;

const options = [
  { key: 'asian', label: 'Asian' },
  { key: 'black', label: 'Black' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'white', label: 'White' },
];

const renderDropdown = ({ initialValues = {}, onValues = () => null } = {}) =>
  render(
    <FinalForm
      onSubmit={() => null}
      initialValues={initialValues}
      render={({ handleSubmit, values }) => {
        onValues(values);
        return (
          <form onSubmit={handleSubmit}>
            <FieldMultiSelectDropdown
              id="form.pub_ethnicity"
              name="pub_ethnicity"
              label="Ethnicity"
              placeholder="Select all that apply"
              options={options}
              validate={nonEmptyArray('Required')}
            />
            <button type="submit">Submit</button>
          </form>
        );
      }}
    />
  );

describe('FieldMultiSelectDropdown', () => {
  it('shows the placeholder while closed and nothing is chosen', () => {
    renderDropdown();
    const button = screen.getByRole('button', { name: /Ethnicity/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveTextContent('Select all that apply');
    // The tick boxes stay out of reach until the dropdown is opened.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('opens a list of tick boxes, allows several choices and lists them when closed', async () => {
    const user = userEvent.setup();
    let latestValues = {};
    renderDropdown({ onValues: v => (latestValues = v) });

    const button = screen.getByRole('button', { name: /Ethnicity/ });
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);

    await user.click(screen.getByRole('checkbox', { name: 'Mixed' }));
    await user.click(screen.getByRole('checkbox', { name: 'White' }));
    expect(latestValues.pub_ethnicity).toEqual(['mixed', 'white']);

    // Untick one again
    await user.click(screen.getByRole('checkbox', { name: 'Mixed' }));
    expect(latestValues.pub_ethnicity).toEqual(['white']);
    await user.click(screen.getByRole('checkbox', { name: 'Black' }));

    // Escape closes the panel, returns focus to the button, and the button reads the choices.
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
    expect(button).toHaveTextContent('Black, White');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('is keyboard operable: ArrowDown opens and focuses the first option, Space ticks it', async () => {
    const user = userEvent.setup();
    let latestValues = {};
    renderDropdown({ onValues: v => (latestValues = v) });

    const button = screen.getByRole('button', { name: /Ethnicity/ });
    button.focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Asian' })).toHaveFocus();
    });
    await user.keyboard(' ');
    expect(latestValues.pub_ethnicity).toEqual(['asian']);

    // Tab moves on to the next option inside the open panel.
    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'Black' })).toHaveFocus();
  });

  it('shows saved values and a required error once touched with nothing chosen', async () => {
    const user = userEvent.setup();
    renderDropdown({ initialValues: { pub_ethnicity: ['black'] } });
    const button = screen.getByRole('button', { name: /Ethnicity/ });
    expect(button).toHaveTextContent('Black');

    await user.click(button);
    await user.click(screen.getByRole('checkbox', { name: 'Black' }));
    await user.keyboard('{Escape}');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
