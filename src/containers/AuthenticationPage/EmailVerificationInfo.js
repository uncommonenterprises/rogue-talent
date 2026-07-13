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

  // Email verification is mandatory — there is no "Later" / close escape. The user
  // continues by verifying via the emailed link (or can resend / fix the address below).
  return (
    <div className={css.content}>
      <IconEmailSent className={css.modalIcon} />
      <Heading as="h1" rootClassName={css.modalTitle}>
        <FormattedMessage id="AuthenticationPage.verifyEmailTitle" values={{ name }} />
      </Heading>
      <p className={css.modalMessage}>
        <FormattedMessage id="AuthenticationPage.verifyEmailText" values={{ email }} />
      </p>
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
