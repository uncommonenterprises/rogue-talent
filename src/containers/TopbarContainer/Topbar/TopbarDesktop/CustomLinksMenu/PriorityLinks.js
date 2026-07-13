import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../../util/reactIntl';

import { ExternalLink, NamedLink } from '../../../../../components';

import css from './PriorityLinks.module.css';

// The topbar's primary provider action: a model who already has a profile links to it
// ("My profile"); otherwise the link invites them to create one. Shared with CustomLinksMenu.
export const primaryActionLink = (currentUser, currentUserHasListings) => {
  const userId = currentUser?.id?.uuid;
  return currentUserHasListings && userId
    ? { name: 'ProfilePage', params: { id: userId }, labelId: 'TopbarDesktop.myProfile' }
    : { name: 'NewListingPage', params: {}, labelId: 'TopbarDesktop.createListing' };
};

/**
 * Create component that shows only a single primary link (create profile / my profile).
 *
 * @param {*} props contains customLinksMenuClass, currentUser, currentUserHasListings
 * @returns div with only one link inside.
 */
export const CreateListingMenuLink = props => {
  const { customLinksMenuClass, currentUser, currentUserHasListings } = props;
  const { name, params, labelId } = primaryActionLink(currentUser, currentUserHasListings);
  return (
    <div className={customLinksMenuClass}>
      <NamedLink name={name} params={params} className={classNames(css.priorityLink, css.highlight)}>
        <span className={css.priorityLinkLabel}>
          <FormattedMessage id={labelId} />
        </span>
      </NamedLink>
    </div>
  );
};

/**
 * Link component that can be used on TopbarDesktop.
 *
 * @param {*} props containing linkConfig including resolved 'route' params for NamedLink.
 * @returns NamedLink or ExternalLink component based on config.
 */
const PriorityLink = ({ linkConfig }) => {
  const { text, type, href, route, highlight } = linkConfig;
  const classes = classNames(css.priorityLink, { [css.highlight]: highlight });
  const id = `priority-link-${text.toLowerCase().replace(/ /g, '-')}`;

  // Note: if the config contains 'route' keyword,
  // then in-app linking config has been resolved already.
  if (type === 'internal' && route) {
    // Internal link
    const { name, params, to } = route || {};
    return (
      <NamedLink name={name} params={params} to={to} className={classes} id={id}>
        <span className={css.priorityLinkLabel}>{text}</span>
      </NamedLink>
    );
  }
  return (
    <ExternalLink href={href} className={classes}>
      <span className={css.priorityLinkLabel}>{text}</span>
    </ExternalLink>
  );
};

/**
 * Create priority links, which are visible on the desktop layout on the Topbar.
 * If space is limited, this doesn't include anything to the Topbar.
 *
 * @param {*} props contains links array and setLinks function
 * @returns container div with priority links included.
 */
const PriorityLinks = props => {
  const containerRef = useRef(null);

  // With this useEffect, we measure the widths of each rendered priority link
  // This is done once before the real rendering and it's done outside the viewport.
  useEffect(() => {
    const isMeasured = props.links?.[0]?.width;
    if (containerRef.current && !isMeasured) {
      const linksFromRenderedWrapper = [...containerRef.current.childNodes];
      let cumulatedWidth = 0;
      // Generate an array of link configs with width & cumulatedWidth included
      const linksWithWidths = props.links.reduce((links, l, i) => {
        const width = linksFromRenderedWrapper[i].offsetWidth;
        cumulatedWidth = cumulatedWidth + width;
        return [...links, { ...l, width, cumulatedWidth }];
      }, []);
      props.setLinks(linksWithWidths);
    }
  }, [containerRef]);

  const { links, priorityLinks } = props;
  const isServer = typeof window === 'undefined';
  const isMeasured = links?.[0]?.width && (priorityLinks.length === 0 || priorityLinks?.[0]?.width);
  const styleWrapper = !!isMeasured
    ? {}
    : {
        style: {
          position: 'absolute',
          top: '-2000px',
          left: '-2000px',
          width: '100%',
          height: 'var(--topbarHeightDesktop)',
          display: 'flex',
          flexDirection: 'row',
        },
      };
  const linkConfigs = isMeasured ? priorityLinks : links;

  return isMeasured || isServer ? (
    <div className={css.priorityLinkWrapper} {...styleWrapper} ref={containerRef}>
      {linkConfigs.map((linkConfig, index) => {
        return <PriorityLink key={`${linkConfig.text}_${index}`} linkConfig={linkConfig} />;
      })}
    </div>
  ) : (
    ReactDOM.createPortal(
      <div className={css.priorityLinkWrapper} {...styleWrapper} ref={containerRef}>
        {linkConfigs.map((linkConfig, index) => {
          return <PriorityLink key={`${linkConfig.text}_${index}`} linkConfig={linkConfig} />;
        })}
      </div>,
      document.body
    )
  );
};

export default PriorityLinks;
