import React from 'react';
import classNames from 'classnames';

import RtIcon from '../RtIcon/RtIcon';

import css from './Notice.module.css';

const DEFAULT_ICONS = { info: 'info', error: 'alert', warn: 'alert' };

/**
 * Calm notice box from the booking journey (B03/B04): an icon and a short paragraph on a
 * subtle surface. `error` is the only red variant (red = danger/errors only).
 *
 * @component
 * @param {Object} props
 * @param {'info'|'error'|'warn'} [props.variant] default 'info'
 * @param {string} [props.icon] RtIcon name; defaults by variant
 * @param {string} [props.className]
 * @param {string} [props.role] e.g. 'alert' for errors
 * @param {React.ReactNode} props.children the message
 * @returns {JSX.Element}
 */
const Notice = props => {
  const { variant = 'info', icon, className, role, children } = props;
  const classes = classNames(css.root, css[variant], className);
  return (
    <div className={classes} role={role}>
      <RtIcon name={icon || DEFAULT_ICONS[variant]} className={css.icon} />
      <div className={css.body}>{children}</div>
    </div>
  );
};

export default Notice;
