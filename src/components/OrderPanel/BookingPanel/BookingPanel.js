import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney, formatMoneyCompact } from '../../../util/currency';
import { PHONE_LAYOUT_MAX_WIDTH, useIsPhoneLayout } from '../../../util/useIsPhoneLayout';

import { ModalInMobile, NamedLink, Notice, RtIcon } from '../../../components';

import {
  PANEL_BOOK,
  PANEL_CHECK_STATUS,
  PANEL_CLOSED,
  PANEL_LOGGED_OUT,
  PANEL_OWN_PROFILE,
  PANEL_PENDING,
  PANEL_VERIFY_IDENTITY,
} from '../bookingPanelState';

import css from './BookingPanel.module.css';

// Below this width the panel is a bottom bar plus a full-height sheet (B03).
const PHONE_MAX_WIDTH = PHONE_LAYOUT_MAX_WIDTH;

const formatPrice = (intl, price, marketplaceCurrency) => {
  if (!price) {
    return null;
  }
  if (price.currency !== marketplaceCurrency) {
    return `(${price.currency})`;
  }
  try {
    return formatMoneyCompact(intl, price);
  } catch (e) {
    return formatMoney(intl, price);
  }
};

/**
 * The call to action for a non-booking panel state, as a link. Shared by the desktop panel and
 * the phone bottom bar so the two always agree.
 */
const StateLink = props => {
  const { panelState, editParams, fromPath, className, variant = 'primary' } = props;
  const linkClass = classNames(
    variant === 'secondary' ? css.secondaryLink : css.primaryLink,
    className
  );
  switch (panelState) {
    case PANEL_LOGGED_OUT:
      return (
        <NamedLink name="LoginPage" to={{ state: { from: fromPath } }} className={linkClass}>
          <FormattedMessage id="OrderPanel.logInToBook" />
        </NamedLink>
      );
    case PANEL_PENDING:
    case PANEL_CHECK_STATUS:
      return (
        <NamedLink name="AccountStatusPage" className={linkClass}>
          <FormattedMessage id="OrderPanel.checkAccountStatus" />
        </NamedLink>
      );
    case PANEL_VERIFY_IDENTITY:
      return (
        <NamedLink name="ClientVerificationPage" className={linkClass}>
          <FormattedMessage id="OrderPanel.verifyIdentity" />
        </NamedLink>
      );
    case PANEL_OWN_PROFILE:
      return editParams?.id ? (
        <NamedLink
          name="EditListingPage"
          params={editParams}
          className={classNames(css.secondaryLink, className)}
        >
          <FormattedMessage id="OrderPanel.editProfile" />
        </NamedLink>
      ) : null;
    default:
      return null;
  }
};

/**
 * Booking panel on a model's profile (B03). Desktop: a sticky panel with the day rate, the
 * Start / End date fields (calendar popover), the price and one cobalt action. Phone: a fixed
 * bottom bar (day rate + action) that opens a full-height dates sheet. Logged-out, waiting-for-
 * approval, not-yet-ID-verified and own-profile states replace the form with a short message and
 * a single action.
 *
 * @component
 * @param {Object} props
 * @param {string} props.panelState one of the PANEL_* states (bookingPanelState.js)
 * @param {Object} props.price listing price (Money)
 * @param {string} props.marketplaceCurrency
 * @param {string} props.modelName first name used in sentences
 * @param {Function} props.renderBookingForm (layout, onDatesChange) => form element
 * @param {string} props.formId id of the booking form (the phone bar submits it)
 * @param {boolean} props.isSheetOpen phone sheet open
 * @param {Function} props.onOpenSheet
 * @param {Function} props.onCloseSheet
 * @param {Function} props.onManageDisableScrolling
 * @param {Object} [props.editParams] own profile: EditListingPage params
 * @param {string} [props.fromPath] current path, so log in returns here
 * @returns {JSX.Element}
 */
