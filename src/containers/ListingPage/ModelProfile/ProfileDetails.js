import React from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoneyCompact } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { getModelCity, getOptionLabel } from '../../../util/modelProfile';

import { Avatar, ExternalLink, RtIcon, UserDisplayName } from '../../../components';

import { getWebsiteHref, getInstagramHref, getAverageRating, getProfileBio } from './profileData';

import css from './ModelProfile.module.css';

const { Money } = sdkTypes;

const Fact = ({ labelId, children }) =>
  children ? (
    <div className={css.fact}>
      <dt>
        <FormattedMessage id={labelId} />
      </dt>
      <dd>{children}</dd>
    </div>
  ) : null;

const KvRow = ({ label, children }) =>
  children ? (
    <div className={css.kvRow}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  ) : null;

const Section = ({ id, titleId, titleValues, children }) => (
  <section className={css.section} aria-labelledby={id}>
    <h2 id={id} className={css.sectionTitle}>
      <FormattedMessage id={titleId} values={titleValues} />
    </h2>
    {children}
  </section>
);

const Stars = ({ rating }) => (
  <span className={css.stars} aria-hidden="true">
    {[1, 2, 3, 4, 5].map(n => (
      <RtIcon key={n} name="star" className={n <= Math.round(rating) ? css.starOn : css.starOff} />
    ))}
  </span>
);

/**
 * Model profile header: city eyebrow, name, rating line (only once there is a review) and the
 * modelling categories (B03).
 */
