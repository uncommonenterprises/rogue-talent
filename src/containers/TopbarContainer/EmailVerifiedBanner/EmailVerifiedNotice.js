import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import {
  dismissVerifiedNotice,
  showVerifiedNoticeOnPath,
} from '../../../ducks/emailVerification.duck';

import EmailVerifiedBanner from './EmailVerifiedBanner';

/**
 * Connected wrapper for the screen 05 "Your email is verified." banner: renders it only on the
 * page the user lands on right after verifying (see emailVerification.duck). TopbarContainer
 * renders it above the topbar by default; pages whose topbar is position: fixed on desktop
 * (SearchPage) render it themselves under the topbar instead.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className optional wrapper class
 * @returns {JSX.Element|null}
 */
const EmailVerifiedNotice = props => {
  const { className } = props;
  const location = useLocation();
  const dispatch = useDispatch();
  const show = useSelector(state => showVerifiedNoticeOnPath(state, location?.pathname));

  if (!show) {
    return null;
  }

  const banner = <EmailVerifiedBanner onDismiss={() => dispatch(dismissVerifiedNotice())} />;
  return className ? <div className={className}>{banner}</div> : banner;
};

export default EmailVerifiedNotice;
