import React from 'react';
import { Form as FinalForm } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatUkDate, getChecklistIds, REVIEW_KIND_MODEL } from '../../util/reviewTool';

import {
  BookingStatusChip,
  FieldCheckbox,
  Notice,
  PrimaryButton,
  SecondaryButton,
} from '../../components';

import ReviewTimeAgo from '../ReviewQueuePage/ReviewTimeAgo';
import ReviewStatusChip from '../ReviewQueuePage/ReviewStatusChip';

import css from './ReviewProfilePage.module.css';

export const REVIEW_PANEL_ID = 'review-panel';
export const REVIEW_CHECKLIST_ID = 'review-checklist';

/**
 * The review status chip: amber while waiting (Pending approval / Resubmitted), green when
 * approved, grey when declined (a decline is a normal outcome, not an error: R02 notes).
 */
export const ReviewDecisionChip = ({ profile }) => {
  const decision = profile?.status?.decision;
  const [style, labelId] =
    decision === 'approved'
      ? ['accepted', 'ReviewPanel.statusApproved']
      : decision === 'declined'
      ? ['declined', 'ReviewPanel.statusDeclined']
      : profile?.resubmission
      ? ['review', 'ReviewPanel.statusResubmitted']
      : ['review', 'ReviewPanel.statusPending'];
  return (
    <BookingStatusChip status={style}>
      <FormattedMessage id={labelId} />
    </BookingStatusChip>
  );
};

/**
 * "Submitted 02/11/2026 · 2 days ago" as a definition-list row.
 */
export const SubmittedRow = ({ profile }) => (
  <div>
    <dt>
      <FormattedMessage
        id={profile?.resubmission ? 'ReviewPanel.resubmitted' : 'ReviewPanel.submitted'}
      />
    </dt>
    <dd>
      {formatUkDate(profile?.submittedAt) || '-'}
      <small>
        <ReviewTimeAgo value={profile?.submittedAt} overdue={profile?.overdue} />
      </small>
    </dd>
  </div>
);

/**
 * Model Stripe rows (identity + bank) or the client identity rows (ID + 18+ flags).
 */
export const VerificationRows = ({ profile }) => {
  if (profile?.kind === REVIEW_KIND_MODEL) {
    return (
      <>
        <div>
          <dt>
            <FormattedMessage id="ReviewPanel.identity" />
          </dt>
          <dd>
            <ReviewStatusChip status={profile?.stripe?.identity} />
          </dd>
        </div>
        <div>
          <dt>
            <FormattedMessage id="ReviewPanel.bank" />
          </dt>
          <dd>
            <ReviewStatusChip status={profile?.stripe?.bank} />
          </dd>
        </div>
      </>
    );
  }
  const identity = profile?.identity || {};
  const ageId = identity.ageCheckFailed
    ? 'ReviewPanel.age18Failed'
    : identity.verified18Plus
    ? 'ReviewPanel.age18Yes'
    : 'ReviewPanel.age18No';
  return (
    <>
      <div>
        <dt>
          <FormattedMessage id="ReviewPanel.identity" />
        </dt>
        <dd>
          <ReviewStatusChip status={identity.status} />
        </dd>
      </div>
      <div>
        <dt>
          <FormattedMessage id="ReviewPanel.age18FromId" />
        </dt>
        <dd>
          <FormattedMessage id={ageId} />
        </dd>
      </div>
      <div>
        <dt>
          <FormattedMessage id="ReviewPanel.declared18" />
        </dt>
        <dd>
          <FormattedMessage id={identity.declared18Plus ? 'ReviewTool.yes' : 'ReviewTool.no'} />
        </dd>
      </div>
    </>
  );
};

const verificationHintId = profile => {
  if (profile?.kind === REVIEW_KIND_MODEL) {
    const ready = profile?.stripe?.identity === 'verified' && profile?.stripe?.bank === 'verified';
    return ready ? 'ReviewPanel.modelStripeReady' : 'ReviewPanel.modelStripeHint';
  }
  return 'ReviewPanel.clientIdentityHint';
};

