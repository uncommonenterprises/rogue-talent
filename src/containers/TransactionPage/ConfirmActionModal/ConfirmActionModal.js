import React from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { Modal, SecondaryButton } from '../../../components';

import css from './ConfirmActionModal.module.css';

/**
 * A short "are you sure?" for a booking step that can't be undone (B08 decline, Q9 withdraw):
 * what happens, then the action (secondary, not red: it is a normal choice) and a quiet way out.
 *
 * `onConfirm` returns the transition promise. The page's transition thunk resolves even when
 * the API rejects it, so only a resolved action that isn't 'rejected' closes the dialog; on a
 * failure the error stays in view.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onManageDisableScrolling
 * @param {Function} props.onConfirm returns a promise
 * @param {boolean} [props.inProgress]
 * @param {boolean} [props.hasError] show the error line
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} props.body
 * @param {React.ReactNode} props.confirmLabel
 * @param {React.ReactNode} props.cancelLabel
 * @param {React.ReactNode} props.errorMessage
 * @returns {JSX.Element}
 */
const ConfirmActionModal = props => {
  const intl = useIntl();
  const {
    id,
    isOpen,
    onClose,
    onManageDisableScrolling,
    onConfirm,
    inProgress = false,
    hasError = false,
    title,
    body,
    confirmLabel,
    cancelLabel,
    errorMessage,
  } = props;

  const handleConfirm = () => {
    Promise.resolve(onConfirm())
      .then(res => {
        if (res?.meta?.requestStatus !== 'rejected') {
          onClose();
        }
      })
      .catch(() => {});
  };

  return (
    <Modal
      id={id}
      containerClassName={css.root}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
      closeButtonMessage={intl.formatMessage({ id: 'ConfirmActionModal.close' })}
    >
      <h2 className={css.title}>{title}</h2>
      <p className={css.body}>{body}</p>
      {hasError ? (
        <p className={css.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className={css.actions}>
        <SecondaryButton
          type="button"
          className={css.confirm}
          onClick={handleConfirm}
          inProgress={inProgress}
          disabled={inProgress}
        >
          {confirmLabel}
        </SecondaryButton>
        <button type="button" className={css.keep} onClick={onClose} disabled={inProgress}>
          {cancelLabel || <FormattedMessage id="ConfirmActionModal.close" />}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmActionModal;