const BookingPanel = props => {
  const intl = useIntl();
  const isPhone = useIsPhoneLayout();
  const [hasDates, setHasDates] = useState(false);
  const {
    className,
    panelState,
    price,
    marketplaceCurrency,
    modelName,
    renderBookingForm,
    formId,
    isSheetOpen,
    onOpenSheet,
    onCloseSheet,
    onManageDisableScrolling,
    editParams,
    fromPath,
  } = props;

  const formattedPrice = formatPrice(intl, price, marketplaceCurrency);
  const isBookState = panelState === PANEL_BOOK;

  const priceLine = formattedPrice ? (
    <div className={css.price}>
      {formattedPrice}
      <small>
        <FormattedMessage id="OrderPanel.perDayShort" />
      </small>
    </div>
  ) : null;

  const stateBody =
    panelState === PANEL_LOGGED_OUT ? (
      <>
        <p className={css.lede}>
          <FormattedMessage id="OrderPanel.loggedOutLede" values={{ name: modelName }} />
        </p>
        <StateLink panelState={panelState} fromPath={fromPath} />
        <NamedLink
          name="SignupForUserTypePage"
          params={{ userType: 'client' }}
          className={css.ghostLink}
        >
          <FormattedMessage id="OrderPanel.createClientAccount" />
        </NamedLink>
      </>
    ) : panelState === PANEL_PENDING ? (
      <>
        <Notice icon="clock">
          <p>
            <FormattedMessage id="OrderPanel.pendingNotice" />
          </p>
        </Notice>
        <StateLink panelState={panelState} />
      </>
    ) : panelState === PANEL_VERIFY_IDENTITY ? (
      <>
        <Notice icon="lock">
          <p>
            <FormattedMessage id="OrderPanel.verifyNotice" />
          </p>
        </Notice>
        <StateLink panelState={panelState} />
      </>
    ) : panelState === PANEL_CHECK_STATUS ? (
      <StateLink panelState={panelState} />
    ) : panelState === PANEL_OWN_PROFILE ? (
      <>
        <p className={css.lede}>
          <FormattedMessage id="OrderPanel.ownProfileLede" />
        </p>
        <StateLink panelState={panelState} editParams={editParams} />
      </>
    ) : panelState === PANEL_CLOSED ? (
      <p className={css.lede}>
        <FormattedMessage id="OrderPanel.closedListingButtonText" />
      </p>
    ) : null;

  const barCta = isBookState ? (
    hasDates ? (
      <button type="submit" form={formId} className={css.barButton}>
        <FormattedMessage id="BookingDatesForm.requestToBook" />
      </button>
    ) : (
      <button
        type="button"
        className={css.barButton}
        onClick={onOpenSheet}
        disabled={isPhone === null}
      >
        <FormattedMessage id="BookingDatesForm.selectDates" />
      </button>
    )
  ) : panelState === PANEL_CLOSED ? null : (
    <StateLink
      panelState={panelState}
      editParams={editParams}
      fromPath={fromPath}
      className={css.barLink}
    />
  );

  return (
    <div className={classNames(css.root, className)}>
      {/* Desktop: sticky panel (aligned with the location line by the page layout) */}
      <div className={css.panel}>
        {priceLine}
        {isBookState
          ? isPhone === false
            ? renderBookingForm('popover', setHasDates)
            : null
          : stateBody}
      </div>

      {/* Phone: bottom bar */}
      <div className={css.bar}>
        <div className={css.barPrice}>
          <b>{formattedPrice}</b>
          <small>
            <FormattedMessage id="OrderPanel.perDayLong" />
          </small>
        </div>
        {barCta}
      </div>

      {/* Phone: the dates sheet. Rendered in place (no portal) so the chosen dates survive
          closing and reopening it, and the bar's "Request to book" can submit the same form. */}
      {isBookState && isPhone ? (
        <ModalInMobile
          id="BookingDatesSheet"
          containerClassName={css.sheet}
          isModalOpenOnMobile={isSheetOpen}
          onClose={onCloseSheet}
          showAsModalMaxWidth={PHONE_MAX_WIDTH}
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <div className={css.sheetHead}>
            <h2 className={css.sheetTitle}>
              <FormattedMessage id="BookingDatesForm.chooseDates" />
            </h2>
            <button
              type="button"
              className={css.iconButton}
              onClick={onCloseSheet}
              aria-label={intl.formatMessage({ id: 'OrderPanel.closeSheet' })}
            >
              <RtIcon name="close" />
            </button>
          </div>
          {renderBookingForm('stack', setHasDates)}
        </ModalInMobile>
      ) : null}
    </div>
  );
};

export default BookingPanel;