const ChecklistForm = ({ profile }) => {
  const intl = useIntl();
  const ids = getChecklistIds(profile);
  const total = ids.length;
  const isModel = profile?.kind === REVIEW_KIND_MODEL;
  return (
    <FinalForm
      onSubmit={() => {}}
      initialValues={{ checklist: [] }}
      render={({ values }) => {
        const ticked = (values.checklist || []).filter(v => ids.includes(v)).length;
        return (
          <form className={css.checklistForm} onSubmit={e => e.preventDefault()}>
            <div className={css.sec}>
              <div className={css.secTitle} id={REVIEW_CHECKLIST_ID}>
                <span>
                  <FormattedMessage id="ReviewPanel.checklistTitle" />
                </span>
                <span className={css.draftFlag}>
                  <FormattedMessage id="ReviewPanel.draftFlag" />
                </span>
              </div>
              <fieldset className={css.checklist} aria-labelledby={REVIEW_CHECKLIST_ID}>
                {ids.map(checkId => (
                  <FieldCheckbox
                    key={checkId}
                    id={`review-check-${checkId}`}
                    className={css.checkRow}
                    name="checklist"
                    value={checkId}
                    label={intl.formatMessage({ id: `ReviewPanel.check.${checkId}` })}
                  />
                ))}
              </fieldset>
              <p className={css.progress} aria-live="polite">
                <FormattedMessage
                  id="ReviewPanel.progress"
                  values={{ count: ticked, total, b: text => <b>{text}</b> }}
                />
              </p>
            </div>
            <div className={css.actions}>
              <PrimaryButton type="button" disabled>
                <FormattedMessage
                  id={isModel ? 'ReviewPanel.approveModel' : 'ReviewPanel.approveClient'}
                />
              </PrimaryButton>
              <SecondaryButton type="button" disabled>
                <FormattedMessage id="ReviewPanel.decline" />
              </SecondaryButton>
              <p className={css.actionsHint}>
                <FormattedMessage id="ReviewPanel.nextStageNote" />
              </p>
            </div>

            {/* Phone only: how many are ticked, and a jump to the decision (R02 bottom bar). */}
            <div className={css.mobileBar}>
              <span className={css.mobileBarCount}>
                <FormattedMessage
                  id="ReviewPanel.mobileBarCount"
                  values={{ count: ticked, total }}
                />
              </span>
              <a href={`#${REVIEW_CHECKLIST_ID}`} className={css.mobileBarLink}>
                <FormattedMessage id="ReviewPanel.mobileBarLink" />
              </a>
            </div>
          </form>
        );
      }}
    />
  );
};

/**
 * Review panel (R02 / R04), read-only in stage 1: status, submitted date, verification, and the
 * five-item checklist. Ticking is local only (nothing is saved). Approve and Decline are shown
 * disabled with a "next stage" note; "Flag a safety concern" is stage 2 and not shown yet.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.profile review payload ({ kind: 'model' | 'client', ... })
 * @param {string} props.firstName for the hints ("Imogen goes live once...")
 * @returns {JSX.Element}
 */
const ReviewPanel = ({ profile, firstName }) => {
  const waiting = profile?.status?.waiting === true;
  const decision = profile?.status?.decision;
  return (
    <section id={REVIEW_PANEL_ID} className={css.panel} aria-labelledby="review-panel-title">
      <div className={css.panelHead}>
        <h2 id="review-panel-title" className={css.panelTitle}>
          <FormattedMessage id="ReviewPanel.heading" />
        </h2>
        <ReviewDecisionChip profile={profile} />
      </div>

      <dl className={css.kv}>
        <SubmittedRow profile={profile} />
      </dl>

      <div className={css.sec}>
        <h3 className={css.secTitle}>
          <FormattedMessage
            id={
              profile?.kind === REVIEW_KIND_MODEL
                ? 'ReviewPanel.stripeTitle'
                : 'ReviewPanel.identityTitle'
            }
          />
        </h3>
        <dl className={css.kv}>
          <VerificationRows profile={profile} />
        </dl>
        {profile?.identity?.ageCheckFailed ? (
          <Notice variant="error" role="alert">
            <FormattedMessage id="ReviewPanel.underAgeWarning" />
          </Notice>
        ) : null}
        <p className={css.hint}>
          <FormattedMessage id={verificationHintId(profile)} values={{ name: firstName }} />
        </p>
      </div>

      {waiting ? (
        <ChecklistForm profile={profile} />
      ) : (
        <div className={css.sec}>
          <p className={css.decisionLine}>
            <FormattedMessage
              id={
                decision === 'approved'
                  ? 'ReviewPanel.decidedApproved'
                  : 'ReviewPanel.decidedDeclined'
              }
            />
          </p>
        </div>
      )}
    </section>
  );
};

export default ReviewPanel;
