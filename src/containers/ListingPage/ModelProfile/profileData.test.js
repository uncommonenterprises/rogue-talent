import { getOptionLabel } from '../../../util/modelProfile';
import { getWebsiteHref, getInstagramHref, getAverageRating, getProfileBio } from './profileData';

describe('model profile data helpers', () => {
  const config = {
    listing: {
      listingFields: [
        {
          key: 'experience_level',
          enumOptions: [
            { option: 'new-face', label: 'New Face (just starting out)' },
            { option: 'professional', label: 'Professional (full-time)' },
          ],
        },
      ],
    },
  };
  const intl = {
    messages: { 'ModelField.experience_level.new-face': 'New face' },
    formatMessage: ({ id }) => intl.messages[id],
  };

  it('prefers the short en.json label, then the field label, then the raw value', () => {
    expect(getOptionLabel(intl, config, 'experience_level', 'new-face')).toEqual('New face');
    expect(getOptionLabel(intl, config, 'experience_level', 'professional')).toEqual(
      'Professional (full-time)'
    );
    expect(getOptionLabel(intl, config, 'experience_level', 'other')).toEqual('other');
  });

  it('links websites over http(s) only', () => {
    expect(getWebsiteHref('www.thespark.company')).toEqual('https://www.thespark.company');
    expect(getWebsiteHref('https://example.com/a')).toEqual('https://example.com/a');
    expect(getWebsiteHref('javascript:alert(1)')).toBeNull();
    expect(getWebsiteHref('data:text/html,x')).toBeNull();
    expect(getWebsiteHref('two words')).toBeNull();
    expect(getWebsiteHref('')).toBeNull();
    expect(getWebsiteHref(undefined)).toBeNull();
  });

  it('builds Instagram links from handles', () => {
    expect(getInstagramHref('@thesparkdotcompany')).toEqual(
      'https://www.instagram.com/thesparkdotcompany'
    );
    expect(getInstagramHref('instagram.com/ava.c')).toEqual('https://www.instagram.com/ava.c');
    expect(getInstagramHref('https://www.instagram.com/ava.c/')).toEqual(
      'https://www.instagram.com/ava.c/'
    );
    expect(getInstagramHref('https://evil.example/ava')).toBeNull();
    expect(getInstagramHref('not a handle!')).toBeNull();
  });

  it('averages review ratings', () => {
    const r = rating => ({ attributes: { rating } });
    expect(getAverageRating([r(5), r(4)])).toEqual(4.5);
    expect(getAverageRating([])).toBeNull();
  });

  it('reads the trimmed bio from the author, or null when there is none', () => {
    const author = bio => ({ attributes: { profile: { bio } } });
    expect(getProfileBio(author('  Line one\nLine two  '))).toEqual('Line one\nLine two');
    expect(getProfileBio(author('  '))).toBeNull();
    expect(getProfileBio(author(null))).toBeNull();
    expect(getProfileBio(null)).toBeNull();
  });
});
