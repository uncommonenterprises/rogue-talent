import React, { useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';

// Import contexts and util modules
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  QUEUE_TABS,
  QUEUE_TAB_ALL,
  QUEUE_TAB_MODELS,
  QUEUE_TAB_CLIENTS,
  QUEUE_TAB_DECIDED,
  REVIEW_KIND_MODEL,
  filterQueueItems,
  formatUkDate,
  getLongestWaitDays,
  isReviewBusyError,
  isReviewNoAccessError,
} from '../../util/reviewTool';
import { isScrollingDisabled } from '../../ducks/ui.duck';

// Import shared components
import { LayoutSingleColumn, NamedLink, Notice, Page, RtIcon } from '../../components';

// Import modules from parent directory
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

// Import modules from this directory
import ReviewNoAccess from './ReviewNoAccess';
import ReviewStatusChip from './ReviewStatusChip';
import ReviewTimeAgo from './ReviewTimeAgo';
import { fetchQueue } from './ReviewQueuePage.duck';
import css from './ReviewQueuePage.module.css';

const TAB_LABEL_IDS = {
  [QUEUE_TAB_ALL]: 'ReviewQueuePage.tabAll',
  [QUEUE_TAB_MODELS]: 'ReviewQueuePage.tabModels',
  [QUEUE_TAB_CLIENTS]: 'ReviewQueuePage.tabClients',
  [QUEUE_TAB_DECIDED]: 'ReviewQueuePage.tabDecided',
};

const EMPTY_TITLE_IDS = {
  [QUEUE_TAB_ALL]: 'ReviewQueuePage.emptyAll',
  [QUEUE_TAB_MODELS]: 'ReviewQueuePage.emptyModels',
  [QUEUE_TAB_CLIENTS]: 'ReviewQueuePage.emptyClients',
};

const QueueRow = ({ row }) => {
  const isModel = row.type === REVIEW_KIND_MODEL;
  const flag = row.resubmission
    ? 'ReviewQueuePage.flagResubmission'
    : row.anomaly
    ? 'ReviewQueuePage.flagAnomaly'
    : null;
  return (
    <NamedLink name="ReviewProfilePage" params={{ userId: row.userId }} className={css.row}>
      <span className={css.who}>
        <span className={css.monogram} aria-hidden="true">
          {row.initials}
        </span>
        <span className={css.whoText}>
          <b>{row.name}</b>
          {row.place ? <small>{row.place}</small> : null}
        </span>
      </span>
      <span className={css.tags}>
        <span className={css.typeTag}>
          <FormattedMessage
            id={isModel ? 'ReviewQueuePage.typeModel' : 'ReviewQueuePage.typeClient'}
          />
        </span>
        <ReviewStatusChip status={row.verification} />
        {flag ? (
          <span className={css.flagTag}>
            <FormattedMessage id={flag} />
          </span>
        ) : (
          <span className={css.flagEmpty} aria-hidden="true" />
        )}
      </span>
      <span className={css.sub}>
        <span>{formatUkDate(row.submittedAt)}</span>
        <ReviewTimeAgo value={row.submittedAt} overdue={row.overdue} className={css.ago} />
      </span>
      <RtIcon name="chevronRight" className={css.chevron} />
    </NamedLink>
  );
};

const EmptyState = ({ tab, onShowDecided }) => (
  <div className={css.empty}>
    <h2 className={css.emptyTitle}>
      <FormattedMessage id={EMPTY_TITLE_IDS[tab]} />
    </h2>
    <p className={css.emptyText}>
      <FormattedMessage id="ReviewQueuePage.emptyText" />
    </p>
    <button type="button" className={css.secondaryButton} onClick={onShowDecided}>
      <FormattedMessage id="ReviewQueuePage.seeRecentDecisions" />
    </button>
  </div>
);

const DecidedPlaceholder = () => (
  <div className={css.empty}>
    <h2 className={css.emptyTitle}>
      <FormattedMessage id="ReviewQueuePage.decidedTitle" />
    </h2>
    <p className={css.emptyText}>
      <FormattedMessage id="ReviewQueuePage.decidedText" />
    </p>
  </div>
);

/**
 * The review queue (review tool stage 1, R01): everyone waiting for a review decision, oldest
 * first, with tabs for models and clients. Read-only. Rows open the review page. Anyone without
 * review access gets "You don't have access to this page" (the server decides; R07 state 1).
 *
 * @component
 * @param {Object} props
 * @param {Object} [props.queue] - the queue from GET /api/review/queue
 * @param {boolean} props.fetchInProgress
 * @param {Object} [props.fetchError] - { error, status }
 * @param {boolean} props.scrollingDisabled
 * @param {Function} props.onRetry
 * @returns {JSX.Element}
 */
