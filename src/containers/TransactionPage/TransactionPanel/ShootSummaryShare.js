import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { LINE_ITEM_DAY, LINE_ITEM_NIGHT } from '../../../util/types';
import { formatDateIntoPartials, subtractTime, isSameDay } from '../../../util/dates';
import { Heading, SecondaryButton } from '../../../components';

import css from './TransactionPanel.module.css';

/**
 * Build the "when" line for the shoot summary from the booking dates.
 * For day/night bookings the end date is exclusive, so we show the inclusive
 * end and render a single date when start and end fall on the same day.
 */
const buildWhen = (booking, lineItemUnitType, timeZone, intl) => {
  const attrs = booking?.attributes;
  if (!attrs) {
    return null;
  }
  const { start, end, displayStart, displayEnd } = attrs;
  const startDate = displayStart || start;
  const endRaw = displayEnd || end;
  if (!startDate || !endRaw) {
    return null;
  }

  const isDayOrNight = [LINE_ITEM_DAY, LINE_ITEM_NIGHT].includes(lineItemUnitType);
  const endDate = isDayOrNight ? subtractTime(endRaw, 1, 'days') : endRaw;
  const opts = { timeZone };

  if (isDayOrNight) {
    // Day-based bookings have no meaningful clock times — show date(s) only.
    const startPartials = formatDateIntoPartials(startDate, intl, opts);
    if (isSameDay(startDate, endDate, timeZone)) {
      return startPartials.date;
    }
    const endPartials = formatDateIntoPartials(endDate, intl, opts);
    return `${startPartials.date} – ${endPartials.date}`;
  }

  // Hourly (or other) bookings: show date + times.
  const startPartials = formatDateIntoPartials(startDate, intl, opts);
  const endPartials = formatDateIntoPartials(endRaw, intl, opts);
  if (isSameDay(startDate, endRaw, timeZone)) {
    return `${startPartials.date}, ${startPartials.time} – ${endPartials.time}`;
  }
  return `${startPartials.dateAndTime} – ${endPartials.dateAndTime}`;
};

/**
 * SAF-17: Shareable shoot summary for the MODEL on a confirmed booking.
 *
 * Produces a complete summary (client name + registered company, when, where,
 * shoot type) that the model shares via HER OWN apps using the Web Share API,
 * with a copy-to-clipboard fallback. Rogue Talent is NOT the channel and does
 * NOT contact anyone or monitor anything — this only helps her tell someone
 * where she'll be. `navigator`/`window` access is guarded for SSR safety.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.show - Whether to render the share block
 * @param {Object} props.booking - The booking entity (attributes.start/end)
 * @param {string} [props.timeZone] - IANA time zone of the listing availability
 * @param {string} [props.lineItemUnitType] - e.g. 'line-item/day'
 * @param {string} [props.shootAddress] - Address from order protectedData
 * @param {string} [props.shootType] - Human-readable shoot type label
 * @param {string} [props.clientName] - Client display name
 * @param {string} [props.clientCompany] - Client registered company/agency
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @returns {JSX.Element|null}
 */
const ShootSummaryShare = props => {
  const intl = useIntl();
  const [copyState, setCopyState] = useState('idle');

  const {
    show,
    booking,
    timeZone,
    lineItemUnitType,
    shootAddress,
    shootType,
    clientName,
    clientCompany,
    className,
    rootClassName,
  } = props;

  if (!show) {
    return null;
  }

  const when = buildWhen(booking, lineItemUnitType, timeZone, intl);

  // Assemble the summary as labelled lines, skipping anything we don't have.
  const lines = [intl.formatMessage({ id: 'TransactionPanel.shootSummaryTextHeading' }), ''];
  if (clientName) {
    lines.push(
      intl.formatMessage({ id: 'TransactionPanel.shootSummaryTextClient' }, { name: clientName })
    );
  }
  if (clientCompany) {
    lines.push(
      intl.formatMessage(
        { id: 'TransactionPanel.shootSummaryTextCompany' },
        { company: clientCompany }
      )
    );
  }
  if (when) {
    lines.push(intl.formatMessage({ id: 'TransactionPanel.shootSummaryTextWhen' }, { when }));
  }
  if (shootAddress) {
    lines.push(
      intl.formatMessage({ id: 'TransactionPanel.shootSummaryTextWhere' }, { address: shootAddress })
    );
  }
  if (shootType) {
    lines.push(
      intl.formatMessage({ id: 'TransactionPanel.shootSummaryTextShootType' }, { type: shootType })
    );
  }
  lines.push('');
  lines.push(intl.formatMessage({ id: 'TransactionPanel.shootSummaryTextFooter' }));

  const summaryText = lines.join('\n');
  const shareTitle = intl.formatMessage({ id: 'TransactionPanel.shootSummaryShareTitle' });

  // Web Share API when available (mobile), copy-to-clipboard fallback otherwise.
  // All navigator/window access is guarded so SSR never touches these APIs.
  const canWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(summaryText);
        setCopyState('copied');
        return;
      } catch (e) {
        // fall through to manual-copy hint
      }
    }
    setCopyState('error');
  };

  const handleShare = async () => {
    if (canWebShare) {
      try {
        await navigator.share({ title: shareTitle, text: summaryText });
        return;
      } catch (e) {
        // User dismissed the share sheet or it failed — fall back to copy.
      }
    }
    handleCopy();
  };

  const classes = classNames(rootClassName || css.shootSummary, className);
  const buttonLabelId = canWebShare
    ? 'TransactionPanel.shootSummaryShareButton'
    : copyState === 'copied'
    ? 'TransactionPanel.shootSummaryCopiedButton'
    : 'TransactionPanel.shootSummaryCopyButton';

  return (
    <section className={classes}>
      <Heading as="h3" rootClassName={css.shootSummaryHeading}>
        <FormattedMessage id="TransactionPanel.shootSummaryHeading" />
      </Heading>
      <p className={css.shootSummaryIntro}>
        <FormattedMessage id="TransactionPanel.shootSummaryIntro" />
      </p>

      <pre className={css.shootSummaryPreview}>{summaryText}</pre>

      <SecondaryButton
        type="button"
        className={css.shootSummaryButton}
        onClick={canWebShare ? handleShare : handleCopy}
      >
        <FormattedMessage id={buttonLabelId} />
      </SecondaryButton>

      {copyState === 'copied' && !canWebShare ? (
        <p className={css.shootSummaryStatus} role="status">
          <FormattedMessage id="TransactionPanel.shootSummaryCopiedButton" />
        </p>
      ) : null}
      {copyState === 'error' ? (
        <p className={css.shootSummaryStatus} role="status">
          <FormattedMessage id="TransactionPanel.shootSummaryCopyError" />
        </p>
      ) : null}
    </section>
  );
};

export default ShootSummaryShare;
