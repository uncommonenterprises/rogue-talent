import React, { act } from 'react';
import '@testing-library/jest-dom';

import { createCurrentUser, fakeIntl } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { SafetySettingsPageComponent } from './SafetySettingsPage';
import { getSafetyBoundariesUpdate, hasNoPrivateResidenceBoundary } from './safetyBoundaries';

// The server's own SAF-14 check (the code that silently blocks private-residence bookings), so
// the test proves the saved value is read exactly as before. Its logger is stubbed: it pulls in
// server-only monitoring that isn't needed here.
jest.mock('../../../server/log', () => ({ error: () => null }));
const { providerBlocksPrivateResidence } = require('../../../server/api-util/residenceBoundary');

const { screen, userEvent } = testingLibrary;
const noop = () => null;

const LABEL = 'SafetySettingsForm.noPrivateResidenceLabel';
const SAVE = 'SafetySettingsForm.saveChanges';

// Captured from the old Profile settings page (ProfileSettingsPage handleSubmit, before the
// move) by rendering it as a model, ticking or unticking the checkbox and saving: the
// privateData it sent to updateProfile.
const OLD_PROFILE_SETTINGS_PRIVATE_DATA = {
  on: { safety_boundaries: { no_private_residence: true } },
  off: { safety_boundaries: { no_private_residence: false } },
};

const userWith = (userType, privateData = {}) =>
  createCurrentUser('user-1', {
    profile: {
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane D.',
      publicData: { userType },
      privateData,
    },
  });

const renderPage = async (currentUser, onSubmitSafetyBoundaries) => {
  let rendered;
  await act(async () => {
    rendered = render(
      <SafetySettingsPageComponent
        currentUser={currentUser}
        onSubmitSafetyBoundaries={onSubmitSafetyBoundaries}
        scrollingDisabled={false}
        intl={fakeIntl}
      />
    );
  });
  return rendered;
};

const toggleAndSave = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(LABEL));
  await user.click(screen.getByRole('button', { name: SAVE }));
};

describe('SafetySettingsPage (SAF-13 private-residence boundary, F5 part C)', () => {
  it('saves exactly the payload Profile settings used to send', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    await renderPage(userWith('model'), onSubmit);

    expect(screen.getByLabelText(LABEL)).not.toBeChecked();
    await toggleAndSave();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    // Only the boundary is sent, and it is identical to the old page's privateData.
    expect(payload).toEqual({ privateData: OLD_PROFILE_SETTINGS_PRIVATE_DATA.on });
    expect(JSON.stringify(payload.privateData)).toEqual(
      JSON.stringify(OLD_PROFILE_SETTINGS_PRIVATE_DATA.on)
    );
    // ...and the server's SAF-14 check reads it as "blocks private-residence shoots".
    expect(providerBlocksPrivateResidence(payload.privateData)).toBe(true);
  });

  it('round-trips: saved on shows ticked, unticking saves off, and off shows unticked', async () => {
    // 1. Saved on (as written by the old page): the box starts ticked.
    const onSubmit = jest.fn(() => Promise.resolve());
    const { unmount } = await renderPage(
      userWith('model', OLD_PROFILE_SETTINGS_PRIVATE_DATA.on),
      onSubmit
    );
    expect(screen.getByLabelText(LABEL)).toBeChecked();

    // 2. Untick and save: identical to the old page's "off" payload.
    await toggleAndSave();
    const offPayload = onSubmit.mock.calls[0][0];
    expect(offPayload).toEqual({ privateData: OLD_PROFILE_SETTINGS_PRIVATE_DATA.off });
    expect(providerBlocksPrivateResidence(offPayload.privateData)).toBe(false);
    unmount();

    // 3. The saved "off" value reads back unticked; ticking it again saves "on".
    const onSubmitAgain = jest.fn(() => Promise.resolve());
    await renderPage(userWith('model', offPayload.privateData), onSubmitAgain);
    expect(screen.getByLabelText(LABEL)).not.toBeChecked();
    await toggleAndSave();
    expect(onSubmitAgain.mock.calls[0][0]).toEqual({
      privateData: OLD_PROFILE_SETTINGS_PRIVATE_DATA.on,
    });
  });

  it('keeps the explanatory copy and shows the Safety tab in the side nav', async () => {
    await renderPage(userWith('model'), jest.fn(() => Promise.resolve()));
    expect(screen.getByText('SafetySettingsForm.safetyBoundariesHeading')).toBeInTheDocument();
    expect(screen.getByText('SafetySettingsForm.noPrivateResidenceInfo')).toBeInTheDocument();
    expect(screen.getByText('SafetySettingsPage.intro')).toBeInTheDocument();
    expect(
      screen.getAllByText('LayoutWrapperAccountSettingsSideNav.safetyTabTitle').length
    ).toBeGreaterThan(0);
  });

  it('does not show the control to clients (they are sent to Contact details)', async () => {
    await renderPage(userWith('client'), jest.fn());
    expect(screen.queryByLabelText(LABEL)).not.toBeInTheDocument();
  });

  it('shows nothing to save while the current user is loading', async () => {
    await renderPage(null, jest.fn());
    expect(screen.queryByLabelText(LABEL)).not.toBeInTheDocument();
  });
});

describe('safetyBoundaries helpers', () => {
  it('only an explicit true switches the boundary on', () => {
    expect(getSafetyBoundariesUpdate(true)).toEqual({
      privateData: OLD_PROFILE_SETTINGS_PRIVATE_DATA.on,
    });
    expect(getSafetyBoundariesUpdate(false)).toEqual({
      privateData: OLD_PROFILE_SETTINGS_PRIVATE_DATA.off,
    });
    expect(getSafetyBoundariesUpdate(undefined)).toEqual({
      privateData: OLD_PROFILE_SETTINGS_PRIVATE_DATA.off,
    });
  });

  it('reads the saved boundary from the current user', () => {
    expect(
      hasNoPrivateResidenceBoundary(userWith('model', OLD_PROFILE_SETTINGS_PRIVATE_DATA.on))
    ).toBe(true);
    expect(
      hasNoPrivateResidenceBoundary(userWith('model', OLD_PROFILE_SETTINGS_PRIVATE_DATA.off))
    ).toBe(false);
    expect(hasNoPrivateResidenceBoundary(userWith('model'))).toBe(false);
    expect(hasNoPrivateResidenceBoundary(null)).toBe(false);
  });
});
