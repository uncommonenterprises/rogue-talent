import React from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../util/reactIntl';
import {
  ACCOUNT_STATUS_PENDING,
  ACCOUNT_STATUS_APPROVED,
  ACCOUNT_STATUS_VERIFIED,
  ACCOUNT_STATUS_REJECTED,
} from '../../../util/accountStatus';

// Import shared components
import { AccountStatusBadge } from '../../../components';

// Import modules from parent directory
import { TRACKER_DONE, TRACKER_CURRENT } from '../AccountStatusPage.helpers';

// Import modules from this directory
import css from './StatusCard.module.css';

// ---- Icons (line icons from the mockups; sanitize.css fills svg, so fill is reset in CSS) ----

const IconClock = () => (
  <svg className={css.lineIcon} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M12 7v5l3.5 2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconShield = () => (
  <svg className={css.lineIcon} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCheck = () => (
  <svg className={css.lineIcon} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCross = () => (
  <svg className={css.lineIcon} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const STATUS_ICON = {
  [ACCOUNT_STATUS_PENDING]: { Icon: IconClock, className: css.iconPending },
  [ACCOUNT_STATUS_APPROVED]: { Icon: IconShield, className: css.iconApproved },
  [ACCOUNT_STATUS_VERIFIED]: { Icon: IconCheck, className: css.iconVerified },
  [ACCOUNT_STATUS_REJECTED]: { Icon: IconCross, className: css.iconRejected },
};

/**
 * The status card (journey.css .status-card): status icon, the large rt-status chip, the
 * Bricolage headline and a lede, then the screen's content.
 *
 * @component
 * @param {Object} props
 * @param {string} props.status - lifecycle status
 * @param {ReactNode} props.title - h1 content
 * @param {ReactNode} props.lede - paragraph under the headline
 * @param {ReactNode} props.children - the rest of the card
 * @returns {JSX.Element}
 */
export const StatusCard = props => {
  const { status, title, lede, children } = props;
  const { Icon, className } = STATUS_ICON[status] || {};
  return (
    <section className={css.card}>
      <div className={css.head}>
        {Icon ? (
          <div className={classNames(css.icon, className)}>
            <Icon />
          </div>
        ) : null}
        <AccountStatusBadge status={status} large className={css.badge} />
        <h1 className={css.title}>{title}</h1>
        <p className={css.lede}>{lede}</p>
      </div>
      {children}
    </section>
  );
};

const IconTick = () => (
  <svg className={css.tick} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path
      d="M2 6l2.5 2.5L10 3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Vertical progress tracker (screens 14 and 19). Done steps are a filled cobalt circle with a
 * tick, the current step is amber-outlined with an "In progress" label, to-do steps are a muted
 * numbered circle: never an empty box, so it can't read as an unticked checklist.
 *
 * @component
 * @param {Object} props
 * @param {Array<{ key: string, labelId: string, state: string }>} props.steps
 * @param {string} props.ariaLabel
 * @returns {JSX.Element}
 */
export const ProgressTracker = props => {
  const { steps, ariaLabel } = props;
  return (
    <ol className={css.tracker} aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const isDone = step.state === TRACKER_DONE;
        const isCurrent = step.state === TRACKER_CURRENT;
        return (
          <li
            key={step.key}
            className={classNames(css.trackerStep, {
              [css.trackerDone]: isDone,
              [css.trackerCurrent]: isCurrent,
              [css.trackerTodo]: !isDone && !isCurrent,
            })}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className={css.trackerMarker} aria-hidden="true">
              {isDone ? <IconTick /> : i + 1}
            </span>
            <span className={css.trackerBody}>
              <span className={css.trackerTitle}>
                <FormattedMessage id={step.labelId} />
              </span>
              {isCurrent ? (
                <span className={css.trackerStatus}>
                  <FormattedMessage id="AccountStatusPage.tracker.inProgress" />
                </span>
              ) : null}
              <span className={css.srOnly}>
                <FormattedMessage
                  id={
                    isDone
                      ? 'AccountStatusPage.tracker.srDone'
                      : isCurrent
                      ? 'AccountStatusPage.tracker.srCurrent'
                      : 'AccountStatusPage.tracker.srTodo'
                  }
                />
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

/**
 * A callout box (journey.css .callout): plain, accent (the verify-now nudge) or muted.
 *
 * @component
 * @param {Object} props
 * @param {'accent'|'muted'} [props.variant]
 * @param {ReactNode} props.title
 * @param {ReactNode} props.text - the callout paragraph
 * @param {string} [props.textClassName] - extra class for the paragraph
 * @param {ReactNode} [props.action] - e.g. a button under the text
 * @returns {JSX.Element}
 */
export const Callout = props => {
  const { variant, title, text, textClassName, action } = props;
  return (
    <div
      className={classNames(css.callout, {
        [css.calloutAccent]: variant === 'accent',
        [css.calloutMuted]: variant === 'muted',
      })}
    >
      <h2 className={css.calloutTitle}>{title}</h2>
      <p className={classNames(css.calloutText, textClassName)}>{text}</p>
      {action || null}
    </div>
  );
};

/**
 * A short info list (journey.css .info-list) with a line icon per item.
 *
 * @component
 * @param {Object} props
 * @param {Array<{ key: string, icon: ReactNode, text: ReactNode }>} props.items
 * @returns {JSX.Element}
 */
export const InfoList = props => {
  const { items } = props;
  return (
    <ul className={css.infoList}>
      {items.map(item => (
        <li key={item.key} className={css.infoItem}>
          {item.icon}
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
};

// Info-list icons (16px line icons from the mockups).
export const IconIdCard = () => (
  <svg className={css.infoIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const IconSelfie = () => (
  <svg className={css.infoIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const IconBank = () => (
  <svg className={css.infoIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="1.5" y="4.5" width="13" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const IconChevron = () => (
  <svg className={css.infoIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M6 3l5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconArrowRight = () => (
  <svg className={css.buttonIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M6 3l5 5-5 5M4 8h7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconCalendar = () => (
  <svg className={css.calendarIcon} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
