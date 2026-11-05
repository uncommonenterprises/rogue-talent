import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render } from '../../../util/testHelpers';

import { ProfileAbout } from './ProfileDetails';

const authorWithBio = bio => ({ attributes: { profile: { bio } } });

describe('ProfileAbout (tester F, F4)', () => {
  it('shows the bio as an "About" section, as plain text with line breaks kept', () => {
    const bio = 'Editorial and commercial model.\nHappy to travel. www.example.com';
    const { getByRole, container } = render(<ProfileAbout author={authorWithBio(bio)} />);

    expect(getByRole('heading', { name: 'ListingPage.aboutTitle' })).toBeInTheDocument();
    const paragraph = container.querySelector('p');
    expect(paragraph.textContent).toEqual(bio);
    // Nothing in a bio is turned into a link.
    expect(container.querySelector('a')).toBeNull();
  });

  it('hides the section when there is no bio', () => {
    [undefined, null, '', '   \n  '].forEach(bio => {
      const { container, unmount } = render(<ProfileAbout author={authorWithBio(bio)} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    });

    const { container } = render(<ProfileAbout author={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
