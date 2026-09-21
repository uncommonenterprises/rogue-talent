import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { getSafetyRespectRatingForReviewType } from '../../util/reviewSafety';

import { Avatar, ReviewRating, UserDisplayName } from '../../components';

import css from './Reviews.module.css';

// SAF-25: renders the "Safety & respect" score beside a review when the viewer has
// the transaction protectedData (the two parties + operator). It is null — and so
// hidden — on the public profile/listing pages and for older reviews that predate
// the dimension, because protectedData isn't available there.
const SafetyRespectRatingMaybe = props => {
  const { safetyRating } = props;
  if (!safetyRating) {
    return null;
  }
  return (
    <p className={css.safetyRespect}>
      <span className={css.safetyRespectLabel}>
        <FormattedMessage id="Reviews.safetyRespectLabel" />
      </span>
      <ReviewRating
        rating={safetyRating}
        className={css.safetyRespectRating}
        reviewStarClassName={css.reviewRatingStar}
      />
    </p>
  );
};

const Review = props => {
  const { review, intl, transaction } = props;

  const date = review.attributes.createdAt;
  const dateString = intl.formatDate(date, { month: 'long', year: 'numeric' });
  const safetyRating = getSafetyRespectRatingForReviewType(
    review.attributes.type,
    transaction?.attributes?.protectedData
  );

  return (
    <div className={css.review}>
      <Avatar className={css.avatar} user={review.author} />
      <div>
        <ReviewRating
          rating={review.attributes.rating}
          className={css.mobileReviewRating}
          reviewStarClassName={css.reviewRatingStar}
        />
        <p className={css.reviewContent}>{review.attributes.content}</p>
        <SafetyRespectRatingMaybe safetyRating={safetyRating} />
        <p className={css.reviewInfo}>
          <UserDisplayName user={review.author} intl={intl} />
          <span className={css.separator}>•</span>
          {dateString}
          <span className={css.desktopSeparator}>•</span>
          <span className={css.desktopReviewRatingWrapper}>
            <ReviewRating
              rating={review.attributes.rating}
              className={css.desktopReviewRating}
              reviewStarClassName={css.reviewRatingStar}
            />
          </span>
        </p>
      </div>
    </div>
  );
};

/**
 * A component that renders a list of reviews.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {Array<propTypes.review>} props.reviews - The reviews to render
 * @param {propTypes.transaction} [props.transaction] - SAF-25: the transaction whose
 *   protectedData carries the "Safety & respect" scores. Only pass it in party/operator
 *   contexts (e.g. the transaction page) — it is NOT available/shown on public profiles.
 * @returns {JSX.Element}
 */
const Reviews = props => {
  const intl = useIntl();
  const { className, rootClassName, reviews = [], transaction } = props;
  const classes = classNames(rootClassName || css.root, className);

  return reviews.length ? (
    <ul className={classes}>
      {reviews.map(r => {
        return (
          <li key={`Review_${r.id.uuid}`} className={css.reviewItem}>
            <Review review={r} intl={intl} transaction={transaction} />
          </li>
        );
      })}
    </ul>
  ) : null;
};

export default Reviews;
