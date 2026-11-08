import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { NamedLink, Notice, RtIcon } from '../../../components';

import { getBookingPanelState } from '../bookingPanelState';
import {
  VIEWER_CHECK_STATUS,
  VIEWER_DATES,
  VIEWER_LOGGED_OUT,
  VIEWER_MODEL_ACCOUNT,
  VIEWER_OWN,
  VIEWER_PENDING,
  VIEWER_VERIFY_IDENTITY,
  getAvailabilityViewerState,
} from '../availabilityViewer';

import AvailabilityCalendar from './AvailabilityCalendar';

import css from './ProfileAvailability.module.css';

// min_booking_notice values that have a "48 hours'" style phrase (BookingDatesForm.noticePhrase.*).
// 'same-day' and an unset notice mean only today is held back.
const NOTICE_PHRASE_KEYS = ['24-hours', '48-hours', '1-week', '2-weeks'];

const LOCKED_MESSAGE_IDS = {
  [VIEWER_LOGGED_OUT]: 'ProfileAvailability.lockedLoggedOut',
  [VIEWER_PENDING]: 'ProfileAvailability.lockedPending',
  [VIEWER_VERIFY_IDENTITY]: 'ProfileAvailability.lockedVerify',
  [VIEWER_CHECK_STATUS]: 'ProfileAvailability.lockedCheckStatus',
  [VIEWER_MODEL_ACCOUNT]: 'ProfileAvailability.lockedModelAccount',
};

// In the desktop panel these states already show their own notice box underneath, so the
// availability line is a quiet one-liner rather than a second box.
const QUIET_IN_PANEL = [VIEWER_PENDING, VIEWER_VERIFY_IDENTITY];

/**
 * Availability on a model's profile (B03b): the heading, the read-only calendar, the legend and
 * the honest note, or, for anyone who may not see free dates (decision 2, 08/11/2026), a short
 * line in the same place with no dates. The model sees their own calendar as a read-only preview
 * with a link to edit it.
 *
 * Two placements: `panel` (inside the desktop booking panel, under the rate) and `section` (a
 * section in the profile body on phones, where the "Next free" chips always show).
 *
 * @component
 * @param {Object} props
 * @param {'panel'|'section'} [props.variant]
 * @param {string} [props.viewerState] VIEWER_* (availabilityViewer.js); computed from the
 *   account props below when not given
 * @param {boolean} [props.isAuthenticated]
 * @param {Object} [props.currentUser]
 * @param {boolean} [props.isOwnListing]
 * @param {boolean} [props.isClosed]
 * @param {string} props.modelName first name used in sentences
 * @param {string} [props.noticeKey] min_booking_notice
 * @param {Function} [props.onPickDate] dayKey => void (hand-off to the date picker)
 * @param {Object} [props.editParams] own profile: EditListingPage params
 * @param {boolean} [props.hideCalendar] render the "no dates" line if it applies, but not the
 *   calendar (used before the screen width is known, and on phones for the hidden panel)
 * @returns {JSX.Element|null}
 */
const ProfileAvailability = props => {
  const intl = useIntl();
  const {
    className,
    variant = 'panel',
    viewerState: viewerStateMaybe,
    isAuthenticated,
    currentUser,
    isOwnListing,
    isClosed,
    modelName,
    noticeKey,
    onPickDate,
    editParams,
    hideCalendar = false,
    ...calendarProps
  } = props;

  const viewerState =
    viewerStateMaybe ||
    getAvailabilityViewerState({
      panelState: getBookingPanelState({ isAuthenticated, currentUser, isOwnListing, isClosed }),
      currentUser,
    });
  const isPanel = variant === 'panel';
  const isOwn = viewerState === VIEWER_OWN;
  const showsCalendar = viewerState === VIEWER_DATES || isOwn;
  const lockedMessageId = LOCKED_MESSAGE_IDS[viewerState];

  if ((!showsCalendar && !lockedMessageId) || (showsCalendar && hideCalendar)) {
    // Closed profile, still finding out who is looking, or the calendar belongs to the other
    // layout (the panel is hidden on phones): show nothing.
    return null;
  }

  const heading = isPanel ? (
    <h3 className={css.heading}>
      <FormattedMessage id={isOwn ? 'ProfileAvailability.titleOwn' : 'ProfileAvailability.title'} />
    </h3>
  ) : null;

  if (!showsCalendar) {
    const message = <FormattedMessage id={lockedMessageId} values={{ name: modelName }} />;
    return (
      <div className={classNames(css.root, className)}>
        {heading}
        {isPanel && QUIET_IN_PANEL.includes(viewerState) ? (
          <p className={css.quietLine}>
            <RtIcon name="lock" className={css.quietIcon} />
            <span>{message}</span>
          </p>
        ) : (
          <Notice icon="lock">
            <p>{message}</p>
          </Notice>
        )}
      </div>
    );
  }

  const hasNoticePhrase = NOTICE_PHRASE_KEYS.includes(noticeKey);
  const notice = hasNoticePhrase
    ? intl.formatMessage({ id: `BookingDatesForm.noticePhrase.${noticeKey}` })
    : null;
  const noteId = isOwn
    ? hasNoticePhrase
      ? 'ProfileAvailability.ownNote'
      : 'ProfileAvailability.ownNoteNoNotice'
    : hasNoticePhrase
    ? 'ProfileAvailability.note'
    : 'ProfileAvailability.noteNoNotice';

  return (
    <div className={classNames(css.root, className)}>
      {heading}
      <AvailabilityCalendar
        {...calendarProps}
        modelName={modelName}
        noticeKey={noticeKey}
        readOnly={isOwn}
        onPickDate={isOwn ? null : onPickDate}
        nextFreeMode={isPanel ? 'sparse' : 'always'}
        className={isPanel ? null : css.framedCalendar}
      />
      <div className={css.legend} aria-hidden="true">
        <span className={css.legendItem}>
          <i className={css.legendFree} />
          <FormattedMessage id="ProfileAvailability.legendFree" />
        </span>
        <span className={css.legendItem}>
          <i className={css.legendUnavailable} />
          <FormattedMessage id="ProfileAvailability.legendUnavailable" />
        </span>
      </div>
      {!isPanel && !isOwn ? (
        <p className={css.hint}>
          <FormattedMessage id="ProfileAvailability.tapHint" />
        </p>
      ) : null}
      <p className={css.note}>
        <FormattedMessage id={noteId} values={{ name: modelName, notice }} />
      </p>
      {isOwn && editParams?.id ? (
        <NamedLink
          name="EditListingPage"
          params={{ ...editParams, tab: 'availability' }}
          className={css.secondaryLink}
        >
          <FormattedMessage id="ProfileAvailability.editAvailability" />
        </NamedLink>
      ) : null}
    </div>
  );
};

export default ProfileAvailability;
