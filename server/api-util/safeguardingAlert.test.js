jest.mock('./mailer', () => ({ sendMail: jest.fn() }));
jest.mock('../log', () => ({ error: jest.fn() }));

const { sendMail } = require('./mailer');
const { sendSafeguardingAlert, ALERT_UNDER_18, ALERT_HELD } = require('./safeguardingAlert');

describe('sendSafeguardingAlert', () => {
  beforeEach(() => sendMail.mockReset());

  it('emails the safety inbox with the user id and no date of birth', async () => {
    sendMail.mockResolvedValue({ sent: true });
    const ok = await sendSafeguardingAlert({
      kind: ALERT_UNDER_18,
      userId: 'user-123',
      userType: 'client',
      source: 'Stripe Identity (client ID check)',
    });
    expect(ok).toBe(true);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('safety@roguetalent.co');
    expect(mail.subject).toMatch(/Under-18 client blocked/);
    expect(mail.textBody).toMatch(/user-123/);
    expect(mail.textBody).not.toMatch(/dob|date of birth:|\d{2}\/\d{2}\/\d{4}/i);
    expect(mail.textBody).not.toMatch(/—/);
  });

  it('uses the held wording for a previously flagged account', async () => {
    sendMail.mockResolvedValue({ sent: true });
    await sendSafeguardingAlert({ kind: ALERT_HELD, userId: 'u', userType: 'client', source: 's' });
    expect(sendMail.mock.calls[0][0].subject).toMatch(/held for review/);
  });

  it('never throws when mail fails', async () => {
    sendMail.mockRejectedValue(new Error('boom'));
    await expect(
      sendSafeguardingAlert({ userId: 'u', userType: 'model', source: 's' })
    ).resolves.toBe(false);
  });

  it('returns false when mail is not configured', async () => {
    sendMail.mockResolvedValue({ sent: false, skipped: true });
    await expect(sendSafeguardingAlert({ userId: 'u' })).resolves.toBe(false);
  });
});
