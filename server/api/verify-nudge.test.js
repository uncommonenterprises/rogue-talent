// Account-status Step 4 — verify-nudge ENDPOINT tests (auth + fail-safe wiring).
//
// Covers: dormant when CRON_SECRET is unset (200 not-configured), 401 on missing/bad
// secret (constant-time compare), success path invokes the sweep and returns its summary,
// dryRun passthrough, and that a rejected sweep still yields a 200 (never crashes).

jest.mock('../log', () => ({ error: jest.fn() }));
jest.mock('../api-util/verifyNudge', () => ({ runVerifyNudgeSweep: jest.fn() }));

const { runVerifyNudgeSweep } = require('../api-util/verifyNudge');
const handler = require('./verify-nudge');

// Minimal Express-like req/res doubles.
const makeReq = ({ headers = {}, query = {} } = {}) => ({
  headers,
  query,
  get(name) {
    return this.headers[name.toLowerCase()];
  },
});

const makeRes = () => {
  const res = {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set() {
      return this;
    },
    send(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
};

const parse = res => JSON.parse(res.body);

const SECRET = 'super-secret-value';

beforeEach(() => {
  runVerifyNudgeSweep.mockReset();
  delete process.env.CRON_SECRET;
});

describe('verify-nudge endpoint', () => {
  it('is dormant (200 not-configured) when CRON_SECRET is unset', async () => {
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-cron-secret': 'anything' } }), res);
    expect(res.statusCode).toBe(200);
    expect(parse(res)).toMatchObject({ configured: false, reason: 'cron-secret-not-set' });
    expect(runVerifyNudgeSweep).not.toHaveBeenCalled();
  });

  it('401s when the secret is missing', async () => {
    process.env.CRON_SECRET = SECRET;
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(401);
    expect(runVerifyNudgeSweep).not.toHaveBeenCalled();
  });

  it('401s when the secret is wrong (incl. different length)', async () => {
    process.env.CRON_SECRET = SECRET;
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-cron-secret': 'nope' } }), res);
    expect(res.statusCode).toBe(401);
    expect(runVerifyNudgeSweep).not.toHaveBeenCalled();
  });

  it('accepts the secret via X-Cron-Secret header and returns the sweep summary', async () => {
    process.env.CRON_SECRET = SECRET;
    runVerifyNudgeSweep.mockResolvedValue({ configured: true, nudged: 3 });
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-cron-secret': SECRET } }), res);
    expect(res.statusCode).toBe(200);
    expect(parse(res)).toMatchObject({ ok: true, configured: true, nudged: 3 });
    expect(runVerifyNudgeSweep).toHaveBeenCalledWith({ dryRun: false });
  });

  it('accepts the secret via Authorization: Bearer and passes dryRun through', async () => {
    process.env.CRON_SECRET = SECRET;
    runVerifyNudgeSweep.mockResolvedValue({ configured: true, dryRun: true, nudged: 0 });
    const res = makeRes();
    await handler(
      makeReq({ headers: { authorization: `Bearer ${SECRET}` }, query: { dryRun: 'true' } }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(runVerifyNudgeSweep).toHaveBeenCalledWith({ dryRun: true });
  });

  it('accepts the secret via ?secret= query param', async () => {
    process.env.CRON_SECRET = SECRET;
    runVerifyNudgeSweep.mockResolvedValue({ configured: true, nudged: 0 });
    const res = makeRes();
    await handler(makeReq({ query: { secret: SECRET } }), res);
    expect(res.statusCode).toBe(200);
    expect(runVerifyNudgeSweep).toHaveBeenCalled();
  });

  it('still returns 200 if the sweep rejects (never crashes)', async () => {
    process.env.CRON_SECRET = SECRET;
    runVerifyNudgeSweep.mockRejectedValue(new Error('unexpected'));
    const res = makeRes();
    await handler(makeReq({ headers: { 'x-cron-secret': SECRET } }), res);
    expect(res.statusCode).toBe(200);
    expect(parse(res)).toMatchObject({ ok: true, configured: false, reason: 'error' });
  });
});
