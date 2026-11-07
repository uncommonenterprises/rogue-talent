import React from 'react';
import '@testing-library/jest-dom';
import { Form as FinalForm } from 'react-final-form';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import CustomExtendedDataField from './CustomExtendedDataField';

const { screen, userEvent } = testingLibrary;

const longFieldConfig = (key, label, minimum, maximum, helpText) => ({
  key,
  scope: 'public',
  schemaType: 'long',
  label,
  helpText,
  minimum,
  maximum,
  saveConfig: { label, isRequired: true },
});

const renderField = fieldConfig =>
  render(
    <FinalForm
      onSubmit={() => {}}
      render={() => (
        <form>
          <CustomExtendedDataField
            name={fieldConfig.key}
            fieldConfig={fieldConfig}
            formId="TestForm"
            hintBelowInput
          />
        </form>
      )}
    />,
    { messages: enMessages }
  );

describe('CustomExtendedDataField', () => {
  it('names the unit from the label and puts the error below the help text', async () => {
    const user = userEvent.setup();
    const helpText = 'The fullest part of your hips in centimetres.';
    renderField(longFieldConfig('hips_cm', 'Hips (cm)', 50, 200, helpText));

    await user.type(screen.getByRole('spinbutton'), '5');
    await user.tab();

    const error = screen.getByText(
      'That looks too small for centimetres. The lowest we accept is 50.'
    );
    const hint = screen.getByText(helpText);
    // The help text comes first, then the error on its own line after it.
    expect(hint.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hint.closest('p').contains(error)).toBe(false);
    // In normal flow, not the absolutely-positioned variant that sat on top of the hint.
    expect(error).toHaveClass('validationErrorInFlow');
    expect(error).not.toHaveClass('validationError');
  });

  it('uses the plain message when the bracket is not a unit it knows', async () => {
    const user = userEvent.setup();
    renderField(longFieldConfig('shoe_size_uk', 'Shoe size (UK)', 1, 20, 'Your UK shoe size.'));

    await user.type(screen.getByRole('spinbutton'), '25');
    await user.tab();

    expect(
      screen.getByText('That looks too large. The highest we accept is 20.')
    ).toBeInTheDocument();
  });

  describe('displayInInches', () => {
    const waistHelp = 'Your natural waistline in centimetres.';

    // Renders the field with the form's current values alongside, so tests can check that the
    // stored value stays in whole centimetres.
    const renderInchesField = (fieldConfig, initialValues = {}) =>
      render(
        <FinalForm
          onSubmit={() => {}}
          initialValues={initialValues}
          render={({ values }) => (
            <form>
              <CustomExtendedDataField
                name={fieldConfig.key}
                fieldConfig={fieldConfig}
                formId="TestForm"
                hintBelowInput
                displayInInches
              />
              <output data-testid="values">{JSON.stringify(values)}</output>
            </form>
          )}
        />,
        { messages: enMessages }
      );
    const storedValues = () => JSON.parse(screen.getByTestId('values').textContent);

    it('labels the field in inches and swaps the unit in the help text', () => {
      renderInchesField(longFieldConfig('waist_cm', 'Waist (cm)', 40, 200, waistHelp));
      expect(screen.getByLabelText(/^Waist \(in\)/)).toBeInTheDocument();
      expect(screen.queryByText(/Waist \(cm\)/)).not.toBeInTheDocument();
      expect(screen.getByText('Your natural waistline in inches.')).toBeInTheDocument();
    });

    it('accepts half inches and stores whole centimetres', async () => {
      const user = userEvent.setup();
      renderInchesField(longFieldConfig('waist_cm', 'Waist (cm)', 40, 200, waistHelp));

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('step', '0.5');
      await user.type(input, '32.5');

      expect(input).toHaveValue(32.5);
      expect(storedValues()).toEqual({ waist_cm: 83 });
    });

    it('shows a stored cm value in inches, to the nearest half inch', () => {
      renderInchesField(longFieldConfig('waist_cm', 'Waist (cm)', 40, 200, waistHelp), {
        waist_cm: 70,
      });
      expect(screen.getByRole('spinbutton')).toHaveValue(27.5);
      // Nothing is re-saved just by looking at it in inches.
      expect(storedValues()).toEqual({ waist_cm: 70 });
    });

    it('checks the cm minimum after conversion and gives it in inches', async () => {
      const user = userEvent.setup();
      renderInchesField(longFieldConfig('waist_cm', 'Waist (cm)', 40, 200, waistHelp));

      // 15.5 in = 39 cm, under the 40 cm minimum
      await user.type(screen.getByRole('spinbutton'), '15.5');
      await user.tab();

      expect(
        screen.getByText('That looks too small for inches. The lowest we accept is 16.')
      ).toBeInTheDocument();
      expect(screen.queryByText(/centimetres/)).not.toBeInTheDocument();
    });

    it('checks the cm maximum after conversion and gives it in inches', async () => {
      const user = userEvent.setup();
      renderInchesField(longFieldConfig('hips_cm', 'Hips (cm)', 50, 200));

      // 79 in = 201 cm, over the 200 cm maximum
      await user.type(screen.getByRole('spinbutton'), '79');
      await user.tab();

      expect(
        screen.getByText('That looks too large for inches. The highest we accept is 78.5.')
      ).toBeInTheDocument();
    });

    it('accepts the inches minimum itself', async () => {
      const user = userEvent.setup();
      renderInchesField(longFieldConfig('waist_cm', 'Waist (cm)', 40, 200, waistHelp));

      await user.type(screen.getByRole('spinbutton'), '16');
      await user.tab();

      expect(screen.queryByText(/too small/)).not.toBeInTheDocument();
      expect(storedValues()).toEqual({ waist_cm: 41 });
    });

    it('does not affect a field that is not a number field', () => {
      renderInchesField({
        key: 'notes',
        scope: 'public',
        schemaType: 'text',
        saveConfig: { label: 'Notes (cm)', isRequired: true },
      });
      expect(screen.getByLabelText(/^Notes \(cm\)/)).toBeInTheDocument();
    });
  });
});
