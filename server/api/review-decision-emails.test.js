// POST /api/cron/review-decision-emails: CRON_SECRET guard + dry-run pass-through.
// The sweep itself is mocked here (it has its own tests in api-util/decisionEmails.test.js).

const mockSweep = jest.fn();
jest.mock('../api-util/decisionEmails', () => ({
  runDecisionEmailSweep: (...args) => mockSweep(...args),
}));
jest.mock('../log', () => ({ error: jest.fn() }));

const endpoint = require('./review-decision-emails');

const originalSecret = process.env.CRON_SECRET;

const call = ({ headers = {}, query = {} } = {}) =>
  new Promise(resolve => {
    let status = 200;
    const req = {
      query,
      get: name => headers[name.toLowerCase()],
    };
    const res = {
      headersSent: false,
      status(s) {
        status = s;
        return this;
      },
      set() {
        return this;
      },
      send(payload) {
        resolve({ status, body: JSON.parse(payload) });
        return this;
      },
      end() {
        return this;
      },
    };
    endpoint(req, res);
  });

beforeEach(() => {
  mockSweep.mockReset().mockResolvedValue({ configured: true, sent: 0 });
});
afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});

describe('POST /api/cron/review-decision-emails', () => {
  it('is dormant (200, no sweep) while CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    expect(await call()).toEqual({
      status: 200,
      body: { ok: true, configured: false, reason: 'cron-secret-not-set' },
    });
    expect(mockSweep).not.toHaveBeenCalled();
  });

  it('refuses a missing or wrong secret (401, no sweep)', async () => {
    process.env.CRON_SECRET = 'right-secret';
    expect((await call()).status).toBe(401);
    expect((await call({ headers: { 'x-cron-secret': 'wrong-secret' } })).status).toBe(401);
    expect(mockSweep).not.toHaveBeenCalled();
  });

  it('runs the sweep with the right secret', async () => {
    process.env.CRON_SECRET = 'right-secret';
    const result = await call({ headers: { 'x-cron-secret': 'right-secret' } });
    expect(result).toEqual({ status: 200, body: { ok: true, configured: true, sent: 0 } });
    expect(mockSweep).toHaveBeenCalledWith({ dryRun: false });
  });

  it('passes ?dryRun=true through', async () => {
    process.env.CRON_SECRET = 'right-secret';
    await call({ headers: { authorization: 'Bearer right-secret' }, query: { dryRun: 'true' } });
    expect(mockSweep).toHaveBeenCalledWith({ dryRun: true });
  });
});
