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
});
