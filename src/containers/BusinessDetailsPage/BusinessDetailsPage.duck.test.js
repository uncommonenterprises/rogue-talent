import { saveBusinessDetails } from './BusinessDetailsPage.duck';
import { isResubmission } from './BusinessDetailsPage';

// The resubmit endpoint and the currentUser re-fetch are stubbed: nothing leaves the test.
jest.mock('../../util/api', () => ({
  resubmitForReview: jest.fn(),
}));
jest.mock('../../ducks/user.duck', () => ({
  fetchCurrentUser: () => () => Promise.resolve(null),
}));

const { resubmitForReview } = require('../../util/api');

// A minimal thunk-capable dispatch with the SDK as the thunk extra argument (as in store.js).
const makeDispatch = sdk => {
  const dispatch = action =>
    typeof action === 'function' ? action(dispatch, () => ({}), sdk) : action;
  return dispatch;
};

const payload = { publicData: { company_name: 'Northside Studio' } };

describe('BusinessDetailsPage duck: resubmission after a decline', () => {
  beforeEach(() => {
    resubmitForReview.mockReset();
  });

  it('a normal submit saves the details and does not call the resubmit endpoint', async () => {
    const updateProfile = jest.fn(() => Promise.resolve({ data: {} }));
    const dispatch = makeDispatch({ currentUser: { updateProfile } });
    await dispatch(saveBusinessDetails(payload));
    expect(updateProfile).toHaveBeenCalledWith(payload);
    expect(resubmitForReview).not.toHaveBeenCalled();
  });

  it('a resubmission saves the details FIRST, then clears the decline', async () => {
    const calls = [];
    const updateProfile = jest.fn(() => {
      calls.push('save');
      return Promise.resolve({ data: {} });
    });
    resubmitForReview.mockImplementation(() => {
      calls.push('resubmit');
      return Promise.resolve({ ok: true, resubmitted: true });
    });
    const dispatch = makeDispatch({ currentUser: { updateProfile } });
    await dispatch(saveBusinessDetails(payload, { resubmit: true }));
    expect(calls).toEqual(['save', 'resubmit']);
  });

  it('a failed resubmission rejects, so the page stays and shows the error', async () => {
    const updateProfile = jest.fn(() => Promise.resolve({ data: {} }));
    resubmitForReview.mockImplementation(() => Promise.reject(new Error('409')));
    const dispatch = makeDispatch({ currentUser: { updateProfile } });
    await expect(dispatch(saveBusinessDetails(payload, { resubmit: true }))).rejects.toBeTruthy();
  });

  it('a failed save never calls the resubmit endpoint', async () => {
    const updateProfile = jest.fn(() => Promise.reject(new Error('save failed')));
    const dispatch = makeDispatch({ currentUser: { updateProfile } });
    await expect(dispatch(saveBusinessDetails(payload, { resubmit: true }))).rejects.toBeTruthy();
    expect(resubmitForReview).not.toHaveBeenCalled();
  });
});

describe('BusinessDetailsPage: isResubmission', () => {
  const client = metadata => ({
    id: { uuid: 'c1' },
    attributes: { state: 'active', profile: { publicData: { userType: 'client' }, metadata } },
  });

  it('only for a declined client with the lifecycle on', () => {
    expect(isResubmission(true, client({ reviewDecision: 'declined' }))).toBe(true);
    expect(isResubmission(false, client({ reviewDecision: 'declined' }))).toBe(false);
    expect(isResubmission(true, client({ reviewDecision: 'approved' }))).toBe(false);
    expect(isResubmission(true, client({}))).toBe(false);
  });
});
