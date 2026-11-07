import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { getStatusChipStyle } from '../../util/reviewTool';

import { BookingStatusChip } from '../../components';

const STATUS_LABEL_IDS = {
  verified: 'ReviewTool.statusVerified',
  'in-progress': 'ReviewTool.statusInProgress',
  'not-started': 'ReviewTool.statusNotStarted',
  unknown: 'ReviewTool.statusUnknown',
};

/**
 * Verification status chip for the review tool (the rt-status set: green = verified, amber = in
 * progress, grey = not started or not known). No new colours.
 *
 * @component
 * @param {Object} props
 * @param {'verified'|'in-progress'|'not-started'|'unknown'} props.status
 * @returns {JSX.Element}
 */
const ReviewStatusChip = ({ status }) => (
  <BookingStatusChip status={getStatusChipStyle(status)}>
    <FormattedMessage id={STATUS_LABEL_IDS[status] || STATUS_LABEL_IDS.unknown} />
  </BookingStatusChip>
);

export default ReviewStatusChip;