export const ReviewQueuePageComponent = props => {
  const intl = useIntl();
  const { queue, fetchInProgress, fetchError, scrollingDisabled, onRetry } = props;
  const [tab, setTab] = useState(QUEUE_TAB_ALL);

  const noAccess = isReviewNoAccessError(fetchError);
  const title = intl.formatMessage({
    id: noAccess ? 'ReviewNoAccess.title' : 'ReviewQueuePage.title',
  });

  const items = queue?.items || [];
  const counts = queue?.counts || {};
  const tabCounts = {
    [QUEUE_TAB_ALL]: counts.all,
    [QUEUE_TAB_MODELS]: counts.models,
    [QUEUE_TAB_CLIENTS]: counts.clients,
  };
  const rows = filterQueueItems(items, tab);
  const longestWait = getLongestWaitDays(items);

  const content = noAccess ? (
    <ReviewNoAccess />
  ) : fetchError ? (
    <div className={css.wrap}>
      <Notice variant="error" role="alert">
        <FormattedMessage
          id={isReviewBusyError(fetchError) ? 'ReviewTool.busy' : 'ReviewTool.error'}
        />
      </Notice>
      <button
        type="button"
        className={css.secondaryButton}
        onClick={onRetry}
        disabled={fetchInProgress}
      >
        <FormattedMessage id="ReviewTool.retry" />
      </button>
    </div>
  ) : !queue ? (
    <div className={css.wrap}>
      <p className={css.loading}>
        <FormattedMessage id="ReviewTool.loading" />
      </p>
    </div>
  ) : (
    <div className={css.wrap}>
      <div className={css.titleRow}>
        <div>
          <h1 className={css.title}>
            <FormattedMessage id="ReviewQueuePage.heading" />
          </h1>
          <p className={css.summary}>
            {items.length > 0 ? (
              <>
                <FormattedMessage
                  id="ReviewQueuePage.summary"
                  values={{ count: items.length, b: text => <b>{text}</b> }}
                />{' '}
                {longestWait !== null ? (
                  <FormattedMessage
                    id="ReviewQueuePage.summaryLongest"
                    values={{ days: longestWait }}
                  />
                ) : null}{' '}
                <FormattedMessage id="ReviewQueuePage.summaryAmber" />
              </>
            ) : (
              <FormattedMessage id="ReviewQueuePage.summaryEmpty" />
            )}
          </p>
        </div>
      </div>

      <div
        className={css.tabs}
        role="tablist"
        aria-label={intl.formatMessage({ id: 'ReviewQueuePage.tabsLabel' })}
      >
        {QUEUE_TABS.map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`review-tab-${t}`}
            aria-selected={tab === t}
            aria-controls="review-tab-panel"
            className={classNames(css.tab, { [css.tabActive]: tab === t })}
            onClick={() => setTab(t)}
          >
            <FormattedMessage id={TAB_LABEL_IDS[t]} />
            {typeof tabCounts[t] === 'number' ? (
              <span className={css.tabCount}>{tabCounts[t]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div id="review-tab-panel" role="tabpanel" aria-labelledby={`review-tab-${tab}`}>
        {tab === QUEUE_TAB_DECIDED ? (
          <DecidedPlaceholder />
        ) : rows.length === 0 ? (
          <EmptyState tab={tab} onShowDecided={() => setTab(QUEUE_TAB_DECIDED)} />
        ) : (
          <div className={css.list}>
            <div className={css.head} aria-hidden="true">
              <span>
                <FormattedMessage id="ReviewQueuePage.colName" />
              </span>
              <span>
                <FormattedMessage id="ReviewQueuePage.colType" />
              </span>
              <span>
                <FormattedMessage id="ReviewQueuePage.colSubmitted" />
              </span>
              <span>
                <FormattedMessage id="ReviewQueuePage.colVerification" />
              </span>
              <span>
                <FormattedMessage id="ReviewQueuePage.colFlag" />
              </span>
              <span />
            </div>
            {rows.map(row => (
              <QueueRow key={row.userId} row={row} />
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && tab !== QUEUE_TAB_DECIDED ? (
        <p className={css.footnote}>
          <FormattedMessage id="ReviewQueuePage.datesNote" />
        </p>
      ) : null}
    </div>
  );

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled} noIndex>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        {content}
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { queue, fetchInProgress, fetchError } = state.ReviewQueuePage;
  return {
    queue,
    fetchInProgress,
    fetchError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onRetry: () => dispatch(fetchQueue()),
});

const ReviewQueuePage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ReviewQueuePageComponent);

export default ReviewQueuePage;
