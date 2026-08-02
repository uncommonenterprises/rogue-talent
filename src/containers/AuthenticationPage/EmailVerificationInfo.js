import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';

import { Heading, NamedLink, IconEmailSent, InlineTextButton } from '../../components';

import css from './AuthenticationPage.module.css';

const EmailVerificationInfo = props => {
  const {
    name,
    email,
    onResendVerificationEmail,
    resendErrorMessage,
    sendVerificationEmailInProgress,
    isModel,
    closeLinkName,
  } = props;

  const resendEmailLink = (
    <InlineTextButton rootClassName={css.modalHelperLink} onClick={onResendVerificationEmail}>
      <FormattedMessage id="AuthenticationPage.resendEmailLinkText" />
    </InlineTextButton>
  );

  const fixEmailLink = (
    <NamedLink className={css.modalHelperLink} name="ContactDetailsPage">
      <FormattedMessage id="AuthenticationPage.fixEmailLinkText" />
    </NamedLink>
  );

  // Verification is a soft nag: a model can start building their profile with an
  // unverified email (they just can't go live). Offer that forward path so the
  // screen isn't a dead end. Models only — the client flow is unchanged.
  const verifyLaterMaybe =
    isModel && closeLinkName ? (
      <p className={css.modalHelperText}>
        <NamedLink className={css.modalHelperLink} name={closeLinkName}>
          <FormattedMessage id="AuthenticationPage.verifyLaterModelLink" />
        </NamedLink>
        <br />
        <FormattedMessage id="AuthenticationPage.verifyLaterModelNote" />
      </p>
    ) : null;

  return (
    <div className={css.content}>
      <IconEmailSent className={css.modalIcon} />
      <Heading as="h1" rootClassName={css.modalTitle}>
        <FormattedMessage id="AuthenticationPage.verifyEmailTitle" values={{ name }} />
      </Heading>
      <p className={css.modalMessage}>
        <FormattedMessage id="AuthenticationPage.verifyEmailText" values={{ email }} />
      </p>
      {verifyLaterMaybe}
      {resendErrorMessage}

      <div className={css.bottomWrapper}>
        <p className={css.modalHelperText}>
          {sendVerificationEmailInProgress ? (
            <FormattedMessage id="AuthenticationPage.sendingEmail" />
          ) : (
            <FormattedMessage id="AuthenticationPage.resendEmail" values={{ resendEmailLink }} />
          )}
        </p>
        <p className={css.modalHelperText}>
          <FormattedMessage id="AuthenticationPage.fixEmail" values={{ fixEmailLink }} />
        </p>
      </div>
    </div>
  );
};

export default EmailVerificationInfo;
