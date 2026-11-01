import React from 'react';
import classNames from 'classnames';

import css from './BookingStatusChip.module.css';

/**
 * Booking status chip (B09, the rt-status shape). The label carries the meaning; colour is
 * second: amber = waiting on someone, green = confirmed, cobalt tint = done, grey = ended.
 * Expired has a hollow dot, the only non-colour cue between the two grey chips. No red.
 *
 * @component
 * @param {Object} props
 * @param {'requested'|'review'|'accepted'|'completed'|'declined'|'expired'|'cancelled'} props.status
 *   the chip style (see STATUS_CHIP in util/bookingStatus.js)
 * @param {React.ReactNode} props.children the label
 * @param {boolean} [props.large]
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
const BookingStatusChip = ({ status, children, large = false, className }) => (
  <span className={classNames(css.root, css[status], { [css.large]: large }, className)}>
    <span className={css.dot} aria-hidden="true" />
    {children}
  </span>
);

export default BookingStatusChip;