export const ProfileHead = props => {
  const { title, publicData, config, reviews = [] } = props;
  const intl = useIntl();
  const city = getModelCity(publicData);
  const categories = (publicData?.modelling_categories || []).map(o =>
    getOptionLabel(intl, config, 'modelling_categories', o)
  );
  const average = getAverageRating(reviews);

  return (
    <header className={css.head}>
      {city ? <span className={css.eyebrow}>{city}</span> : null}
      <h1 className={css.name}>{title}</h1>
      {average ? (
        <div className={css.ratingLine}>
          <RtIcon name="star" className={css.ratingStar} />
          <strong>{intl.formatNumber(average, { maximumFractionDigits: 1 })}</strong>
          <span>
            <FormattedMessage id="ListingPage.reviewCount" values={{ count: reviews.length }} />
          </span>
        </div>
      ) : null}
      {categories.length > 0 ? (
        <div
          className={css.tags}
          aria-label={intl.formatMessage({ id: 'ListingPage.categoriesLabel' })}
        >
          {categories.map(c => (
            <span key={c} className={css.tag}>
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
};

/**
 * "About" section: the model's bio (the author's profile.bio, written in the wizard's "About
 * you" step or on Profile settings). Plain text with line breaks kept; nothing is turned into
 * a link, so contact details or handles in a bio never become one-click off-platform contact.
 * Renders nothing when the bio is empty.
 *
 * @param {Object} props
 * @param {Object} props.author the listing author (user entity)
 * @returns {JSX.Element|null}
 */
export const ProfileAbout = props => {
  const bio = getProfileBio(props.author);
  return bio ? (
    <Section id="profile-about" titleId="ListingPage.aboutTitle">
      <p className={css.bio}>{bio}</p>
    </Section>
  ) : null;
};

/**
 * Model profile sections (B03): stats, rates, travel and notice, location, reviews and
 * "Checked before going live". Replaces the template's map, generic field list and "About the
 * listing author" (run-through finding 10; open question 7: no Contact button). The model's bio
 * leads as an "About" section when there is one (tester F, F4).
 *
 * `reviewMode` (review tool, R02): the same sections a client sees, minus reviews (a pending
 * model has none) and "Checked before going live" (it would claim a review that has not
 * happened yet).
 *
 * `availability` (B03b, phones only): the availability calendar as a section after "Travel and
 * notice" (notice is its context) and before Location and reviews. On desktop it lives in the
 * booking panel instead, so the page passes nothing there.
 */
const ProfileDetails = props => {
  const {
    publicData = {},
    price,
    config,
    modelName,
    author,
    reviews = [],
    fetchReviewsError,
    reviewMode = false,
    availability = null,
    availabilityTitleId = 'ProfileAvailability.title',
  } = props;
  const intl = useIntl();
  const opt = key =>
    publicData[key] != null ? getOptionLabel(intl, config, key, publicData[key]) : null;
  const cm = key =>
    typeof publicData[key] === 'number'
      ? intl.formatMessage({ id: 'ListingPage.valueCm' }, { value: publicData[key] })
      : null;
  const ethnicity = Array.isArray(publicData.ethnicity)
    ? publicData.ethnicity.map(o => getOptionLabel(intl, config, 'ethnicity', o)).join(', ')
    : null;
  const shoe =
    typeof publicData.shoe_size_uk === 'number'
      ? intl.formatMessage({ id: 'ListingPage.valueShoeUk' }, { value: publicData.shoe_size_uk })
      : null;

  const websiteHref = getWebsiteHref(publicData.model_website_url);
  const instagramHref = getInstagramHref(publicData.instagram_url);
  const links = [
    websiteHref ? (
      <ExternalLink key="web" href={websiteHref}>
        <FormattedMessage id="ListingPage.linkWebsite" />
      </ExternalLink>
    ) : null,
    instagramHref ? (
      <ExternalLink key="ig" href={instagramHref}>
        <FormattedMessage id="ListingPage.linkInstagram" />
      </ExternalLink>
    ) : null,
  ].filter(Boolean);

  const hasMeasurements = ['bust_chest_cm', 'waist_cm', 'hips_cm', 'shoe_size_uk'].some(
    k => typeof publicData[k] === 'number'
  );

  // Rates: the day rate is what bookings are charged at; half-day and hourly are for reference
  // only (open question 2). Rate fields are stored in pence, like the listing price.
  const currency = price?.currency || config.currency;
  const money = amount =>
    typeof amount === 'number' && amount > 0
      ? formatMoneyCompact(intl, new Money(amount, currency))
      : null;
  const dayRate = price ? formatMoneyCompact(intl, price) : null;
  const halfDay = money(publicData.half_day_rate);
  const hourly = money(publicData.hourly_rate);
  const hasReferenceRates = !!(halfDay || hourly);

  const city = getModelCity(publicData);
  const travelCharged = publicData.travel_fee_policy === 'charged-separately';
  const notice = opt('min_booking_notice');
  // Notice is enforced (open question 12): the sub-line states it plainly ("Imogen needs at least
  // 48 hours' notice before a shoot"). Same-day or unknown values have no phrase, so no sub-line.
  const noticeKey = publicData.min_booking_notice;
  const noticePhrase = ['24-hours', '48-hours', '1-week', '2-weeks'].includes(noticeKey)
    ? intl.formatMessage({ id: `BookingDatesForm.noticePhrase.${noticeKey}` })
    : null;
  const showNotice = notice && !!noticePhrase;
  const average = getAverageRating(reviews);

  return (
    <>
      <ProfileAbout author={author} />

      <Section id="profile-stats" titleId="ListingPage.statsTitle">
        <h3 className={css.subTitle}>
          <FormattedMessage id="ListingPage.lookTitle" />
        </h3>
        <dl className={css.facts}>
          <Fact labelId="ListingPage.factGender">{opt('gender')}</Fact>
          <Fact labelId="ListingPage.factHeight">{cm('height_cm')}</Fact>
          <Fact labelId="ListingPage.factHair">{opt('hair_colour')}</Fact>
          <Fact labelId="ListingPage.factEyes">{opt('eye_colour')}</Fact>
          <Fact labelId="ListingPage.factEthnicity">{ethnicity}</Fact>
          <Fact labelId="ListingPage.factExperience">{opt('experience_level')}</Fact>
        </dl>
        {hasMeasurements ? (
          <>
            <h3 className={css.subTitle}>
              <FormattedMessage id="ListingPage.measurementsTitle" />
            </h3>
            <dl className={css.facts}>
              <Fact labelId="ListingPage.factBust">{cm('bust_chest_cm')}</Fact>
              <Fact labelId="ListingPage.factWaist">{cm('waist_cm')}</Fact>
              <Fact labelId="ListingPage.factHips">{cm('hips_cm')}</Fact>
              <Fact labelId="ListingPage.factShoe">{shoe}</Fact>
            </dl>
          </>
        ) : null}
        {links.length > 0 ? (
          <>
            <h3 className={css.subTitle}>
              <FormattedMessage id="ListingPage.moreTitle" />
            </h3>
            <dl className={css.facts}>
              <Fact labelId="ListingPage.factLinks">
                <span className={css.links}>{links}</span>
              </Fact>
            </dl>
          </>
        ) : null}
      </Section>

      {dayRate ? (
        <Section id="profile-rates" titleId="ListingPage.ratesTitle">
          <div className={css.rateGrid}>
            <div className={css.rateCellMain}>
              <span className={css.rateLabel}>
                <FormattedMessage id="ListingPage.rateDay" />
              </span>
              <span className={css.rateAmount}>{dayRate}</span>
              <span className={css.rateSub}>
                <FormattedMessage id="ListingPage.rateDaySub" />
              </span>
            </div>
            {halfDay ? (
              <div className={css.rateCell}>
                <span className={css.rateLabel}>
                  <FormattedMessage id="ListingPage.rateHalfDay" />
                </span>
                <span className={css.rateAmount}>{halfDay}</span>
                <span className={css.rateSub}>
                  <FormattedMessage id="ListingPage.rateForReference" />
                </span>
              </div>
            ) : null}
            {hourly ? (
              <div className={css.rateCell}>
                <span className={css.rateLabel}>
                  <FormattedMessage id="ListingPage.rateHourly" />
                </span>
                <span className={css.rateAmount}>{hourly}</span>
                <span className={css.rateSub}>
                  <FormattedMessage id="ListingPage.rateForReference" />
                </span>
              </div>
            ) : null}
          </div>
          <p className={css.smallMuted}>
            <FormattedMessage
              id={hasReferenceRates ? 'ListingPage.ratesNote' : 'ListingPage.ratesNoteDayOnly'}
              values={{ name: modelName }}
            />
          </p>
        </Section>
      ) : null}

      <Section id="profile-travel" titleId="ListingPage.travelTitle">
        <dl className={css.kvRows}>
          <KvRow label={<FormattedMessage id="ListingPage.basedIn" />}>{city}</KvRow>
          <KvRow
            label={<FormattedMessage id="ListingPage.travelRange" values={{ name: modelName }} />}
          >
            {opt('availability_radius')}
          </KvRow>
          <KvRow label={<FormattedMessage id="ListingPage.travelCosts" />}>
            {publicData.travel_fee_policy ? (
              <>
                {opt('travel_fee_policy')}
                {travelCharged ? (
                  <small>
                    <FormattedMessage
                      id="ListingPage.travelChargedNote"
                      values={{ name: modelName }}
                    />
                  </small>
                ) : null}
              </>
            ) : null}
          </KvRow>
          <KvRow label={<FormattedMessage id="ListingPage.minimumNotice" />}>
            {showNotice ? (
              <>
                {notice}
                <small>
                  <FormattedMessage
                    id="ListingPage.noticeGuide"
                    values={{ name: modelName, notice: noticePhrase }}
                  />
                </small>
              </>
            ) : notice ? (
              notice
            ) : null}
          </KvRow>
        </dl>
      </Section>

      {availability ? (
        <Section id="profile-availability" titleId={availabilityTitleId}>
          {availability}
        </Section>
      ) : null}

      {city ? (
        <Section id="profile-location" titleId="ListingPage.locationTitle">
          <p className={css.trustLine}>
            <RtIcon name="pin" className={css.trustIcon} />
            <span>
              <FormattedMessage
                id="ListingPage.locationLine"
                values={{ name: modelName, city: <strong>{city}</strong> }}
              />
            </span>
          </p>
        </Section>
      ) : null}

      {reviewMode ? null : (
        <Section
          id="profile-reviews"
          titleId={
            reviews.length > 0 ? 'ListingPage.reviewsTitle' : 'ListingPage.reviewsTitleEmpty'
          }
          titleValues={{ count: reviews.length }}
        >
          {fetchReviewsError ? (
            <p className={css.errorText}>
              <FormattedMessage id="ListingPage.reviewsError" />
            </p>
          ) : null}
          {average ? (
            <div className={css.reviewSummary}>
              <span className={css.reviewScore}>
                {intl.formatNumber(average, { maximumFractionDigits: 1 })}
              </span>
              <div className={css.reviewSummaryText}>
                <Stars rating={average} />
                <span className={css.smallMuted}>
                  <FormattedMessage id="ListingPage.reviewsOverall" />
                </span>
              </div>
            </div>
          ) : !fetchReviewsError ? (
            <p className={css.smallMuted}>
              <FormattedMessage id="ListingPage.noReviews" />
            </p>
          ) : null}
          {reviews.length > 0 ? (
            <div>
              {reviews.map(r => (
                <div className={css.review} key={r.id.uuid}>
                  <div className={css.reviewMeta}>
                    <Avatar className={css.reviewAvatar} user={r.author} disableProfileLink />
                    <div>
                      <strong>
                        <UserDisplayName user={r.author} intl={intl} />
                      </strong>
                      <div className={css.reviewDate}>
                        {intl.formatDate(r.attributes.createdAt, {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  <p className={css.reviewText}>{r.attributes.content}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      )}

      {reviewMode ? null : (
        <Section id="profile-checked" titleId="ListingPage.checkedTitle">
          <ul className={css.checkedList}>
            <li>
              <RtIcon name="check" className={css.checkedIcon} />
              <span>
                <FormattedMessage
                  id="ListingPage.checkedProfile"
                  values={{ strong: text => <strong>{text}</strong> }}
                />
              </span>
            </li>
            <li>
              <RtIcon name="check" className={css.checkedIcon} />
              <span>
                <FormattedMessage
                  id="ListingPage.checkedId"
                  values={{ strong: text => <strong>{text}</strong> }}
                />
              </span>
            </li>
          </ul>
          <p className={css.smallMuted}>
            <FormattedMessage id="ListingPage.checkedNote" />
          </p>
        </Section>
      )}
    </>
  );
};

export default ProfileDetails;
