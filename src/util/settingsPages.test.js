import { createCurrentUser } from './testData';
import { showProfileSettingsForUser, showSafetySettingsForUser } from './settingsPages';

const userOfType = userType =>
  createCurrentUser('u1', {
    profile: { firstName: 'A', lastName: 'B', publicData: { userType } },
  });

describe('settingsPages', () => {
  it('shows Profile settings to clients but never to models', () => {
    expect(showProfileSettingsForUser(userOfType('client'))).toBe(true);
    expect(showProfileSettingsForUser(userOfType('model'))).toBe(false);
  });

  it('hides Profile settings while the current user is loading', () => {
    expect(showProfileSettingsForUser(null)).toBe(false);
    expect(showProfileSettingsForUser(undefined)).toBe(false);
  });

  it('shows the Safety page to models only', () => {
    expect(showSafetySettingsForUser(userOfType('model'))).toBe(true);
    expect(showSafetySettingsForUser(userOfType('client'))).toBe(false);
    expect(showSafetySettingsForUser(null)).toBe(false);
  });
});
