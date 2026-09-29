import reducer, {
  dismissVerifiedNotice,
  showVerifiedNoticeOnPath,
  verifyEmail,
} from './emailVerification.duck';
import { locationChanged } from './routing.duck';

const moveTo = pathname => locationChanged({ location: { pathname }, canonicalPath: pathname });
const run = actions => actions.reduce((state, action) => reducer(state, action), undefined);
const asState = emailVerification => ({ emailVerification });

describe('emailVerification duck - screen 05 "Your email is verified." banner', () => {
  it('is hidden until an email is verified', () => {
    const state = run([moveTo('/verify-email'), moveTo('/s')]);
    expect(state.verifiedNoticeVisible).toBe(false);
    expect(showVerifiedNoticeOnPath(asState(state), '/s')).toBe(false);
  });

  it('shows on the first destination after verifying, skipping the redirect hops', () => {
    const draftPath = '/l/draft/00000000-0000-0000-0000-000000000000/new/profile';
    const state = run([
      moveTo('/verify-email'),
      verifyEmail.fulfilled(true, 'requestId', 'token'),
      moveTo('/l/new'),
      moveTo(draftPath),
    ]);
    expect(showVerifiedNoticeOnPath(asState(state), draftPath)).toBe(true);
    // Not on the verify page itself
    expect(showVerifiedNoticeOnPath(asState(state), '/verify-email')).toBe(false);
  });

  it('is one-off: it goes away once the user moves to another page', () => {
    const state = run([
      verifyEmail.fulfilled(true, 'requestId', 'token'),
      moveTo('/s'),
      moveTo('/l/some-model/123'),
    ]);
    expect(state.verifiedNoticeVisible).toBe(false);
    expect(showVerifiedNoticeOnPath(asState(state), '/s')).toBe(false);
  });

  it('can be dismissed', () => {
    const state = run([
      verifyEmail.fulfilled(true, 'requestId', 'token'),
      moveTo('/s'),
      dismissVerifiedNotice(),
    ]);
    expect(showVerifiedNoticeOnPath(asState(state), '/s')).toBe(false);
  });
});
