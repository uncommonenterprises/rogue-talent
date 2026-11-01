import React from 'react';
import classNames from 'classnames';

import css from './RtIcon.module.css';

// Line icons used on the discovery and booking journey (docs/design/booking-journey/journey.css).
// 24x24 viewBox, stroke = currentColor, so the icon takes the text colour around it.
const STROKE_ICONS = {
  check: { width: 2, paths: ['M20 6L9 17l-5-5'] },
  close: { width: 1.8, paths: ['M18 6L6 18M6 6l12 12'] },
  chevronDown: { width: 1.8, paths: ['M6 9l6 6 6-6'] },
  chevronLeft: { width: 1.8, paths: ['M15 18l-6-6 6-6'] },
  chevronRight: { width: 1.8, paths: ['M9 18l6-6-6-6'] },
  arrowLeft: { width: 1.8, paths: ['M19 12H5M12 19l-7-7 7-7'] },
  search: { width: 1.8, circles: [[11, 11, 7]], paths: ['M20 20l-3.5-3.5'] },
  calendar: { width: 1.6, rects: [[3, 5, 18, 16, 2]], paths: ['M3 10h18M8 3v4M16 3v4'] },
  clock: { width: 1.6, circles: [[12, 12, 9]], paths: ['M12 7v5l3 2'] },
  pin: {
    width: 1.6,
    circles: [[12, 10, 2.5]],
    paths: ['M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z'],
  },
  sliders: {
    width: 1.6,
    circles: [[13, 8, 2.5], [9, 16, 2.5]],
    paths: ['M4 8h6M16 8h4M4 16h2M12 16h8'],
  },
  info: { width: 1.6, circles: [[12, 12, 9]], paths: ['M12 11v5M12 8h.01'] },
  lock: { width: 1.6, rects: [[5, 11, 14, 10, 2]], paths: ['M8 11V8a4 4 0 018 0v3'] },
  alert: { width: 1.6, paths: ['M12 3l10 18H2z', 'M12 10v5M12 18h.01'] },
  image: {
    width: 1.6,
    rects: [[3, 4, 18, 16, 2]],
    circles: [[9, 10, 1.8]],
    paths: ['M21 16l-5-5-8 9'],
  },
};

const STAR_PATH = 'M12 3l2.8 5.9 6.2.9-4.5 4.4 1.1 6.3L12 17.5 6.4 20.5l1.1-6.3L3 9.8l6.2-.9z';

/**
 * A design-system line icon (B01-B09 icon set). Decorative by default (aria-hidden); pass
 * `title` to give it an accessible name.
 *
 * @component
 * @param {Object} props
 * @param {string} props.name icon name, e.g. 'check', 'calendar', 'star'
 * @param {'sm'|'md'|'lg'} [props.size] 14px, 18px (default) or 24px
 * @param {string} [props.className]
 * @param {string} [props.title] accessible name (omit for decorative icons)
 * @returns {JSX.Element|null}
 */
const RtIcon = props => {
  const { name, size = 'md', className, title } = props;
  const isFilled = name === 'star';
  const classes = classNames(css.root, css[size], isFilled ? css.filled : css.stroke, className);
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  if (isFilled) {
    return (
      <svg className={classes} viewBox="0 0 24 24" fill="currentColor" focusable="false" {...a11y}>
        <path d={STAR_PATH} />
      </svg>
    );
  }

  const icon = STROKE_ICONS[name];
  if (!icon) {
    return null;
  }
  const { width, paths = [], circles = [], rects = [] } = icon;
  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...a11y}
    >
      {rects.map(([x, y, w, h, rx]) => (
        <rect key={`r${x}${y}`} x={x} y={y} width={w} height={h} rx={rx} />
      ))}
      {circles.map(([cx, cy, r]) => (
        <circle key={`c${cx}${cy}`} cx={cx} cy={cy} r={r} />
      ))}
      {paths.map(d => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
};

export default RtIcon;
