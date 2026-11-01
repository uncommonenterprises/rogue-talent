import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render } from '../../util/testHelpers';
import enMessages from '../../translations/en.json';

import LicenceSummary, { LICENCE_POINT_IDS } from './LicenceSummary';

const messages = Object.fromEntries(
  Object.keys(enMessages)
    .filter(k => k.startsWith('LicenceSummary.') || k === 'StripePaymentForm.licenceDraftNotice')
    .map(k => [k, enMessages[k]])
);

describe('LicenceSummary (B06, B08)', () => {
  it('client view: the draft mark, then the five plain-English points', () => {
    const { container, getByText } = render(
      <LicenceSummary audience="client" draftNotice="DRAFT. Pending legal review." />,
      { messages }
    );
    expect(getByText('DRAFT. Pending legal review.')).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(5);
    expect(getByText('Use it freely.')).toBeInTheDocument();
    expect(getByText('Limits protect the model.')).toBeInTheDocument();
  });

  it('model view: four points, in the model’s words', () => {
    const { container, getByText } = render(
      <LicenceSummary audience="model" draftNotice="DRAFT" />,
      { messages }
    );
    expect(container.querySelectorAll('li')).toHaveLength(4);
    expect(getByText('One fee, no usage fees.')).toBeInTheDocument();
    expect(container.textContent).toContain('no AI training');
  });

  it('every point has copy and none uses an em dash', () => {
    const ids = [...LICENCE_POINT_IDS.client, ...LICENCE_POINT_IDS.model];
    ids.forEach(id => {
      expect(enMessages[id]).toBeTruthy();
      expect(enMessages[id]).not.toContain('—');
    });
    expect(enMessages['StripePaymentForm.licenceDraftNotice']).not.toContain('—');
  });
});
