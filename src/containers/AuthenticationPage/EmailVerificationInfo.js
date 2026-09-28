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

  // RT-FB-06: follow the pattern leading products use for "check your email" screens:
  // short headline, one line showing the address, ONE clear next step (so the screen is
  // never a dead end - verification is a soft gate), and recovery options kept as a single
  // quiet line directly beneath rather than floated to the bottom of the card.
  const ctaId = isModel
    ? 'AuthenticationPage.verifyLaterModelLink'
    : 'AuthenticationPage.verifyEmailClientCta';
  const noteId = isModel
    ? 'AuthenticationPage.verifyLaterModelNote'
    : 'AuthenticationPage.verifyEmailClientNote';

  return (
    <div className={css.content}>
      <IconEmailSent className={css.modalIcon} />
      <Heading as="h1" rootClassName={css.modalTitle}>
        <FormattedMessage id="AuthenticationPage.verifyEmailTitle" values={{ name }} />
      </Heading>
      <p className={css.modalMessage}>
        <FormattedMessage id="AuthenticationPage.verifyEmailText" values={{ email }} />
      </p>

      {closeLinkName ? (
        <div className={css.verifyNextStep}>
          <NamedLink className={css.verifyPrimaryAction} name={closeLinkName}>
            <FormattedMessage id={ctaId} />
          </NamedLink>
          <p className={css.verifyNote}>
            <FormattedMessage id={noteId} />
          </p>
        </div>
      ) : null}

      {resendErrorMessage}

      <p className={css.verifyHelpLine}>
        {sendVerificationEmailInProgress ? (
          <FormattedMessage id="AuthenticationPage.sendingEmail" />
        ) : (
          <FormattedMessage
            id="AuthenticationPage.resendEmail"
            values={{ resendEmailLink, fixEmailLink }}
          />
        )}
      </p>
    </div>
  );
};

export default EmailVerificationInfo;
